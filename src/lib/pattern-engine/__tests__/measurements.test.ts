// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { resolveMeasurements, MEASUREMENT_KEYS, type MeasurementInput } from '../drafting/measurements.js';
import { TEST_BODY } from './draftingFixtures.js';

const IN = 25.4;

describe('drafting step 1 — measurement set', () => {
  it('converts to mm and adds each girth its own ease; lengths stay as measured', () => {
    const r = resolveMeasurements({ ...TEST_BODY, ease: { chest: 4, wrist: 1 } }, 'in');
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.value.body.chest).toBeCloseTo(40 * IN, 9);
    expect(r.value.eased.chest).toBeCloseTo(44 * IN, 9);
    expect(r.value.eased.wrist).toBeCloseTo(8 * IN, 9);
    expect(r.value.eased.waist).toBeCloseTo(34 * IN, 9);
    expect(r.value.eased.nape_to_waist).toBeCloseTo(18 * IN, 9);
    const mm = resolveMeasurements({ ...Object.fromEntries(Object.entries(TEST_BODY).map(([k, v]) => [k, (v as number) * IN])) }, 'mm');
    if (!mm.ok) throw new Error('mm');
    expect(mm.value.body.arm_length).toBeCloseTo(25 * IN, 9);
  });
  it('every measurement is required: no default stands in for a body', () => {
    const r = resolveMeasurements({}, 'in');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.field).sort()).toEqual([...MEASUREMENT_KEYS].sort());
  });
  it('negative ease is allowed for stretch, but not below half the body', () => {
    expect(resolveMeasurements({ ...TEST_BODY, ease: { chest: -2 } }, 'in').ok).toBe(true);
    const r = resolveMeasurements({ ...TEST_BODY, ease: { wrist: -4 } }, 'in');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].field).toBe('ease.wrist');
  });
  it('catches swapped or impossible measurements on the field to fix', () => {
    const f = (i: MeasurementInput) => { const r = resolveMeasurements(i, 'in'); return r.ok ? [] : r.errors.map((e) => e.field); };
    expect(f({ ...TEST_BODY, scye_depth: 19 })).toEqual(['scye_depth']);
    expect(f({ ...TEST_BODY, wrist: 14 })).toEqual(['wrist']);
    expect(f({ ...TEST_BODY, shoulder_width: 21 })).toEqual(['shoulder_width']);
    expect(f({ ...TEST_BODY, neck: 41 })).toEqual(['neck']);
  });
});
