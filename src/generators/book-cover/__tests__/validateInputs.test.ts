import { describe, it, expect } from 'vitest';
import { validateInputs } from '../inputs.js';
import type { BookCoverInputs } from '../types.js';

const BASE: BookCoverInputs = {
  book_height: 200,
  book_width: 150,
  spine_width: 25,
  flap_depth: 70,
  units: 'mm',
};

describe('validateInputs — happy path', () => {
  it('accepts valid minimal inputs', () => {
    expect(validateInputs(BASE).ok).toBe(true);
  });

  it('accepts seam_allowance of zero', () => {
    expect(validateInputs({ ...BASE, seam_allowance: 0 }).ok).toBe(true);
  });

  it('accepts a valid outer_pocket', () => {
    const result = validateInputs({ ...BASE, outer_pocket: { width: 80, height: 100, position: 'front' } });
    expect(result.ok).toBe(true);
  });

  it('accepts a valid pen_holder', () => {
    expect(validateInputs({ ...BASE, pen_holder: { count: 3, slot_width: 20 } }).ok).toBe(true);
  });
});

describe('validateInputs — book_height rejections', () => {
  it('rejects negative book_height', () => {
    expect(validateInputs({ ...BASE, book_height: -1 }).ok).toBe(false);
  });
  it('rejects zero book_height', () => {
    expect(validateInputs({ ...BASE, book_height: 0 }).ok).toBe(false);
  });
  it('rejects NaN book_height', () => {
    expect(validateInputs({ ...BASE, book_height: NaN }).ok).toBe(false);
  });
  it('rejects Infinity book_height', () => {
    expect(validateInputs({ ...BASE, book_height: Infinity }).ok).toBe(false);
  });
});

describe('validateInputs — book_width rejections', () => {
  it('rejects negative book_width', () => {
    expect(validateInputs({ ...BASE, book_width: -5 }).ok).toBe(false);
  });
  it('rejects zero book_width', () => {
    expect(validateInputs({ ...BASE, book_width: 0 }).ok).toBe(false);
  });
  it('rejects NaN book_width', () => {
    expect(validateInputs({ ...BASE, book_width: NaN }).ok).toBe(false);
  });
  it('rejects Infinity book_width', () => {
    expect(validateInputs({ ...BASE, book_width: Infinity }).ok).toBe(false);
  });
});

describe('validateInputs — spine_width rejections', () => {
  it('rejects negative spine_width', () => {
    expect(validateInputs({ ...BASE, spine_width: -1 }).ok).toBe(false);
  });
  it('rejects zero spine_width', () => {
    expect(validateInputs({ ...BASE, spine_width: 0 }).ok).toBe(false);
  });
  it('rejects NaN spine_width', () => {
    expect(validateInputs({ ...BASE, spine_width: NaN }).ok).toBe(false);
  });
  it('rejects Infinity spine_width', () => {
    expect(validateInputs({ ...BASE, spine_width: Infinity }).ok).toBe(false);
  });
});

describe('validateInputs — flap_depth rejections', () => {
  it('rejects negative flap_depth', () => {
    expect(validateInputs({ ...BASE, flap_depth: -10 }).ok).toBe(false);
  });
  it('rejects zero flap_depth', () => {
    expect(validateInputs({ ...BASE, flap_depth: 0 }).ok).toBe(false);
  });
  it('rejects NaN flap_depth', () => {
    expect(validateInputs({ ...BASE, flap_depth: NaN }).ok).toBe(false);
  });
  it('rejects Infinity flap_depth', () => {
    expect(validateInputs({ ...BASE, flap_depth: Infinity }).ok).toBe(false);
  });
});

describe('validateInputs — seam_allowance rejections', () => {
  it('rejects negative seam_allowance', () => {
    expect(validateInputs({ ...BASE, seam_allowance: -1 }).ok).toBe(false);
  });
  it('rejects NaN seam_allowance', () => {
    expect(validateInputs({ ...BASE, seam_allowance: NaN }).ok).toBe(false);
  });
  it('rejects Infinity seam_allowance', () => {
    expect(validateInputs({ ...BASE, seam_allowance: Infinity }).ok).toBe(false);
  });
});

describe('validateInputs — pocket validation', () => {
  it('rejects outer_pocket with width >= book_width', () => {
    const r = validateInputs({ ...BASE, outer_pocket: { width: 150, height: 100 } });
    expect(r.ok).toBe(false);
  });
  it('rejects outer_pocket with height >= book_height', () => {
    const r = validateInputs({ ...BASE, outer_pocket: { width: 80, height: 200 } });
    expect(r.ok).toBe(false);
  });
  it('rejects inner_pocket with width >= book_width', () => {
    const r = validateInputs({ ...BASE, inner_pocket: { width: 200, height: 100 } });
    expect(r.ok).toBe(false);
  });
  it('rejects inner_pocket with height >= book_height', () => {
    const r = validateInputs({ ...BASE, inner_pocket: { width: 80, height: 200 } });
    expect(r.ok).toBe(false);
  });
});

describe('validateInputs — pen_holder validation', () => {
  it('rejects pen_holder count < 1', () => {
    const r = validateInputs({ ...BASE, pen_holder: { count: 0, slot_width: 20 } });
    expect(r.ok).toBe(false);
  });
  it('rejects pen_holder count = -1', () => {
    const r = validateInputs({ ...BASE, pen_holder: { count: -1, slot_width: 20 } });
    expect(r.ok).toBe(false);
  });
  it('rejects pen_holder slot_width = 0', () => {
    const r = validateInputs({ ...BASE, pen_holder: { count: 3, slot_width: 0 } });
    expect(r.ok).toBe(false);
  });
  it('rejects pen_holder slot_width = NaN', () => {
    const r = validateInputs({ ...BASE, pen_holder: { count: 3, slot_width: NaN } });
    expect(r.ok).toBe(false);
  });
  it('rejects pen_holder slot_width = Infinity', () => {
    const r = validateInputs({ ...BASE, pen_holder: { count: 3, slot_width: Infinity } });
    expect(r.ok).toBe(false);
  });
  it('rejects pen_holder strip too long (count*slot_width > book_height - 2*hem)', () => {
    // book_height=200, top_bottom_hem=12, available=176
    // count=4, slot_width=50 => total=200 > 176
    const r = validateInputs({ ...BASE, pen_holder: { count: 4, slot_width: 50 } });
    expect(r.ok).toBe(false);
  });
  it('accepts pen_holder strip that exactly fits', () => {
    // book_height=200, hem=12, available=176 => 4*44=176 fits exactly
    const r = validateInputs({ ...BASE, pen_holder: { count: 4, slot_width: 44 } });
    expect(r.ok).toBe(true);
  });
});
