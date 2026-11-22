/**
 * Drafting engine, step 2 (roadmap 10f): the bodice block.
 *
 * A half back and a half front (each cut on the fold at its centre line),
 * drafted from the eased measurements alone. Geometry choices, not a named
 * drafting system (none is sourced): each is stated here and in decisions.md.
 *
 * Frame per half: x from the centre line (CB or CF) out to the side seam,
 * y down from the shoulder-neck level (y = 0).
 *
 * - Chest line at the scye depth; each half is a quarter of the eased chest
 *   wide there, so back + front = half the body (the side seam sits under
 *   the arm). Waist and hip lines at a quarter of their eased girths.
 * - Neck: the side neck point sits at the neck's radius (neck / 2π) from the
 *   centre line. The back neckline is a quarter ellipse down `backNeckDepth`
 *   (a fraction of that radius, default 1/4); the front neckline's depth is
 *   SOLVED so back + front measure half the eased neck: the collar seam is
 *   right by construction.
 * - Shoulder: neck point to the shoulder point at half the shoulder width,
 *   dropped by `shoulderDrop` (the garment supplies it, flagged). Front and
 *   back shoulders are the same line, so the shoulder seam matches.
 * - Armhole: a cubic from the shoulder point (leaving square to the
 *   shoulder) to the underarm point (arriving level), the same on both
 *   halves. Its length is what the sleeve cap is solved against (step 3).
 * - Side seam: underarm → waist → hip, the same on both halves.
 *
 * Lengths in mm.
 */
import type { Point } from '../graph/Point.js';
import type { Measurements } from './measurements.js';

export interface BodiceOptions {
  /** How far the shoulder point sits below the neck point, mm. Required: no default slope is sourced. */
  shoulderDrop: number;
  /** Back neck depth as a fraction of the neck radius. Default 1/4. */
  backNeckDepthRatio?: number;
  /** Samples per curve. Default 64. */
  samples?: number;
}

export interface BodiceHalf {
  /** Closed finished outline: CB/CF top → neck → shoulder → armhole → side → hem → back up the centre line. */
  outline: Point[];
  neck: Point[];
  shoulder: [Point, Point];
  armhole: Point[];
  side: Point[];
  /** The centre (fold) line, top to bottom. */
  centre: [Point, Point];
  neckDepth: number;
}

export interface BodiceBlock {
  back: BodiceHalf;
  front: BodiceHalf;
  /** Seam lengths, back and front, mm. */
  lengths: { neck: [number, number]; shoulder: [number, number]; armhole: [number, number]; side: [number, number] };
  /** Widths at the chest, waist and hip lines (each half). */
  widths: { chest: number; waist: number; hip: number };
  /** y of the chest (underarm), waist and hip lines. */
  lines: { chest: number; waist: number; hip: number };
}

export type BodiceResult = { ok: true; value: BodiceBlock } | { ok: false; error: string };

export function polylineLength(p: Point[]): number {
  let s = 0;
  for (let i = 1; i < p.length; i++) s += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
  return s;
}

/** Quarter ellipse from the centre line (0, depth) to the neck point (w, 0). */
function neckCurve(w: number, depth: number, n: number): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => { const t = (i / n) * (Math.PI / 2); return { x: w * Math.sin(t), y: depth * Math.cos(t) }; });
}

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, n: number): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
  });
}

export function draftBodice(m: Measurements, opt: BodiceOptions): BodiceResult {
  const n = opt.samples ?? 64;
  const e = m.eased;
  if (!(Number.isFinite(opt.shoulderDrop) && opt.shoulderDrop >= 0)) return { ok: false, error: 'shoulder drop must be 0 or more' };
  const W = e.chest / 4, Ww = e.waist / 4, Wh = e.hip / 4;
  const yChest = e.scye_depth, yWaist = e.nape_to_waist, yHip = e.nape_to_waist + e.waist_to_hip;
  const rho = e.neck / (2 * Math.PI);
  const sx = e.shoulder_width / 2, sy = opt.shoulderDrop;
  if (sx <= rho) return { ok: false, error: 'the shoulder width does not reach past the neck' };
  if (sx >= W) return { ok: false, error: 'the shoulder point is outside the chest width: the armhole would turn back on itself' };
  if (sy >= yChest) return { ok: false, error: 'the shoulder drop reaches the chest line' };
  const backDepth = (opt.backNeckDepthRatio ?? 0.25) * rho;
  const back = neckCurve(rho, backDepth, n);
  const target = e.neck / 2 - polylineLength(back);
  if (!(target > rho)) return { ok: false, error: 'the neck is too small for its own width' };
  // Solve the front depth so the front neckline is `target` long (arc length grows with depth).
  let lo = 0, hi = 10 * rho;
  if (polylineLength(neckCurve(rho, hi, n)) < target) return { ok: false, error: 'cannot fit the front neckline' };
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (polylineLength(neckCurve(rho, mid, n)) < target) lo = mid; else hi = mid; }
  const frontDepth = (lo + hi) / 2;
  if (frontDepth >= yChest) return { ok: false, error: 'the front neckline reaches the chest line' };

  const sp = { x: sx, y: sy }, np = { x: rho, y: 0 }, ua = { x: W, y: yChest };
  // Leave the shoulder square to it, arrive at the underarm level; control lengths a third of the way.
  const sh = { x: sx - rho, y: sy }, L = Math.hypot(sh.x, sh.y);
  const perp = { x: sh.y / L, y: -sh.x / L }; // square to the shoulder, turned toward the armhole (down)
  const down = perp.y < 0 ? { x: -perp.x, y: -perp.y } : perp;
  const k = (yChest - sy) / 3;
  const armhole = cubic(sp, { x: sp.x + down.x * k, y: sp.y + down.y * k }, { x: W - (W - sx) * 0.6, y: yChest }, ua, n);
  const side = [ua, { x: Ww, y: yWaist }, { x: Wh, y: yHip }];
  const half = (neckDepth: number, neck: Point[]): BodiceHalf => ({
    outline: [{ x: 0, y: neckDepth }, ...neck.slice(1), sp, ...armhole.slice(1), ...side.slice(1), { x: 0, y: yHip }],
    neck, shoulder: [np, sp], armhole, side, centre: [{ x: 0, y: neckDepth }, { x: 0, y: yHip }], neckDepth,
  });
  const b = half(backDepth, back), f = half(frontDepth, neckCurve(rho, frontDepth, n));
  return {
    ok: true,
    value: {
      back: b, front: f,
      lengths: {
        neck: [polylineLength(b.neck), polylineLength(f.neck)],
        shoulder: [L, L],
        armhole: [polylineLength(b.armhole), polylineLength(f.armhole)],
        side: [polylineLength(b.side), polylineLength(f.side)],
      },
      widths: { chest: W, waist: Ww, hip: Wh },
      lines: { chest: yChest, waist: yWaist, hip: yHip },
    },
  };
}
