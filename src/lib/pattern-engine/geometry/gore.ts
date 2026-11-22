/**
 * Gores of a dome: the flat development of a crown made of N equal panels
 * (a beanie, a hood top, a cap). The dome is half an ellipsoid of revolution
 * with base circumference C and height H; each gore is the strip between two
 * meridians. Up the gore's centre line, distance s is the meridian's arc
 * length from the base, and the gore's width there is the ring's
 * circumference at that height divided by N — so N gores sewn edge to edge
 * rebuild the dome to first order (the classic gore approximation).
 *
 * Lengths in mm.
 */
export interface GoreSample { s: number; half: number }

export interface Gores {
  circumference: number;
  height: number;
  count: number;
  /** Base (s = 0) to apex, along the centre line. */
  length: number;
  /** From the base to the apex. */
  samples: GoreSample[];
}

export type GoresResult = { ok: true; value: Gores } | { ok: false; error: string };

export function domeGores(circumference: number, height: number, count: number, n = 48): GoresResult {
  if (!(Number.isFinite(circumference) && circumference > 0)) return { ok: false, error: 'circumference must be positive' };
  if (!(Number.isFinite(height) && height > 0)) return { ok: false, error: 'height must be positive' };
  if (!(Number.isInteger(count) && count >= 2)) return { ok: false, error: 'a dome needs at least two gores' };
  const a = circumference / (2 * Math.PI);
  // Meridian (a cos t, H sin t), t from 0 (base) to π/2 (apex); integrate its arc length with Simpson steps.
  const speed = (t: number) => Math.hypot(a * Math.sin(t), height * Math.cos(t));
  const samples: GoreSample[] = [{ s: 0, half: (Math.PI * a) / count }];
  let s = 0;
  for (let i = 1; i <= n; i++) {
    const t0 = ((i - 1) / n) * (Math.PI / 2), t1 = (i / n) * (Math.PI / 2);
    s += ((t1 - t0) / 6) * (speed(t0) + 4 * speed((t0 + t1) / 2) + speed(t1));
    samples.push({ s, half: i === n ? 0 : (Math.PI * a * Math.cos(t1)) / count });
  }
  return { ok: true, value: { circumference, height, count, length: s, samples } };
}
