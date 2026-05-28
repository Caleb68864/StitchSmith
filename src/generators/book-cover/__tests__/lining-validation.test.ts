import { describe, it, expect } from 'vitest';
import { validateInputs } from '../inputs.js';
import type { BookCoverInputs } from '../types.js';

const BASE: BookCoverInputs = {
  units: 'mm',
  book_height: 210,
  book_width: 148,
  spine_width: 12,
  flap_depth: 65,
};

describe('lining-required-for-features', () => {
  it('card_slots without lining returns ok:false with lining-required-for-features', () => {
    const result = validateInputs({ ...BASE, card_slots: { count: 3 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('lining-required-for-features');
  });

  it('card_slots with lining.enabled:true returns ok:true', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true }, card_slots: { count: 3 } });
    expect(result.ok).toBe(true);
  });

  it('card_slots with lining.enabled:false returns ok:false', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: false }, card_slots: { count: 3 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('lining-required-for-features');
  });

  it('bookmark_ribbon without lining returns ok:false', () => {
    const result = validateInputs({ ...BASE, bookmark_ribbon: { count: 2 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('lining-required-for-features');
  });

  it('bookmark_ribbon with lining returns ok:true', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true }, bookmark_ribbon: { count: 2 } });
    expect(result.ok).toBe(true);
  });

  it('internal_zip_pocket without lining returns ok:false', () => {
    const result = validateInputs({ ...BASE, internal_zip_pocket: { width: 100, height: 80 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('lining-required-for-features');
  });

  it('internal_zip_pocket with lining returns ok:true', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true }, internal_zip_pocket: { width: 100, height: 80 } });
    expect(result.ok).toBe(true);
  });

  it('mesh_pocket without lining returns ok:false', () => {
    const result = validateInputs({ ...BASE, mesh_pocket: { width: 100, height: 80 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('lining-required-for-features');
  });

  it('mesh_pocket with lining returns ok:true', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true }, mesh_pocket: { width: 100, height: 80 } });
    expect(result.ok).toBe(true);
  });

  it('tactical.enabled:true with card_slots passes (tactical implies lining)', () => {
    const result = validateInputs({ ...BASE, tactical: { enabled: true }, card_slots: { count: 2 } });
    expect(result.ok).toBe(true);
  });

  it('lining alone without features returns ok:true', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true } });
    expect(result.ok).toBe(true);
  });
});

describe('card_slots.count validation', () => {
  it('count 1 is valid', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true }, card_slots: { count: 1 } });
    expect(result.ok).toBe(true);
  });

  it('count 5 is valid', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true }, card_slots: { count: 5 } });
    expect(result.ok).toBe(true);
  });

  it('count 6 returns ok:false', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true }, card_slots: { count: 6 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('card_slots.count');
  });

  it('count 0 returns ok:false', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true }, card_slots: { count: 0 } });
    expect(result.ok).toBe(false);
  });

  it('count -1 returns ok:false', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true }, card_slots: { count: -1 } });
    expect(result.ok).toBe(false);
  });

  it('count 3 with lining returns ok:true', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true }, card_slots: { count: 3 } });
    expect(result.ok).toBe(true);
  });
});

describe('lining.interfacing validation', () => {
  it('interfacing fusible is valid', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true, interfacing: 'fusible' } });
    expect(result.ok).toBe(true);
  });

  it('interfacing sew-in is valid', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true, interfacing: 'sew-in' } });
    expect(result.ok).toBe(true);
  });

  it('interfacing hdpe is valid', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true, interfacing: 'hdpe' } });
    expect(result.ok).toBe(true);
  });

  it('interfacing eva is valid', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true, interfacing: 'eva' } });
    expect(result.ok).toBe(true);
  });

  it('interfacing none is valid', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true, interfacing: 'none' } });
    expect(result.ok).toBe(true);
  });

  it('interfacing invalid value returns ok:false', () => {
    const result = validateInputs({ ...BASE, lining: { enabled: true, interfacing: 'cardboard' as never } });
    expect(result.ok).toBe(false);
  });
});
