import type { Path } from './Path.js';
import type { Point } from './Point.js';
import type { EdgeId } from './Edge.js';

export interface PieceAnnotation {
  kind: 'grain' | 'notch' | 'label' | 'custom';
  label?: string;
  point?: Point;
  angle?: number;
}

export interface Piece {
  id: string;
  name: string;
  /** Cut N mirrored copies (typically pairs: LH + RH). */
  mirror: boolean;
  quantity: number;
  paths: Path[];
  materialId?: string;
  /** The sub-assembly the piece goes into (front, straps…), for cut sheets grouped by assembly. Optional. */
  assembly?: string;
  annotations?: PieceAnnotation[];
  /** Per-edge seam allowance in mm, keyed by Edge.id. Missing entries mean 0 mm. */
  seamAllowances?: Record<EdgeId, number>;
  /**
   * Cut this piece with fabric folded along its left edge — the fold becomes
   * the finished piece's centerline. When true, the cutter cuts ONE physical
   * piece from doubled fabric.
   */
  cutOnFold?: boolean;
}

/**
 * Tag pieces with their sub-assembly for cut sheets grouped by assembly: the
 * first rule whose pattern matches the piece id wins; unmatched pieces keep any
 * assembly they already have, else `fallback`. Mutates and returns `pieces`.
 */
export function assignAssemblies(pieces: Piece[], rules: [RegExp, string][], fallback = 'Other'): Piece[] {
  for (const p of pieces) {
    const hit = rules.find(([re]) => re.test(p.id));
    p.assembly = hit ? hit[1] : p.assembly ?? fallback;
  }
  return pieces;
}
