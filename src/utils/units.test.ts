import { convertLengthValues } from './units.js';
import { describe, it, expect } from 'vitest';
import { inchesToMm, mmToInches, PAPER_SIZES_MM, getPaperSize } from './units.js';

describe('units', () => {
  it('inchesToMm', () => { expect(inchesToMm(1)).toBe(25.4); });
  it('mmToInches', () => { expect(mmToInches(25.4)).toBe(1); });
  it('round trip', () => { expect(mmToInches(inchesToMm(2.5))).toBeCloseTo(2.5); });
  it('PAPER_SIZES_MM has letter and a4', () => {
    expect(PAPER_SIZES_MM.letter.width).toBeCloseTo(215.9);
    expect(PAPER_SIZES_MM.a4.height).toBeCloseTo(297);
  });
  it('getPaperSize landscape swaps dimensions', () => {
    const p = getPaperSize('letter', 'landscape');
    expect(p.width).toBeCloseTo(279.4);
    expect(p.height).toBeCloseTo(215.9);
  });
});

describe('convertLengthValues', () => {
  it('converts only the named keys from inches to mm', () => {
    const out = convertLengthValues({ a: 28, b: 24, sa: 15 }, ['a', 'b'], 'in', 'mm');
    expect(out).toEqual({ a: 711.2, b: 609.6 });
  });

  it('converts mm to inches and rounds away float dust', () => {
    const out = convertLengthValues({ a: 711.2 }, ['a'], 'mm', 'in');
    expect(out).toEqual({ a: 28 });
  });

  it('is a no-op when the unit does not change', () => {
    expect(convertLengthValues({ a: 5 }, ['a'], 'mm', 'mm')).toEqual({});
  });

  it('skips undefined and non-finite values', () => {
    const out = convertLengthValues({ a: undefined, b: NaN, c: 10 }, ['a', 'b', 'c'], 'in', 'mm');
    expect(out).toEqual({ c: 254 });
  });
});
