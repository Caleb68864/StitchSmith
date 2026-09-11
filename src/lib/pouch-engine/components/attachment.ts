/**
 * Attachment component for the pouch engine.
 *
 * Produces strap pieces and assembly steps for various attachment methods:
 * - pals / molle  : back PALS rows (1" webbing, 1" gaps) + vertical mount straps
 * - belt_loop     : Single belt-loop piece sized per MOLLE+ convention
 * - alice         : Two clip-slot pieces for ALICE/LC-2 attachment
 * - velcro_panel  : Single loop-side panel piece
 *
 * PALS geometry (vault plate-carriers/pals-spec-1in-spacing.md,
 * plate-carriers/pals-sewn-webbing.md, mag-pouches/pals-grid-vs-cell-width.md):
 *   - rows are 1" webbing with a 1" gap → 2" row pitch, bartacked every 1.5"
 *   - column pitch 1.5" is immutable; one rifle mag needs two columns (3")
 *   - back rows are cut 1" over-length, seared one end, trimmed flush after
 *     sewing (they draw in) — tagged trim-after-sew
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
  /** Finished height of the pouch back in mm. */
  finishedHeight_mm: number;
  /**
   * Finished width of the pouch back in mm — drives the back PALS row length.
   * Defaults to 3" (one rifle cell) when omitted.
   */
  finishedWidth_mm?: number;
  /**
   * Vertical mount straps (one per PALS column the pouch spans). Defaults to
   * two per 1.5" of width, i.e. `round(finishedWidth / 38.1)`, minimum 1.
   */
  mountColumns?: number;
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

const IN = 25.4;

/** Webbing width: 1 inch in mm */
export const PALS_WEBBING_WIDTH_MM = 1 * IN;

/** Row pitch: 1" webbing + 1" gap = 2" centre-to-centre. */
export const PALS_ROW_PITCH_MM = 2 * IN;

/** Column pitch (bartack spacing) — immutable by spec. */
export const PALS_COLUMN_PITCH_MM = 1.5 * IN;

/** Margin kept clear at top and bottom of the back before the first/last row. */
export const PALS_EDGE_MARGIN_MM = 0.5 * IN;

/** Over-length on back rows, trimmed flush after sewing. */
export const PALS_ROW_OVERCUT_MM = 1 * IN;

/** Fold-over / tuck allowance on each vertical mount strap. */
export const PALS_STRAP_FOLD_OVER_MM = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * How many complete PALS rows fit in `finishedHeight_mm`: 1" rows with 1" gaps
 * and a 0.5" margin top and bottom. 5.5" → 2 rows, 7.5" → 3 rows.
 */
export function palsRowCount(finishedHeight_mm: number): number {
  if (!Number.isFinite(finishedHeight_mm)) return 0;
  const usable = finishedHeight_mm - 2 * PALS_EDGE_MARGIN_MM;
  if (usable < PALS_WEBBING_WIDTH_MM) return 0;
  return Math.max(0, Math.floor((usable + (PALS_ROW_PITCH_MM - PALS_WEBBING_WIDTH_MM)) / PALS_ROW_PITCH_MM));
}

/** PALS columns a back of this finished width spans (rounded to the grid). */
export function palsColumnCount(finishedWidth_mm: number): number {
  return Math.max(1, Math.round(finishedWidth_mm / PALS_COLUMN_PITCH_MM));
}

function makeRect(id: string, width: number, height: number): Path {
  const e = (eid: string, sx: number, sy: number, ex: number, ey: number): StraightEdge => ({
    kind: 'straight',
    id: eid,
    role: 'cut',
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

function zeroSa(id: string): Record<string, number> {
  return { [`${id}-top`]: 0, [`${id}-right`]: 0, [`${id}-bottom`]: 0, [`${id}-left`]: 0 };
}

// ─── Build functions ──────────────────────────────────────────────────────────

function buildPals(spec: AttachmentSpec): AttachmentResult {
  const rows = palsRowCount(spec.finishedHeight_mm);
  const warnings: string[] = [];
  const backW = spec.finishedWidth_mm ?? 3 * IN;
  const columns = spec.mountColumns ?? palsColumnCount(backW);

  if (rows <= 0) {
    warnings.push(
      `finishedHeight_mm (${spec.finishedHeight_mm}) is too short for any PALS rows ` +
        `(minimum ${2 * PALS_EDGE_MARGIN_MM + PALS_WEBBING_WIDTH_MM} mm for 1 row).`,
    );
    return { pieces: [], steps: [], warnings };
  }

  const gridError = Math.abs(backW / PALS_COLUMN_PITCH_MM - Math.round(backW / PALS_COLUMN_PITCH_MM)) * PALS_COLUMN_PITCH_MM;
  if (gridError > 0.5) {
    warnings.push(
      `Back width ${(backW / IN).toFixed(2)}" is not a multiple of the 1.5" PALS column pitch — the mount straps will not mount up in spec spacing. ` +
        'Round the width to the grid or use a Velcro/sewn mount.',
    );
  }

  const rowLen = backW + PALS_ROW_OVERCUT_MM;
  const rowPiece: Piece = {
    id: 'pals-back-row',
    name: 'PALS back row (1" webbing)',
    mirror: false,
    quantity: rows,
    materialId: 'webbing-25',
    paths: [makeRect('pals-back-row', rowLen, PALS_WEBBING_WIDTH_MM)],
    seamAllowances: zeroSa('pals-back-row'),
    annotations: [
      {
        kind: 'label',
        label: `PALS row — cut ${rows} × ${rowLen.toFixed(1)} mm (back width + 1" over-cut; trim flush after sewing)`,
      } satisfies PieceAnnotation,
    ],
  };

  const strapLen = spec.finishedHeight_mm + PALS_STRAP_FOLD_OVER_MM;
  const strapPiece: Piece = {
    id: 'pals-mount-strap',
    name: 'PALS mount strap (1" webbing)',
    mirror: false,
    quantity: columns,
    materialId: 'webbing-25',
    paths: [makeRect('pals-mount-strap', PALS_WEBBING_WIDTH_MM, strapLen)],
    seamAllowances: zeroSa('pals-mount-strap'),
    annotations: [
      {
        kind: 'label',
        label: `Mount strap — cut ${columns} × ${strapLen.toFixed(1)} mm (back height + ${PALS_STRAP_FOLD_OVER_MM} mm tuck/snap tab)`,
      } satisfies PieceAnnotation,
    ],
  };

  const steps: Step[] = [
    {
      id: 'pals-back-rows',
      title: `Sew ${rows} PALS row${rows === 1 ? '' : 's'} across the back`,
      body:
        `Cut each row ${rowLen.toFixed(0)} mm — 1" longer than the back — and sear one end only. Sew rows at a 2" pitch (1" webbing, 1" gap), ` +
        `starting ${(PALS_EDGE_MARGIN_MM / IN).toFixed(1)}" from the bottom, bartacking every 1.5" so the slots land on the grid. ` +
        'Trim the unseared end flush after sewing; webbing draws in as it is stitched, so never cut it to net first. Or skip the sewn rows and use MALICE clips through the host grid.',
      dependsOn: [],
      refsPieces: [rowPiece.id],
      group: 'Attachment',
    },
    {
      id: 'pals-mount-straps',
      title: `Fit ${columns} vertical mount strap${columns === 1 ? '' : 's'}`,
      body:
        `Bartack the top of each ${strapLen.toFixed(0)} mm strap under the top back row, one per PALS column (${columns} column${columns === 1 ? '' : 's'} on a ${(backW / IN).toFixed(2)}" back). ` +
        'Weave each strap alternately through the host grid and the pouch rows; the extra 50 mm at the end tucks behind the bottom row or takes a snap.',
      dependsOn: ['pals-back-rows'],
      refsPieces: [strapPiece.id],
      group: 'Attachment',
    },
  ];

  return { pieces: [rowPiece, strapPiece], steps, warnings };
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
    seamAllowances: zeroSa('belt-loop'),
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
      group: 'Attachment',
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
    seamAllowances: zeroSa(`alice-slot-${idx}`),
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
      group: 'Attachment',
    },
  ];

  return { pieces: slots, steps, warnings: [] };
}

function buildVelcroPanel(spec: AttachmentSpec): AttachmentResult {
  // Hook-side panel sized to the back of the pouch; mates with a loop-lined host.
  const panelWidth_mm = spec.finishedWidth_mm ?? 50.8;
  const panelHeight_mm = spec.finishedHeight_mm;

  const piece: Piece = {
    id: 'velcro-hook-panel',
    name: 'Velcro hook panel (back)',
    mirror: false,
    quantity: 1,
    materialId: 'velcro-hook',
    paths: [makeRect('velcro-panel', panelWidth_mm, panelHeight_mm)],
    seamAllowances: zeroSa('velcro-panel'),
    annotations: [
      {
        kind: 'label',
        label: `Velcro hook panel — ${panelWidth_mm.toFixed(1)} mm × ${panelHeight_mm.toFixed(1)} mm (mates with a loop-lined host)`,
      },
    ],
  };

  const steps: Step[] = [
    {
      id: 'velcro-panel-attach',
      title: 'Attach the hook panel to the back',
      body:
        'Stitch the hook-side panel to the back of the pouch, short sides first, then the long sides, then a centre line — a pulling load needs the centre line. ' +
        'Hook-side parts go on last in the build so nothing later has to sew across them.',
      dependsOn: [],
      refsPieces: [piece.id],
      group: 'Attachment',
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
