import type { Point } from '../pattern-engine/graph/Point.js';

/**
 * A held region of one piece's cloth, in that piece's flat coordinates: a disc
 * round a point, a rectangle, or an annulus.
 *
 * The shape has to enclose an area comparable with the mesh spacing or it holds
 * nothing: mesh vertices sit on a grid, so a disc smaller than a cell usually
 * falls between them. That is how a circle skirt came to be pinned at 50 points
 * along its waist and still fall — every 4 mm disc missed the 16 mm grid. Use
 * `ring` for anything sewn round a curve.
 */
export type PinSpec =
  | { pieceId: string; point: Point; radius: number }
  | { pieceId: string; rect: { x0: number; y0: number; x1: number; y1: number } }
  | { pieceId: string; ring: { cx: number; cy: number; r0: number; r1: number } };

export function pinHolds(pins: PinSpec[], pieceId: string, f: Point): boolean {
  for (const p of pins) {
    if (p.pieceId !== pieceId) continue;
    if ('rect' in p) {
      if (f.x >= p.rect.x0 && f.x <= p.rect.x1 && f.y >= p.rect.y0 && f.y <= p.rect.y1) return true;
    } else if ('ring' in p) {
      const d = Math.hypot(f.x - p.ring.cx, f.y - p.ring.cy);
      if (d >= p.ring.r0 && d <= p.ring.r1) return true;
    } else if (Math.hypot(f.x - p.point.x, f.y - p.point.y) <= p.radius) return true;
  }
  return false;
}
