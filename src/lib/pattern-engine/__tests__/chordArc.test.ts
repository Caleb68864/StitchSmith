// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { chordArc, chordArcPoints } from '../geometry/chordArc.js';

describe('chordArc — an arc of a given length on a given chord', () => {
  it('a semicircle: arc = π/2 × chord, rise = chord / 2', () => {
    const r = chordArc(100, (Math.PI / 2) * 100);
    if (!r.ok) throw new Error(r.error);
    expect(r.value.theta).toBeCloseTo(Math.PI, 6);
    expect(r.value.rise).toBeCloseTo(50, 4);
  });
  it('the solved arc has the asked length and stands on the chord', () => {
    const r = chordArc(660, 1016);
    if (!r.ok) throw new Error(r.error);
    const { radius, theta } = r.value;
    expect(radius * theta).toBeCloseTo(1016, 6);
    expect(2 * radius * Math.sin(theta / 2)).toBeCloseTo(660, 6);
    const pts = chordArcPoints(r.value, 200);
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    expect(len).toBeCloseTo(1016, 0);
    expect(Math.min(...pts.map((p) => p.y))).toBeCloseTo(-r.value.rise, 3);
    expect(pts[100].x).toBeCloseTo(330, 6);
  });
  it('rejects an arc no longer than its chord, or longer than a semicircle', () => {
    expect(chordArc(100, 100).ok).toBe(false);
    expect(chordArc(100, 160).ok).toBe(false);
    expect(chordArc(0, 10).ok).toBe(false);
  });
});
