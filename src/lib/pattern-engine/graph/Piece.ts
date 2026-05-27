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
