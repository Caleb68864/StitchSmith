/**
 * 3D check of the wind shirt: back and front hung on a torso built from the
 * measurements, with arms (`armForms`, held out 45° so the side seams pass
 * under them rather than through them), the shoulder and side seams closed
 * round it. The sleeves are not assembled yet (a sleeve set into an armhole
 * needs a tube placement along a sloping arm; recorded in the roadmap), so
 * the armholes stay open round the arms.
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
import { BACK_ID, FRONT_ID } from './buildPattern.js';
import { draftShirt, runs, type Outline } from './draft.js';

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
  const girth = 4 * d.bodice.widths.chest;
  const report = [
    `Body on a torso of your ${fmtIn(r.measurements.chest)}" chest: the shirt is ${fmtIn(girth)}" round at the chest, ${fmtIn(girth - r.measurements.chest)}" of ease; shoulder and side seams closed.`,
    'Sleeves are not assembled in this check yet; the armholes stay open round the arms.',
  ];
  return { pieces: [back, front], placements, seams, pins, solids: [...form.solids, ...arms.solids], gravity: [0, -0.01, 0], torso, report };
}
