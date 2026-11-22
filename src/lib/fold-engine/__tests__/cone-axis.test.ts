// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { conePoint, coneFrame } from '../placement.js';

const base = { apex: { x: 0, y: 0 }, apex3: [10, 20, 30] as [number, number, number], halfAngle: 0.3, angleScale: 4, angle0: 0.2 };
const flats = [{ x: 50, y: 80 }, { x: -30, y: 120 }, { x: 5, y: 200 }];

describe('cone placement along any axis (a tube round a sloping arm)', () => {
  it('the default axis gives exactly the old hanging cone', () => {
    for (const f of flats) {
      const a = conePoint(base, f), b = conePoint({ ...base, axis: [0, -1, 0] }, f);
      for (let i = 0; i < 3; i++) expect(b[i]).toBeCloseTo(a[i], 9);
    }
  });
  it('along a tilted axis every point sits rho from the axis line and h along it', () => {
    const axis: [number, number, number] = [0.6, -0.8, 0];
    const { a, e1, e2 } = coneFrame(axis);
    // Orthonormal.
    const dot = (u: number[], v: number[]) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    expect(dot(a, e1)).toBeCloseTo(0, 12);
    expect(dot(a, e2)).toBeCloseTo(0, 12);
    expect(dot(e1, e2)).toBeCloseTo(0, 12);
    for (const f of flats) {
      const p = conePoint({ ...base, axis }, f);
      const r = Math.hypot(f.x, f.y);
      const v = [p[0] - base.apex3[0], p[1] - base.apex3[1], p[2] - base.apex3[2]];
      const h = dot(v, a);
      expect(h).toBeCloseTo(r * Math.cos(base.halfAngle), 9);
      const off = [v[0] - h * a[0], v[1] - h * a[1], v[2] - h * a[2]];
      expect(Math.hypot(off[0], off[1], off[2])).toBeCloseTo(r * Math.sin(base.halfAngle), 9);
    }
  });
  it('a ref along the axis falls back to +z', () => {
    const { e1 } = coneFrame([1, 0, 0], [1, 0, 0]);
    expect(e1[2]).toBeCloseTo(1, 12);
  });
});
