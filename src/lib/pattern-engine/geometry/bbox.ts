import type { Point } from '../graph/Point.js';
import type { Edge } from '../graph/Edge.js';
import type { Path } from '../graph/Path.js';
import type { Piece } from '../graph/Piece.js';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function bboxFromPoints(points: Point[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function edgePoints(edge: Edge): Point[] {
  switch (edge.kind) {
    case 'straight':
      return [edge.start, edge.end];
    case 'arc': {
      // Sample arc at start, end, and a few intermediate points
      const pts: Point[] = [edge.start, edge.end];
      const startAngle = Math.atan2(edge.start.y - edge.center.y, edge.start.x - edge.center.x);
      const endAngle = Math.atan2(edge.end.y - edge.center.y, edge.end.x - edge.center.x);
      const steps = 8;
      for (let i = 1; i < steps; i++) {
        const angle = startAngle + (endAngle - startAngle) * (i / steps);
        pts.push({
          x: edge.center.x + edge.radius * Math.cos(angle),
          y: edge.center.y + edge.radius * Math.sin(angle),
        });
      }
      return pts;
    }
    case 'bezier':
      return [edge.start, edge.cp1, edge.cp2, edge.end];
  }
}

export function bboxFromPath(path: Path): BoundingBox {
  const points: Point[] = [];
  for (const edge of path.edges) {
    points.push(...edgePoints(edge));
  }
  return bboxFromPoints(points);
}

export function bboxFromPiece(piece: Piece): BoundingBox {
  const points: Point[] = [];
  for (const path of piece.paths) {
    for (const edge of path.edges) {
      points.push(...edgePoints(edge));
    }
  }
  return bboxFromPoints(points);
}

export function unionBbox(a: BoundingBox, b: BoundingBox): BoundingBox {
  const minX = Math.min(a.minX, b.minX);
  const minY = Math.min(a.minY, b.minY);
  const maxX = Math.max(a.maxX, b.maxX);
  const maxY = Math.max(a.maxY, b.maxY);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
