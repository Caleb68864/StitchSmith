/**
 * Face PALS bars — three 1" webbing bars per cell on the face of a pleated
 * card, centred on each cell so every cell face is itself a PALS column that
 * another layer can stack onto; the top bar doubles as the bungee anchor.
 *
 * Source: vault mag-pouches/mag-pouch-4pack-single-dimensions.md (12 bars of
 * 3" on the 4-pack card, "centers found at 3"").
 */

import type { Piece } from '../../pattern-engine/graph/Piece.js';
import type { StraightEdge } from '../../pattern-engine/graph/Edge.js';
import type { Path } from '../../pattern-engine/graph/Path.js';
import type { Step } from '../../pattern-engine/instructions/Step.js';

const IN = 25.4;
export const FACE_PALS_BARS_PER_CELL = 3;
export const FACE_PALS_WEBBING_WIDTH_MM = 1 * IN;

export interface FacePalsSpec {
  cellCount: number;
  /** Bar length = cell span (mm). */
  cellSpan_mm: number;
  /** Cell height (mm) — used to check three bars fit. */
  cellHeight_mm: number;
  dependsOn?: string[];
  facePieceId?: string;
}

export interface FacePalsResult {
  pieces: Piece[];
  steps: Step[];
  warnings: string[];
}

function rect(id: string, w: number, h: number): Path {
  const e = (eid: string, sx: number, sy: number, ex: number, ey: number): StraightEdge =>
    ({ kind: 'straight', id: eid, role: 'cut', start: { x: sx, y: sy }, end: { x: ex, y: ey } });
  return {
    id: `${id}-outline`,
    closed: true,
    edges: [e(`${id}-top`, 0, 0, w, 0), e(`${id}-right`, w, 0, w, h), e(`${id}-bottom`, w, h, 0, h), e(`${id}-left`, 0, h, 0, 0)],
  };
}

export function buildFacePals(spec: FacePalsSpec): FacePalsResult {
  const warnings: string[] = [];
  const qty = FACE_PALS_BARS_PER_CELL * spec.cellCount;
  const minHeight = FACE_PALS_BARS_PER_CELL * FACE_PALS_WEBBING_WIDTH_MM + (FACE_PALS_BARS_PER_CELL - 1) * IN;
  if (spec.cellHeight_mm < minHeight) {
    warnings.push(
      `Cell height ${(spec.cellHeight_mm / IN).toFixed(2)}" is short for three 1" face bars at 1" gaps (needs ${(minHeight / IN).toFixed(1)}"); drop to two bars or accept tighter spacing.`,
    );
  }
  const piece: Piece = {
    id: 'face-pals-bar',
    name: 'Face PALS bar (1" webbing)',
    mirror: false,
    quantity: qty,
    materialId: 'webbing-25',
    paths: [rect('face-pals-bar', spec.cellSpan_mm, FACE_PALS_WEBBING_WIDTH_MM)],
    seamAllowances: { 'face-pals-bar-top': 0, 'face-pals-bar-right': 0, 'face-pals-bar-bottom': 0, 'face-pals-bar-left': 0 },
    annotations: [
      { kind: 'label', label: `Face bar — ${qty} × ${(spec.cellSpan_mm / IN).toFixed(2)}" of 1" webbing (3 per cell)` },
    ],
  };
  const steps: Step[] = [
    {
      id: 'face-pals-sew',
      title: `Sew ${FACE_PALS_BARS_PER_CELL} PALS bars onto each cell face`,
      body:
        `Centre one ${(spec.cellSpan_mm / IN).toFixed(2)}" bar per cell at each row position — 1" webbing with 1" gaps, the top bar starting about 1" below the mouth. ` +
        'Bartack each end on the cell centre-line so a stacked pouch lands on grid; the top bar is the bungee anchor. Sew the visible end first and let the far end fall where it falls.',
      dependsOn: spec.dependsOn ?? [],
      refsPieces: [piece.id, ...(spec.facePieceId ? [spec.facePieceId] : [])],
      group: 'Interior',
    },
  ];
  return { pieces: [piece], steps, warnings };
}
