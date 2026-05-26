import { describe, it, expect } from 'vitest';
import { validateInputs, resolveInputs, toMm } from '../inputs.js';
import { DEFAULT_COLLAR_HEIGHT_MM } from '../defaults.js';

describe('toMm', () => {
  it('returns value unchanged for mm units', () => {
    expect(toMm(100, 'mm')).toBe(100);
  });

  it('converts inches to mm', () => {
    expect(toMm(1, 'in')).toBeCloseTo(25.4, 6);
    expect(toMm(4, 'in')).toBeCloseTo(101.6, 6);
  });
});

describe('validateInputs', () => {
  it('returns ok: true for valid mm inputs', () => {
    const result = validateInputs({ bottom_length: 200, bottom_width: 100, height_when_rolled: 300, units: 'mm' });
    expect(result.ok).toBe(true);
  });

  it('returns ok: false for zero bottom_length', () => {
    const result = validateInputs({ bottom_length: 0, bottom_width: 100, height_when_rolled: 300, units: 'mm' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('invalid-inputs');
  });

  it('returns ok: false for negative bottom_width', () => {
    const result = validateInputs({ bottom_length: 200, bottom_width: -1, height_when_rolled: 300, units: 'mm' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('invalid-inputs');
  });

  it('returns ok: false for NaN height_when_rolled', () => {
    const result = validateInputs({ bottom_length: 200, bottom_width: 100, height_when_rolled: NaN, units: 'mm' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('invalid-inputs');
  });

  it('returns ok: false for Infinity bottom_length', () => {
    const result = validateInputs({ bottom_length: Infinity, bottom_width: 100, height_when_rolled: 300, units: 'mm' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('invalid-inputs');
  });

  it('returns ok: false for zero collar_height when provided', () => {
    const result = validateInputs({ bottom_length: 200, bottom_width: 100, height_when_rolled: 300, collar_height: 0, units: 'mm' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('invalid-inputs');
  });

  it('returns ok: true for valid inch inputs', () => {
    const result = validateInputs({ bottom_length: 8, bottom_width: 4, height_when_rolled: 12, units: 'in' });
    expect(result.ok).toBe(true);
  });

  it('returns ok: false for negative seam_allowance', () => {
    const result = validateInputs({ bottom_length: 200, bottom_width: 100, height_when_rolled: 300, seam_allowance: -1, units: 'mm' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('invalid-inputs');
  });
});

describe('resolveInputs', () => {
  it('defaults collar_height to DEFAULT_COLLAR_HEIGHT_MM when absent', () => {
    const r = resolveInputs({ bottom_length: 200, bottom_width: 100, height_when_rolled: 300, units: 'mm' });
    expect(r.collar_height).toBe(DEFAULT_COLLAR_HEIGHT_MM);
  });

  it('uses provided collar_height', () => {
    const r = resolveInputs({ bottom_length: 200, bottom_width: 100, height_when_rolled: 300, collar_height: 150, units: 'mm' });
    expect(r.collar_height).toBe(150);
  });

  it('converts inch inputs to mm', () => {
    const r = resolveInputs({ bottom_length: 8, bottom_width: 4, height_when_rolled: 12, units: 'in' });
    expect(r.bottom_length).toBeCloseTo(8 * 25.4, 2);
    expect(r.bottom_width).toBeCloseTo(4 * 25.4, 2);
    expect(r.height_when_rolled).toBeCloseTo(12 * 25.4, 2);
  });

  it('inch inputs resolve to same mm geometry as equivalent mm inputs (within 0.01mm)', () => {
    const mmIn = { bottom_length: 8 * 25.4, bottom_width: 4 * 25.4, height_when_rolled: 12 * 25.4, units: 'mm' as const };
    const inIn = { bottom_length: 8, bottom_width: 4, height_when_rolled: 12, units: 'in' as const };
    const rMm = resolveInputs(mmIn);
    const rIn = resolveInputs(inIn);
    expect(Math.abs(rMm.bottom_length - rIn.bottom_length)).toBeLessThan(0.01);
    expect(Math.abs(rMm.bottom_width - rIn.bottom_width)).toBeLessThan(0.01);
    expect(Math.abs(rMm.height_when_rolled - rIn.height_when_rolled)).toBeLessThan(0.01);
  });
});
