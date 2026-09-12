/**
 * 3D fit check for the padded strap page: a torso form, the pad(s) draped over
 * the shoulder(s) with both webbing ends held, and for the H-harness the cross
 * strap draped across the back and seamed to both pads. The cloth then shows
 * whether the pad lies flat over the shoulder (stretch) and whether the cross
 * strap's spread reaches the far pad on this torso (seam gap).
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import { mirrorPieceX, pointAlongPath, type PiecePlacement } from '../../lib/fold-engine/index.js';
import { shoulderPath, torsoForm, TORSO_MEDIUM, type SeamSpec, type TorsoSpec, type Vec3 } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs } from './types.js';
import { PAD_PIECE_ID, CROSS_STRAP_PIECE_ID } from './buildPattern.js';

export const PAD_LEFT_ID = `${PAD_PIECE_ID}-left`;

export interface PaddedStrapAssembly {
  pieces: Piece[];
  object: { shape: 'torso'; width: number; depth: number; height: number; torso: { shoulderWidth: number; neckRadius: number }; at: Vec3; label: string };
  placements: Record<string, PiecePlacement>;
  pins: { pieceId: string; point: Point; radius: number }[];
  seams: SeamSpec[];
  /** Plain-language fit findings against this torso. */
  report: string[];
  /** H-harness: gap between the pads' inner edges on this torso, and the chest range the cross strap covers. */
  fit?: { padGap: number; minSpread: number; maxSpread: number; ok: boolean };
}

export function paddedStrapAssembly(pieces: Piece[], r: ResolvedInputs, torso: TorsoSpec = TORSO_MEDIUM): PaddedStrapAssembly | null {
  const pad = pieces.find((p) => p.id === PAD_PIECE_ID);
  if (!pad || r.architecture === 'none') return null;
  const origin: Vec3 = [0, 0, 0];
  const form = torsoForm(torso, origin);
  const h = r.mode === 'h_harness';
  const w = r.pad_width;
  // Pack pad: the yoke end sits just below the shoulder on the back; H pad: the cross strap must
  // land on the back, so the rear end starts lower.
  const backStartY = form.chestTop - (h ? r.cross_strap_height + 40 : 80);
  const pathR = shoulderPath(torso, 'right', backStartY, origin);
  const pathL = shoulderPath(torso, 'left', backStartY, origin);
  // The pad as drawn is the right-hand one (mirror: true, quantity 2); mirror it for the left.
  const padLeft = mirrorPieceX(pad, PAD_LEFT_ID, `${pad.name} (left)`);
  const body: Piece[] = [pad, padLeft];
  const placements: Record<string, PiecePlacement> = {
    [PAD_PIECE_ID]: { keep: true, drape: { path: pathR, across: [1, 0, 0], x0: w / 2 } },
    [PAD_LEFT_ID]: { keep: true, drape: { path: pathL, across: [1, 0, 0], x0: w / 2 } },
  };
  const pins = [
    { pieceId: PAD_PIECE_ID, point: { x: w / 2, y: 0 }, radius: w },
    { pieceId: PAD_PIECE_ID, point: { x: w / 2, y: r.pad_length }, radius: w },
    { pieceId: PAD_LEFT_ID, point: { x: w / 2, y: 0 }, radius: w },
    { pieceId: PAD_LEFT_ID, point: { x: w / 2, y: r.pad_length }, radius: w },
  ];
  const seams: SeamSpec[] = [];
  const report: string[] = [];
  let fit: PaddedStrapAssembly['fit'];
  const cross = pieces.find((p) => p.id === CROSS_STRAP_PIECE_ID);
  if (h && cross) {
    // The cross strap covers chests from `spread` (cut at the first slot) to spread + adjustment.
    const padGap = form.shoulderTop.right[0] - form.shoulderTop.left[0] - w;
    fit = { padGap, minSpread: r.pad_spread, maxSpread: r.pad_spread + r.chest_adjust_range, ok: padGap >= r.pad_spread && padGap <= r.pad_spread + r.chest_adjust_range };
    report.push(fit.ok
      ? `Cross strap fits this torso: pads sit ${Math.round(padGap)} mm apart, within the ${Math.round(fit.minSpread)}–${Math.round(fit.maxSpread)} mm the slots cover.`
      : padGap < fit.minSpread
        ? `Pad spread ${Math.round(r.pad_spread)} mm is wider than this torso's ${Math.round(padGap)} mm pad gap even at the first slot — reduce the spread (sizing only cuts down).`
        : `Pads sit ${Math.round(padGap)} mm apart, beyond the ${Math.round(fit.maxSpread)} mm the slots reach — increase the spread or the adjustment range.`);
    // Cross strap across the back at the pads' landing height, from the left pad's outer edge.
    const land = pointAlongPath(pathL, r.cross_strap_height).p;
    const wb = r.webbing_width;
    const xL = form.shoulderTop.left[0] - w / 2;
    const xR = form.shoulderTop.right[0] + w / 2;
    const z = land[2] - 2;
    const path: Vec3[] = [[xL, land[1], z], [xR + r.chest_adjust_range, land[1], z]];
    placements[CROSS_STRAP_PIECE_ID] = { keep: true, drape: { path, across: [0, -1, 0], x0: wb / 2, along: 'x' } };
    body.push(cross);
    const y0 = r.cross_strap_height;
    const slotEnd = w + r.pad_spread + r.chest_adjust_range;
    seams.push(
      { label: 'cross strap ↔ left pad', a: { pieceId: CROSS_STRAP_PIECE_ID, from: { x: 0, y: wb / 2 }, to: { x: w, y: wb / 2 } }, b: { pieceId: PAD_LEFT_ID, from: { x: 0, y: y0 }, to: { x: w, y: y0 } } },
      { label: 'cross strap ↔ right pad (largest slot)', a: { pieceId: CROSS_STRAP_PIECE_ID, from: { x: slotEnd - w, y: wb / 2 }, to: { x: slotEnd, y: wb / 2 } }, b: { pieceId: PAD_PIECE_ID, from: { x: 0, y: y0 }, to: { x: w, y: y0 } } },
    );
  }
  return {
    pieces: [...body, ...pieces.filter((p) => !body.includes(p) && p.id !== PAD_PIECE_ID)],
    object: { shape: 'torso', width: torso.chestWidth, depth: torso.chestDepth, height: torso.torsoLength, torso: { shoulderWidth: torso.shoulderWidth, neckRadius: torso.neckRadius }, at: origin, label: 'torso' },
    placements,
    pins,
    seams,
    report,
    fit,
  };
}
