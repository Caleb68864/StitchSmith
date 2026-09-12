/**
 * Piece instances for 3D assembly. A pattern piece cut twice mirrored is one
 * `Piece` with `mirror: true`; the assembled bag needs both copies as separate
 * pieces with their own flat geometry.
 */
import type { Piece } from '../pattern-engine/graph/Piece.js';
import type { Path } from '../pattern-engine/graph/Path.js';
import type { Edge } from '../pattern-engine/graph/Edge.js';
import type { Point } from '../pattern-engine/graph/Point.js';
import { bboxFromPiece } from '../pattern-engine/geometry/bbox.js';

/** Mirror a piece left-to-right about its own bounding-box centre, keeping its bbox. */
export function mirrorPieceX(piece: Piece, id: string, name?: string): Piece {
  const bb = bboxFromPiece(piece);
  const axis = (bb.minX + bb.maxX) / 2;
  const mp = (p: Point): Point => ({ x: 2 * axis - p.x, y: p.y });
  const me = (e: Edge): Edge => {
    switch (e.kind) {
      case 'straight': return { ...e, start: mp(e.start), end: mp(e.end) };
      case 'arc': return { ...e, start: mp(e.start), end: mp(e.end), center: mp(e.center), clockwise: !e.clockwise };
      case 'bezier': return { ...e, start: mp(e.start), end: mp(e.end), cp1: mp(e.cp1), cp2: mp(e.cp2) };
    }
  };
  const paths: Path[] = piece.paths.map((path) => ({ ...path, edges: path.edges.map(me) }));
  const annotations = piece.annotations?.map((a) => (a.point ? { ...a, point: mp(a.point) } : a));
  return { ...piece, id, name: name ?? `${piece.name} (mirrored)`, mirror: false, quantity: 1, paths, annotations };
}
