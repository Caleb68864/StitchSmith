import { describe, it, expect } from 'vitest';
import { offsetPolygon, polygonArea } from '../geometry/offset.js';
import type { Point } from '../graph/Point.js';

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
