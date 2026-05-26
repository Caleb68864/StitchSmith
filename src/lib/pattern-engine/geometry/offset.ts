import type { Point } from '../graph/Point.js';

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function cross2d(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

function lineIntersect(
  p1: Point, d1: Point,
  p2: Point, d2: Point,
): Point | null {
  const denom = cross2d(d1.x, d1.y, d2.x, d2.y);
  if (Math.abs(denom) < 1e-10) return null;
  const t = cross2d(p2.x - p1.x, p2.y - p1.y, d2.x, d2.y) / denom;
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}

/**
 * Offsets a polygon outward (positive d) or inward (negative d).
 * Input vertices must be in CCW order (standard math coords, Y-up).
 * Returns a Result error if self-intersection is detected on inward offsets.
 */
export function offsetPolygon(vertices: Point[], d: number): Result<Point[]> {
  const n = vertices.length;
  if (n < 3) return { ok: false, error: 'polygon must have at least 3 vertices' };

  // Compute outward normals for each edge
  const normals: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-12) return { ok: false, error: `degenerate edge at index ${i}` };
    // Outward normal for CCW polygon: rotate edge vector 90° clockwise → (dy, -dx)
    normals.push({ x: dy / len, y: -dx / len });
  }

  // Offset each edge
  const offsetEdges: { p: Point; dir: Point }[] = [];
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const nx = normals[i].x;
    const ny = normals[i].y;
    offsetEdges.push({
      p: { x: a.x + d * nx, y: a.y + d * ny },
      dir: { x: b.x - a.x, y: b.y - a.y },
    });
  }

  // Find intersections of adjacent offset edges to get new vertices
  const result: Point[] = [];
  for (let i = 0; i < n; i++) {
    const cur = offsetEdges[i];
    const nxt = offsetEdges[(i + 1) % n];
    const pt = lineIntersect(cur.p, cur.dir, nxt.p, nxt.dir);
    if (!pt) {
      // Parallel edges: use midpoint fallback
      result.push({ x: cur.p.x + cur.dir.x, y: cur.p.y + cur.dir.y });
    } else {
      result.push(pt);
    }
  }

  // Self-intersection check for inward offsets: detect winding reversal or edge crossing
  if (d < 0) {
    // Winding reversal: if original was CCW (positive signed area), result must also be CCW
    const origSigned = signedArea(vertices);
    const resSigned = signedArea(result);
    if (origSigned * resSigned < 0) {
      return { ok: false, error: 'self-intersection detected in inward offset' };
    }
    for (let i = 0; i < n; i++) {
      const a = result[i];
      const b = result[(i + 1) % n];
      for (let j = i + 2; j < n; j++) {
        if (j === n - 1 && i === 0) continue; // adjacent
        const c = result[j];
        const dd = result[(j + 1) % n];
        const denom = cross2d(b.x - a.x, b.y - a.y, dd.x - c.x, dd.y - c.y);
        if (Math.abs(denom) < 1e-10) continue;
        const t = cross2d(c.x - a.x, c.y - a.y, dd.x - c.x, dd.y - c.y) / denom;
        const u = cross2d(c.x - a.x, c.y - a.y, b.x - a.x, b.y - a.y) / denom;
        if (t > 0 && t < 1 && u > 0 && u < 1) {
          return { ok: false, error: 'self-intersection detected in inward offset' };
        }
      }
    }
  }

  return { ok: true, value: result };
}

function signedArea(vertices: Point[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

export function polygonArea(vertices: Point[]): number {
  return Math.abs(signedArea(vertices));
}
