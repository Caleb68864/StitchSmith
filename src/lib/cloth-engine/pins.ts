import type { Point } from '../pattern-engine/graph/Point.js';

/** A held region of one piece's cloth: a disc round a flat point, or a flat rectangle. */
export type PinSpec =
  | { pieceId: string; point: Point; radius: number }
  | { pieceId: string; rect: { x0: number; y0: number; x1: number; y1: number } };

export function pinHolds(pins: PinSpec[], pieceId: string, f: Point): boolean {
  for (const p of pins) {
    if (p.pieceId !== pieceId) continue;
    if ('rect' in p) {
      if (f.x >= p.rect.x0 && f.x <= p.rect.x1 && f.y >= p.rect.y0 && f.y <= p.rect.y1) return true;
    } else if (Math.hypot(f.x - p.point.x, f.y - p.point.y) <= p.radius) return true;
  }
  return false;
}
