/**
 * 3D check for the micro rig: the front panel layer with the pleated face
 * sewn to it (divisions through both face layers, gathered bottom) round a
 * magazine standing in the first cell, and the back layer behind it. The
 * utility pocket and strips are not assembled.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { PiecePlacement } from '../../lib/fold-engine/index.js';
import type { SeamSpec } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs } from './types.js';
import { PANEL_FRONT_ID, PANEL_BACK_ID, FACE_ID } from './buildPattern.js';

const IN = 25.4;

export interface MicroRigAssembly {
  pieces: Piece[];
  object: { width: number; depth: number; height: number; label: string; lift: number; base: { pieceId: string; point: Point; direction: Point } };
  placements: Record<string, PiecePlacement>;
  seams: SeamSpec[];
}

export function microRigAssembly(pieces: Piece[], r: ResolvedInputs): MicroRigAssembly | null {
  const front = pieces.find((p) => p.id === PANEL_FRONT_ID);
  const back = pieces.find((p) => p.id === PANEL_BACK_ID);
  const face = pieces.find((p) => p.id === FACE_ID);
  if (!front || !back || !face || r.pocket_set !== 'mag_cells') return null;
  const faceEndHem = 0.5 * IN;
  const cardH = r.cell_height;
  const faceCutH = 2 * cardH;
  const magX0 = r.edge_margin;
  const cellTop = r.panel_height - cardH;
  const cellBottom = r.panel_height;
  const seams: SeamSpec[] = [];
  for (let k = 0; k <= r.cell_count; k++) {
    const xf = faceEndHem + k * r.face_per_cell;
    const xb = magX0 + k * r.cell_span;
    const name = k === 0 || k === r.cell_count ? 'outer side' : `division ${k}`;
    seams.push(
      { label: name, a: { pieceId: FACE_ID, from: { x: xf, y: faceCutH }, to: { x: xf, y: faceCutH - cardH } }, b: { pieceId: PANEL_FRONT_ID, from: { x: xb, y: cellBottom }, to: { x: xb, y: cellTop } } },
      { label: `${name} (outer layer)`, a: { pieceId: FACE_ID, from: { x: xf, y: 0 }, to: { x: xf, y: cardH } }, b: { pieceId: PANEL_FRONT_ID, from: { x: xb, y: cellBottom }, to: { x: xb, y: cellTop } }, gap: 2.4 },
    );
  }
  for (let k = 0; k < r.cell_count; k++) {
    const xf0 = faceEndHem + k * r.face_per_cell, xf1 = xf0 + r.face_per_cell;
    const xb0 = magX0 + k * r.cell_span, xb1 = xb0 + r.cell_span;
    seams.push(
      { label: `bottom gather ${k + 1}`, a: { pieceId: FACE_ID, from: { x: xf0, y: faceCutH }, to: { x: xf1, y: faceCutH } }, b: { pieceId: PANEL_FRONT_ID, from: { x: xb0, y: cellBottom }, to: { x: xb1, y: cellBottom } } },
      { label: `bottom gather ${k + 1} (outer layer)`, a: { pieceId: FACE_ID, from: { x: xf0, y: 0 }, to: { x: xf1, y: 0 } }, b: { pieceId: PANEL_FRONT_ID, from: { x: xb0, y: cellBottom }, to: { x: xb1, y: cellBottom } }, gap: 2.4 },
    );
  }
  // Panel layers meet at the sides and bottom (edge tape); the top stays open on the Velcro.
  seams.push(
    { label: 'layers, left', a: { pieceId: PANEL_FRONT_ID, from: { x: 0, y: 0 }, to: { x: 0, y: r.panel_height } }, b: { pieceId: PANEL_BACK_ID, from: { x: 0, y: 0 }, to: { x: 0, y: r.panel_height } } },
    { label: 'layers, right', a: { pieceId: PANEL_FRONT_ID, from: { x: r.panel_width, y: 0 }, to: { x: r.panel_width, y: r.panel_height } }, b: { pieceId: PANEL_BACK_ID, from: { x: r.panel_width, y: 0 }, to: { x: r.panel_width, y: r.panel_height } } },
    { label: 'layers, bottom', a: { pieceId: PANEL_FRONT_ID, from: { x: 0, y: r.panel_height }, to: { x: r.panel_width, y: r.panel_height } }, b: { pieceId: PANEL_BACK_ID, from: { x: 0, y: r.panel_height }, to: { x: r.panel_width, y: r.panel_height } } },
  );
  const singleFront: Piece = { ...front, quantity: 1 };
  const singleBack: Piece = { ...back, quantity: 1 };
  const singleFace: Piece = { ...face, quantity: 1 };
  return {
    pieces: [singleFront, singleFace, singleBack, ...pieces.filter((p) => ![PANEL_FRONT_ID, PANEL_BACK_ID, FACE_ID].includes(p.id))],
    object: {
      width: r.mag.width, depth: r.mag.thickness, height: r.mag.height, label: 'magazine', lift: 1 * IN,
      base: { pieceId: PANEL_FRONT_ID, point: { x: magX0 + r.cell_span / 2, y: cellBottom }, direction: { x: 0, y: -1 } },
    },
    placements: {
      // Face folded double at its mouth, stood one magazine deep in front of the panel, bottoms aligned.
      [FACE_ID]: { rootPoint: { x: faceEndHem + r.face_per_cell / 2, y: cardH + cardH / 2 }, dx: magX0 - faceEndHem, dy: cellBottom - faceCutH, dz: r.mag.thickness + 1 },
      [PANEL_BACK_ID]: { dx: 0, dy: 0, dz: -2.4 },
    },
    seams,
  };
}
