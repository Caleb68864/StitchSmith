/**
 * Drafting engine, step 3 (roadmap 10f): the sleeve block.
 *
 * A one-piece set-in sleeve whose cap is solved against the bodice's
 * armhole: the cap height is found by bisection so that each half of the
 * cap curve measures its armhole (back half to the back armhole, front to
 * the front) plus half the cap ease. The cap is an S-curve: a cubic that
 * leaves the cap top level and arrives at the underarm level. The bicep
 * line is the eased bicep wide; the sleeve runs the arm length from the cap
 * top to the wrist, the eased wrist wide; both underseams are the same line,
 * so they match.
 *
 * Frame: x across the sleeve (0 at the centre line, back half at −x, front
 * at +x), y down from the cap top. Lengths in mm.
 */
import type { Point } from '../graph/Point.js';
import type { Measurements } from './measurements.js';
import type { BodiceBlock } from './bodice.js';
import { polylineLength } from './bodice.js';

export interface SleeveOptions {
  /** Extra cap length over the armhole, mm, shared between the halves. Default 0 (a shirt-style cap). */
  capEase?: number;
  samples?: number;
}

export interface SleeveBlock {
  outline: Point[];
  /** Cap halves from the top to each underarm point: back (−x), front (+x). */
  capBack: Point[];
  capFront: Point[];
  underseamBack: [Point, Point];
  underseamFront: [Point, Point];
  capHeight: number;
  bicep: number;
  wrist: number;
  length: number;
  lengths: { capBack: number; capFront: number; underseam: number };
}

export type SleeveResult = { ok: true; value: SleeveBlock } | { ok: false; error: string };

function sCurve(half: number, h: number, n: number, sign: 1 | -1): Point[] {
  // Top (0, 0) leaving level, underarm (sign·half, h) arriving level; controls at mid-height.
  const p0 = { x: 0, y: 0 }, p1 = { x: sign * half * 0.5, y: 0 }, p2 = { x: sign * half * 0.5, y: h }, p3 = { x: sign * half, y: h };
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y };
  });
}

/** Cap height giving a half cap of `target` length over half the bicep. */
function solveCap(half: number, target: number, n: number): number | null {
  if (!(target > half)) return null;
  let lo = 0, hi = 4 * target;
  if (polylineLength(sCurve(half, hi, n, 1)) < target) return null;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (polylineLength(sCurve(half, mid, n, 1)) < target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

export function draftSleeve(m: Measurements, bodice: BodiceBlock, opt: SleeveOptions = {}): SleeveResult {
  const n = opt.samples ?? 64;
  const ease = opt.capEase ?? 0;
  if (!Number.isFinite(ease)) return { ok: false, error: 'cap ease must be a number' };
  const B = m.eased.bicep, Wr = m.eased.wrist, len = m.eased.arm_length;
  const half = B / 2;
  // The bodice halves share one armhole curve, so one cap height serves both cap halves.
  const [ab, af] = bodice.lengths.armhole;
  const hb = solveCap(half, ab + ease / 2, n), hf = solveCap(half, af + ease / 2, n);
  if (hb === null || hf === null) return { ok: false, error: 'the bicep is too wide for the armhole: the cap cannot reach it' };
  const h = Math.max(hb, hf);
  if (h >= len) return { ok: false, error: 'the cap is deeper than the arm is long' };
  if (Wr >= B) return { ok: false, error: 'the wrist must be narrower than the bicep' };
  const capBack = sCurve(half, hb, n, -1), capFront = sCurve(half, hf, n, 1);
  const ub: [Point, Point] = [capBack[n], { x: -Wr / 2, y: len }], uf: [Point, Point] = [capFront[n], { x: Wr / 2, y: len }];
  const outline = [...[...capBack].reverse(), ...capFront.slice(1), uf[1], ub[1]];
  return {
    ok: true,
    value: {
      outline, capBack, capFront, underseamBack: ub, underseamFront: uf, capHeight: h, bicep: B, wrist: Wr, length: len,
      lengths: { capBack: polylineLength(capBack), capFront: polylineLength(capFront), underseam: Math.hypot(uf[1].x - uf[0].x, uf[1].y - uf[0].y) },
    },
  };
}
