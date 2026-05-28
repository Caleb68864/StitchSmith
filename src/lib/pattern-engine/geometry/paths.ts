// Path construction primitives used by every generator.
// These are pure graph helpers — no domain knowledge, no defaults — and live in
// pattern-engine so generators can stop redeclaring them locally.

import type { Point } from '../graph/Point.js';
import type { Edge } from '../graph/Edge.js';
import type { Path } from '../graph/Path.js';

export function point(x: number, y: number): Point {
  return { x, y };
}

/**
 * Axis-aligned rectangle outline starting at (0,0). Caller picks the edge role
 * (default 'cut'). Vertex order matches the convention used by all generators:
 * (0,0) → (w,0) → (w,h) → (0,h).
 */
export function makeRectOutline(
  id: string,
  w: number,
  h: number,
  role: Edge['role'] = 'cut',
): Path {
  return {
    id,
    closed: true,
    edges: [
      { kind: 'straight', id: `${id}:e0`, role, start: point(0, 0), end: point(w, 0) },
      { kind: 'straight', id: `${id}:e1`, role, start: point(w, 0), end: point(w, h) },
      { kind: 'straight', id: `${id}:e2`, role, start: point(w, h), end: point(0, h) },
      { kind: 'straight', id: `${id}:e3`, role, start: point(0, h), end: point(0, 0) },
    ],
  };
}

/**
 * Rectangle outline with rounded corners — 4 ArcEdge + 4 StraightEdge.
 * `r` is the corner radius. If `r <= 0`, returns a plain rect.
 *
 * Traversal matches the book-cover convention:
 * bottom → bottom-right arc → right → top-right arc → top → top-left arc →
 * left → bottom-left arc.
 */
export function makeRoundedRectOutline(
  id: string,
  w: number,
  h: number,
  r: number,
  role: Edge['role'] = 'cut',
): Path {
  if (r <= 0) return makeRectOutline(id, w, h, role);
  const radius = Math.min(r, w / 2, h / 2);
  return {
    id,
    closed: true,
    edges: [
      // Bottom: left tangent to right tangent
      { kind: 'straight', id: `${id}:e0`, role, start: point(radius, 0), end: point(w - radius, 0) },
      // Bottom-right arc: center (w-r, r)
      { kind: 'arc', id: `${id}:e1`, role, start: point(w - radius, 0), end: point(w, radius), center: point(w - radius, radius), radius, clockwise: true },
      // Right edge
      { kind: 'straight', id: `${id}:e2`, role, start: point(w, radius), end: point(w, h - radius) },
      // Top-right arc: center (w-r, h-r)
      { kind: 'arc', id: `${id}:e3`, role, start: point(w, h - radius), end: point(w - radius, h), center: point(w - radius, h - radius), radius, clockwise: true },
      // Top: right to left
      { kind: 'straight', id: `${id}:e4`, role, start: point(w - radius, h), end: point(radius, h) },
      // Top-left arc: center (r, h-r)
      { kind: 'arc', id: `${id}:e5`, role, start: point(radius, h), end: point(0, h - radius), center: point(radius, h - radius), radius, clockwise: true },
      // Left edge
      { kind: 'straight', id: `${id}:e6`, role, start: point(0, h - radius), end: point(0, radius) },
      // Bottom-left arc: center (r, r)
      { kind: 'arc', id: `${id}:e7`, role, start: point(0, radius), end: point(radius, 0), center: point(radius, radius), radius, clockwise: true },
    ],
  };
}

/**
 * Inward seam-allowance offset of a rounded-rect outline. Returns a closed
 * 'seam'-role Path tracing the inset rounded rect with true arc edges (not a
 * polyline approximation). Returns null when SA collapses the inner radius
 * to zero or negative.
 *
 * Arc centers are preserved from the outer outline; arc radii are reduced by
 * SA. This is geometrically the correct inward offset of a rounded rectangle.
 */
export function makeRoundedRectSaPath(
  id: string,
  w: number,
  h: number,
  r: number,
  SA: number,
): Path | null {
  if (SA <= 0) return null;
  const innerR = r - SA;
  if (innerR <= 0) return null;
  return {
    id,
    closed: true,
    edges: [
      { kind: 'straight', id: `${id}:e0`, role: 'seam', start: point(r, SA), end: point(w - r, SA) },
      { kind: 'arc', id: `${id}:e1`, role: 'seam', start: point(w - r, SA), end: point(w - SA, r), center: point(w - r, r), radius: innerR, clockwise: true },
      { kind: 'straight', id: `${id}:e2`, role: 'seam', start: point(w - SA, r), end: point(w - SA, h - r) },
      { kind: 'arc', id: `${id}:e3`, role: 'seam', start: point(w - SA, h - r), end: point(w - r, h - SA), center: point(w - r, h - r), radius: innerR, clockwise: true },
      { kind: 'straight', id: `${id}:e4`, role: 'seam', start: point(w - r, h - SA), end: point(r, h - SA) },
      { kind: 'arc', id: `${id}:e5`, role: 'seam', start: point(r, h - SA), end: point(SA, h - r), center: point(r, h - r), radius: innerR, clockwise: true },
      { kind: 'straight', id: `${id}:e6`, role: 'seam', start: point(SA, h - r), end: point(SA, r) },
      { kind: 'arc', id: `${id}:e7`, role: 'seam', start: point(SA, r), end: point(r, SA), center: point(r, r), radius: innerR, clockwise: true },
    ],
  };
}

/**
 * Vertical line as an open single-edge Path. Useful for fold lines.
 */
export function makeVertLine(
  id: string,
  x: number,
  h: number,
  role: Edge['role'],
  label?: string,
): Path {
  return {
    id,
    closed: false,
    edges: [
      { kind: 'straight', id: `${id}:e0`, role, start: point(x, 0), end: point(x, h) },
    ],
    label,
  };
}

/**
 * Horizontal line as an open single-edge Path. Useful for hem fold lines.
 */
export function makeHorizLine(
  id: string,
  y: number,
  w: number,
  role: Edge['role'],
  label?: string,
): Path {
  return {
    id,
    closed: false,
    edges: [
      { kind: 'straight', id: `${id}:e0`, role, start: point(0, y), end: point(w, y) },
    ],
    label,
  };
}

/**
 * Closed polyline from a list of points (each point becomes a vertex). Used
 * primarily for seam-allowance paths returned by `offsetPolygon`.
 */
export function makePathFromPoints(
  id: string,
  pts: Point[],
  role: Edge['role'],
): Path {
  const edges: Edge[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    edges.push({
      kind: 'straight',
      id: `${id}:e${i}`,
      role,
      start: pts[i],
      end: pts[(i + 1) % n],
    });
  }
  return { id, closed: true, edges };
}
