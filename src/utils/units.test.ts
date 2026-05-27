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
