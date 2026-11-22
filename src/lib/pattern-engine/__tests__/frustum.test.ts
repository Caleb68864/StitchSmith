// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { frustum, frustumPoint, radiusAt, edgeDirection } from '../geometry/frustum.js';

const arcLen = (f: ReturnType<typeof frustum> & { ok: true }, s: number, n = 400) => {
  let L = 0;
  for (let i = 1; i <= n; i++) { const a = frustumPoint(f.value, (i - 1) / n, s), b = frustumPoint(f.value, i / n, s); L += Math.hypot(b.x - a.x, b.y - a.y); }
  return L;
};

describe('frustum — flat development of a tapered tube', () => {
  it('both ends come out at their circumferences and the straight edges at the slant height (bottom wider)', () => {
    const f = frustum(381, 432, 305);
    if (!f.ok) throw new Error(f.error);
    expect(arcLen(f, 0)).toBeCloseTo(381, 1);
    expect(arcLen(f, 305)).toBeCloseTo(432, 1);
    const a = frustumPoint(f.value, 0, 0), b = frustumPoint(f.value, 0, 305);
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(305, 6);
    expect(radiusAt(f.value, 305) - radiusAt(f.value, 0)).toBeCloseTo(305, 9);
    const d = edgeDirection(f.value, 0);
    expect((b.x - a.x) / 305).toBeCloseTo(d.x, 9);
    expect((b.y - a.y) / 305).toBeCloseTo(d.y, 9);
  });
  it('bottom narrower: the apex flips below and the ends still measure right', () => {
    const f = frustum(432, 381, 305);
    if (!f.ok) throw new Error(f.error);
    expect(f.value.direction).toBe(-1);
    expect(arcLen(f, 0)).toBeCloseTo(432, 1);
    expect(arcLen(f, 305)).toBeCloseTo(381, 1);
    expect(frustumPoint(f.value, 0.5, 305).y - frustumPoint(f.value, 0.5, 0).y).toBeCloseTo(305, 6);
  });
  it('equal ends: a rectangle to within a micron', () => {
    const f = frustum(400, 400, 300);
    if (!f.ok) throw new Error(f.error);
    expect(arcLen(f, 0)).toBeCloseTo(400, 3);
    const a = frustumPoint(f.value, 0, 0), b = frustumPoint(f.value, 0, 300);
    expect(Math.abs(b.x - a.x)).toBeLessThan(1e-3);
  });
  it('rejects bad input and a piece that would wrap past a full circle', () => {
    expect(frustum(0, 400, 300).ok).toBe(false);
    expect(frustum(400, 400, 0).ok).toBe(false);
    expect(frustum(100, 3000, 50).ok).toBe(false);
  });
});
