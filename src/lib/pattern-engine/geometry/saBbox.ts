import type { Piece } from '../graph/Piece.js';
import { bboxFromPiece, bboxFromPoints, unionBbox } from './bbox.js';
import type { BoundingBox } from './bbox.js';
import { computeSeamAllowancePolygon } from './offset.js';

/**
 * Bounding box of a piece including its seam-allowance outer cut polygon.
 * Shared by the SVG/PDF exporters (page layout) and the cut list (yardage):
 * without SA the box under-reports the fabric a piece actually consumes.
 *
 * `defaultSa` applies to closed paths whose Piece has no `seamAllowances`
 * entry; 0 falls back to the plain body bbox unless per-edge SA is set.
 */
export function bboxFromPieceWithSa(piece: Piece, defaultSa: number): BoundingBox {
  let box = bboxFromPiece(piece);
  if (!piece.seamAllowances && defaultSa <= 0) return box;
  for (const path of piece.paths) {
    if (!path.closed) continue;
    const sa = computeSeamAllowancePolygon(piece, path, defaultSa);
    if (sa.ok && sa.value) {
      box = unionBbox(box, bboxFromPoints(sa.value));
    }
  }
  return box;
}
