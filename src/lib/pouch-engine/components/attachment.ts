/**
 * Attachment component for the pouch engine.
 *
 * Produces strap pieces and assembly steps for various attachment methods:
 * - pals / molle  : PALS/MOLLE webbing strap system (1" webbing, 25.4 mm pitch)
 * - belt_loop     : Single belt-loop piece sized per MOLLE+ convention
 * - alice         : Two clip-slot pieces for ALICE/LC-2 attachment
 * - velcro_panel  : Single loop-side panel piece
 */

import type { Piece, PieceAnnotation } from '../../pattern-engine/graph/Piece.js';
import type { StraightEdge } from '../../pattern-engine/graph/Edge.js';
import type { Path } from '../../pattern-engine/graph/Path.js';
import type { Step } from '../../pattern-engine/instructions/Step.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttachmentStyle =
  | 'pals'
  | 'molle'
  | 'belt_loop'
  | 'alice'
  | 'velcro_panel';

export interface AttachmentSpec {
  style: AttachmentStyle;
  /** Finished height of the pouch body in mm. */
  finishedHeight_mm: number;
  /**
   * Belt width in mm — used only for `belt_loop` style.
   * Defaults to MOLLE+ standard: 50.8 mm (2 inches).
   */
  beltWidth_mm?: number;
}

export interface AttachmentResult {
  pieces: Piece[];
  steps: Step[];
  warnings: string[];
}

// ─── PALS / MOLLE constants ───────────────────────────────────────────────────

/** Webbing width: 1 inch in mm */
const PALS_WEBBING_WIDTH_MM = 25.4;

/** Vertical pitch between PALS rows: 1 inch in mm */
const PALS_ROW_PITCH_MM = 25.4;

/** Fold-over allowance per strap: 50 mm */
const PALS_FOLD_OVER_MM = 50;

/**
 * Bottom offset before the first PALS row.
 * PALS spec: first bar-tack 0.5" from the bottom = 12.7 mm.
 */
const PALS_BOTTOM_OFFSET_MM = 12.7;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** How many complete PALS rows fit in `finishedHeight_mm`. */
export function palsRowCount(finishedHeight_mm: number): number {
  return Math.max(0, Math.floor((finishedHeight_mm - PALS_BOTTOM_OFFSET_MM) / PALS_ROW_PITCH_MM));
}

function makeRect(id: string, width: number, height: number): Path {
  const e = (eid: string, sx: number, sy: number, ex: number, ey: number): StraightEdge => ({
    kind: 'straight',
    id: eid,
    role: 'stitch',
    start: { x: sx, y: sy },
    end: { x: ex, y: ey },
  });
  return {
    id: `${id}-outline`,
    closed: true,
    edges: [
      e(`${id}-top`, 0, 0, width, 0),
      e(`${id}-right`, width, 0, width, height),
      e(`${id}-bottom`, width, height, 0, height),
      e(`${id}-left`, 0, height, 0, 0),
    ],
  };
}

function makeStrapPiece(id: string, name: string, qty: number, rowHeight_mm: number): Piece {
  const totalHeight = rowHeight_mm + PALS_FOLD_OVER_MM;
  const annotations: PieceAnnotation[] = [
    {
      kind: 'label',
      label: `PALS strap — cut ${qty}; total height ${totalHeight.toFixed(1)} mm (incl. ${PALS_FOLD_OVER_MM} mm fold-over)`,
    },
  ];
  return {
    id,
    name,
    mirror: false,
    quantity: qty,
    paths: [makeRect(id, PALS_WEBBING_WIDTH_MM, totalHeight)],
    annotations,
  };
}

// ─── Build functions ──────────────────────────────────────────────────────────

function buildPals(spec: AttachmentSpec): AttachmentResult {
  const rows = palsRowCount(spec.finishedHeight_mm);
  const warnings: string[] = [];

  if (rows <= 0) {
    warnings.push(
      `finishedHeight_mm (${spec.finishedHeight_mm}) is too short for any PALS rows ` +
        `(minimum ${PALS_BOTTOM_OFFSET_MM + PALS_ROW_PITCH_MM} mm for 1 row).`,
    );
    return { pieces: [], steps: [], warnings };
  }

  const piece = makeStrapPiece('pals-strap', 'PALS Strap', rows, PALS_ROW_PITCH_MM);

  const steps: Step[] = [
    {
      id: 'pals-weave',
      title: 'Weave PALS straps',
      body:
        `Weave ${rows} strap(s) through the PALS webbing grid on the front panel, ` +
        `one per row. Bar-tack each strap at the 1.5" (38.1 mm) spacing per PALS spec. ` +
        `Fold over the top ${PALS_FOLD_OVER_MM} mm of each strap and stitch down.`,
      dependsOn: [],
      refsPieces: [piece.id],
      group: 'attachment',
    },
  ];

  return { pieces: [piece], steps, warnings };
}

function buildBeltLoop(spec: AttachmentSpec): AttachmentResult {
  const beltWidth_mm = spec.beltWidth_mm ?? 50.8; // default 2" MOLLE+ belt
  const pieceHeight_mm = 1.75 * 25.4; // 1.75 inches tall
  const pieceLength_mm = (beltWidth_mm + 0.5 * 25.4) * 2; // (belt_width + 0.5") * 2

  const piece: Piece = {
    id: 'belt-loop',
    name: 'Belt Loop',
    mirror: false,
    quantity: 1,
    paths: [makeRect('belt-loop', pieceLength_mm, pieceHeight_mm)],
    annotations: [
      {
        kind: 'label',
        label: `Belt loop — ${pieceHeight_mm.toFixed(1)} mm tall × ${pieceLength_mm.toFixed(1)} mm long`,
      },
    ],
  };

  const steps: Step[] = [
    {
      id: 'belt-loop-fold-stitch',
      title: 'Fold and stitch belt loop',
      body:
        'Fold the belt loop piece in half lengthwise (right sides together). ' +
        'Stitch along the long edge and turn right-side out. ' +
        'Thread belt through the loop and bartack or snap-close both ends to the pouch back panel.',
      dependsOn: [],
      refsPieces: [piece.id],
      group: 'attachment',
    },
  ];

  return { pieces: [piece], steps, warnings: [] };
}

function buildAlice(_spec: AttachmentSpec): AttachmentResult {
  // ALICE clip system uses two clip slots; slots are 1" (25.4 mm) wide
  const slotWidth_mm = 25.4;
  const slotHeight_mm = 38.1; // 1.5" tall to accommodate ALICE clip tongue

  const makeSlot = (idx: number): Piece => ({
    id: `alice-slot-${idx}`,
    name: `ALICE Clip Slot ${idx}`,
    mirror: false,
    quantity: 1,
    paths: [makeRect(`alice-slot-${idx}`, slotWidth_mm, slotHeight_mm)],
    annotations: [
      {
        kind: 'label',
        label: `ALICE clip slot ${idx} — ${slotWidth_mm} mm × ${slotHeight_mm} mm`,
      },
    ],
  });

  const slots = [makeSlot(1), makeSlot(2)];

  const steps: Step[] = [
    {
      id: 'alice-slot-attach',
      title: 'Attach ALICE clip slots',
      body:
        'Stitch both ALICE clip slot pieces to the back panel at the appropriate spacing ' +
        '(match LC-2 / ALICE pack grid). Bar-tack each corner for retention.',
      dependsOn: [],
      refsPieces: slots.map((s) => s.id),
      group: 'attachment',
    },
  ];

  return { pieces: slots, steps, warnings: [] };
}

function buildVelcroPanel(spec: AttachmentSpec): AttachmentResult {
  // Single loop-side velcro panel piece; sized to the finished height of the pouch
  const panelWidth_mm = 50.8; // standard 2" loop panel
  const panelHeight_mm = spec.finishedHeight_mm;

  const piece: Piece = {
    id: 'velcro-loop-panel',
    name: 'Velcro Loop Panel',
    mirror: false,
    quantity: 1,
    paths: [makeRect('velcro-panel', panelWidth_mm, panelHeight_mm)],
    annotations: [
      {
        kind: 'label',
        label: `Velcro loop panel — ${panelWidth_mm} mm × ${panelHeight_mm} mm`,
      },
    ],
  };

  const steps: Step[] = [
    {
      id: 'velcro-panel-attach',
      title: 'Attach velcro loop panel',
      body:
        'Stitch the loop-side velcro panel to the back of the pouch, aligning edges. ' +
        'Edgestitch all four sides at 3 mm from edge.',
      dependsOn: [],
      refsPieces: [piece.id],
      group: 'attachment',
    },
  ];

  return { pieces: [piece], steps, warnings: [] };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build attachment hardware pieces and assembly steps for a pouch.
 *
 * `molle` is treated identically to `pals` — MOLLE is the platform name;
 * PALS (Pouch Attachment Ladder System) is the webbing specification.
 */
export function buildAttachment(spec: AttachmentSpec): AttachmentResult {
  switch (spec.style) {
    case 'pals':
    case 'molle':
      return buildPals(spec);
    case 'belt_loop':
      return buildBeltLoop(spec);
    case 'alice':
      return buildAlice(spec);
    case 'velcro_panel':
      return buildVelcroPanel(spec);
    default: {
      const _exhaustive: never = spec.style;
      return { pieces: [], steps: [], warnings: [`Unknown attachment style: ${_exhaustive}`] };
    }
  }
}
