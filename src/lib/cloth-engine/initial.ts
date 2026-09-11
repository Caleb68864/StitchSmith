/**
 * Bridge from the rigid fold (Stage 1) to the cloth (Stage 3): initial particle
 * positions come from the folded regions, so the cloth starts at the pressed
 * shape and relaxes from there.
 */

import type { Point } from '../pattern-engine/graph/Point.js';
import { regionTransforms, transformFlatPoint, regionAt, type FoldModel } from '../fold-engine/index.js';
import type { Vec3 } from './sim.js';

export interface FoldedInitialOptions {
  model: FoldModel;
  angles: number[];
  t?: number;
  /** Flat-frame translation (dx, dy) and z offset applied after folding. */
  offset?: { dx?: number; dy?: number; dz?: number };
}

/** Returns a function mapping a flat point of this piece to its rigid-folded 3D position. */
export function foldedInitial(opts: FoldedInitialOptions): (flat: Point) => Vec3 {
  const transforms = regionTransforms(opts.model, opts.angles, opts.t ?? 1);
  const dx = opts.offset?.dx ?? 0;
  const dy = opts.offset?.dy ?? 0;
  const dz = opts.offset?.dz ?? 0;
  const fallback = opts.model.root;
  return (flat: Point) => {
    let r = regionAt(opts.model, flat);
    if (r < 0) r = fallback;
    const p = transformFlatPoint(transforms[r], flat);
    return [p[0] + dx, p[1] - dy, p[2] + dz];
  };
}

/**
 * Bending rest length across a mesh edge: the flat distance between the opposite
 * vertices, unless the edge lies on a fold line, in which case the distance after
 * rotating one side by the fold's angle about that line — a pressed crease. Local
 * and tree-independent, so it stays consistent where the rigid hinge tree tears
 * (corner squares of a grid-cut piece).
 */
export function foldedCreaseRest(opts: { model: FoldModel; angles: number[]; t?: number }) {
  const t = opts.t ?? 1;
  const folds = opts.model.folds.map((f, i) => ({ line: f.line, length: f.length, theta: Math.abs((opts.angles[i] ?? 0) * t) }));
  // On the fold SEGMENT, not its infinite line: a band's side strip may sit on a
  // wing fold's line without being folded there.
  const onSegment = (f: { line: { p: Point; d: Point }; length: number }, q: Point) => {
    const off = Math.abs(f.line.d.x * (q.y - f.line.p.y) - f.line.d.y * (q.x - f.line.p.x));
    if (off > 1e-3) return false;
    const along = (q.x - f.line.p.x) * f.line.d.x + (q.y - f.line.p.y) * f.line.d.y;
    return along > -1e-3 && along < f.length + 1e-3;
  };
  return (k: Point, l: Point, i: Point, j: Point): number => {
    const flat = Math.hypot(l.x - k.x, l.y - k.y);
    for (const f of folds) {
      if (f.theta < 1e-6 || !onSegment(f, i) || !onSegment(f, j)) continue;
      // Rotate l about the fold line by theta (out of the flat plane) and measure to k.
      const rel = { x: l.x - f.line.p.x, y: l.y - f.line.p.y };
      const along = rel.x * f.line.d.x + rel.y * f.line.d.y;
      const perp = rel.x * -f.line.d.y + rel.y * f.line.d.x; // signed distance from the line
      const lx = f.line.p.x + f.line.d.x * along - f.line.d.y * perp * Math.cos(f.theta);
      const ly = f.line.p.y + f.line.d.y * along + f.line.d.x * perp * Math.cos(f.theta);
      const lz = perp * Math.sin(f.theta);
      return Math.hypot(lx - k.x, ly - k.y, lz);
    }
    return flat;
  };
}
