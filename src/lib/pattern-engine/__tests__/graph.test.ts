import { describe, it, expect } from 'vitest';
import type { Point } from '../graph/Point.js';
import type { Edge, StraightEdge, ArcEdge, BezierEdge, EdgeRole } from '../graph/Edge.js';
import type { Path } from '../graph/Path.js';
import type { Piece, PieceAnnotation } from '../graph/Piece.js';
import type { Pattern } from '../graph/Pattern.js';

describe('Point', () => {
  it('holds x and y coordinates', () => {
    const p: Point = { x: 10, y: 20 };
    expect(p.x).toBe(10);
    expect(p.y).toBe(20);
  });
});

describe('Edge discriminated union', () => {
  it('StraightEdge has kind=straight, role, start, end', () => {
    const e: StraightEdge = {
      kind: 'straight',
      id: 'e1',
      role: 'cut',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
    };
    expect(e.kind).toBe('straight');
    expect(e.role).toBe('cut');
    expect(e.id).toBe('e1');
  });

  it('ArcEdge has kind=arc with center and radius', () => {
    const e: ArcEdge = {
      kind: 'arc',
      id: 'e1',
      role: 'fold',
      start: { x: 0, y: 10 },
      end: { x: 10, y: 0 },
      center: { x: 0, y: 0 },
      radius: 10,
      clockwise: false,
    };
    expect(e.kind).toBe('arc');
    expect(e.radius).toBe(10);
  });

  it('BezierEdge has kind=bezier with cp1 and cp2', () => {
    const e: BezierEdge = {
      kind: 'bezier',
      id: 'e1',
      role: 'seam',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      cp1: { x: 33, y: 30 },
      cp2: { x: 66, y: 30 },
    };
    expect(e.kind).toBe('bezier');
    expect(e.cp1.y).toBe(30);
  });

  it('supports all role values', () => {
    const roles: EdgeRole[] = ['cut', 'fold', 'stitch', 'seam', 'notch'];
    for (const role of roles) {
      const e: Edge = { kind: 'straight', id: `e-${role}`, role, start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };
      expect(e.role).toBe(role);
    }
  });
});

describe('Piece', () => {
  it('satisfies required interface shape', () => {
    const path: Path = { id: 'p1', edges: [], closed: true };
    const annotation: PieceAnnotation = { kind: 'grain', angle: 0 };
    const piece: Piece = {
      id: 'back',
      name: 'Back Panel',
      mirror: false,
      quantity: 1,
      paths: [path],
      materialId: 'main-fabric',
      annotations: [annotation],
    };
    expect(piece.id).toBe('back');
    expect(piece.mirror).toBe(false);
    expect(piece.quantity).toBe(1);
    expect(piece.paths).toHaveLength(1);
    expect(piece.annotations).toHaveLength(1);
  });
});

describe('Pattern', () => {
  it('holds pieces', () => {
    const pattern: Pattern = {
      id: 'test-pattern',
      name: 'Test Pattern',
      pieces: [],
    };
    expect(pattern.pieces).toHaveLength(0);
  });
});
