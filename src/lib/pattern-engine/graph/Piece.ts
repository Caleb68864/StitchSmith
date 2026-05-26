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
  mirror: boolean;
  quantity: number;
  paths: Path[];
  materialId?: string;
  annotations?: PieceAnnotation[];
  /** Per-edge seam allowance in mm, keyed by Edge.id. Missing entries mean 0 mm. */
  seamAllowances?: Record<EdgeId, number>;
}
