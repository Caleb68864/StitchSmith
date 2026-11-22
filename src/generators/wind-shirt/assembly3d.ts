/**
 * 3D check of the wind shirt: back and front hung on a torso built from the
 * measurements, with arms (`armForms`, held out 45° so the side seams pass
 * under them rather than through them), the shoulder and side seams closed
 * round it, and each sleeve wrapped on a cone along its arm (the cone
 * placement's `axis`) with its cap seamed into the armhole and its underseam
 * closed.
 *
 * Torso from the measurements: the chest girth as an ellipse 1.4 times as
 * wide as deep (Ramanujan's perimeter), the nape-to-waist length, the
 * shoulder width and the neck radius. A check of the body only, not a fit
 * prediction.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { PiecePlacement } from '../../lib/fold-engine/index.js';
import { torsoForm, armForms, type PinSpec, type SeamSpec, type Solid, type TorsoSpec, type Vec3 } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs } from './types.js';
import { BACK_ID, FRONT_ID, SLEEVE_ID } from './buildPattern.js';
import { conePoint } from '../../lib/fold-engine/index.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import { draftShirt, runs, type Outline } from './draft.js';

export const SLEEVE_RIGHT_ID = 'shirt-sleeve-right';
export const SLEEVE_LEFT_ID = 'shirt-sleeve-left';

export interface WindShirtAssembly {
  pieces: Piece[];
  placements: Record<string, PiecePlacement>;
  seams: SeamSpec[];
  /** No pins: the torso and arms carry the shirt. The page passes `holdHost={false}` so the viewer does not hold the back flat either. */
  pins: PinSpec[];
  solids: Solid[];
  gravity: Vec3;
  torso: TorsoSpec;
  report: string[];
}

const IN = 25.4;
const fmtIn = (mm: number) => (mm / IN).toFixed(1);
/** Clearance off the form, mm. */
const C = 6;

/** Width and depth of an ellipse 1.4:1 with this perimeter (Ramanujan). */
function ellipseOf(perimeter: number): { w: number; d: number } {
  const k = 1.4;
  // P(b) for a = k·b; solve linearly (P is proportional to b).
  const p1 = Math.PI * (3 * (k + 1) - Math.sqrt((3 * k + 1) * (k + 3)));
  const b = perimeter / p1;
  return { w: 2 * k * b, d: 2 * b };
}

export function torsoFromMeasurements(r: ResolvedInputs): TorsoSpec {
  const m = r.measurements;
  const e = ellipseOf(m.chest);
  return { chestWidth: e.w, chestDepth: e.d, torsoLength: m.nape_to_waist, shoulderWidth: m.shoulder_width, neckRadius: m.neck / (2 * Math.PI) };
}

export function windShirtAssembly(pieces: Piece[], r: ResolvedInputs): WindShirtAssembly | null {
  const back = pieces.find((p) => p.id === BACK_ID), front = pieces.find((p) => p.id === FRONT_ID);
  if (!back || !front) return null;
  const dr = draftShirt(r);
  if (!dr.ok) return null;
  const d = dr.value;
  const torso = torsoFromMeasurements(r);
  const form = torsoForm(torso);
  const arms = armForms(torso, { radius: r.measurements.bicep / (2 * Math.PI), length: r.measurements.arm_length, abductionDeg: 45 });
  // Each piece's neck points (the top of its shoulder runs) go to the top of the shoulder.
  const place = (o: Outline, z: number): PiecePlacement => {
    const sh = runs(o, 'shoulder');
    const neckY = Math.min(...sh.flat().map((p) => p.y));
    const cx = (Math.min(...o.finished.map((p) => p.x)) + Math.max(...o.finished.map((p) => p.x))) / 2;
    return { keep: true, dx: -cx, dy: -(form.topY + neckY), dz: z };
  };
  const placements: Record<string, PiecePlacement> = {
    [BACK_ID]: place(d.back, form.backZ - C),
    [FRONT_ID]: place(d.front, form.frontZ + C),
  };
  const pins: PinSpec[] = [];
  const seams: SeamSpec[] = [];
  for (const tag of ['shoulder', 'side'] as const) {
    const rb = runs(d.back, tag), rf = runs(d.front, tag);
    rb.forEach((run, i) => {
      for (let k = 1; k < run.length; k++) {
        seams.push({ label: `${tag} ${i + 1}.${k}`, a: { pieceId: BACK_ID, from: run[k - 1], to: run[k] }, b: { pieceId: FRONT_ID, from: rf[i][k - 1], to: rf[i][k] } });
      }
    });
  }
  // Sleeves: each the frustum between its underseams wrapped on a cone along its arm (apex past
  // the wrist, axis toward the shoulder), the underseam on the underside, the cap seamed into
  // the armhole half by half and the underseam closed.
  const sleeve = pieces.find((p) => p.id === SLEEVE_ID);
  const out: Piece[] = [back, front];
  if (sleeve) {
    const sv = d.sleeve, o = d.sleevePiece;
    const off = { x: o.finished[0].x - sv.capBack[sv.capBack.length - 1].x, y: o.finished[0].y - sv.capBack[sv.capBack.length - 1].y };
    const fl = (p: Point): Point => ({ x: p.x + off.x, y: p.y + off.y });
    const B = sv.bicep, Wr = sv.wrist, hU = sv.underseamFront[0].y, len = sv.length;
    const yApex = hU + ((len - hU) * B) / (B - Wr);
    const phi = 2 * Math.atan2((B - Wr) / 2, len - hU);
    const halfAngle = Math.asin(Math.min(1, phi / (2 * Math.PI)));
    const angleScale = (2 * Math.PI) / phi;
    const apex = fl({ x: 0, y: yApex });
    const rWrist = Math.hypot(Wr / 2, yApex - len);
    const cap = runs(o, 'cap')[0];
    const nHalf = (cap.length - 1) / 2;
    // cap[0..nHalf] runs from the −x underarm to the top; cap[nHalf..] from the top to the +x underarm.
    const minusTopDown = cap.slice(0, nHalf + 1).reverse(), plusTopDown = cap.slice(nHalf);
    const under = runs(o, 'underseam');
    const ab = runs(d.back, 'armhole'), af = runs(d.front, 'armhole');
    // runs[0] is the +x armhole (shoulder → underarm); runs[1] the −x one (underarm → shoulder).
    const topDown = (rr: Point[][], side: 0 | 1) => (side === 0 ? rr[0] : [...rr[1]].reverse());
    const pair = (label: string, aId: string, A: Point[], bId: string, Bp: Point[]) => {
      const k = Math.min(A.length, Bp.length) - 1;
      for (let i = 1; i <= k; i++) {
        const ia = Math.round((i * (A.length - 1)) / k), ja = Math.round(((i - 1) * (A.length - 1)) / k);
        const ib = Math.round((i * (Bp.length - 1)) / k), jb = Math.round(((i - 1) * (Bp.length - 1)) / k);
        seams.push({ label: `${label} ${i}`, a: { pieceId: aId, from: A[ja], to: A[ia] }, b: { pieceId: bId, from: Bp[jb], to: Bp[ib] } });
      }
    };
    for (const [id, armSide, bodySide] of [[SLEEVE_RIGHT_ID, arms.right, 0], [SLEEVE_LEFT_ID, arms.left, 1]] as const) {
      const S = armSide.shoulder, Wt = armSide.wrist;
      const L = Math.hypot(S[0] - Wt[0], S[1] - Wt[1], S[2] - Wt[2]);
      const axis: Vec3 = [(S[0] - Wt[0]) / L, (S[1] - Wt[1]) / L, (S[2] - Wt[2]) / L];
      const hW = rWrist * Math.cos(halfAngle);
      const apex3: Vec3 = [Wt[0] - axis[0] * hW, Wt[1] - axis[1] * hW, Wt[2] - axis[2] * hW];
      // Angle 0 (the cap top) points up off the arm; the underseams (flat ±φ/2 about −90°) land opposite.
      const cone = { apex, apex3, halfAngle, angleScale, angle0: (Math.PI / 2) * angleScale, axis, ref: [0, 1, 0] as Vec3 };
      placements[id] = { keep: true, cone };
      out.push({ ...sleeve, id, name: id === SLEEVE_RIGHT_ID ? 'Sleeve (right)' : 'Sleeve (left)', quantity: 1 });
      // Which flat side faces the front on this arm decides which cap half meets which armhole.
      const probe = conePoint(cone, plusTopDown[Math.floor(plusTopDown.length / 2)]);
      const plusFront = probe[2] > 0;
      pair(`${id} cap front`, id, plusFront ? plusTopDown : minusTopDown, FRONT_ID, topDown(af, bodySide));
      pair(`${id} cap back`, id, plusFront ? minusTopDown : plusTopDown, BACK_ID, topDown(ab, bodySide));
      // Underseam: the +x run (underarm → wrist) to the −x run reversed (underarm → wrist).
      const plusU = under.find((u) => u[0].x > apex.x) ?? under[0], minusU = under.find((u) => u !== plusU)!;
      pair(`${id} underseam`, id, plusU, id, [...minusU].reverse());
    }
  }
  const girth = 4 * d.bodice.widths.chest;
  const report = [
    `Body on a torso of your ${fmtIn(r.measurements.chest)}" chest: the shirt is ${fmtIn(girth)}" round at the chest, ${fmtIn(girth - r.measurements.chest)}" of ease; shoulder and side seams closed.`,
    sleeve ? `Sleeves wrapped round the arms (held out 45°) and set into the armholes; each cap is ${fmtIn(d.seams.cap - d.seams.armhole)}" longer than its armhole, eased in.` : 'No sleeve piece: the armholes stay open round the arms.',
  ];
  return { pieces: out, placements, seams, pins, solids: [...form.solids, ...arms.solids], gravity: [0, -0.01, 0], torso, report };
}
