/**
 * Fold engine — 2D polygon helpers.
 *
 * Everything here works on plain point arrays in pattern coordinates (mm,
 * y down as drawn). Curved edges are sampled to polylines first.
 */

import type { Edge } from '../pattern-engine/graph/Edge.js';
import type { Path } from '../pattern-engine/graph/Path.js';
import type { Point } from '../pattern-engine/graph/Point.js';

export type Poly = Point[];

const EPS = 1e-7;

/** Sample one edge into points (start … end inclusive). */
export function sampleEdge(edge: Edge, segments = 16): Point[] {
  switch (edge.kind) {
    case 'straight':
      return [edge.start, edge.end];
    case 'arc': {
      const { center, radius, clockwise } = edge;
      let a0 = Math.atan2(edge.start.y - center.y, edge.start.x - center.x);
      let a1 = Math.atan2(edge.end.y - center.y, edge.end.x - center.x);
      if (clockwise && a1 < a0) a1 += 2 * Math.PI;
      if (!clockwise && a1 > a0) a1 -= 2 * Math.PI;
      const pts: Point[] = [];
      for (let i = 0; i <= segments; i++) {
        const a = a0 + (a1 - a0) * (i / segments);
        pts.push({ x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) });
      }
      return pts;
    }
    case 'bezier': {
      const pts: Point[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const m = 1 - t;
        pts.push({
          x: m * m * m * edge.start.x + 3 * m * m * t * edge.cp1.x + 3 * m * t * t * edge.cp2.x + t * t * t * edge.end.x,
          y: m * m * m * edge.start.y + 3 * m * m * t * edge.cp1.y + 3 * m * t * t * edge.cp2.y + t * t * t * edge.end.y,
        });
      }
      return pts;
    }
  }
}

/** Flatten a closed path to a polygon (no duplicate closing vertex). */
export function pathToPolygon(path: Path, segments = 16): Poly {
  const pts: Point[] = [];
  for (const e of path.edges) {
    const s = sampleEdge(e, segments);
    for (let i = pts.length === 0 ? 0 : 1; i < s.length; i++) pts.push(s[i]);
  }
  if (pts.length > 1 && dist(pts[0], pts[pts.length - 1]) < 1e-6) pts.pop();
  return pts;
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function signedArea(p: Poly): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const u = p[i];
    const v = p[(i + 1) % p.length];
    a += u.x * v.y - v.x * u.y;
  }
  return a / 2;
}

export function area(p: Poly): number {
  return Math.abs(signedArea(p));
}

export function centroid(p: Poly): Point {
  const a = signedArea(p);
  if (Math.abs(a) < EPS) {
    const n = p.length || 1;
    return { x: p.reduce((s, q) => s + q.x, 0) / n, y: p.reduce((s, q) => s + q.y, 0) / n };
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < p.length; i++) {
    const u = p[i];
    const v = p[(i + 1) % p.length];
    const f = u.x * v.y - v.x * u.y;
    cx += (u.x + v.x) * f;
    cy += (u.y + v.y) * f;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

/** An infinite line through `p` with direction `d`. */
export interface Line {
  p: Point;
  d: Point;
}

/** Signed distance of `q` from the line (positive on the left of d). */
export function sideOf(line: Line, q: Point): number {
  return line.d.x * (q.y - line.p.y) - line.d.y * (q.x - line.p.x);
}

function intersect(a: Point, b: Point, line: Line): Point {
  const sa = sideOf(line, a);
  const sb = sideOf(line, b);
  const t = sa / (sa - sb);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * Split a polygon by an infinite line into the part on the positive side and
 * the part on the negative side (Sutherland–Hodgman against each half-plane).
 * Either part may be empty. Vertices on the line go to both parts.
 */
export function splitPolygon(poly: Poly, line: Line, tol = 1e-6): { pos: Poly; neg: Poly } {
  const clip = (sign: 1 | -1): Poly => {
    const out: Poly = [];
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % n];
      const sa = sideOf(line, a) * sign;
      const sb = sideOf(line, b) * sign;
      const aIn = sa >= -tol;
      const bIn = sb >= -tol;
      if (aIn) out.push(a);
      if ((aIn && !bIn) || (!aIn && bIn)) {
        if (Math.abs(sa) > tol || Math.abs(sb) > tol) out.push(intersect(a, b, line));
      }
    }
    return dedupe(out);
  };
  const pos = clip(1);
  const neg = clip(-1);
  return { pos: area(pos) > tol ? pos : [], neg: area(neg) > tol ? neg : [] };
}

function dedupe(p: Poly): Poly {
  const out: Poly = [];
  for (const q of p) {
    if (out.length === 0 || dist(out[out.length - 1], q) > 1e-6) out.push(q);
  }
  if (out.length > 1 && dist(out[0], out[out.length - 1]) < 1e-6) out.pop();
  return out;
}

/** True when both endpoints of segment ab lie on the line. */
export function segmentOnLine(a: Point, b: Point, line: Line, tol = 1e-4): boolean {
  return Math.abs(sideOf(line, a)) < tol && Math.abs(sideOf(line, b)) < tol;
}

/**
 * Length of polygon boundary that lies on `line` — used to decide whether two
 * regions are hinged across it.
 */
export function boundaryOnLine(poly: Poly, line: Line): number {
  let len = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (segmentOnLine(a, b, line)) len += dist(a, b);
  }
  return len;
}

/** Ear-clipping triangulation. Returns index triples into `poly`. */
export function triangulate(poly: Poly): [number, number, number][] {
  const n = poly.length;
  if (n < 3) return [];
  const idx = Array.from({ length: n }, (_, i) => i);
  if (signedArea(poly) < 0) idx.reverse();
  const tris: [number, number, number][] = [];
  const isConvex = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > EPS;
  const inTri = (p: Point, a: Point, b: Point, c: Point) => {
    const s1 = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    const s2 = (c.x - b.x) * (p.y - b.y) - (c.y - b.y) * (p.x - b.x);
    const s3 = (a.x - c.x) * (p.y - c.y) - (a.y - c.y) * (p.x - c.x);
    return s1 >= -EPS && s2 >= -EPS && s3 >= -EPS;
  };
  let guard = 0;
  while (idx.length > 3 && guard++ < 10000) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const ia = idx[(i + idx.length - 1) % idx.length];
      const ib = idx[i];
      const ic = idx[(i + 1) % idx.length];
      const a = poly[ia];
      const b = poly[ib];
      const c = poly[ic];
      if (!isConvex(a, b, c)) continue;
      let ok = true;
      for (const j of idx) {
        if (j === ia || j === ib || j === ic) continue;
        if (inTri(poly[j], a, b, c)) { ok = false; break; }
      }
      if (!ok) continue;
      tris.push([ia, ib, ic]);
      idx.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break; // degenerate; fall through with what we have
  }
  if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
  return tris;
}

/** Even-odd point-in-polygon test with a small tolerance for points on the boundary. */
export function pointInPolygon(q: Point, poly: Poly, tol = 1e-6): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = poly[i];
    const b = poly[j];
    // On-edge check
    const cross = (b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x);
    if (Math.abs(cross) < tol * Math.max(1, dist(a, b)) &&
        q.x >= Math.min(a.x, b.x) - tol && q.x <= Math.max(a.x, b.x) + tol &&
        q.y >= Math.min(a.y, b.y) - tol && q.y <= Math.max(a.y, b.y) + tol) return true;
    if ((a.y > q.y) !== (b.y > q.y)) {
      const x = a.x + ((q.y - a.y) * (b.x - a.x)) / (b.y - a.y);
      if (q.x < x) inside = !inside;
    }
  }
  return inside;
}
