/**
 * Cradle component — a webbing strip under each cell that carries the
 * magazine bottom: up the face interior, across the bottom, up the back.
 *
 * Source: vault mag-pouches/mag-cell-bottom-flat-vs-cradle.md. SOE's cut is
 * 1" + 1" + 1" = 3" of ~1" webbing per cell, corrected on camera from 3.5".
 * The 1" bottom segment is "shortest that keeps primers covered", not derived
 * from the magazine — so when the object is thicker than 1" the strip must bow
 * and the builder should mock one cell first.
 */

import type { Piece } from '../../pattern-engine/graph/Piece.js';
import type { StraightEdge } from '../../pattern-engine/graph/Edge.js';
import type { Path } from '../../pattern-engine/graph/Path.js';
import type { Step } from '../../pattern-engine/instructions/Step.js';

const IN = 25.4;

export const CRADLE_WEBBING_WIDTH_MM = 1 * IN;
export const CRADLE_REACH_MM = 1 * IN;
export const CRADLE_DEFAULT_LENGTH_MM = 3 * IN;

export interface CradleSpec {
  cellCount: number;
  /** Object depth in the cell (magazine thickness), mm. Drives the bow warning. */
  objectDepth_mm: number;
  /** Override total strip length, mm. Default 3". */
  length_mm?: number;
  /** Step id the cradle step must follow (the interior-ready step). */
  dependsOn?: string[];
  facePieceId?: string;
}

export interface CradleResult {
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

export function buildCradles(spec: CradleSpec): CradleResult {
  const length = spec.length_mm ?? CRADLE_DEFAULT_LENGTH_MM;
  const warnings: string[] = [];
  const bottomSegment = length - 2 * CRADLE_REACH_MM;

  if (spec.objectDepth_mm > bottomSegment + 0.5) {
    warnings.push(
      `Cradle bottom segment is ${(bottomSegment / IN).toFixed(2)}" but the magazine is ${(spec.objectDepth_mm / IN).toFixed(2)}" thick — ` +
        'the strip will bow or pinch the cell walls. Mock one cell in scrap and tune the cradle length; 3" is "shortest that keeps primers covered", not derived geometry.',
    );
  }

  const piece: Piece = {
    id: 'cradle-strip',
    name: 'Cradle strip (1" webbing)',
    mirror: false,
    quantity: spec.cellCount,
    materialId: 'webbing-25',
    paths: [rect('cradle', length, CRADLE_WEBBING_WIDTH_MM)],
    seamAllowances: { 'cradle-top': 0, 'cradle-right': 0, 'cradle-bottom': 0, 'cradle-left': 0 },
    annotations: [
      {
        kind: 'label',
        label: `Cradle — ${spec.cellCount} × ${(length / IN).toFixed(2)}" of 1" webbing (1" up face, ${(bottomSegment / IN).toFixed(2)}" bottom, 1" up back)`,
      },
    ],
  };

  const steps: Step[] = [
    {
      id: 'cradle-tack',
      title: 'Tack a cradle strip under each cell',
      body:
        `Centre one ${(length / IN).toFixed(2)}" strip of 1" webbing on each cell: ${(CRADLE_REACH_MM / IN).toFixed(0)}" up the face interior, ` +
        `${(bottomSegment / IN).toFixed(2)}" across the bottom, ${(CRADLE_REACH_MM / IN).toFixed(0)}" up the back. It sits between the Cordura and the interior loop, ` +
        'so tack the face end before the loop strip goes on. Both ends must finish concealed — hemmed under at the face, buried under the loop at the back — never raw inside the channel. ' +
        'Keep the loop above the cradle stitch field: multi-pass stitching shreds Velcro.',
      dependsOn: spec.dependsOn ?? [],
      refsPieces: ['cradle-strip', ...(spec.facePieceId ? [spec.facePieceId] : [])],
      group: 'Interior',
    },
  ];

  return { pieces: [piece], steps, warnings };
}
