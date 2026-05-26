import type { Point } from '../graph/Point.js';
import type { Edge } from '../graph/Edge.js';
import type { Path } from '../graph/Path.js';
import type { Piece } from '../graph/Piece.js';

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
  if (!isFinite(d)) return { ok: false, error: `offset distance must be a finite number (got ${d})` };
  for (let i = 0; i < n; i++) {
    if (!isFinite(vertices[i].x) || !isFinite(vertices[i].y)) {
      return { ok: false, error: `vertex ${i} has non-finite coordinates` };
    }
  }

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

/**
 * Sample a curved edge into a polyline. Straight edges return [start, end].
 * Arcs and beziers are sampled at `segments` points; 24 is fine for fabric SA
 * which is small relative to typical curve radii.
 */
function sampleEdge(edge: Edge, segments = 24): Point[] {
  switch (edge.kind) {
    case 'straight':
      return [edge.start, edge.end];
    case 'arc': {
      const { center, radius, clockwise } = edge;
      let startAngle = Math.atan2(edge.start.y - center.y, edge.start.x - center.x);
      let endAngle = Math.atan2(edge.end.y - center.y, edge.end.x - center.x);
      if (clockwise && endAngle < startAngle) endAngle += 2 * Math.PI;
      if (!clockwise && endAngle > startAngle) endAngle -= 2 * Math.PI;
      const pts: Point[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const a = startAngle + (endAngle - startAngle) * t;
        pts.push({ x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) });
      }
      return pts;
    }
    case 'bezier': {
      const pts: Point[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const mt = 1 - t;
        pts.push({
          x: mt * mt * mt * edge.start.x + 3 * mt * mt * t * edge.cp1.x + 3 * mt * t * t * edge.cp2.x + t * t * t * edge.end.x,
          y: mt * mt * mt * edge.start.y + 3 * mt * mt * t * edge.cp1.y + 3 * mt * t * t * edge.cp2.y + t * t * t * edge.end.y,
        });
      }
      return pts;
    }
  }
}

/**
 * Flatten a closed Path's edges to a vertex list, with a parallel array of
 * per-segment SA values. Each Edge contributes its sampled segments; every
 * segment inherits its parent Edge's SA value.
 */
function flattenPath(
  path: Path,
  saByEdgeId: Record<string, number>,
  defaultSa: number,
): { vertices: Point[]; saPerEdge: number[] } {
  const vertices: Point[] = [];
  const saPerEdge: number[] = [];
  for (const edge of path.edges) {
    const sa = saByEdgeId[edge.id] ?? defaultSa;
    const sampled = sampleEdge(edge);
    const start = vertices.length === 0 ? 0 : 1;
    for (let i = start; i < sampled.length; i++) {
      vertices.push(sampled[i]);
      saPerEdge.push(sa);
    }
  }
  if (path.closed && vertices.length > 1) {
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-9) {
      vertices.pop();
      saPerEdge.pop();
    }
  }
  return { vertices, saPerEdge };
}

/**
 * Offset a polygon edge-by-edge with a per-edge distance array.
 * `distances[i]` applies to the edge from vertices[i] to vertices[i+1].
 */
export function offsetPolygonPerEdge(vertices: Point[], distances: number[]): Result<Point[]> {
  const n = vertices.length;
  if (n < 3) return { ok: false, error: 'polygon must have at least 3 vertices' };
  if (distances.length !== n) return { ok: false, error: `distances length ${distances.length} must equal vertices length ${n}` };
  for (let i = 0; i < n; i++) {
    if (!isFinite(vertices[i].x) || !isFinite(vertices[i].y)) {
      return { ok: false, error: `vertex ${i} has non-finite coordinates` };
    }
    if (!isFinite(distances[i])) {
      return { ok: false, error: `distance ${i} must be a finite number (got ${distances[i]})` };
    }
  }

  const offsetEdges: { p: Point; dir: Point }[] = [];
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-12) return { ok: false, error: `degenerate edge at index ${i}` };
    const nx = dy / len;
    const ny = -dx / len;
    const d = distances[i];
    offsetEdges.push({
      p: { x: a.x + d * nx, y: a.y + d * ny },
      dir: { x: dx, y: dy },
    });
  }

  const result: Point[] = [];
  for (let i = 0; i < n; i++) {
    const cur = offsetEdges[i];
    const nxt = offsetEdges[(i + 1) % n];
    const pt = lineIntersect(cur.p, cur.dir, nxt.p, nxt.dir);
    if (!pt) {
      result.push({ x: cur.p.x + cur.dir.x, y: cur.p.y + cur.dir.y });
    } else {
      result.push(pt);
    }
  }

  if (distances.some((d) => d < 0)) {
    const origSigned = signedArea(vertices);
    const resSigned = signedArea(result);
    if (origSigned * resSigned < 0) {
      return { ok: false, error: 'self-intersection detected in inward offset' };
    }
  }

  return { ok: true, value: result };
}

/**
 * Compute the seam-allowance outer cut line for a closed path on a piece.
 * Reads `piece.seamAllowances` keyed by `Edge.id`; edges without an entry
 * fall back to `defaultSa`. Returns ok:null when every edge has 0 SA.
 * SA convention: positive = outward (away from the body).
 */
export function computeSeamAllowancePolygon(
  piece: Piece,
  path: Path,
  defaultSa = 0,
): Result<Point[] | null> {
  if (!path.closed) return { ok: false, error: 'seam allowance only supported for closed paths' };
  const sa = piece.seamAllowances ?? {};
  const { vertices, saPerEdge } = flattenPath(path, sa, defaultSa);
  if (vertices.length < 3) return { ok: false, error: 'flattened path has fewer than 3 vertices' };
  if (saPerEdge.every((d) => d === 0)) return { ok: true, value: null };
  return offsetPolygonPerEdge(vertices, saPerEdge);
}
