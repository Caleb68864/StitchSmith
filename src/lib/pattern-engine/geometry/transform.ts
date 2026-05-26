import type { Point } from '../graph/Point.js';

export function translatePoint(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy };
}

export function rotatePoint(p: Point, cx: number, cy: number, radians: number): Point {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export function scalePoint(p: Point, cx: number, cy: number, sx: number, sy: number): Point {
  return {
    x: cx + (p.x - cx) * sx,
    y: cy + (p.y - cy) * sy,
  };
}

export function mirrorPointX(p: Point, axisX: number): Point {
  return { x: 2 * axisX - p.x, y: p.y };
}

export function mirrorPointY(p: Point, axisY: number): Point {
  return { x: p.x, y: 2 * axisY - p.y };
}
