// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { resolveMeasurements } from '../drafting/measurements.js';
import { draftBodice } from '../drafting/bodice.js';
import { draftSleeve } from '../drafting/sleeve.js';
import { TEST_BODY } from './draftingFixtures.js';

const IN = 25.4;
const m = (() => { const r = resolveMeasurements({ ...TEST_BODY, ease: { chest: 4, bicep: 2, wrist: 2, neck: 1 } }, 'in'); if (!r.ok) throw new Error('m'); return r.value; })();
const bodice = (() => { const b = draftBodice(m, { shoulderDrop: 1.75 * IN }); if (!b.ok) throw new Error(b.error); return b.value; })();

describe('drafting step 3 — sleeve block', () => {
  it('each cap half measures its armhole within a millimetre (no cap ease)', () => {
    const s = draftSleeve(m, bodice);
    if (!s.ok) throw new Error(s.error);
    expect(Math.abs(s.value.lengths.capBack - bodice.lengths.armhole[0])).toBeLessThan(1);
    expect(Math.abs(s.value.lengths.capFront - bodice.lengths.armhole[1])).toBeLessThan(1);
    expect(s.value.capHeight).toBeGreaterThan(0);
  });
  it('cap ease is shared between the halves', () => {
    const s = draftSleeve(m, bodice, { capEase: 0.75 * IN });
    if (!s.ok) throw new Error(s.error);
    expect(s.value.lengths.capBack - bodice.lengths.armhole[0]).toBeCloseTo(0.375 * IN, 0);
    expect(s.value.lengths.capFront - bodice.lengths.armhole[1]).toBeCloseTo(0.375 * IN, 0);
    const plain = draftSleeve(m, bodice);
    if (!plain.ok) throw new Error('plain');
    expect(s.value.capHeight).toBeGreaterThan(plain.value.capHeight);
  });
  it('the bicep line is the eased bicep, the wrist the eased wrist, the length the arm; both underseams match', () => {
    const s = draftSleeve(m, bodice);
    if (!s.ok) throw new Error(s.error);
    const v = s.value;
    expect(v.capFront[v.capFront.length - 1].x - v.capBack[v.capBack.length - 1].x).toBeCloseTo(15 * IN, 6);
    expect(v.underseamFront[1].x - v.underseamBack[1].x).toBeCloseTo(9 * IN, 6);
    expect(v.underseamFront[1].y).toBeCloseTo(25 * IN, 9);
    const lb = Math.hypot(v.underseamBack[1].x - v.underseamBack[0].x, v.underseamBack[1].y - v.underseamBack[0].y);
    expect(lb).toBeCloseTo(v.lengths.underseam, 9);
    // Leaves the cap top level.
    expect(Math.abs(v.capFront[1].y - v.capFront[0].y)).toBeLessThan(1);
  });
  it('refuses a bicep too wide for the armhole, and a wrist wider than the bicep', () => {
    const fat = resolveMeasurements({ ...TEST_BODY, bicep: 30, ease: { chest: 4 } }, 'in');
    if (!fat.ok) throw new Error('fat');
    const b = draftBodice(fat.value, { shoulderDrop: 1.75 * IN });
    if (!b.ok) throw new Error(b.error);
    expect(draftSleeve(fat.value, b.value).ok).toBe(false);
    const wide = { ...m, eased: { ...m.eased, wrist: m.eased.bicep + 1 } };
    expect(draftSleeve(wide, bodice).ok).toBe(false);
  });
});
