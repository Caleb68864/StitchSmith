/**
 * How the viewer lays out its pieces: placed pieces sit in the scene frame,
 * the rest in a side-by-side row. Kept out of FoldViewer so it can be tested
 * against the cloth test harness without WebGL.
 */
import type { Pattern } from '../../../lib/pattern-engine/graph/Pattern.js';
import { bboxFromPiece } from '../../../lib/pattern-engine/geometry/bbox.js';
import { buildFoldModel, isScenePlaced, type FoldModel } from '../../../lib/fold-engine/index.js';
import type { FoldPreview3DProps, PiecePlacement } from '../FoldPreview3D.js';

const PIECE_GAP = 20;
export const PALETTE = [0x4f7cac, 0xc98b4a, 0x6aa36f, 0xa66a9e, 0xd0b04d, 0x5d8f9e, 0xb3675b, 0x8b8b8b];

export interface PieceEntry {
  model: FoldModel;
  /** Flat-frame translation applied before folding. */
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  color: number;
  placement?: PiecePlacement;
}

export function layoutPieces(pattern: Pattern, allPieces: boolean, placements: Record<string, PiecePlacement>, base?: FoldPreview3DProps['object'] extends infer O ? (O extends { base?: infer B } ? B : never) : never): PieceEntry[] {
  const entries: PieceEntry[] = [];
  let x = 0;
  const models = pattern.pieces.map((piece) => {
    let rootPoint = placements[piece.id]?.rootPoint;
    // The object stands on the root by definition: root the host piece just inside its base edge.
    if (!rootPoint && base && base.pieceId === piece.id) {
      rootPoint = { x: base.point.x + base.direction.x, y: base.point.y + base.direction.y };
    }
    return buildFoldModel(piece, { rootPoint });
  });
  const anyFolds = models.some((m) => m && m.folds.length > 0);
  const assembled = Object.keys(placements).length > 0;
  pattern.pieces.forEach((piece, i) => {
    const model = models[i];
    if (!model) return;
    const pl = placements[piece.id];
    // By default show the pieces that actually fold (or every piece when none do). In an
    // assembled scene show only the placed pieces and the object's host: every other piece is
    // a loose strip or pocket that would only clutter the sewn-up view.
    const isHost = base?.pieceId === piece.id;
    if (!allPieces && assembled && !pl && !isHost) return;
    if (!allPieces && !assembled && anyFolds && model.folds.length === 0 && !pl?.keep) return;
    const bb = bboxFromPiece(piece);
    if (isScenePlaced(pl)) {
      // Placed pieces (offsets, a rotation, a drape path, or riding on another piece) sit in the
      // scene frame instead of the side-by-side row, exactly as the cloth harness places them.
      entries.push({ model, offsetX: pl.dx ?? 0, offsetY: pl.dy ?? 0, offsetZ: pl.dz ?? 0, color: PALETTE[i % PALETTE.length], placement: pl });
      return;
    }
    entries.push({ model, offsetX: x - bb.minX, offsetY: 0, offsetZ: 0, color: PALETTE[i % PALETTE.length] });
    x += bb.width + PIECE_GAP;
  });
  return entries;
}

