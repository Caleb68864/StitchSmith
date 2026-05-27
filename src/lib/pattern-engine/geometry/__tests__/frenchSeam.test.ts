import { describe, it, expect } from 'vitest';
import { frenchSeamAllowance, FRENCH_SEAM_TOTAL_MM } from '../frenchSeam.js';

describe('FRENCH_SEAM_TOTAL_MM', () => {
  it('equals 12.7 (1/2 inch)', () => {
    expect(FRENCH_SEAM_TOTAL_MM).toBe(12.7);
  });
});

describe('frenchSeamAllowance', () => {
  it('1/4" (6.35mm) doubles to 1/2" (12.7mm)', () => {
    expect(frenchSeamAllowance(6.35)).toBe(12.7);
  });

  it('3/8" (9.5mm) doubles to 3/4" (19mm)', () => {
    expect(frenchSeamAllowance(9.5)).toBe(19);
  });

  it('clamps to FRENCH_SEAM_TOTAL_MM when doubled value is less', () => {
    // 4mm * 2 = 8 < 12.7, so result is 12.7
    expect(frenchSeamAllowance(4)).toBe(12.7);
  });

  it('returns doubled value when it exceeds FRENCH_SEAM_TOTAL_MM', () => {
    // 10mm * 2 = 20 > 12.7
    expect(frenchSeamAllowance(10)).toBe(20);
  });
});
