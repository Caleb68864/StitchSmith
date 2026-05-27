/**
 * Retention component for the pouch engine.
 *
 * Emits cut-piece geometry for retention hardware so the BOM and the pattern
 * preview stay in sync. Today only `flap_velcro` produces fabric/velcro
 * pieces; snap and fastex retention is hardware-only.
 */

import type { Piece } from '../../pattern-engine/graph/Piece.js';
import type { StraightEdge } from '../../pattern-engine/graph/Edge.js';
import type { Path } from '../../pattern-engine/graph/Path.js';

export type RetentionStyle =
  | 'flap_velcro'
  | 'flap_snap'
  | 'flap_fastex'
  | 'open_top_bungee'
  | 'flap_only';

export interface RetentionSpec {
  style: RetentionStyle;
  /** Hook-side velcro strip length in mm (flap_velcro only). */
  hookLength_mm?: number;
  /** Loop-side velcro strip length in mm (flap_velcro only). */
  loopLength_mm?: number;
}

export interface RetentionResult {
  pieces: Piece[];
  warnings: string[];
}

/** Standard 1" hook-and-loop tape width. */
const VELCRO_STRIP_WIDTH_MM = 25.4;

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

function strip(id: string, name: string, length_mm: number): Piece {
  return {
    id,
    name,
    mirror: false,
    quantity: 1,
    paths: [makeRect(id, VELCRO_STRIP_WIDTH_MM, length_mm)],
    annotations: [
      {
        kind: 'label',
        label: `${name} — ${VELCRO_STRIP_WIDTH_MM} × ${length_mm.toFixed(1)} mm`,
      },
    ],
  };
}

export function buildRetention(spec: RetentionSpec): RetentionResult {
  switch (spec.style) {
    case 'flap_velcro': {
      const pieces: Piece[] = [];
      const warnings: string[] = [];
      if (spec.hookLength_mm && spec.hookLength_mm > 0) {
        pieces.push(strip('velcro-hook', 'Velcro Hook Strip', spec.hookLength_mm));
      }
      if (spec.loopLength_mm && spec.loopLength_mm > 0) {
        pieces.push(strip('velcro-loop', 'Velcro Loop Strip', spec.loopLength_mm));
      }
      if (pieces.length === 0) {
        warnings.push('flap_velcro retention with no hook/loop length — no velcro pieces emitted.');
      }
      return { pieces, warnings };
    }
    // Hardware-only retention styles have no cut pieces.
    case 'flap_snap':
    case 'flap_fastex':
    case 'open_top_bungee':
    case 'flap_only':
      return { pieces: [], warnings: [] };
    default: {
      const _exhaustive: never = spec.style;
      return { pieces: [], warnings: [`Unknown retention style: ${_exhaustive}`] };
    }
  }
}
