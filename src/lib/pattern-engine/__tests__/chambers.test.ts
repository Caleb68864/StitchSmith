// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { layoutChambers, fillGrams, MM3_PER_IN3, G_PER_OZ, SEWN_THROUGH_PROFILE, MAX_CHAMBERS } from '../primitives/chambers.js';

const IN = 25.4;
const base = { length: 78 * IN, spacing: 6 * IN, loft: 2 * IN, style: 'baffled' as const, widthAt: () => 50 * IN, fillPower: 850, overstuffPct: 10 };

describe('baffle-chamber primitive', () => {
  it('fill = volume × (1 + overstuff) / fill power: 850 in³ at 850 FP, 0 % = 1 oz', () => {
    expect(fillGrams(850 * MM3_PER_IN3, 850, 0)).toBeCloseTo(G_PER_OZ, 9);
    expect(fillGrams(850 * MM3_PER_IN3, 850, 10)).toBeCloseTo(1.1 * G_PER_OZ, 9);
  });

  it('a spacing that divides the length gives that pitch; one that does not is shortened to an even pitch', () => {
    const a = layoutChambers(base);
    if (!a.ok) throw new Error(a.error);
    expect(a.value.count).toBe(13);
    expect(a.value.pitch).toBeCloseTo(6 * IN, 9);
    expect(a.value.wallY).toHaveLength(12);
    expect(a.value.wallY[0]).toBeCloseTo(6 * IN, 9);
    const b = layoutChambers({ ...base, spacing: 7 * IN });
    if (!b.ok) throw new Error(b.error);
    expect(b.value.count).toBe(12);
    expect(b.value.pitch).toBeCloseTo(6.5 * IN, 9);
  });

  it('baffled chambers are boxes: 50" × 78" × 2" = 7800 in³; sewn-through is 2/3 of that', () => {
    const a = layoutChambers(base);
    const s = layoutChambers({ ...base, style: 'sewn_through' });
    if (!a.ok || !s.ok) throw new Error('layout');
    expect(a.value.totalVolumeMm3 / MM3_PER_IN3).toBeCloseTo(7800, 6);
    expect(s.value.totalVolumeMm3 / a.value.totalVolumeMm3).toBeCloseTo(SEWN_THROUGH_PROFILE, 9);
    // 7800 in³ × 1.1 / 850 = 10.094 oz.
    expect(a.value.totalFillG / G_PER_OZ).toBeCloseTo((7800 * 1.1) / 850, 6);
  });

  it('a straight taper puts more fill in the wide chambers; the total is the trapezoid area × loft', () => {
    const r = layoutChambers({ ...base, widthAt: (y) => 54 * IN + ((40 - 54) * IN * y) / (78 * IN) });
    if (!r.ok) throw new Error(r.error);
    const c = r.value.chambers;
    expect(c[0].fillG).toBeGreaterThan(c[c.length - 1].fillG);
    expect(c[0].width).toBeCloseTo((54 - (14 * 3) / 78) * IN, 6);
    expect(r.value.totalVolumeMm3 / MM3_PER_IN3).toBeCloseTo(((54 + 40) / 2) * 78 * 2, 6);
  });

  it('rejects what it cannot lay out', () => {
    expect(layoutChambers({ ...base, spacing: 0 }).ok).toBe(false);
    expect(layoutChambers({ ...base, fillPower: 0 }).ok).toBe(false);
    expect(layoutChambers({ ...base, widthAt: () => -1 }).ok).toBe(false);
  });

  it('refuses a layout of more than MAX_CHAMBERS instead of allocating it (a 1e9 length once ran the heap out)', () => {
    const t = Date.now();
    const r = layoutChambers({ ...base, length: 1e9 * IN, spacing: 1 });
    expect(r.ok).toBe(false);
    expect(Date.now() - t).toBeLessThan(1000);
    expect(layoutChambers({ ...base, length: MAX_CHAMBERS * 10, spacing: 10 }).ok).toBe(true);
  });
});
