/**
 * 3D check for the micro rig: the front panel layer with the pleated face
 * sewn to it (divisions through both face layers, gathered bottom) round a
 * magazine standing in the first cell, and the back layer behind it. The
 * utility pocket and strips are not assembled.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { PiecePlacement } from '../../lib/fold-engine/index.js';
import type { SeamSpec, PinSpec } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs } from './types.js';
import { PANEL_FRONT_ID, PANEL_BACK_ID, FACE_ID, REAR_POUCH_ID, FRONT_POUCH_ID } from './buildPattern.js';

const IN = 25.4;

export interface MicroRigAssembly {
  pieces: Piece[];
  object: { width: number; depth: number; height: number; label: string; lift: number; base: { pieceId: string; point: Point; direction: Point } };
  placements: Record<string, PiecePlacement>;
  seams: SeamSpec[];
  /** Held cloth. Stacked cells pin only the panel's top strip and outboard zone so it can bow behind the magazines. */
  pins?: PinSpec[];
}

export function microRigAssembly(pieces: Piece[], r: ResolvedInputs): MicroRigAssembly | null {
  const front = pieces.find((p) => p.id === PANEL_FRONT_ID);
  const back = pieces.find((p) => p.id === PANEL_BACK_ID);
  if (!front || !back) return null;
  if (r.pocket_set === 'stacked_cells') return stackedAssembly(pieces, r, front, back);
  const face = pieces.find((p) => p.id === FACE_ID);
  if (!face || r.pocket_set !== 'mag_cells') return null;
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

/**
 * Stacked cells: the self-lined rear pouch sewn to the front layer at its divisions with the
 * magazine (flat side out) in column 1, and — two deep — the column-1 front pouch sewn over it at
 * the wider front-cell marks, so the wrap allowance shows as the face standing off the rear cell.
 */
function stackedAssembly(pieces: Piece[], r: ResolvedInputs, front: Piece, back: Piece): MicroRigAssembly | null {
  const rear = pieces.find((p) => p.id === REAR_POUCH_ID);
  if (!rear) return null;
  const frontPouch = r.cells_deep === 2 ? pieces.find((p) => p.id === FRONT_POUCH_ID) : undefined;
  const hem = 0.5 * IN;
  const ph = r.pouch_height;
  const magX0 = r.edge_margin;
  const cellTop = r.panel_height - ph;
  const cellBottom = r.panel_height;
  const n = r.cell_count;
  const seams: SeamSpec[] = [];
  // Rear pouch: root half (below the mouth fold) to the panel at every division and both sides; bottom too.
  for (let k = 0; k <= n; k++) {
    const xr = hem + k * r.rear_cell_width;
    const xb = magX0 + k * r.rear_cell_width;
    seams.push(
      { label: k === 0 || k === n ? 'rear outer side' : `rear division ${k}`, a: { pieceId: REAR_POUCH_ID, from: { x: xr, y: 2 * ph }, to: { x: xr, y: ph } }, b: { pieceId: PANEL_FRONT_ID, from: { x: xb, y: cellBottom }, to: { x: xb, y: cellTop } } },
      { label: `rear ${k} (outer layer)`, a: { pieceId: REAR_POUCH_ID, from: { x: xr, y: 0 }, to: { x: xr, y: ph } }, b: { pieceId: PANEL_FRONT_ID, from: { x: xb, y: cellBottom }, to: { x: xb, y: cellTop } }, gap: 2.4 },
    );
  }
  // The cradle webbing spans the cell bottom from the pouch face to the panel, so the pouch bottom
  // hangs one magazine thickness in front of the panel's bottom line rather than against it.
  const bottomGap = r.mag.thickness + 2;
  seams.push(
    { label: 'rear bottom (via cradle)', a: { pieceId: REAR_POUCH_ID, from: { x: hem, y: 2 * ph }, to: { x: hem + n * r.rear_cell_width, y: 2 * ph } }, b: { pieceId: PANEL_FRONT_ID, from: { x: magX0, y: cellBottom }, to: { x: magX0 + n * r.rear_cell_width, y: cellBottom } }, gap: bottomGap },
    { label: 'rear bottom, outer layer (via cradle)', a: { pieceId: REAR_POUCH_ID, from: { x: hem, y: 0 }, to: { x: hem + n * r.rear_cell_width, y: 0 } }, b: { pieceId: PANEL_FRONT_ID, from: { x: magX0, y: cellBottom }, to: { x: magX0 + n * r.rear_cell_width, y: cellBottom } }, gap: bottomGap + 1.2 },
    { label: 'layers, left', a: { pieceId: PANEL_FRONT_ID, from: { x: 0, y: 0 }, to: { x: 0, y: r.panel_height } }, b: { pieceId: PANEL_BACK_ID, from: { x: 0, y: 0 }, to: { x: 0, y: r.panel_height } } },
    { label: 'layers, right', a: { pieceId: PANEL_FRONT_ID, from: { x: r.panel_width, y: 0 }, to: { x: r.panel_width, y: r.panel_height } }, b: { pieceId: PANEL_BACK_ID, from: { x: r.panel_width, y: 0 }, to: { x: r.panel_width, y: r.panel_height } } },
    { label: 'layers, bottom', a: { pieceId: PANEL_FRONT_ID, from: { x: 0, y: r.panel_height }, to: { x: r.panel_width, y: r.panel_height } }, b: { pieceId: PANEL_BACK_ID, from: { x: 0, y: r.panel_height }, to: { x: r.panel_width, y: r.panel_height } } },
  );
  const rearPlaced: Piece = { ...rear, quantity: 1 };
  const body: Piece[] = [{ ...front, quantity: 1 }, rearPlaced, { ...back, quantity: 1 }];
  const placements: Record<string, PiecePlacement> = {
    [REAR_POUCH_ID]: { rootPoint: { x: hem + r.rear_cell_width / 2, y: ph + ph / 2 }, dx: magX0 - hem, dy: cellBottom - 2 * ph, dz: r.mag.thickness + 1 },
    [PANEL_BACK_ID]: { dx: 0, dy: 0, dz: -2.4 },
  };
  if (frontPouch) {
    // Column-1 front pouch: its sides sew to the rear pouch's first two divisions, one stack layer out.
    const fw = r.front_cell_mark + 2 * hem;
    const fh = 2 * ph + 1 * IN;
    const fp: Piece = { ...frontPouch, quantity: 1 };
    body.splice(2, 0, fp);
    placements[FRONT_POUCH_ID] = { rootPoint: { x: fw / 2, y: ph + 0.5 * IN + ph / 2 }, dx: magX0 - hem, dy: cellBottom - fh, dz: r.stack_depth + 3 };
    const xr0 = hem, xr1 = hem + r.rear_cell_width;
    const yTop = ph + 0.5 * IN, yBot = fh - 1 * IN;
    seams.push(
      { label: 'front pouch left', a: { pieceId: FRONT_POUCH_ID, from: { x: hem, y: yBot }, to: { x: hem, y: yTop } }, b: { pieceId: REAR_POUCH_ID, from: { x: xr0, y: 2 * ph }, to: { x: xr0, y: ph } }, gap: 2.4 },
      { label: 'front pouch right', a: { pieceId: FRONT_POUCH_ID, from: { x: fw - hem, y: yBot }, to: { x: fw - hem, y: yTop } }, b: { pieceId: REAR_POUCH_ID, from: { x: xr1, y: 2 * ph }, to: { x: xr1, y: ph } }, gap: 2.4 },
      { label: 'front pouch bottom (via cradle)', a: { pieceId: FRONT_POUCH_ID, from: { x: hem, y: yBot }, to: { x: fw - hem, y: yBot } }, b: { pieceId: REAR_POUCH_ID, from: { x: xr0, y: 2 * ph }, to: { x: xr1, y: 2 * ph } }, gap: bottomGap },
    );
  }
  return {
    pieces: [...body, ...pieces.filter((p) => ![PANEL_FRONT_ID, PANEL_BACK_ID, REAR_POUCH_ID, FRONT_POUCH_ID].includes(p.id))],
    // The magazine stands flat side out: its depth runs across the cell, its thickness out from the panel.
    object: {
      width: r.mag.width, depth: r.mag.thickness, height: r.mag.height, label: 'magazine', lift: 4,
      base: { pieceId: PANEL_FRONT_ID, point: { x: magX0 + r.rear_cell_width / 2, y: cellBottom }, direction: { x: 0, y: -1 } },
    },
    placements,
    seams,
    // A flat cell holds a magazine only because the panel bows behind it (the vault: the stack
    // "measures fatter than the arithmetic"). Hold the top strip and everything outboard of the cells.
    pins: [
      { pieceId: PANEL_FRONT_ID, rect: { x0: 0, y0: 0, x1: r.panel_width, y1: Math.max(0, cellTop - 6) } },
      { pieceId: PANEL_FRONT_ID, rect: { x0: 0, y0: 0, x1: Math.max(0, magX0 - 4), y1: r.panel_height } },
      { pieceId: PANEL_FRONT_ID, rect: { x0: magX0 + n * r.rear_cell_width + 6, y0: 0, x1: r.panel_width, y1: r.panel_height } },
    ],
  };
}
