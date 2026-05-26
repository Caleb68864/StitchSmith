import type { Point } from './Point.js';

export type EdgeRole = 'cut' | 'fold' | 'stitch' | 'seam' | 'notch';

export type EdgeId = string;

export interface StraightEdge {
  kind: 'straight';
  id: EdgeId;
  role: EdgeRole;
  start: Point;
  end: Point;
}

export interface ArcEdge {
  kind: 'arc';
  id: EdgeId;
  role: EdgeRole;
  start: Point;
  end: Point;
  center: Point;
  radius: number;
  clockwise: boolean;
}

export interface BezierEdge {
  kind: 'bezier';
  id: EdgeId;
  role: EdgeRole;
  start: Point;
  end: Point;
  cp1: Point;
  cp2: Point;
}

export type Edge = StraightEdge | ArcEdge | BezierEdge;

export function makeEdgeIdGen(prefix: string): () => EdgeId {
  let n = 0;
  return () => `${prefix}:e${n++}`;
}
