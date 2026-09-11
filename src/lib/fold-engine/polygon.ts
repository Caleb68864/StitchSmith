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
 * Split a simple polygon by an infinite line into the parts on the positive
 * side and the negative side. Works for concave outlines (the folded-T cross,
 * an L): the boundary is cut into chains at its crossings of the line, and the
 * chains on each side are stitched back together along the line by pairing
 * consecutive crossings (the inside intervals of a simple polygon alternate).
 * Boundary runs lying ON the line stay with the side whose interior touches
 * them. Either result may be empty; each may hold several polygons.
 */
export function splitPolygonMulti(poly: Poly, line: Line, tol = 1e-6): { pos: Poly[]; neg: Poly[] } {
  const n = poly.length;
  if (n < 3) return { pos: [], neg: [] };
  const raw = poly.map((q): -1 | 0 | 1 => {
    const v = sideOf(line, q);
    return v > tol ? 1 : v < -tol ? -1 : 0;
  });
  if (raw.every((x) => x >= 0)) return { pos: [poly], neg: [] };
  if (raw.every((x) => x <= 0)) return { pos: [], neg: [poly] };
  // A vertex on the line whose nearest off-line neighbours share a side is a
  // touch, not a crossing: give it that side so only real crossings make runs.
  const sides = raw.slice();
  const nextNonZero = (i: number, dir: 1 | -1): -1 | 1 => {
    for (let k = 1; k < n; k++) { const v = raw[(i + dir * k + n * k) % n]; if (v !== 0) return v; }
    return 1;
  };
  for (let i = 0; i < n; i++) {
    if (raw[i] !== 0) continue;
    const a = nextNonZero(i, -1);
    const b = nextNonZero(i, 1);
    if (a === b) sides[i] = a;
  }
  if (sides.every((x) => x >= 0)) return { pos: [poly], neg: [] };
  if (sides.every((x) => x <= 0)) return { pos: [], neg: [poly] };

  // Ring with intersection vertices inserted at every side change.
  type V = { p: Point; s: -1 | 0 | 1 };
  const ring0: V[] = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    ring0.push({ p: a, s: sides[i] });
    if (sides[i] * sides[(i + 1) % n] < 0) ring0.push({ p: intersect(a, b, line), s: 0 });
  }
  // Rotate so the ring starts at the first vertex of a chain (previous vertex is on the line or the other side).
  let start = -1;
  for (let i = 0; i < ring0.length; i++) {
    const v = ring0[i];
    const prev = ring0[(i + ring0.length - 1) % ring0.length];
    if (v.s !== 0 && prev.s !== v.s) { start = i; break; }
  }
  if (start < 0) return { pos: [], neg: [] };
  const ring = ring0.slice(start).concat(ring0.slice(0, start));

  const ccw = signedArea(poly) > 0;
  const tOf = (q: Point) => (q.x - line.p.x) * line.d.x + (q.y - line.p.y) * line.d.y;

  // Segments: chains (one side) and runs (on the line), alternating.
  type Seg = { kind: 'chain'; side: -1 | 1; verts: Point[] } | { kind: 'run'; verts: Point[] };
  const segs: Seg[] = [];
  for (const v of ring) {
    const last = segs[segs.length - 1];
    if (v.s === 0) {
      if (last && last.kind === 'run') last.verts.push(v.p); else segs.push({ kind: 'run', verts: [v.p] });
    } else if (last && last.kind === 'chain' && last.side === v.s) {
      last.verts.push(v.p);
    } else {
      segs.push({ kind: 'chain', side: v.s, verts: [v.p] });
    }
  }
  const chains = segs.filter((x): x is Seg & { kind: 'chain' } => x.kind === 'chain').map((c) => ({ side: c.side, verts: [...c.verts] }));
  if (chains.length < 2) {
    const c = chains[0];
    return c && c.side > 0 ? { pos: [dedupe(c.verts)], neg: [] } : c ? { pos: [], neg: [dedupe(c.verts)] } : { pos: [], neg: [] };
  }
  // Attach each run (a crossing) to its neighbouring chains.
  let ci = -1;
  for (const seg of segs) {
    if (seg.kind === 'chain') { ci++; continue; }
    const prev = chains[(ci + chains.length) % chains.length];
    const next = chains[(ci + 1) % chains.length];
    const run = seg.verts;
    if (run.length === 1) {
      prev.verts.push(run[0]);
      next.verts.unshift(run[0]);
      continue;
    }
    const runDir = tOf(run[run.length - 1]) - tOf(run[0]);
    // Interior lies to the left of the boundary for a CCW ring: that side owns the run.
    const owner = (runDir > 0 ? 1 : -1) * (ccw ? 1 : -1);
    if (owner === prev.side) { prev.verts.push(...run); next.verts.unshift(run[run.length - 1]); }
    else { prev.verts.push(run[0]); next.verts.unshift(...run); }
  }
  // Chains whose ring-wrap split them are already contiguous because the ring starts at a chain start.

  // Crossings: each chain's start and end lie on the line. Sort by t and pair (2k, 2k+1).
  const ends = chains.flatMap((c, i) => [
    { t: tOf(c.verts[0]), chain: i, end: 'start' as const },
    { t: tOf(c.verts[c.verts.length - 1]), chain: i, end: 'end' as const },
  ]);
  // Distinct crossing points along the line, sorted.
  const ts = [...new Set(ends.map((e) => Math.round(e.t * 1e6) / 1e6))].sort((a, b) => a - b);
  const partnerT = (t: number): number | null => {
    const k = ts.findIndex((x) => Math.abs(x - t) < 1e-5);
    if (k < 0) return null;
    const pk = k % 2 === 0 ? k + 1 : k - 1;
    return pk >= 0 && pk < ts.length ? ts[pk] : null;
  };

  const result: { pos: Poly[]; neg: Poly[] } = { pos: [], neg: [] };
  const visited = new Set<number>();
  for (let s0 = 0; s0 < chains.length; s0++) {
    if (visited.has(s0)) continue;
    const side = chains[s0].side;
    const out: Point[] = [];
    let cur = s0;
    let guard = 0;
    while (!visited.has(cur) && guard++ <= chains.length) {
      visited.add(cur);
      out.push(...chains[cur].verts);
      const tEnd = tOf(chains[cur].verts[chains[cur].verts.length - 1]);
      const tP = partnerT(tEnd);
      if (tP === null) break;
      const next = chains.findIndex((c, i) => !visited.has(i) && c.side === side && Math.abs(tOf(c.verts[0]) - tP) < 1e-5);
      if (next < 0) break;
      cur = next;
    }
    const cleaned = dedupe(out);
    if (cleaned.length >= 3 && area(cleaned) > tol) (side > 0 ? result.pos : result.neg).push(cleaned);
  }
  return result;
}

/**
 * Split a polygon by an infinite line. Convenience wrapper returning one
 * polygon per side (the largest when the split yields several); callers that
 * need every part use `splitPolygonMulti`.
 */
export function splitPolygon(poly: Poly, line: Line, tol = 1e-6): { pos: Poly; neg: Poly } {
  const r = splitPolygonMulti(poly, line, tol);
  const biggest = (arr: Poly[]) => arr.reduce<Poly>((best, p) => (area(p) > area(best) ? p : best), []);
  return { pos: biggest(r.pos), neg: biggest(r.neg) };
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

/**
 * Ear-clipping triangulation. Returns index triples into `poly`. Collinear
 * vertices (which appear wherever a split line meets a straight edge) are
 * skipped as ear tips so they cannot stall the clipper, and are still covered
 * because the ear on either side spans them.
 */
export function triangulate(poly: Poly): [number, number, number][] {
  const n = poly.length;
  if (n < 3) return [];
  let idx = Array.from({ length: n }, (_, i) => i);
  if (signedArea(poly) < 0) idx.reverse();
  // Remove collinear middle vertices from the working ring; they add no area.
  const collinear = (a: Point, b: Point, c: Point) => Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) < 1e-7 * Math.max(1, dist(a, c));
  let pruned = true;
  while (pruned && idx.length > 3) {
    pruned = false;
    for (let i = 0; i < idx.length; i++) {
      const a = poly[idx[(i + idx.length - 1) % idx.length]];
      const b = poly[idx[i]];
      const c = poly[idx[(i + 1) % idx.length]];
      if (collinear(a, b, c)) { idx.splice(i, 1); pruned = true; break; }
    }
  }
  if (idx.length < 3) return [];
  idx = [...idx];
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
