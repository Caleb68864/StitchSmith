/**
 * Catenary edge curve: the "cat cut" on a tarp ridge or edge.
 *
 * A line under tension sags into a catenary. A tarp edge cut straight goes
 * slack in the middle when it is pitched, because the ridgeline (or the edge
 * itself) sags. A cat cut takes that sag out of the panel, so the edge is cut
 * as a catenary that curves into the panel by `sag` at mid-span and meets the
 * chord at both ends.
 *
 * The curve is given as the depth from the chord: d(t) for t ∈ [0, span],
 * d(0) = d(span) = 0 and d(span/2) = sag. With the catenary parameter `a`
 * (the ratio of horizontal tension to weight per length):
 *
 *   d(t) = a · (cosh(span / 2a) − cosh((t − span/2) / a))
 *
 * `a` is solved from the sag: a · (cosh(span / 2a) − 1) = sag. A shallow
 * catenary is close to the parabola 4·sag·t·(span − t)/span²; tests pin how
 * close, so a generator may quote either.
 */
import type { Point } from '../graph/Point.js';

export interface Catenary {
  span: number;
  sag: number;
  /** Catenary parameter (mm). Infinity for a straight edge (sag 0). */
  a: number;
  /** Depth from the chord at distance t along it (clamped to the span). */
  depth: (t: number) => number;
  /** Slope of the depth curve at t (dd/dt); the steepest point is at the ends. */
  slope: (t: number) => number;
  /** Length of the curved edge from end to end. */
  arcLength: number;
}

export type CatenaryResult = { ok: true; value: Catenary } | { ok: false; error: string };

/** Deepest sag accepted, as a fraction of the span. Deeper is not a cat cut any more. */
export const MAX_SAG_RATIO = 0.25;

/**
 * Solve the catenary through both ends of a chord `span` long that sags
 * `sag` at the middle. Bisection on log(a): the sag is monotone in `a`.
 */
export function catenary(span: number, sag: number): CatenaryResult {
  if (!Number.isFinite(span) || span <= 0) return { ok: false, error: 'span must be a positive number' };
  if (!Number.isFinite(sag) || sag < 0) return { ok: false, error: 'sag must be 0 or greater' };
  if (sag > MAX_SAG_RATIO * span) return { ok: false, error: `sag must be at most ${MAX_SAG_RATIO} of the span` };
  const half = span / 2;
  if (sag === 0) {
    return { ok: true, value: { span, sag, a: Infinity, depth: () => 0, slope: () => 0, arcLength: span } };
  }
  const sagOf = (a: number) => a * (Math.cosh(half / a) - 1);
  // sagOf falls as a grows. Bracket: tiny a overshoots, huge a undershoots.
  let lo = Math.log(half / 50);
  let hi = Math.log((half * half) / sag); // the parabola's a = half²/(2·sag) sits inside this
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (sagOf(Math.exp(mid)) > sag) lo = mid; else hi = mid;
  }
  const a = Math.exp((lo + hi) / 2);
  const ch = Math.cosh(half / a);
  const clamp = (t: number) => Math.min(span, Math.max(0, t));
  return {
    ok: true,
    value: {
      span,
      sag,
      a,
      depth: (t) => a * (ch - Math.cosh((clamp(t) - half) / a)),
      slope: (t) => -Math.sinh((clamp(t) - half) / a),
      // Arc length of a·cosh(x/a) over [−half, half].
      arcLength: 2 * a * Math.sinh(half / a),
    },
  };
}

/**
 * Points along a catenary edge from `start` to `end`, displaced from the
 * chord toward `toward` (a point on the side the curve should bow into,
 * usually the panel's centre). `segments` straight pieces; ends exact.
 */
export function catenaryPoints(start: Point, end: Point, sag: number, toward: Point, segments = 24): Point[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const span = Math.hypot(dx, dy);
  const cat = catenary(span, sag);
  if (!cat.ok) throw new Error(cat.error);
  const ux = dx / span, uy = dy / span;
  // Unit normal, flipped to face `toward`.
  let nx = -uy, ny = ux;
  if ((toward.x - start.x) * nx + (toward.y - start.y) * ny < 0) { nx = -nx; ny = -ny; }
  const n = Math.max(1, Math.round(segments));
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (span * i) / n;
    const d = cat.value.depth(t);
    out.push({ x: start.x + ux * t + nx * d, y: start.y + uy * t + ny * d });
  }
  out[0] = { ...start };
  out[n] = { ...end };
  return out;
}

/** Length of a polyline (for checking a sampled curve against `arcLength`). */
export function polylineLength(points: Point[]): number {
  let s = 0;
  for (let i = 1; i < points.length; i++) s += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return s;
}
