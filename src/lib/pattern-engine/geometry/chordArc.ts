/**
 * A circular arc of a given length standing on a given chord: the shape a
 * wider panel takes when its edges are sewn to a narrower base (a bivy top
 * over its floor, a gusset closing the arch). Solves sin(θ/2)/(θ/2) = c/s for
 * the subtended angle θ by bisection, for arcs up to a semicircle.
 *
 * Lengths in mm. `points` samples the arc in a frame with the chord on y = 0
 * from (0, 0) to (chord, 0) and the arc bulging toward −y (up the page).
 */
import type { Point } from '../graph/Point.js';

export interface ChordArc {
  chord: number;
  arcLength: number;
  radius: number;
  /** Subtended angle, radians (0 < θ ≤ π). */
  theta: number;
  /** Height of the arc above the chord at its middle. */
  rise: number;
}

export type ChordArcResult = { ok: true; value: ChordArc } | { ok: false; error: string };

export function chordArc(chord: number, arcLength: number): ChordArcResult {
  if (!(Number.isFinite(chord) && chord > 0)) return { ok: false, error: 'chord must be a positive number' };
  if (!(Number.isFinite(arcLength) && arcLength > chord)) return { ok: false, error: 'the arc must be longer than its chord' };
  if (arcLength > (Math.PI / 2) * chord + 1e-9) return { ok: false, error: 'an arc longer than a semicircle on this chord cannot stand on it' };
  const target = chord / arcLength;
  const f = (t: number) => Math.sin(t / 2) / (t / 2);
  let lo = 1e-9, hi = Math.PI;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (f(mid) > target) lo = mid; else hi = mid; }
  const theta = (lo + hi) / 2;
  const radius = arcLength / theta;
  return { ok: true, value: { chord, arcLength, radius, theta, rise: radius * (1 - Math.cos(theta / 2)) } };
}

/** n + 1 points along the arc from (0, 0) to (chord, 0), bulging to −y. */
export function chordArcPoints(a: ChordArc, n = 24): Point[] {
  const cx = a.chord / 2, cy = a.radius * Math.cos(a.theta / 2);
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const phi = -a.theta / 2 + (a.theta * i) / n;
    pts.push({ x: cx - a.radius * Math.sin(-phi), y: cy - a.radius * Math.cos(phi) });
  }
  pts[0] = { x: 0, y: 0 };
  pts[n] = { x: a.chord, y: 0 };
  return pts;
}
