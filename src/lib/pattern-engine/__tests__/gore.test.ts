// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { domeGores } from '../geometry/gore.js';

describe('domeGores — panels of a dome', () => {
  it('a hemisphere: each gore a quarter-circumference long, its base 1/N of the circumference', () => {
    const C = 560;
    const g = domeGores(C, C / (2 * Math.PI), 6);
    if (!g.ok) throw new Error(g.error);
    expect(g.value.length).toBeCloseTo(C / 4, 3);
    expect(2 * g.value.samples[0].half * 6).toBeCloseTo(C, 9);
    expect(g.value.samples[g.value.samples.length - 1].half).toBe(0);
  });
  it('at every height the N gore widths add up to the ring there', () => {
    const C = 560, H = 180, N = 8;
    const g = domeGores(C, H, N, 64);
    if (!g.ok) throw new Error(g.error);
    const a = C / (2 * Math.PI);
    const mid = g.value.samples[32]; // t = π/4
    expect(2 * mid.half * N).toBeCloseTo(2 * Math.PI * a * Math.cos(Math.PI / 4), 6);
    // Taller dome, longer gore than the hemisphere.
    expect(g.value.length).toBeGreaterThan(C / 4);
    for (let i = 1; i < g.value.samples.length; i++) expect(g.value.samples[i].half).toBeLessThanOrEqual(g.value.samples[i - 1].half + 1e-9);
  });
  it('rejects nonsense', () => {
    expect(domeGores(0, 100, 6).ok).toBe(false);
    expect(domeGores(500, 0, 6).ok).toBe(false);
    expect(domeGores(500, 100, 1).ok).toBe(false);
  });
});
