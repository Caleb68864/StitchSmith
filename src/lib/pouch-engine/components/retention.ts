/**
 * Retention component for the pouch engine.
 *
 * Emits cut-piece geometry for retention so the BOM and the pattern preview
 * stay in sync.
 *
 *   flap_velcro     — hook strip (lid underside) + loop strip (face); the loop
 *                     field is longer than the hook by the adjustment travel
 *   flap_snap /     — hardware only, no cut pieces
 *   flap_fastex
 *   open_top_bungee — no fabric pieces; bungee and pull tabs are BOM items
 *   velcro_dot      — interior loop on BOTH cell walls + a 1" hook square on
 *                     one face of each magazine (vault: 1 in² is the spec)
 *   kydex_wedge     — interior loop on BOTH cell walls; wedge is a bought part
 *   none            — nothing
 *
 * Interior loop is also emitted when `interiorLoop` is set regardless of
 * style — SOE lines every card cell so it accepts any retention later.
 */

import type { Piece } from '../../pattern-engine/graph/Piece.js';
import type { StraightEdge } from '../../pattern-engine/graph/Edge.js';
import type { Path } from '../../pattern-engine/graph/Path.js';
import type { Step } from '../../pattern-engine/instructions/Step.js';

export type RetentionStyle =
  | 'flap_velcro'
  | 'flap_snap'
  | 'flap_fastex'
  | 'open_top_bungee'
  | 'velcro_dot'
  | 'kydex_wedge'
  | 'none'
  | 'flap_only';

export interface RetentionSpec {
  style: RetentionStyle;
  /** Hook-side velcro strip length in mm (flap_velcro only). */
  hookLength_mm?: number;
  /** Loop-side velcro strip length in mm (flap_velcro only). */
  loopLength_mm?: number;
  /** Number of cells (interior loop strips = 2 per cell). Default 1. */
  cellCount?: number;
  /** Interior loop strip length = cell height, mm. */
  cellHeight_mm?: number;
  /** Force interior loop strips on both walls of every cell. */
  interiorLoop?: boolean;
  /** Step ids the interior work must follow (e.g. the card's interior-ready step). */
  interiorDependsOn?: string[];
  facePieceId?: string;
}

export interface RetentionResult {
  pieces: Piece[];
  steps: Step[];
  warnings: string[];
}

const IN = 25.4;

/** Standard 1" hook-and-loop tape width (lid closure). */
export const VELCRO_STRIP_WIDTH_MM = 1 * IN;

/** Interior wall loop width — reads ~2" on camera; unverified, measure a mag. */
export const INTERIOR_LOOP_WIDTH_MM = 2 * IN;

/** Velcro-dot retention: 1" hook square per magazine, one face only. */
export const HOOK_DOT_SIZE_MM = 1 * IN;

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

function strip(id: string, name: string, width: number, length_mm: number, qty: number, materialId: string, note?: string): Piece {
  return {
    id,
    name,
    mirror: false,
    quantity: qty,
    materialId,
    paths: [makeRect(id, width, length_mm)],
    seamAllowances: zeroSa(id),
    annotations: [
      {
        kind: 'label',
        label: `${name} — ${qty} × ${width.toFixed(1)} × ${length_mm.toFixed(1)} mm${note ? ` (${note})` : ''}`,
      },
    ],
  };
}

function interiorLoopPieces(spec: RetentionSpec): { pieces: Piece[]; steps: Step[] } {
  const cells = spec.cellCount ?? 1;
  const height = spec.cellHeight_mm ?? 0;
  if (height <= 0) return { pieces: [], steps: [] };
  const piece = strip(
    'interior-loop',
    'Interior loop (both cell walls)',
    INTERIOR_LOOP_WIDTH_MM,
    height,
    2 * cells,
    'velcro-loop',
    'cut to net; runs full height to the mouth',
  );
  const steps: Step[] = [
    {
      id: 'interior-loop-sew',
      title: 'Sew loop onto both interior walls of every cell',
      body:
        `Two ${height.toFixed(0)} mm loop strips per cell, one on the face interior and one on the back interior, run vertically all the way to the mouth so the ` +
        'magazine rubs Velcro rather than stitching or raw edges on the way in. Loop on both walls lets the mag go in bullets-left or bullets-right and still find loop. ' +
        'Short sides first, then long sides. Keep the strip clear of any later stitch field (cradle, divisions).',
      dependsOn: spec.interiorDependsOn ?? [],
      refsPieces: [piece.id, ...(spec.facePieceId ? [spec.facePieceId] : [])],
      group: 'Interior',
    },
  ];
  return { pieces: [piece], steps };
}

export function buildRetention(spec: RetentionSpec): RetentionResult {
  const pieces: Piece[] = [];
  const steps: Step[] = [];
  const warnings: string[] = [];

  const needsInteriorLoop =
    spec.interiorLoop === true || spec.style === 'velcro_dot' || spec.style === 'kydex_wedge';
  if (needsInteriorLoop) {
    const loop = interiorLoopPieces(spec);
    pieces.push(...loop.pieces);
    steps.push(...loop.steps);
    if (loop.pieces.length === 0) {
      warnings.push('Interior loop requested but cellHeight_mm is missing — no loop strips emitted.');
    }
  }

  switch (spec.style) {
    case 'flap_velcro': {
      if (spec.hookLength_mm && spec.hookLength_mm > 0) {
        pieces.push(strip('velcro-hook', 'Lid hook strip', VELCRO_STRIP_WIDTH_MM, spec.hookLength_mm, 1, 'velcro-hook', 'underside of lid'));
      }
      if (spec.loopLength_mm && spec.loopLength_mm > 0) {
        pieces.push(strip('velcro-loop', 'Face loop field', VELCRO_STRIP_WIDTH_MM, spec.loopLength_mm, 1, 'velcro-loop', 'on the face; longer than the hook by the travel'));
      }
      if (!pieces.some((p) => p.id === 'velcro-hook' || p.id === 'velcro-loop')) {
        warnings.push('flap_velcro retention with no hook/loop length — no velcro pieces emitted.');
      }
      break;
    }
    case 'velcro_dot': {
      const cells = spec.cellCount ?? 1;
      pieces.push(
        strip('hook-dot', 'Hook dot (on magazine)', HOOK_DOT_SIZE_MM, HOOK_DOT_SIZE_MM, cells, 'velcro-hook', 'one face of each mag only'),
      );
      steps.push({
        id: 'retention-velcro-dot',
        title: 'Stick a 1" hook square on one face of each magazine',
        body:
          'One 1" square (or dot) of adhesive hook per magazine, on ONE face only — two faces grab too hard to draw. ' +
          'Cell depth does most of the holding; the dot keeps the mag from walking out. Tunable per mag, nothing sewn.',
        dependsOn: ['interior-loop-sew'],
        refsPieces: ['hook-dot'],
        group: 'Retention',
      });
      break;
    }
    case 'kydex_wedge': {
      steps.push({
        id: 'retention-kydex',
        title: 'Seat a Kydex wedge in each cell',
        body:
          'Slip a strip of paper or thin card into the cell to mask the loop, drop the wedge in, pull the mask and press down. ' +
          'Once the loop grabs it is near impossible to remove, so seat it where you want it. Wedges are platform-specific — a .308 wedge is a different part from an M4 wedge.',
        dependsOn: ['interior-loop-sew'],
        refsPieces: [],
        group: 'Retention',
      });
      break;
    }
    case 'open_top_bungee': {
      steps.push({
        id: 'retention-bungee',
        title: 'Lace the bungee retention',
        body:
          'Anchor one bungee per cell through the top face bar (front-routed so it stays adjustable) with a pull tab over the mag top. ' +
          'Start with 16" of cord per cell and lace a mock first — fat cord needs ~18". Keep every knot reachable so the elastic can be replaced without disassembly.',
        dependsOn: spec.interiorDependsOn ?? [],
        refsPieces: [],
        group: 'Retention',
      });
      break;
    }
    // Hardware-only or no retention: no cut pieces.
    case 'flap_snap':
    case 'flap_fastex':
    case 'flap_only':
    case 'none':
      break;
    default: {
      const _exhaustive: never = spec.style;
      warnings.push(`Unknown retention style: ${_exhaustive}`);
    }
  }

  return { pieces, steps, warnings };
}
