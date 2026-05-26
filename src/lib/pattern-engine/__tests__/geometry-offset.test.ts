import { describe, it, expect } from 'vitest';
import { offsetPolygon, offsetPolygonPerEdge, polygonArea, computeSeamAllowancePolygon } from '../geometry/offset.js';
import type { Point } from '../graph/Point.js';
import type { Piece } from '../graph/Piece.js';
import type { Path } from '../graph/Path.js';

// CCW square 1000mm x 1000mm (1 m²)
const unitSquareCCW: Point[] = [
  { x: 0, y: 0 },
  { x: 1000, y: 0 },
  { x: 1000, y: 1000 },
  { x: 0, y: 1000 },
];

describe('offsetPolygon — outward', () => {
  it('outward 1mm offset of a 1000x1000mm square produces area ≈ 1.004 m²', () => {
    const result = offsetPolygon(unitSquareCCW, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const area = polygonArea(result.value);
    // (1002)² = 1,004,004 mm² = 1.004004 m²
    expect(area).toBeCloseTo(1_004_004, 0);
  });
});

describe('offsetPolygon — inward', () => {
  it('inward 0.5mm offset of a 1000x1000mm square produces area ≈ 0.998 m²', () => {
    const result = offsetPolygon(unitSquareCCW, -0.5);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const area = polygonArea(result.value);
    // (999)² = 998,001 mm² ≈ 0.998 m²
    expect(area).toBeCloseTo(998_001, 0);
  });
});

describe('offsetPolygon — self-intersection detection', () => {
  it('inward offset deeper than the shape width returns an error Result', () => {
    // Narrow 10mm x 100mm strip; inward offset of 6mm would collapse/self-intersect
    const narrowStrip: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 100 },
      { x: 0, y: 100 },
    ];
    const result = offsetPolygon(narrowStrip, -6);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeTruthy();
  });
});

describe('offsetPolygon — error cases', () => {
  it('returns error for degenerate polygon with fewer than 3 vertices', () => {
    const r = offsetPolygon([{ x: 0, y: 0 }, { x: 1, y: 0 }], 1);
    expect(r.ok).toBe(false);
  });
});

describe('polygonArea', () => {
  it('computes area of a unit square correctly', () => {
    const sq: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(polygonArea(sq)).toBeCloseTo(10_000, 1);
  });
});

describe('offsetPolygonPerEdge', () => {
  it('uniform distances match offsetPolygon', () => {
    const uniform = offsetPolygonPerEdge(unitSquareCCW, [2, 2, 2, 2]);
    const expected = offsetPolygon(unitSquareCCW, 2);
    expect(uniform.ok && expected.ok).toBe(true);
    if (!uniform.ok || !expected.ok) return;
    for (let i = 0; i < 4; i++) {
      expect(uniform.value[i].x).toBeCloseTo(expected.value[i].x, 6);
      expect(uniform.value[i].y).toBeCloseTo(expected.value[i].y, 6);
    }
  });

  it('different SA per edge mitres corners correctly', () => {
    // 100x100 CCW square. SA: bottom 5, right/top/left 10.
    const sq: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const r = offsetPolygonPerEdge(sq, [5, 10, 10, 10]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // result[i] is the corner where edge i meets edge i+1.
    // edge 0 = bottom, edge 1 = right ⇒ result[0] = bottom-right corner.
    expect(r.value[0].x).toBeCloseTo(110, 6); // right SA
    expect(r.value[0].y).toBeCloseTo(-5, 6);  // bottom SA
    // edge 1 = right, edge 2 = top ⇒ result[1] = top-right corner
    expect(r.value[1].x).toBeCloseTo(110, 6);
    expect(r.value[1].y).toBeCloseTo(110, 6);
    // result[3] = bottom-left
    expect(r.value[3].x).toBeCloseTo(-10, 6);
    expect(r.value[3].y).toBeCloseTo(-5, 6);
  });

  it('errors when distances length mismatches vertices length', () => {
    const r = offsetPolygonPerEdge(unitSquareCCW, [1, 2, 3]);
    expect(r.ok).toBe(false);
  });
});

describe('computeSeamAllowancePolygon', () => {
  function makeSquarePiece(saByEdge: Record<string, number>): { piece: Piece; path: Path } {
    const path: Path = {
      id: 'sq-outline',
      closed: true,
      edges: [
        { kind: 'straight', id: 'sq-e0', role: 'cut', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
        { kind: 'straight', id: 'sq-e1', role: 'cut', start: { x: 100, y: 0 }, end: { x: 100, y: 100 } },
        { kind: 'straight', id: 'sq-e2', role: 'cut', start: { x: 100, y: 100 }, end: { x: 0, y: 100 } },
        { kind: 'straight', id: 'sq-e3', role: 'cut', start: { x: 0, y: 100 }, end: { x: 0, y: 0 } },
      ],
    };
    const piece: Piece = {
      id: 'sq', name: 'Square', mirror: false, quantity: 1, paths: [path],
      seamAllowances: saByEdge,
    };
    return { piece, path };
  }

  it('returns null when every edge has SA = 0', () => {
    const { piece, path } = makeSquarePiece({ 'sq-e0': 0, 'sq-e1': 0, 'sq-e2': 0, 'sq-e3': 0 });
    const r = computeSeamAllowancePolygon(piece, path);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toBeNull();
  });

  it('honors per-edge SA from Piece.seamAllowances', () => {
    const { piece, path } = makeSquarePiece({ 'sq-e0': 5, 'sq-e1': 10, 'sq-e2': 10, 'sq-e3': 10 });
    const r = computeSeamAllowancePolygon(piece, path);
    expect(r.ok).toBe(true);
    if (!r.ok || !r.value) throw new Error('expected SA polygon');
    // The bottom edge (e0, SA=5) contributes its offset line at y=-5; the two
    // corners that touch it are bottom-right (result[0]) and bottom-left
    // (result[3]).
    expect(r.value[0].y).toBeCloseTo(-5, 6);
    expect(r.value[3].y).toBeCloseTo(-5, 6);
  });

  it('falls back to defaultSa for edges without an explicit entry', () => {
    const { piece, path } = makeSquarePiece({});
    const r = computeSeamAllowancePolygon(piece, path, 10);
    expect(r.ok).toBe(true);
    if (!r.ok || !r.value) throw new Error('expected SA polygon');
    const xs = r.value.map((p) => p.x).sort((a, b) => a - b);
    const ys = r.value.map((p) => p.y).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(-10, 6);
    expect(xs[3]).toBeCloseTo(110, 6);
    expect(ys[0]).toBeCloseTo(-10, 6);
    expect(ys[3]).toBeCloseTo(110, 6);
  });

  it('rejects open paths', () => {
    const { piece, path } = makeSquarePiece({});
    const openPath: Path = { ...path, closed: false };
    const r = computeSeamAllowancePolygon(piece, openPath, 5);
    expect(r.ok).toBe(false);
  });
});
