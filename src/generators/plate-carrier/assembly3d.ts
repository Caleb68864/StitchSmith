/**
 * 3D fit check for the plate carrier: front and back shells hung on a medium
 * torso at the plate's ride height, two shoulder straps draped over the
 * shoulders and seamed to both panel tops, the cummerbund draped round each
 * side from the back panel edge to the front. The straps and cummerbund are
 * pinned at their ends where the drape puts them, so a strap span or a
 * cummerbund length that does not match this torso shows as a seam gap, and
 * the report states the required lengths in words.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { PiecePlacement } from '../../lib/fold-engine/index.js';
import { shoulderPath, torsoForm, TORSO_MEDIUM, type PinSpec, type SeamSpec, type TorsoSpec, type Vec3 } from '../../lib/cloth-engine/index.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { ResolvedInputs } from './types.js';
import { FRONT_SHELL_ID, BACK_SHELL_ID } from './buildPattern.js';

export const STRAP_LEFT_ID = 'pc-strap-display-left';
export const STRAP_RIGHT_ID = 'pc-strap-display-right';
export const CB_LEFT_ID = 'pc-cummerbund-display-left';
export const CB_RIGHT_ID = 'pc-cummerbund-display-right';

export interface PlateCarrierAssembly {
  pieces: Piece[];
  object: { shape: 'torso'; width: number; depth: number; height: number; torso: { shoulderWidth: number; neckRadius: number }; at: Vec3; label: string };
  placements: Record<string, PiecePlacement>;
  pins: PinSpec[];
  seams: SeamSpec[];
  /** Plain-language fit findings against this torso. */
  report: string[];
  fit: { strapRequired: number; strapMin: number; strapMax: number; strapOk: boolean; cummerbundRequired: number; cummerbundSpan: number; cummerbundOk: boolean; plateBottomAboveWaist: number };
}

const IN = 25.4;
const fmtIn = (mm: number) => (mm / IN).toFixed(1);

function pathLength(path: Vec3[]): number {
  let s = 0;
  for (let i = 1; i < path.length; i++) s += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]);
  return s;
}

function rectPiece(id: string, name: string, w: number, h: number, materialId: string): Piece {
  const eid = makeEdgeIdGen(id);
  const e = (sx: number, sy: number, ex: number, ey: number) => ({ kind: 'straight' as const, id: eid(), role: 'cut' as const, start: { x: sx, y: sy }, end: { x: ex, y: ey } });
  const outline = { id: `${id}-outline`, closed: true, edges: [e(0, 0, w, 0), e(w, 0, w, h), e(w, h, 0, h), e(0, h, 0, 0)] };
  const sa: Record<string, number> = {};
  for (const ed of outline.edges) sa[ed.id] = 0;
  return { id, name, mirror: false, quantity: 1, materialId, paths: [outline], seamAllowances: sa };
}

export function plateCarrierAssembly(pieces: Piece[], r: ResolvedInputs, torso: TorsoSpec = TORSO_MEDIUM): PlateCarrierAssembly | null {
  const front = pieces.find((p) => p.id === FRONT_SHELL_ID);
  const back = pieces.find((p) => p.id === BACK_SHELL_ID);
  if (!front || !back) return null;
  const origin: Vec3 = [0, 0, 0];
  const form = torsoForm(torso, origin);
  const W = r.panel_width, H = r.panel_height;
  const c = 2;
  // Plate top two finger widths (~40 mm) below the base of the neck; the chest block's top is the
  // shoulder capsule axis, so the pocket top rides 60 mm under it.
  const yTop = form.chestTop - 60;
  const placements: Record<string, PiecePlacement> = {
    [FRONT_SHELL_ID]: { keep: true, dx: -W / 2, dy: -yTop, dz: form.frontZ + c },
    [BACK_SHELL_ID]: { keep: true, dx: -W / 2, dy: -yTop, dz: form.backZ - c },
  };
  const pins: PinSpec[] = [
    { pieceId: FRONT_SHELL_ID, rect: { x0: W / 2 - 60, y0: 0, x1: W / 2 + 60, y1: 12 } },
    { pieceId: BACK_SHELL_ID, rect: { x0: W / 2 - 60, y0: 0, x1: W / 2 + 60, y1: 12 } },
  ];
  const seams: SeamSpec[] = [];
  const body: Piece[] = [front, back];
  // Shoulder straps: over the shoulder at the box-X positions (W/4 in from each side), from the
  // back panel top to the front panel top. The draped strap is the finished span, one piece.
  const sw = r.strap_width;
  const strapXs: [string, number, number][] = [[STRAP_LEFT_ID, -W / 4, W * 0.25], [STRAP_RIGHT_ID, W / 4, W * 0.75]];
  let strapRequired = 0;
  for (const [id, xw, xf] of strapXs) {
    const base = shoulderPath(torso, xw < 0 ? 'left' : 'right', yTop, origin, c);
    const path: Vec3[] = base.map((p) => [xw, p[1], p[2]]);
    // Required span: back panel top → front panel top along this path.
    const frontTopIdx = path.length - 1;
    const upToFront = path.slice(0, frontTopIdx); // ends at the front chest point (chestTop − 40)
    strapRequired = pathLength(upToFront) + (path[frontTopIdx - 1][1] - yTop);
    // Draped at the setting the adjustment allows nearest the requirement: a strap within its
    // range closes; one outside it leaves the gap.
    const L = Math.min(Math.max(strapRequired, r.shoulder_strap_length), r.shoulder_strap_length + r.strap_adjust_range);
    body.push(rectPiece(id, `Shoulder strap span (${xw < 0 ? 'left' : 'right'})`, sw, L, 'webbing-51'));
    placements[id] = { keep: true, drape: { path, across: [1, 0, 0], x0: sw / 2 } };
    pins.push({ pieceId: id, point: { x: sw / 2, y: 0 }, radius: sw }, { pieceId: id, point: { x: sw / 2, y: L }, radius: sw });
    seams.push(
      { label: `${id} ↔ back top`, a: { pieceId: id, from: { x: 0, y: 0 }, to: { x: sw, y: 0 } }, b: { pieceId: BACK_SHELL_ID, from: { x: xf - sw / 2, y: 0 }, to: { x: xf + sw / 2, y: 0 } } },
      { label: `${id} ↔ front top`, a: { pieceId: id, from: { x: 0, y: L }, to: { x: sw, y: L } }, b: { pieceId: FRONT_SHELL_ID, from: { x: xf - sw / 2, y: 0 }, to: { x: xf + sw / 2, y: 0 } } },
    );
  }
  // Cummerbund: from the back panel's side edge round the chest block's rounded side to the front
  // panel's side edge, at the band height, ending `overlap` inside each panel.
  let cummerbundRequired = 0;
  let cbShown = 0;
  const cbSpan = r.cummerbund_length;
  if (r.cummerbund_style !== 'none') {
    const cw = r.cummerbund_width;
    const yBand = yTop - H * 0.55;
    const ov = r.cummerbund_overlap;
    const R = Math.min(torso.chestDepth, torso.chestWidth) * 0.3 + c;
    const cx = torso.chestWidth / 2 - (R - c), cz = torso.chestDepth / 2 - (R - c);
    for (const side of [1, -1] as const) {
      const id = side > 0 ? CB_RIGHT_ID : CB_LEFT_ID;
      const edgeX = W / 2;
      // Round the chest block's rounded side: on the back tangent plane to where the corner arc
      // starts, the arc, the flat side, the front arc, then the front tangent plane. A chord across
      // the corner would cut the solid, so the arc starts where the sleeve end sits.
      const startX = edgeX - ov;
      const path: Vec3[] = [];
      const th0 = startX <= cx ? -Math.PI / 2 : -Math.acos(Math.min(1, (startX - cx) / R));
      if (startX < cx) path.push([side * startX, yBand, -cz - R]);
      for (let k = 0; k <= 10; k++) { const th = th0 + ((0 - th0) * k) / 10; path.push([side * (cx + R * Math.cos(th)), yBand, -cz + R * Math.sin(th)]); }
      for (let k = 1; k <= 10; k++) { const th = (Math.PI / 2) * (k / 10); path.push([side * (cx + R * Math.cos(th)), yBand, cz + R * Math.sin(th)]); }
      if (startX < cx) path.push([side * startX, yBand, cz + R]);
      cummerbundRequired = pathLength(path);
      // Elastic is worn stretched: drape it at the requirement when that is within a quarter of its
      // cut length (the band's job); laminate is draped as cut, so a short one leaves the gap.
      const shown = r.cummerbund_style === 'elastic' ? Math.max(cbSpan, Math.min(cummerbundRequired, cbSpan * 1.25)) : cbSpan;
      cbShown = shown;
      body.push(rectPiece(id, `Cummerbund span (${side > 0 ? 'right' : 'left'})`, shown, cw, r.cummerbund_style === 'elastic' ? 'elastic-4in' : 'laminate-squadron'));
      placements[id] = { keep: true, drape: { path, across: [0, -1, 0], x0: cw / 2, along: 'x' } };
      pins.push({ pieceId: id, point: { x: 0, y: cw / 2 }, radius: cw / 2 }, { pieceId: id, point: { x: shown, y: cw / 2 }, radius: cw / 2 });
      const bandY = H * 0.55;
      const xInner = side > 0 ? W - ov : ov, xEdge = side > 0 ? W : 0;
      seams.push(
        { label: `${id} ↔ back sleeve`, a: { pieceId: id, from: { x: 0, y: cw / 2 }, to: { x: ov, y: cw / 2 } }, b: { pieceId: BACK_SHELL_ID, from: { x: xInner, y: bandY }, to: { x: xEdge, y: bandY } } },
        { label: `${id} ↔ front sleeve`, a: { pieceId: id, from: { x: shown, y: cw / 2 }, to: { x: shown - ov, y: cw / 2 } }, b: { pieceId: FRONT_SHELL_ID, from: { x: xInner, y: bandY }, to: { x: xEdge, y: bandY } } },
      );
    }
  }
  const strapMin = r.shoulder_strap_length, strapMax = r.shoulder_strap_length + r.strap_adjust_range;
  const strapOk = strapRequired >= strapMin - 10 && strapRequired <= strapMax + 10;
  const cummerbundOk = r.cummerbund_style === 'none' || (r.cummerbund_style === 'elastic' ? cbShown >= cummerbundRequired - 1e-6 && cbSpan >= cummerbundRequired - 3 * IN : Math.abs(cbSpan - cummerbundRequired) <= 1 * IN);
  const plateBottomAboveWaist = yTop - H;
  const report: string[] = [];
  report.push(strapOk
    ? `Shoulder straps fit this torso: ${fmtIn(strapRequired)}" over the shoulder, panel top to panel top, within the ${fmtIn(strapMin)}–${fmtIn(strapMax)}" the strap covers.`
    : strapRequired > strapMax
      ? `This torso needs ${fmtIn(strapRequired)}" over the shoulder; the strap reaches ${fmtIn(strapMax)}" at full adjustment — lengthen the span.`
      : `This torso needs ${fmtIn(strapRequired)}" over the shoulder; the strap's shortest setting is ${fmtIn(strapMin)}" — the plate will ride low. Shorten the span.`);
  if (r.cummerbund_style !== 'none') {
    report.push(cummerbundOk
      ? cbSpan >= cummerbundRequired
        ? `Cummerbund ${fmtIn(cbSpan)}" per side spans the ${fmtIn(cummerbundRequired)}" round this torso's side, sleeve to sleeve, with ${fmtIn(cbSpan - cummerbundRequired)}" to bury in the sleeves.`
        : `Cummerbund ${fmtIn(cbSpan)}" per side stretches ${fmtIn(cummerbundRequired - cbSpan)}" to span this torso's ${fmtIn(cummerbundRequired)}" side, sleeve to sleeve — the elastic's job.`
      : cbSpan < cummerbundRequired
        ? `Cummerbund ${fmtIn(cbSpan)}" per side is ${fmtIn(cummerbundRequired - cbSpan)}" short of this torso's ${fmtIn(cummerbundRequired)}" side span (elastic will stretch some; measure the wearer).`
        : `Cummerbund ${fmtIn(cbSpan)}" per side is ${fmtIn(cbSpan - cummerbundRequired)}" long for this torso's ${fmtIn(cummerbundRequired)}" side span; the excess buries in the sleeves.`);
  }
  report.push(plateBottomAboveWaist >= 0
    ? `Plate pocket bottom sits ${fmtIn(plateBottomAboveWaist)}" above this torso's waist line.`
    : `Plate pocket bottom hangs ${fmtIn(-plateBottomAboveWaist)}" below this torso's waist line: a shorter plate or a higher ride.`);
  return {
    pieces: body,
    object: { shape: 'torso', width: torso.chestWidth, depth: torso.chestDepth, height: torso.torsoLength, torso: { shoulderWidth: torso.shoulderWidth, neckRadius: torso.neckRadius }, at: origin, label: 'torso' },
    placements,
    pins,
    seams,
    report,
    fit: { strapRequired, strapMin, strapMax, strapOk, cummerbundRequired, cummerbundSpan: cbSpan, cummerbundOk, plateBottomAboveWaist },
  };
}
