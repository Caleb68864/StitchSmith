import type { Point } from './Point.js';

export type EdgeRole = 'cut' | 'fold' | 'stitch' | 'seam' | 'notch';

export interface StraightEdge {
  kind: 'straight';
  role: EdgeRole;
  start: Point;
  end: Point;
}

export interface ArcEdge {
  kind: 'arc';
  role: EdgeRole;
  start: Point;
  end: Point;
  center: Point;
  radius: number;
  clockwise: boolean;
}

export interface BezierEdge {
  kind: 'bezier';
  role: EdgeRole;
  start: Point;
  end: Point;
  cp1: Point;
  cp2: Point;
}

export type Edge = StraightEdge | ArcEdge | BezierEdge;
