// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { catenary, catenaryPoints, polylineLength, MAX_SAG_RATIO } from '../catenary.js';

const ok = (span: number, sag: number) => {
  const r = catenary(span, sag);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe('catenary', () => {
  it('meets the chord at both ends and sags exactly `sag` at mid-span', () => {
    const c = ok(3048, 76.2);
    expect(c.depth(0)).toBeCloseTo(0, 9);
    expect(c.depth(3048)).toBeCloseTo(0, 9);
    expect(c.depth(1524)).toBeCloseTo(76.2, 6);
  });

  it('is symmetric about mid-span and deepest there', () => {
    const c = ok(2000, 100);
    for (const t of [100, 400, 777, 950]) expect(c.depth(t)).toBeCloseTo(c.depth(2000 - t), 9);
    for (let t = 0; t <= 2000; t += 50) expect(c.depth(t)).toBeLessThanOrEqual(100 + 1e-9);
  });

  it('satisfies the catenary equation a·(cosh(span/2a) − 1) = sag', () => {
    const c = ok(2500, 60);
    expect(c.a * (Math.cosh(1250 / c.a) - 1)).toBeCloseTo(60, 6);
  });

  it('is within 0.5 % of the parabola 4·s·t(L − t)/L² for a shallow cat cut (sag ≤ 1/20 of the span)', () => {
    const L = 3048, s = L / 20;
    const c = ok(L, s);
    for (let t = 0; t <= L; t += L / 16) {
      const parabola = (4 * s * t * (L - t)) / (L * L);
      expect(Math.abs(c.depth(t) - parabola)).toBeLessThan(0.005 * s);
    }
  });

  it('has an arc length longer than the chord, matching a fine polyline and the shallow-curve estimate L + 8s²/3L', () => {
    const L = 3048, s = 100;
    const c = ok(L, s);
    expect(c.arcLength).toBeGreaterThan(L);
    const fine = catenaryPoints({ x: 0, y: 0 }, { x: L, y: 0 }, s, { x: 0, y: 1 }, 2000);
    expect(polylineLength(fine)).toBeCloseTo(c.arcLength, 2);
    expect(c.arcLength).toBeCloseTo(L + (8 * s * s) / (3 * L), 0);
  });

  it('reports its slope: zero at mid-span, steepest and opposite at the ends', () => {
    const c = ok(2000, 100);
    expect(c.slope(1000)).toBeCloseTo(0, 9);
    expect(c.slope(0)).toBeGreaterThan(0);
    expect(c.slope(2000)).toBeCloseTo(-c.slope(0), 9);
    // Shallow catenary: end slope ≈ 4·sag/span.
    expect(c.slope(0)).toBeCloseTo(0.2, 2);
  });

  it('a zero sag is the straight chord', () => {
    const c = ok(1000, 0);
    expect(c.depth(500)).toBe(0);
    expect(c.arcLength).toBe(1000);
  });

  it('rejects a non-positive span, a negative sag and a sag deeper than the cap', () => {
    expect(catenary(0, 10).ok).toBe(false);
    expect(catenary(NaN, 10).ok).toBe(false);
    expect(catenary(1000, -1).ok).toBe(false);
    expect(catenary(1000, 1000 * MAX_SAG_RATIO + 1).ok).toBe(false);
    expect(catenary(1000, 1000 * MAX_SAG_RATIO).ok).toBe(true);
  });
});

describe('catenaryPoints', () => {
  it('bows toward the given side, keeps the ends exact and returns segments + 1 points', () => {
    const pts = catenaryPoints({ x: 10, y: 20 }, { x: 1010, y: 20 }, 50, { x: 500, y: 500 }, 10);
    expect(pts).toHaveLength(11);
    expect(pts[0]).toEqual({ x: 10, y: 20 });
    expect(pts[10]).toEqual({ x: 1010, y: 20 });
    expect(pts[5].y).toBeCloseTo(70, 6);
    const up = catenaryPoints({ x: 10, y: 20 }, { x: 1010, y: 20 }, 50, { x: 500, y: -500 }, 10);
    expect(up[5].y).toBeCloseTo(-30, 6);
  });

  it('works on a chord at any angle', () => {
    const pts = catenaryPoints({ x: 0, y: 0 }, { x: 0, y: 1000 }, 40, { x: 100, y: 500 }, 8);
    expect(pts[4].x).toBeCloseTo(40, 6);
    expect(pts[4].y).toBeCloseTo(500, 6);
  });
});
