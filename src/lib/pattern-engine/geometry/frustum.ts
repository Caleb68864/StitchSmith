/**
 * Flat development of a cone frustum: a tube whose circumference changes
 * from one end to the other (a gaiter, a sleeve cuff, a tapered stuff sack).
 * Laid flat it is an annular sector; its two straight edges are the seam
 * (or closure) lines and its arcs the two ends.
 *
 * Frame: the apex at the origin, the sector symmetric about +y (down the
 * page). `radiusAt(s)` is the radius at distance s down the slant from the
 * top end; when the bottom is the narrower end the apex sits below and the
 * radius shrinks as s grows. Equal ends give a (near-)rectangle: the apex
 * is put far away. Lengths in mm, angles in radians.
 */
import type { Point } from '../graph/Point.js';

export interface Frustum {
  topCircumference: number;
  bottomCircumference: number;
  /** Slant height, top end to bottom end. */
  height: number;
  /** Radius of the top end's arc. */
  topRadius: number;
  /** +1 when the bottom is wider (apex above), −1 when narrower (apex below). */
  direction: 1 | -1;
  /** Angle the sector subtends. */
  angle: number;
}

export type FrustumResult = { ok: true; value: Frustum } | { ok: false; error: string };

/** Ends closer than this are treated as equal (a rectangle). */
const EQUAL_MM = 1e-6;
const FAR = 1e7;

export function frustum(topCircumference: number, bottomCircumference: number, height: number): FrustumResult {
  const pos = (v: number) => Number.isFinite(v) && v > 0;
  if (!pos(topCircumference) || !pos(bottomCircumference)) return { ok: false, error: 'both circumferences must be positive' };
  if (!pos(height)) return { ok: false, error: 'height must be positive' };
  const diff = bottomCircumference - topCircumference;
  const direction: 1 | -1 = diff >= 0 ? 1 : -1;
  // Similar triangles: r_top / C_top = height / |ΔC| · (1 / 1), radius grows by height over the slant.
  const topRadius = Math.abs(diff) < EQUAL_MM ? FAR * height : (height * topCircumference) / Math.abs(diff);
  const angle = topCircumference / topRadius;
  if (angle >= 2 * Math.PI) return { ok: false, error: 'the ends differ too much for that height: the flat piece would overlap itself' };
  return { ok: true, value: { topCircumference, bottomCircumference, height, topRadius, direction, angle } };
}

export function radiusAt(f: Frustum, s: number): number {
  return f.topRadius + f.direction * s;
}

/**
 * Flat point at angle fraction u (0 = one straight edge, 1 = the other) and
 * slant distance s from the top end, plus an extra radial push `out` (away
 * from the apex) — used for a shaped edge or an allowance on an end.
 */
export function frustumPoint(f: Frustum, u: number, s: number, out = 0): Point {
  const rho = radiusAt(f, s) + f.direction * out;
  const a = (u - 0.5) * f.angle;
  return { x: rho * Math.sin(a), y: f.direction * rho * Math.cos(a) };
}

/** Unit direction along the straight edge at u, pointing from the top end to the bottom end. */
export function edgeDirection(f: Frustum, u: number): Point {
  const a = (u - 0.5) * f.angle;
  return { x: f.direction * Math.sin(a), y: Math.cos(a) };
}
