/**
 * Cloth engine — piece meshing.
 *
 * A piece outline becomes a rectilinear triangle grid: every x and y that
 * appears in the outline, fold lines, stitch lines and declared seams becomes
 * a grid line, and long intervals are subdivided to `spacing`. Rectilinear
 * outlines (every pouch, panel and hem) are represented exactly; curves are
 * stair-stepped at the grid resolution, which is acceptable for a preview.
 */

import type { Piece } from '../pattern-engine/graph/Piece.js';
import type { Point } from '../pattern-engine/graph/Point.js';
import { pathToPolygon, pointInPolygon, type Poly } from '../fold-engine/polygon.js';

export interface ClothMesh {
  pieceId: string;
  /** Flat pattern coordinates, 2 per vertex (mm, y down as drawn). */
  flat: Float64Array;
  vertexCount: number;
  /** Triangle vertex indices, 3 per triangle. */
  triangles: Uint32Array;
  /** Unique edges (i < j). */
  edges: Array<[number, number]>;
  /** Bending pairs: opposite vertices (k, l) of the two triangles sharing interior edge (i, j). */
  bends: Array<[number, number, number, number]>;
  /** Grid coordinates so callers can find the vertex nearest a flat point cheaply. */
  xs: number[];
  ys: number[];
  /** vertex index at grid (ix, iy), or -1. */
  gridIndex: Int32Array;
}

function refine(values: number[], spacing: number): number[] {
  const raw = [...new Set(values.map((v) => Math.round(v * 1000) / 1000))].sort((a, b) => a - b);
  // Grid lines closer than a quarter cell make sliver triangles that bend and stretch badly;
  // merge them (a seam endpoint moves under a quarter cell, which nearestVertex absorbs).
  const sorted: number[] = [];
  for (const v of raw) {
    if (sorted.length && v - sorted[sorted.length - 1] < spacing * 0.25 && sorted.length > 1) continue;
    if (sorted.length === 1 && v - sorted[0] < spacing * 0.25) { sorted.push(v); continue; }
    sorted.push(v);
  }
  const out: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    out.push(sorted[i]);
    if (i + 1 < sorted.length) {
      const gap = sorted[i + 1] - sorted[i];
      const n = Math.ceil(gap / spacing);
      for (let k = 1; k < n; k++) out.push(sorted[i] + (gap * k) / n);
    }
  }
  return out;
}

export interface MeshOptions {
  spacing?: number;
  /** Extra flat coordinates that must land on grid lines (seam endpoints). */
  extraX?: number[];
  extraY?: number[];
}

export function buildClothMesh(piece: Piece, opts: MeshOptions = {}): ClothMesh | null {
  const spacing = opts.spacing ?? 8;
  const outlinePath = piece.paths.find((p) => p.closed && p.edges.length > 0);
  if (!outlinePath) return null;
  const outline: Poly = pathToPolygon(outlinePath, 12);
  if (outline.length < 3) return null;

  const xsRaw: number[] = [...(opts.extraX ?? [])];
  const ysRaw: number[] = [...(opts.extraY ?? [])];
  for (const p of outline) { xsRaw.push(p.x); ysRaw.push(p.y); }
  for (const path of piece.paths) {
    if (path.closed) continue;
    for (const e of path.edges) {
      if (e.kind !== 'straight') continue;
      if (e.role === 'fold' || e.role === 'stitch' || e.role === 'seam') {
        xsRaw.push(e.start.x, e.end.x);
        ysRaw.push(e.start.y, e.end.y);
      }
    }
  }
  const xs = refine(xsRaw, spacing);
  const ys = refine(ysRaw, spacing);
  const nx = xs.length;
  const ny = ys.length;

  const gridIndex = new Int32Array(nx * ny).fill(-1);
  const flat: number[] = [];
  let count = 0;
  const tol = 1e-3;
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const p: Point = { x: xs[ix], y: ys[iy] };
      if (pointInPolygon(p, outline, tol)) {
        gridIndex[iy * nx + ix] = count++;
        flat.push(p.x, p.y);
      }
    }
  }

  const tris: number[] = [];
  const edgeSet = new Map<string, [number, number]>();
  const triOfEdge = new Map<string, number[]>(); // edge key → opposite vertices
  const addEdge = (a: number, b: number, opp: number) => {
    const [i, j] = a < b ? [a, b] : [b, a];
    const key = `${i}:${j}`;
    if (!edgeSet.has(key)) edgeSet.set(key, [i, j]);
    const arr = triOfEdge.get(key) ?? [];
    arr.push(opp);
    triOfEdge.set(key, arr);
  };
  for (let iy = 0; iy < ny - 1; iy++) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const a = gridIndex[iy * nx + ix];
      const b = gridIndex[iy * nx + ix + 1];
      const c = gridIndex[(iy + 1) * nx + ix + 1];
      const d = gridIndex[(iy + 1) * nx + ix];
      if (a < 0 || b < 0 || c < 0 || d < 0) continue;
      // Cell must be inside: test its centre (handles concave outlines).
      const cx = (xs[ix] + xs[ix + 1]) / 2;
      const cy = (ys[iy] + ys[iy + 1]) / 2;
      if (!pointInPolygon({ x: cx, y: cy }, outline, tol)) continue;
      // Alternate the diagonal so bending is isotropic-ish.
      if ((ix + iy) % 2 === 0) {
        tris.push(a, b, c, a, c, d);
        addEdge(a, b, c); addEdge(b, c, a); addEdge(c, a, b);
        addEdge(a, c, d); addEdge(c, d, a); addEdge(d, a, c);
      } else {
        tris.push(a, b, d, b, c, d);
        addEdge(a, b, d); addEdge(b, d, a); addEdge(d, a, b);
        addEdge(b, c, d); addEdge(c, d, b); addEdge(d, b, c);
      }
    }
  }
  if (tris.length === 0) return null;

  const bends: Array<[number, number, number, number]> = [];
  for (const [key, opp] of triOfEdge) {
    if (opp.length !== 2) continue;
    const [i, j] = edgeSet.get(key)!;
    bends.push([opp[0], opp[1], i, j]);
  }

  return {
    pieceId: piece.id,
    flat: Float64Array.from(flat),
    vertexCount: count,
    triangles: Uint32Array.from(tris),
    edges: [...edgeSet.values()],
    bends,
    xs,
    ys,
    gridIndex,
  };
}

/** Index of the mesh vertex nearest a flat point (grid lookup, then a local search). */
export function nearestVertex(mesh: ClothMesh, p: Point): number {
  const near = (arr: number[], v: number) => {
    let lo = 0;
    let hi = arr.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < v) lo = mid + 1; else hi = mid; }
    if (lo > 0 && Math.abs(arr[lo - 1] - v) < Math.abs(arr[lo] - v)) return lo - 1;
    return lo;
  };
  const ix0 = near(mesh.xs, p.x);
  const iy0 = near(mesh.ys, p.y);
  let best = -1;
  let bestD = Infinity;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const ix = ix0 + dx;
      const iy = iy0 + dy;
      if (ix < 0 || iy < 0 || ix >= mesh.xs.length || iy >= mesh.ys.length) continue;
      const v = mesh.gridIndex[iy * mesh.xs.length + ix];
      if (v < 0) continue;
      const d = Math.hypot(mesh.flat[2 * v] - p.x, mesh.flat[2 * v + 1] - p.y);
      if (d < bestD) { bestD = d; best = v; }
    }
  }
  return best;
}
