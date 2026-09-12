/**
 * 3D check for the organizer: the body folded in half round a 3 × 5 notebook
 * standing in the back pocket, the front panel riding on the front half and
 * seamed at its bottom, dividers and sides. The bellows show as the wider
 * panel standing off the body between the dividers.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { PiecePlacement } from '../../lib/fold-engine/index.js';
import type { SeamSpec } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs } from './types.js';
import { BODY_ID, PANEL_ID } from './buildPattern.js';
import { NOTEBOOK_3X5_MM } from './defaults.js';

export interface OrganizerAssembly {
  pieces: Piece[];
  object: { width: number; depth: number; height: number; label: string; lift: number; base: { pieceId: string; point: Point; direction: Point } };
  placements: Record<string, PiecePlacement>;
  seams: SeamSpec[];
}

export function organizerAssembly(pieces: Piece[], r: ResolvedInputs): OrganizerAssembly | null {
  const body = pieces.find((p) => p.id === BODY_ID);
  const panel = pieces.find((p) => p.id === PANEL_ID);
  if (!body || !panel || r.bifold) return null;
  const W = r.pouch_width;
  const L = r.body_cut_length;
  const foldY = L / 2;
  const ssa = r.side_seam_allowance;
  // Body: root on the back half (above the bottom fold in flat coords: y < foldY); the front half hinges 180° toward +z.
  const backTop = r.body_hem;               // hem fold of the back half
  const frontTop = L - r.body_hem;          // hem fold of the front half
  const [nw, nh, nd] = NOTEBOOK_3X5_MM;
  const notebook = { width: Math.min(nw, W - 2 * ssa - 2), depth: nd, height: Math.min(nh, r.pocket_height) };
  // Front panel: after the 180° body fold the front half's flat y runs upward from the fold. The panel's
  // bottom (flat y = H) lands on the fold line and its top hem at the rim. It rides on the front half.
  const H = r.panel_cut_height;
  const panelX0 = (W - r.panel_cut_width) / 2;
  // A panel point at flat x lands on the body at x − side_fold + span_loss (the fold region bridges
  // span_loss to the body edge), so the body's side seam at `ssa` catches the panel at `faceLeft`;
  // what lies outside that line is the flap that pleats into the bellows.
  const faceLeft = r.side_fold + (ssa - r.span_loss);
  const faceRight = r.panel_cut_width - faceLeft;
  const seams: SeamSpec[] = [
    // Panel bottom to the body's fold line (through the front layers only).
    { label: 'panel bottom', a: { pieceId: PANEL_ID, from: { x: faceLeft, y: H }, to: { x: faceRight, y: H } }, b: { pieceId: BODY_ID, from: { x: ssa, y: foldY }, to: { x: W - ssa, y: foldY } }, gap: 2.4 },
    // Sides: all layers at the side seam allowance.
    { label: 'left side', a: { pieceId: PANEL_ID, from: { x: faceLeft, y: H }, to: { x: faceLeft, y: r.panel_hem } }, b: { pieceId: BODY_ID, from: { x: ssa, y: foldY }, to: { x: ssa, y: frontTop } }, gap: 2.4 },
    { label: 'right side', a: { pieceId: PANEL_ID, from: { x: faceRight, y: H }, to: { x: faceRight, y: r.panel_hem } }, b: { pieceId: BODY_ID, from: { x: W - ssa, y: foldY }, to: { x: W - ssa, y: frontTop } }, gap: 2.4 },
    // Back and front halves meet at the sides too (the notebook pocket).
    // (Started a cell above the fold: the crease itself cannot pinch shut on a coarse mesh.)
    { label: 'pocket left', a: { pieceId: BODY_ID, from: { x: ssa, y: foldY - 8 }, to: { x: ssa, y: backTop } }, b: { pieceId: BODY_ID, from: { x: ssa, y: foldY + 8 }, to: { x: ssa, y: frontTop } } },
    { label: 'pocket right', a: { pieceId: BODY_ID, from: { x: W - ssa, y: foldY - 8 }, to: { x: W - ssa, y: backTop } }, b: { pieceId: BODY_ID, from: { x: W - ssa, y: foldY + 8 }, to: { x: W - ssa, y: frontTop } } },
  ];
  r.divider_positions.forEach((pos, i) => {
    const xp = faceLeft + pos;
    const xb = ssa + pos;
    seams.push({ label: `divider ${i + 1}`, a: { pieceId: PANEL_ID, from: { x: xp, y: H }, to: { x: xp, y: r.panel_hem_mark } }, b: { pieceId: BODY_ID, from: { x: xb, y: foldY }, to: { x: xb, y: foldY + (H - r.panel_hem_mark) } }, gap: 2.4 });
  });
  return {
    pieces: [{ ...body }, { ...panel, quantity: 1 }, ...pieces.filter((p) => p.id !== BODY_ID && p.id !== PANEL_ID)],
    object: {
      ...notebook, label: '3 × 5 notebook', lift: 2,
      base: { pieceId: BODY_ID, point: { x: W / 2, y: foldY }, direction: { x: 0, y: -1 } },
    },
    placements: {
      // Panel over the back half's flat footprint (the folded front half lands there), one notebook depth + layer out. No attach: the front half's 180° transform would flip it below the fold.
      [PANEL_ID]: { dx: panelX0, dy: foldY - H, dz: notebook.depth + 2.4 },
    },
    seams,
  };
}
