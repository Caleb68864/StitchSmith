/**
 * 3D fit check for the modular LBV: the two front panels on the chest either
 * side of the closure, the back panel on the back, the shoulder pads draped
 * over a medium torso and the four verticals running from the panel marks up
 * over the shoulders to the pads. Panels are held rigid (foam-stiffened
 * pockets); the pads and verticals are cloth. The report says whether the
 * 24" verticals reach the tension locks with the stated drop to spare and
 * whether the torso lies inside the strap fit range.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import { mirrorPieceX, pointAlongPath, type PiecePlacement } from '../../lib/fold-engine/index.js';
import { torsoForm, TORSO_MEDIUM, type SeamSpec, type TorsoSpec, type Vec3, type PinSpec } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs } from './types.js';
import { FRONT_OUTER_ID, BACK_OUTER_ID, PAD_ID, VERTICAL_ID } from './buildPattern.js';

const IN = 25.4;
export const FRONT_RIGHT_ID = `${FRONT_OUTER_ID}-right`;
export const PAD_LEFT_ID = `${PAD_ID}-left`;
export const VERTICAL_IDS = { frontLeft: `${VERTICAL_ID}-front-left`, frontRight: `${VERTICAL_ID}-front-right`, backLeft: `${VERTICAL_ID}-back-left`, backRight: `${VERTICAL_ID}-back-right` } as const;
/** Gap between the two front panels at the closure (strap-joined, not sewn). */
export const CLOSURE_GAP_MM = 2 * IN;
/** How far below the shoulder line the panel tops hang. */
export const PANEL_DROP_MM = 40;
/** The vertical's sewn landing down the panel face from the top. */
export const LANDING_MM = 1.5 * IN;

export interface LbvAssembly {
  pieces: Piece[];
  object: { shape: 'torso'; width: number; depth: number; height: number; torso: { shoulderWidth: number; neckRadius: number }; at: Vec3; label: string };
  placements: Record<string, PiecePlacement>;
  pins: PinSpec[];
  seams: SeamSpec[];
  report: string[];
  fit: { reachToLock: number; dropAvailable: number; dropOk: boolean; chestCircumference: number; chestOk: boolean };
}

/**
 * Polyline over one shoulder: from `startY` at lateral `xStart` on one face, kicking out to `x` by the
 * shoulder line ("they kick out to where they need to be"), over the capsule, and down the other face.
 */
function overShoulder(spec: TorsoSpec, x: number, startY: number, fromFront: boolean, clearance: number, xStart = x): Vec3[] {
  const form = torsoForm(spec);
  const rr = form.shoulderRadius + clearance;
  const top = form.chestTop;
  const near = fromFront ? form.frontZ + clearance : form.backZ - clearance;
  const far = fromFront ? form.backZ - clearance : form.frontZ + clearance;
  const pts: Vec3[] = [[xStart, startY, near], [x, top - 40, near]];
  for (let k = 0; k <= 12; k++) {
    const a = (Math.PI * k) / 12; // 0 = near side, π = far side
    const z = fromFront ? rr * Math.cos(a) : -rr * Math.cos(a);
    pts.push([x, top + rr * Math.sin(a), z]);
  }
  pts.push([x, top - 40, far], [x, 0, far]);
  return pts;
}
function pathLength(path: Vec3[]): number {
  let s = 0;
  for (let i = 1; i < path.length; i++) s += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]);
  return s;
}
/** Trim a polyline to start `s` mm along it. */
function pathFrom(path: Vec3[], s: number): Vec3[] {
  const out: Vec3[] = [pointAlongPath(path, s).p];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const len = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]);
    acc += len;
    if (acc > s) out.push(path[i]);
  }
  return out;
}

export function lbvAssembly(pieces: Piece[], r: ResolvedInputs, torso: TorsoSpec = TORSO_MEDIUM): LbvAssembly | null {
  const front = pieces.find((p) => p.id === FRONT_OUTER_ID);
  const back = pieces.find((p) => p.id === BACK_OUTER_ID);
  const pad = pieces.find((p) => p.id === PAD_ID);
  const vertical = pieces.find((p) => p.id === VERTICAL_ID);
  if (!front || !back || !pad || !vertical) return null;
  const form = torsoForm(torso);
  const W = r.panel_width;
  const Wb = r.back_outer_width, Hb = r.back_outer_height;
  const panelTopY = form.chestTop - PANEL_DROP_MM;
  // Flat (x, y) → world (x + dx, −(y + dy), dz).
  const frontRight = mirrorPieceX(front, FRONT_RIGHT_ID, `${front.name} (right)`);
  const padLeft = mirrorPieceX(pad, PAD_LEFT_ID, `${pad.name} (left)`);
  const vClone = (id: string, name: string): Piece => ({ ...vertical, id, name, quantity: 1, mirror: false });
  const vFL = vClone(VERTICAL_IDS.frontLeft, 'Vertical, front left');
  const vFR = vClone(VERTICAL_IDS.frontRight, 'Vertical, front right');
  const vBL = vClone(VERTICAL_IDS.backLeft, 'Vertical, back left');
  const vBR = vClone(VERTICAL_IDS.backRight, 'Vertical, back right');
  const placements: Record<string, PiecePlacement> = {
    [FRONT_OUTER_ID]: { keep: true, dx: -(CLOSURE_GAP_MM / 2 + W), dy: -panelTopY, dz: form.frontZ + 4 },
    [FRONT_RIGHT_ID]: { keep: true, dx: CLOSURE_GAP_MM / 2, dy: -panelTopY, dz: form.frontZ + 4 },
    [BACK_OUTER_ID]: { keep: true, dx: -Wb / 2, dy: -panelTopY, dz: form.backZ - 4 },
  };
  const pins: PinSpec[] = [
    // Hold the front panels by their top strip only (the verticals' landing), so the rest
    // settles onto the rounded chest instead of floating flat in front of it.
    { pieceId: FRONT_OUTER_ID, rect: { x0: 0, y0: 0, x1: W, y1: 12 } },
    { pieceId: FRONT_RIGHT_ID, rect: { x0: 0, y0: 0, x1: W, y1: 12 } },
    { pieceId: BACK_OUTER_ID, rect: { x0: 0, y0: 0, x1: Wb, y1: Hb } },
  ];
  // Shoulder pads centred over the crest. The path from the back at chestTop−40: 40 mm up, then a 90° arc to the crest.
  const rrPad = form.shoulderRadius + 2;
  const crestS = 40 + (Math.PI / 2) * rrPad;
  const padStartS = Math.max(0, crestS - r.pad_length / 2);
  for (const [id, side] of [[PAD_ID, 'right'], [PAD_LEFT_ID, 'left']] as const) {
    const x = side === 'right' ? form.shoulderTop.right[0] : form.shoulderTop.left[0];
    const path = pathFrom(overShoulder(torso, x, form.chestTop - 40, false, 2), padStartS);
    placements[id] = { keep: true, drape: { path, across: [1, 0, 0], x0: r.pad_width / 2 } };
    pins.push({ pieceId: id, point: { x: r.pad_width / 2, y: 0 }, radius: r.pad_width }, { pieceId: id, point: { x: r.pad_width / 2, y: r.pad_length }, radius: r.pad_width });
  }
  // Verticals: from each front panel's mark (from its outer edge) straight up and over; from the back panel's outer column lines likewise.
  const xFrontL = -(CLOSURE_GAP_MM / 2 + W) + r.vertical_mark;
  const xFrontR = CLOSURE_GAP_MM / 2 + W - r.vertical_mark;
  const backCols = Math.max(1, r.back_cols);
  const backSpread = backCols * 1.5 * IN;
  const xBackL = -backSpread / 2, xBackR = backSpread / 2;
  const vw = r.vertical_width;
  const seams: SeamSpec[] = [];
  /** The vertical is sewn down the top `LANDING_MM` of the panel: its flat y = 0 sits that far below the panel top. */
  const startY = panelTopY - LANDING_MM;
  // Arc length from the landing to the crest: the first two segments plus the near-side quarter of the arc (k = 0..6).
  const xPadL = form.shoulderTop.left[0], xPadR = form.shoulderTop.right[0];
  const reach = pathLength(overShoulder(torso, xPadL, startY, true, 6, xFrontL).slice(0, 9));
  const verticals: Array<[string, number, number, boolean, string, number]> = [
    [VERTICAL_IDS.frontLeft, xFrontL, xPadL, true, FRONT_OUTER_ID, r.vertical_mark],
    [VERTICAL_IDS.frontRight, xFrontR, xPadR, true, FRONT_RIGHT_ID, W - r.vertical_mark],
    [VERTICAL_IDS.backLeft, xBackL, xPadL, false, BACK_OUTER_ID, Wb / 2 - backSpread / 2],
    [VERTICAL_IDS.backRight, xBackR, xPadR, false, BACK_OUTER_ID, Wb / 2 + backSpread / 2],
  ];
  for (const [id, xStart, x, fromFront, hostId, hostX] of verticals) {
    const path = overShoulder(torso, x, startY, fromFront, 6, xStart);
    // The strip is drawn long in x: flat x is arc length from the bottom of the landing, up the panel and over the shoulder; flat y runs across.
    placements[id] = { keep: true, drape: { path, across: [1, 0, 0], x0: vw / 2, along: 'x' } };
    // Hold the strap where it crests the shoulder; the seam holds the panel end.
    pins.push({ pieceId: id, rect: { x0: reach - 40, y0: 0, x1: reach + 40, y1: vw } });
    seams.push({ label: `${id.slice(VERTICAL_ID.length + 1)} ↔ panel`, a: { pieceId: id, from: { x: 0, y: vw / 2 }, to: { x: LANDING_MM, y: vw / 2 } }, b: { pieceId: hostId, from: { x: hostX, y: LANDING_MM }, to: { x: hostX, y: 0 } }, gap: 2.5 });
  }
  // Fit.
  const dropAvailable = r.usable_adjustment - reach;
  const dropOk = dropAvailable >= r.drop_adjust;
  const chestCircumference = 2 * (torso.chestWidth + torso.chestDepth) * 0.92;
  const chestOk = chestCircumference >= r.fit_min_chest && chestCircumference <= r.fit_max_chest;
  const report = [
    `With the panels at their highest (tops ${Math.round(PANEL_DROP_MM)} mm below the shoulder line) a vertical needs ${Math.round(reach)} mm to reach the tension lock, leaving ${Math.round(dropAvailable)} mm of its ${Math.round(r.usable_adjustment)} mm usable — ${dropOk ? 'funds' : 'does NOT fund'} the ${Math.round(r.drop_adjust)} mm drop.`,
    `This torso is about ${Math.round(chestCircumference)} mm round the chest; the straps fit ${Math.round(r.fit_min_chest)}–${Math.round(r.fit_max_chest)} mm${chestOk ? '.' : ' — outside the range: move the locks outboard, lengthen the front straps, or cut bigger panels.'}`,
  ];
  const body: Piece[] = [front, frontRight, back, pad, padLeft, vFL, vFR, vBL, vBR];
  return {
    pieces: [...body, ...pieces.filter((p) => p.id !== FRONT_OUTER_ID && p.id !== BACK_OUTER_ID && p.id !== PAD_ID && p.id !== VERTICAL_ID)],
    object: { shape: 'torso', width: torso.chestWidth, depth: torso.chestDepth, height: torso.torsoLength, torso: { shoulderWidth: torso.shoulderWidth, neckRadius: torso.neckRadius }, at: [0, 0, 0], label: 'torso' },
    placements,
    pins,
    seams,
    report,
    fit: { reachToLock: reach, dropAvailable, dropOk, chestCircumference, chestOk },
  };
}
