// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { resolveMeasurements } from '../drafting/measurements.js';
import { draftBodice, polylineLength } from '../drafting/bodice.js';
import { TEST_BODY } from './draftingFixtures.js';
import type { Point } from '../graph/Point.js';

const IN = 25.4;
const m = (() => { const r = resolveMeasurements({ ...TEST_BODY, ease: { chest: 4, waist: 4, hip: 4, neck: 1 } }, 'in'); if (!r.ok) throw new Error('m'); return r.value; })();
const block = (() => { const b = draftBodice(m, { shoulderDrop: 1.75 * IN }); if (!b.ok) throw new Error(b.error); return b.value; })();

/** Largest turn between consecutive segments, degrees: a smooth curve turns a little at each sample. */
function maxTurn(p: Point[]): number {
  let worst = 0;
  for (let i = 2; i < p.length; i++) {
    const a = Math.atan2(p[i - 1].y - p[i - 2].y, p[i - 1].x - p[i - 2].x), b = Math.atan2(p[i].y - p[i - 1].y, p[i].x - p[i - 1].x);
    let d = Math.abs(b - a); if (d > Math.PI) d = 2 * Math.PI - d;
    worst = Math.max(worst, (d * 180) / Math.PI);
  }
  return worst;
}

describe('drafting step 2 — bodice block', () => {
  it('back + front = half the eased body at the chest, waist and hip lines', () => {
    expect(2 * block.widths.chest).toBeCloseTo(44 * IN / 2, 6);
    expect(2 * block.widths.waist).toBeCloseTo(38 * IN / 2, 6);
    expect(2 * block.widths.hip).toBeCloseTo(44 * IN / 2, 6);
    expect(block.lines.chest).toBeCloseTo(9 * IN, 9);
    expect(block.lines.waist).toBeCloseTo(18 * IN, 9);
    expect(block.lines.hip).toBeCloseTo(26 * IN, 9);
  });
  it('the seams match: shoulder to shoulder, side to side, and the neckline measures half the eased neck', () => {
    const L = block.lengths;
    expect(L.shoulder[0]).toBeCloseTo(L.shoulder[1], 9);
    expect(L.side[0]).toBeCloseTo(L.side[1], 9);
    expect(L.neck[0] + L.neck[1]).toBeCloseTo(16.5 * IN / 2, 3);
    // The front neck is deeper than the back.
    expect(block.front.neckDepth).toBeGreaterThan(block.back.neckDepth);
    // Shoulder point at half the shoulder width, dropped as asked.
    expect(block.back.shoulder[1].x).toBeCloseTo(8.75 * IN, 9);
    expect(block.back.shoulder[1].y).toBeCloseTo(1.75 * IN, 9);
  });
  it('the curves are smooth (no kinks between samples) and the armhole runs shoulder → underarm', () => {
    expect(maxTurn(block.back.neck)).toBeLessThan(8);
    expect(maxTurn(block.front.neck)).toBeLessThan(8);
    expect(maxTurn(block.back.armhole)).toBeLessThan(10);
    const a = block.back.armhole;
    expect(a[0]).toEqual(block.back.shoulder[1]);
    expect(a[a.length - 1].x).toBeCloseTo(block.widths.chest, 9);
    expect(a[a.length - 1].y).toBeCloseTo(block.lines.chest, 9);
    // It arrives level at the underarm.
    expect(Math.abs(a[a.length - 1].y - a[a.length - 2].y)).toBeLessThan(1);
    expect(polylineLength(a)).toBeGreaterThan(block.lines.chest - 1.75 * IN);
  });
  it('the outline is closed and simple from the centre line round to the hem', () => {
    const o = block.back.outline;
    expect(o[0].x).toBe(0);
    expect(o[o.length - 1].x).toBe(0);
    expect(o[o.length - 1].y).toBeCloseTo(block.lines.hip, 9);
  });
  it('refuses a shoulder outside the chest or a drop to the chest line', () => {
    expect(draftBodice(m, { shoulderDrop: 10 * IN }).ok).toBe(false);
    const wide = resolveMeasurements({ ...TEST_BODY, shoulder_width: 19.9, chest: 40, ease: { chest: -4 } }, 'in');
    if (!wide.ok) throw new Error('wide');
    expect(draftBodice(wide.value, { shoulderDrop: 1.75 * IN }).ok).toBe(false);
    expect(draftBodice(m, { shoulderDrop: -1 }).ok).toBe(false);
  });
});
