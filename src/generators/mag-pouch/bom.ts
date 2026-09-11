/**
 * Mag Pouch Generator — Bill of materials and cut list.
 *
 * Every dimension here comes from `resolveMagPouch` (inches) or from the
 * emitted pattern pieces (mm), so the BOM cannot disagree with the drawing.
 * Strip materials carry cut dimensions and a cut tag (trim-after-sew for
 * anything that draws in when stitched).
 */

import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import { bboxFromPieceWithSa } from '../../lib/pattern-engine/geometry/saBbox.js';
import type {
  MagPouchInputs,
  MagPouchBom,
  MagPouchBomMaterial,
  MagPouchBomHardware,
  MagPouchCutPiece,
} from './types.js';
import type { ResolvedMagPouch } from './resolve.js';
import { inToMm } from './resolve.js';
import { DEFAULT_BUNGEE_LENGTH_IN, DEFAULT_PULL_TAB_LENGTH_IN } from './defaults.js';
import { PLATFORM_LABELS } from './magazines.js';

const IN = 25.4;

function fmt(mm: number): number {
  return Math.round(mm * 10) / 10;
}

/** One cut-list row per pattern piece, sized on its cut envelope. */
export function cutPiecesFromPattern(pattern: Pattern, defaultSaMm: number): MagPouchCutPiece[] {
  return pattern.pieces.map((piece: Piece) => {
    const box = bboxFromPieceWithSa(piece, defaultSaMm);
    const label = piece.annotations?.find((a) => a.kind === 'label')?.label;
    return {
      id: piece.id,
      name: piece.name,
      widthMm: fmt(box.width),
      sizeMm: fmt(box.height),
      quantity: piece.quantity,
      notes: label,
    };
  });
}

export function buildBom(
  inputs: MagPouchInputs,
  r: ResolvedMagPouch,
  pattern: Pattern,
  palsRows: number,
): MagPouchBom {
  const materials: MagPouchBomMaterial[] = [];
  const hardware: MagPouchBomHardware[] = [];
  const cells = r.cellCount;
  const platformName = PLATFORM_LABELS[r.platform];

  // ── Body fabric ─────────────────────────────────────────────────────────────
  const fabricPieces = pattern.pieces.filter((p) => p.id === 'body' || p.id === 'back' || p.id === 'face');
  const fabricNotes = fabricPieces
    .map((p) => {
      const box = bboxFromPieceWithSa(p, inToMm(r.seamAllowanceIn));
      return `${p.name} ${fmt(box.width)} × ${fmt(box.height)} mm`;
    })
    .join('; ');
  materials.push({
    id: 'body-fabric',
    name: 'Main body fabric (500D Cordura or equivalent)',
    type: 'fabric',
    notes:
      (r.construction === 'pleated_card'
        ? 'Cut sizes include the hems; single layer — the face doubles by folding, no need to double the back on a mounted card. '
        : 'Cut on the outer seam-allowance line. ') + fabricNotes,
    quantity: fabricPieces.length,
  });

  // ── Retention ───────────────────────────────────────────────────────────────
  switch (r.retention) {
    case 'flap_velcro':
      materials.push(
        {
          id: 'velcro-hook',
          name: '1" hook tape (lid)',
          type: 'velcro-hook',
          cutWidthMm: IN,
          cutLengthMm: inToMm(r.hookLengthIn),
          quantity: cells,
          cutTag: 'cut-to-net',
          notes: 'Underside of the lid; goes on last.',
        },
        {
          id: 'velcro-loop',
          name: '1" loop tape (face)',
          type: 'velcro-loop',
          cutWidthMm: IN,
          cutLengthMm: inToMm(r.loopLengthIn),
          quantity: cells,
          cutTag: 'cut-to-net',
          notes: 'Loop field = hook + travel; the loop is the parametric piece.',
        },
      );
      break;
    case 'flap_snap':
      hardware.push({
        id: 'snap',
        name: 'Snap fastener',
        type: 'snap',
        quantity: cells,
        notes: 'Line 24 (15 mm) or equivalent; stud on lid, socket on face. Needs a press or setting tool.',
      });
      break;
    case 'flap_fastex':
      hardware.push({
        id: 'fastex-buckle',
        name: '1" side-release buckle',
        type: 'fastex',
        quantity: cells,
        notes: 'Slot width must match the 1" webbing. Female on the lid tab, male on the adjustable face tail.',
      });
      materials.push({
        id: 'buckle-webbing',
        name: '1" webbing (buckle tabs)',
        type: 'webbing',
        cutWidthMm: IN,
        cutLengthMm: inToMm(r.flapLengthIn + 4),
        quantity: cells,
        cutTag: 'mock-derived',
        notes: 'Lid tab + adjustable tail per cell; mock the reach before cutting.',
      });
      break;
    case 'open_top_bungee':
      materials.push(
        {
          id: 'bungee-cord',
          name: 'Shock cord, 1/8" (3 mm)',
          type: 'cord',
          cutLengthMm: inToMm(DEFAULT_BUNGEE_LENGTH_IN),
          quantity: cells,
          cutTag: 'mock-derived',
          notes: `SOE standard cut is ${DEFAULT_BUNGEE_LENGTH_IN}" per cell; fat cord needs ~18". Hand-cut — a digital cutter stretches elastic. Lace a mock first.`,
        },
        {
          id: 'pull-tab-webbing',
          name: '1" webbing (bungee pull tabs)',
          type: 'webbing',
          cutWidthMm: IN,
          cutLengthMm: inToMm(DEFAULT_PULL_TAB_LENGTH_IN),
          quantity: cells,
          cutTag: 'cut-to-net',
          notes:
            r.platform === 'rifle_308'
              ? '.308 pull: built flat, stepped back to leave a cord channel, ends folded for a gloved grab.'
              : r.platform === 'ak'
                ? 'AK pull: run the bungee all the way in with sewn channels so it catches the curved mag corner.'
                : 'Pull sits flat on top of the magazine.',
        },
      );
      hardware.push({
        id: 'cord-lock',
        name: 'Cord lock',
        type: 'cord-lock',
        quantity: cells,
        notes: 'One per cell so the bungee stays adjustable and replaceable without disassembly.',
      });
      break;
    case 'velcro_dot':
      materials.push({
        id: 'hook-dot',
        name: '1" hook square (on magazine)',
        type: 'velcro-hook',
        cutWidthMm: IN,
        cutLengthMm: IN,
        quantity: cells,
        cutTag: 'cut-to-net',
        notes: 'Adhesive hook, one face of each magazine only.',
      });
      break;
    case 'kydex_wedge':
      hardware.push({
        id: 'kydex-wedge',
        name: `Kydex retention wedge (${platformName})`,
        type: 'wedge',
        quantity: cells,
        notes: 'Bought part, keyed to the magazine platform — a .308 wedge is a different part from an M4 wedge.',
      });
      break;
    case 'none':
      break;
  }

  // ── Interior loop ───────────────────────────────────────────────────────────
  if (r.interiorLoop) {
    materials.push({
      id: 'interior-loop',
      name: '2" loop tape (interior walls)',
      type: 'velcro-loop',
      cutWidthMm: 2 * IN,
      cutLengthMm: inToMm(r.pouchHeightIn),
      quantity: 2 * cells,
      cutTag: 'cut-to-net',
      notes: 'Both walls of every cell, full height to the mouth. Width reads ~2" on camera — measure your magazine face.',
    });
  }

  // ── Cradle ──────────────────────────────────────────────────────────────────
  if (r.construction === 'pleated_card' && r.bottomStyle === 'cradle') {
    materials.push({
      id: 'cradle-webbing',
      name: '1" webbing (cradle strips)',
      type: 'webbing',
      cutWidthMm: IN,
      cutLengthMm: 3 * IN,
      quantity: cells,
      cutTag: 'mock-derived',
      notes: '1" up the face, 1" across, 1" up the back. Corrected on camera from 3.5" to 3" — mock one cell.',
    });
  }

  // ── Face PALS bars ──────────────────────────────────────────────────────────
  if (r.facePals) {
    materials.push({
      id: 'face-pals-webbing',
      name: '1" webbing (face PALS bars)',
      type: 'webbing',
      cutWidthMm: IN,
      cutLengthMm: inToMm(r.cellSpanIn),
      quantity: 3 * cells,
      cutTag: 'cut-to-net',
      notes: 'Three bars per cell, centred on the cell; the top bar anchors bungee retention.',
    });
  }

  // ── Attachment ──────────────────────────────────────────────────────────────
  const backWidthIn = r.cellSpanIn * cells;
  switch (inputs.attachment) {
    case 'pals':
    case 'molle':
      materials.push(
        {
          id: 'pals-row-webbing',
          name: '1" webbing (back PALS rows)',
          type: 'webbing',
          cutWidthMm: IN,
          cutLengthMm: inToMm(backWidthIn + 1),
          quantity: palsRows,
          cutTag: 'trim-after-sew',
          notes: `Cut 1" over the ${backWidthIn.toFixed(2)}" back, sear one end, trim flush after sewing. Rows at a 2" pitch (1" webbing, 1" gap).`,
        },
        {
          id: 'mount-strap-webbing',
          name: '1" webbing (vertical mount straps)',
          type: 'webbing',
          cutWidthMm: IN,
          cutLengthMm: inToMm(r.pouchHeightIn) + 50,
          quantity: r.palsColumns,
          cutTag: 'mock-derived',
          notes: `${r.palsColumns} straps (one per PALS column on a ${backWidthIn.toFixed(2)}" back), back height + 50 mm tuck. MALICE clips are the bought alternative.`,
        },
      );
      break;
    case 'belt_loop':
      materials.push({
        id: 'attachment-webbing',
        name: '2" webbing or Cordura (belt loop)',
        type: 'webbing',
        cutWidthMm: 1.75 * IN,
        cutLengthMm: (2 * IN + 0.5 * IN) * 2,
        quantity: 1,
        cutTag: 'cut-to-net',
        notes: 'Sized for a 2" belt: (belt width + 0.5") × 2, folded.',
      });
      break;
    case 'alice':
      hardware.push({
        id: 'alice-clip',
        name: 'ALICE clip',
        type: 'clip',
        quantity: 2,
        notes: 'Two clips through the sewn slot pieces; match the LC-2 grid.',
      });
      break;
    case 'velcro_panel':
      materials.push({
        id: 'back-hook-panel',
        name: 'Hook tape (back panel)',
        type: 'velcro-hook',
        cutWidthMm: inToMm(backWidthIn),
        cutLengthMm: inToMm(r.pouchHeightIn),
        quantity: 1,
        cutTag: 'cut-to-net',
        notes: 'Full-back hook panel mating with a loop-lined host; stitch perimeter + centre line.',
      });
      break;
  }

  // ── Drainage (folded-T) ─────────────────────────────────────────────────────
  if (r.construction === 'folded_t' && inputs.drainage === 'grommet') {
    const size = inputs.grommet_size ?? '#0';
    hardware.push({
      id: 'grommet',
      name: `${size} grommet (drainage)`,
      type: 'grommet',
      quantity: 1,
      notes: `${size} grommet at bottom-centre of the body; pre-burn the hole, set with a press.`,
    });
  }

  return { materials, hardware };
}
