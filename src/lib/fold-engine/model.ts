/**
 * Fold engine — rigid fold preview (roadmap Stage 1).
 *
 * A piece is flat panels joined at `fold`-role lines. Split the outline by
 * every full-span fold line into regions, hinge adjacent regions across the
 * line they share, root the hinge tree at the largest region, and rotate each
 * region about its hinge by a per-fold angle. No physics: pucker, pleats and
 * fabric stretch do not show — but wrong lid lengths, wings that do not reach
 * and cells that do not fit a magazine do.
 *
 * 3D frame: x = pattern x, y = −pattern y (drawn "up" is +y), z toward the
 * viewer. A positive fold angle lifts the child region toward +z.
 */

import type { Piece } from '../pattern-engine/graph/Piece.js';
import type { Point } from '../pattern-engine/graph/Point.js';
import {
  type Poly,
  type Line,
  pathToPolygon,
  splitPolygonMulti,
  sideOf,
  area,
  centroid,
  dist,
  segmentOnLine,
  triangulate,
  pointInPolygon,
} from './polygon.js';

export type Vec3 = [number, number, number];

export interface FoldLine {
  index: number;
  pathId: string;
  label?: string;
  a: Point;
  b: Point;
  line: Line;
  length: number;
}

export interface Region {
  index: number;
  poly: Poly;
  centroid: Point;
  area: number;
}

export interface Hinge {
  child: number;
  parent: number;
  fold: number;
  /** +1 or −1 so that a positive angle lifts the child toward +z. */
  sign: 1 | -1;
  /** The shared boundary segment between parent and child (flat pattern coords). */
  a: Point;
  b: Point;
}

export interface FoldModel {
  pieceId: string;
  pieceName: string;
  regions: Region[];
  folds: FoldLine[];
  root: number;
  /** One hinge per non-root region, parents before children. */
  hinges: Hinge[];
  /** Regions that no fold line reaches (should be none when the tree is complete). */
  orphans: number[];
}

export interface BuildOptions {
  /**
   * A fold line must span at least this fraction of the outline along its
   * direction to be considered at all. Default 0: a fold only splits the
   * regions it fully crosses, which already ignores short tick marks.
   */
  minSpanFraction?: number;
  /** Curve sampling per edge. */
  segments?: number;
  /**
   * Root the hinge tree at the region containing this point. Defaults to the
   * piece's first `label` / `grain` annotation point (generators put it on the
   * body), falling back to the largest region.
   */
  rootPoint?: Point;
}

function extentAlong(poly: Poly, d: Point): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of poly) {
    const t = p.x * d.x + p.y * d.y;
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
  }
  return hi - lo;
}

/** Parameter intervals (along the line direction) of the polygon boundary lying on the line. */
function intervalsOnLine(poly: Poly, line: Line): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (segmentOnLine(a, b, line)) {
      const ta = (a.x - line.p.x) * line.d.x + (a.y - line.p.y) * line.d.y;
      const tb = (b.x - line.p.x) * line.d.x + (b.y - line.p.y) * line.d.y;
      out.push([Math.min(ta, tb), Math.max(ta, tb)]);
    }
  }
  return out;
}

/**
 * Parameter range (along `line.d` from `line.p`) over which the infinite line
 * lies inside the polygon: the span between its first and last crossings of
 * the boundary. Null when the line misses the polygon.
 */
function lineSpanInPolygon(poly: Poly, line: Line): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const sa = sideOf(line, a);
    const sb = sideOf(line, b);
    const onA = Math.abs(sa) < 1e-6;
    const onB = Math.abs(sb) < 1e-6;
    const push = (q: Point) => {
      const t = (q.x - line.p.x) * line.d.x + (q.y - line.p.y) * line.d.y;
      lo = Math.min(lo, t);
      hi = Math.max(hi, t);
    };
    if (onA) push(a);
    if (onB) push(b);
    if (!onA && !onB && sa * sb < 0) {
      const t = sa / (sa - sb);
      push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return hi - lo > 1e-6 ? [lo, hi] : null;
}

/** Longest overlap between two interval sets, or null when they barely touch. */
function overlapInterval(a: [number, number][], b: [number, number][]): [number, number] | null {
  let best: [number, number] | null = null;
  for (const [a0, a1] of a) for (const [b0, b1] of b) {
    const lo = Math.max(a0, b0);
    const hi = Math.min(a1, b1);
    if (hi - lo > 1e-3 && (!best || hi - lo > best[1] - best[0])) best = [lo, hi];
  }
  return best;
}

/** Build the fold model for one piece, or null when it has no closed outline. */
export function buildFoldModel(piece: Piece, opts: BuildOptions = {}): FoldModel | null {
  const minSpan = opts.minSpanFraction ?? 0;
  const segments = opts.segments ?? 16;
  const outlinePath = piece.paths.find((p) => p.closed && p.edges.length > 0);
  if (!outlinePath) return null;
  const outline = pathToPolygon(outlinePath, segments);
  if (outline.length < 3) return null;

  // Candidate fold lines: single straight `fold` edges spanning most of the piece.
  const folds: FoldLine[] = [];
  for (const path of piece.paths) {
    if (path.closed || path.edges.length !== 1) continue;
    const e = path.edges[0];
    if (e.role !== 'fold' || e.kind !== 'straight') continue;
    const len = dist(e.start, e.end);
    if (len < 1e-6) continue;
    const d = { x: (e.end.x - e.start.x) / len, y: (e.end.y - e.start.y) / len };
    if (len < minSpan * extentAlong(outline, d)) continue;
    folds.push({ index: folds.length, pathId: path.id, label: path.label, a: e.start, b: e.end, line: { p: e.start, d }, length: len });
  }

  // Split the outline by the fold SEGMENTS: a fold only splits a region it
  // crosses from side to side, so a wing fold that runs the front row does not
  // slice the bottom band, and a short box-corner tick splits nothing. Repeat
  // until no region changes, because a segment may only fully cross a region
  // after another fold has cut it down.
  let polys: Poly[] = [outline];
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const f of folds) {
      const ta = 0;
      const tb = f.length;
      const next: Poly[] = [];
      for (const poly of polys) {
        const span = lineSpanInPolygon(poly, f.line);
        if (!span || ta > span[0] + 1e-3 || tb < span[1] - 1e-3) { next.push(poly); continue; }
        const { pos, neg } = splitPolygonMulti(poly, f.line);
        if (pos.length > 0 && neg.length > 0) { next.push(...pos, ...neg); changed = true; }
        else next.push(poly);
      }
      polys = next;
    }
    if (!changed) break;
  }
  // Drop folds that split nothing (short tick marks, lines outside the piece) and reindex.
  {
    const used = new Set<number>();
    for (const f of folds) {
      for (const poly of polys) {
        const span = lineSpanInPolygon(poly, f.line);
        if (!span) continue;
        // A fold is "used" when some region has boundary lying on it.
        if (intervalsOnLine(poly, f.line).length > 0) { used.add(f.index); break; }
      }
    }
    const kept = folds.filter((f) => used.has(f.index));
    kept.forEach((f, i) => { f.index = i; });
    folds.length = 0;
    folds.push(...kept);
  }
  const regions: Region[] = polys.map((poly, index) => ({ index, poly, centroid: centroid(poly), area: area(poly) }));

  // Adjacency across fold lines.
  const adj: { other: number; fold: number; a: Point; b: Point }[][] = regions.map(() => []);
  for (const f of folds) {
    const ivs = regions.map((r) => intervalsOnLine(r.poly, f.line));
    for (let i = 0; i < regions.length; i++) {
      if (ivs[i].length === 0) continue;
      for (let j = i + 1; j < regions.length; j++) {
        if (ivs[j].length === 0) continue;
        const si = sideOf(f.line, regions[i].centroid);
        const sj = sideOf(f.line, regions[j].centroid);
        if (si * sj >= 0) continue; // same side: not across this fold
        const ov = overlapInterval(ivs[i], ivs[j]);
        if (!ov) continue;
        // A hinge needs a real shared edge: a seam-allowance sliver (a wing's bottom
        // edge overlapping the band's top edge by one SA) is not a fold.
        const lenI = ivs[i].reduce((s, [a, b]) => s + (b - a), 0);
        const lenJ = ivs[j].reduce((s, [a, b]) => s + (b - a), 0);
        if (ov[1] - ov[0] < 0.5 * Math.min(lenI, lenJ)) continue;
        const a = { x: f.line.p.x + f.line.d.x * ov[0], y: f.line.p.y + f.line.d.y * ov[0] };
        const b = { x: f.line.p.x + f.line.d.x * ov[1], y: f.line.p.y + f.line.d.y * ov[1] };
        adj[i].push({ other: j, fold: f.index, a, b });
        adj[j].push({ other: i, fold: f.index, a, b });
      }
    }
  }

  // Hinge tree rooted at the body: the region under the label/grain mark, else the largest.
  let root = -1;
  const rootPoint = opts.rootPoint ?? piece.annotations?.find((a) => (a.kind === 'label' || a.kind === 'grain') && a.point)?.point;
  if (rootPoint) {
    let best = -1;
    for (const r of regions) {
      if (pointInPolygon(rootPoint, r.poly) && (best < 0 || r.area > regions[best].area)) best = r.index;
    }
    root = best;
  }
  if (root < 0) {
    root = 0;
    for (const r of regions) if (r.area > regions[root].area) root = r.index;
  }
  // Grid-cut pieces give a region several candidate parents (a wing touches
  // both the body panel and a corner square). Expand the largest visited
  // region first so big panels claim their neighbours and corner squares hang
  // off whatever is left — that is what a folded cross does physically.
  const hinges: Hinge[] = [];
  const seen = new Set<number>([root]);
  const queue = [root];
  while (queue.length) {
    queue.sort((i, j) => regions[j].area - regions[i].area);
    const cur = queue.shift()!;
    for (const { other, fold, a, b } of adj[cur]) {
      if (seen.has(other)) continue;
      seen.add(other);
      const f = folds[fold];
      // Sign so a positive angle lifts the child toward +z (see rotateAboutLine).
      const c = regions[other].centroid;
      const cross = f.line.d.x * -(c.y - f.a.y) - -f.line.d.y * (c.x - f.a.x);
      hinges.push({ child: other, parent: cur, fold, sign: cross >= 0 ? 1 : -1, a, b });
      queue.push(other);
    }
  }
  const orphans = regions.map((r) => r.index).filter((i) => !seen.has(i));

  return { pieceId: piece.id, pieceName: piece.name, regions, folds, root, hinges, orphans };
}

// ─── Default angles ───────────────────────────────────────────────────────────

const DEG = Math.PI / 180;

/**
 * Default hinge angle per fold from its label/id: hems and mouth folds wrap
 * fully (180°), lids wrap most of the way (150°), everything else is a box
 * corner (90°). The viewer lets the user override each one.
 */
export function defaultFoldAngles(model: FoldModel): number[] {
  const total = model.regions.reduce((s, r) => s + r.area, 0) || 1;
  return model.folds.map((f) => {
    const key = `${f.label ?? ''} ${f.pathId}`.toLowerCase();
    // A label may state its angle outright, e.g. "Lid crease over the top (90°)".
    const explicit = /\((-?\d+(?:\.\d+)?)°\)/.exec(f.label ?? '');
    if (explicit) return parseFloat(explicit[1]) * DEG;
    if (/hem|mouth|tube|centre|center|half/.test(key)) return 180 * DEG;
    if (/lid|flap/.test(key)) return 150 * DEG;
    if (/spine|cover|collar|wing|bottom|box|gusset/.test(key)) return 90 * DEG;
    // Unlabelled: a fold that splits the piece into near-equal halves is a fold-in-half (handles,
    // sleeves); a fold with a sliver on one side is a hem. Anything else is a box corner.
    const pos = model.regions.filter((r) => sideOf(f.line, r.centroid) > 0).reduce((s, r) => s + r.area, 0);
    const minor = Math.min(pos, total - pos) / total;
    if (minor >= 0.42) return 180 * DEG;
    if (minor <= 0.15) return 180 * DEG;
    return 90 * DEG;
  });
}

// ─── Folding ──────────────────────────────────────────────────────────────────

/** Column-major 4×4 matrix. */
type Mat4 = number[];

function identity(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    out[c * 4 + r] = s;
  }
  return out;
}

function apply(m: Mat4, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
  ];
}

/** Rotation by `theta` about the axis through `p` with unit direction `u` (Rodrigues). */
function rotateAboutLine(p: Vec3, u: Vec3, theta: number): Mat4 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const t = 1 - c;
  const [x, y, z] = u;
  const R = [
    t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0,
    t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0,
    t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0,
    0, 0, 0, 1,
  ];
  const T1 = identity(); T1[12] = -p[0]; T1[13] = -p[1]; T1[14] = -p[2];
  const T2 = identity(); T2[12] = p[0]; T2[13] = p[1]; T2[14] = p[2];
  return multiply(T2, multiply(R, T1));
}

function to3(p: Point): Vec3 {
  return [p.x, -p.y, 0];
}

/** Apply a column-major 4×4 transform to a 3D point (exported for placed pieces in the viewer). */
export function applyTransform(m: RegionTransform, v: Vec3): Vec3 {
  return apply(m, v);
}

/** Rotation by `theta` radians about the axis through `p` along unit `u`, as a column-major 4×4. */
export function rotationAboutLine(p: Vec3, u: Vec3, theta: number): RegionTransform {
  return rotateAboutLine(p, u, theta);
}

/** a ∘ b — apply `b` first, then `a`. */
export function composeTransforms(a: RegionTransform, b: RegionTransform): RegionTransform {
  return multiply(a, b);
}

export interface FoldedPanel {
  region: number;
  vertices: Vec3[];
  triangles: [number, number, number][];
}

export interface FoldedHingeLine {
  fold: number;
  a: Vec3;
  b: Vec3;
}

export interface FoldedModel {
  pieceId: string;
  panels: FoldedPanel[];
  hinges: FoldedHingeLine[];
}

/** Column-major 4×4 transform per region for the given fold angles (exported for the cloth engine). */
export type RegionTransform = number[];

export function regionTransforms(model: FoldModel, angles: number[], t = 1): RegionTransform[] {
  const transforms: Mat4[] = model.regions.map(() => identity());
  for (const h of model.hinges) {
    const f = model.folds[h.fold];
    const a3 = to3(f.a);
    const b3 = to3(f.b);
    const len = Math.hypot(b3[0] - a3[0], b3[1] - a3[1]);
    const u: Vec3 = [(b3[0] - a3[0]) / len, (b3[1] - a3[1]) / len, 0];
    const theta = (angles[h.fold] ?? 0) * t * h.sign;
    // Rotate in the flat frame, then carry the parent's transform.
    transforms[h.child] = multiply(transforms[h.parent], rotateAboutLine(a3, u, theta));
  }
  return transforms;
}

/** Map a flat pattern point (mm, y down) to 3D through a region transform. */
export function transformFlatPoint(m: RegionTransform, p: Point): Vec3 {
  return apply(m, to3(p));
}

/**
 * Fold the model: `angles[i]` is the full hinge angle for fold i (radians),
 * `t` scales every angle (0 = flat, 1 = fully folded).
 */
export function foldModel(model: FoldModel, angles: number[], t = 1): FoldedModel {
  const transforms = regionTransforms(model, angles, t);
  const hingeLines: FoldedHingeLine[] = [];
  for (const h of model.hinges) {
    hingeLines.push({ fold: h.fold, a: apply(transforms[h.parent], to3(h.a)), b: apply(transforms[h.parent], to3(h.b)) });
  }
  const panels: FoldedPanel[] = model.regions.map((r) => ({
    region: r.index,
    vertices: r.poly.map((p) => apply(transforms[r.index], to3(p))),
    triangles: triangulate(r.poly),
  }));
  return { pieceId: model.pieceId, panels, hinges: hingeLines };
}

/** True when a flat point lies within `tol` of any fold segment of the model. */
export function onAnyFold(model: FoldModel, q: Point, tol = 1): boolean {
  for (const f of model.folds) {
    const off = Math.abs(f.line.d.x * (q.y - f.line.p.y) - f.line.d.y * (q.x - f.line.p.x));
    if (off > tol) continue;
    const along = (q.x - f.line.p.x) * f.line.d.x + (q.y - f.line.p.y) * f.line.d.y;
    if (along > -tol && along < f.length + tol) return true;
  }
  return false;
}

/** Index of the region containing a flat-pattern point, or −1. */
export function regionAt(model: FoldModel, q: Point): number {
  let best = -1;
  for (const r of model.regions) {
    if (pointInPolygon(q, r.poly) && (best < 0 || r.area > model.regions[best].area)) best = r.index;
  }
  return best;
}

/** Axis-aligned bounds of a folded model. */
export function foldedBounds(m: FoldedModel): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of m.panels) for (const v of p.vertices) for (let i = 0; i < 3; i++) {
    min[i] = Math.min(min[i], v[i]);
    max[i] = Math.max(max[i], v[i]);
  }
  return { min, max };
}

// ─── Stage 2: cavity measurement ──────────────────────────────────────────────

/** Möller–Trumbore ray/triangle intersection; returns distance along the ray or null. */
function rayTriangle(o: Vec3, d: Vec3, a: Vec3, b: Vec3, c: Vec3): number | null {
  const e1: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e2: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const p: Vec3 = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
  const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
  if (Math.abs(det) < 1e-9) return null;
  const inv = 1 / det;
  const s: Vec3 = [o[0] - a[0], o[1] - a[1], o[2] - a[2]];
  const u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) * inv;
  if (u < -1e-6 || u > 1 + 1e-6) return null;
  const q: Vec3 = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
  const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv;
  if (v < -1e-6 || u + v > 1 + 1e-6) return null;
  const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
  return t > 1e-6 ? t : null;
}

/** Nearest panel hit along a ray, across one or more folded models. */
export function castRay(models: FoldedModel[], origin: Vec3, dir: Vec3): { distance: number; pieceId: string; region: number } | null {
  let best: { distance: number; pieceId: string; region: number } | null = null;
  for (const m of models) {
    for (const panel of m.panels) {
      for (const [i, j, k] of panel.triangles) {
        const t = rayTriangle(origin, dir, panel.vertices[i], panel.vertices[j], panel.vertices[k]);
        if (t !== null && (!best || t < best.distance)) best = { distance: t, pieceId: m.pieceId, region: panel.region };
      }
    }
  }
  return best;
}

export interface CavityAxis {
  /** Distance from the object centre to the nearest panel on the negative side, or null when open. */
  neg: number | null;
  pos: number | null;
  /** Cavity extent (pos + neg) when both sides are closed. */
  extent: number | null;
  /** Object size along this axis. */
  object: number;
  /** extent − object; negative means the object cannot fit rigidly. */
  clearance: number | null;
}

export interface CavityReport {
  x: CavityAxis;
  y: CavityAxis;
  z: CavityAxis;
}

/**
 * Measure the cavity around an object centred at `centre` with half-sizes
 * `half` by casting rays along ±x, ±y, ±z from the centre to the nearest
 * folded panel. `y` is the object's height axis, so its positive side is
 * normally open (the mouth); the report still records the negative hit (the
 * floor) and clearance for closed axes.
 */
export function measureCavity(models: FoldedModel[], centre: Vec3, half: Vec3): CavityReport {
  const axis = (i: 0 | 1 | 2): CavityAxis => {
    const dPos: Vec3 = [0, 0, 0]; dPos[i] = 1;
    const dNeg: Vec3 = [0, 0, 0]; dNeg[i] = -1;
    const p = castRay(models, centre, dPos);
    const n = castRay(models, centre, dNeg);
    const pos = p ? p.distance : null;
    const neg = n ? n.distance : null;
    const extent = pos !== null && neg !== null ? pos + neg : null;
    return { neg, pos, extent, object: 2 * half[i], clearance: extent !== null ? extent - 2 * half[i] : null };
  };
  return { x: axis(0), y: axis(1), z: axis(2) };
}

/**
 * Indices of regions whose hinge path from the root passes through a fold
 * matching `predicate` — e.g. everything hanging off a lid fold. Used to
 * measure a cavity without the rigid lid slicing through it.
 */
export function regionsUnderFolds(model: FoldModel, predicate: (fold: FoldLine) => boolean): Set<number> {
  const parentOf = new Map<number, Hinge>();
  for (const h of model.hinges) parentOf.set(h.child, h);
  const out = new Set<number>();
  for (const r of model.regions) {
    let cur = r.index;
    let guard = 0;
    while (parentOf.has(cur) && guard++ < 10000) {
      const h = parentOf.get(cur)!;
      if (predicate(model.folds[h.fold])) { out.add(r.index); break; }
      cur = h.parent;
    }
  }
  return out;
}

/** A copy of the folded model with the given regions' panels removed. */
export function withoutRegions(folded: FoldedModel, drop: Set<number>): FoldedModel {
  return { ...folded, panels: folded.panels.filter((p) => !drop.has(p.region)) };
}
