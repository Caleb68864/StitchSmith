/**
 * inputs-validation.test.ts
 * Verifies `validateInputs` returns the correct shape for valid and invalid inputs.
 */

import { describe, it, expect } from 'vitest';
import { validateInputs } from '../inputs.js';
import type { MagPouchInputs } from '../types.js';

function validInputs(overrides: Partial<MagPouchInputs> = {}): MagPouchInputs {
  return {
    magazine: { mode: 'predefined', presetId: 'ar15_30_round', units: 'in' },
    retention: 'flap_velcro',
    attachment: 'pals',
    drainage: 'open_corner',
    seamAllowance: 0.375,
    ...overrides,
  };
}

describe('validateInputs', () => {
  // ── Valid cases ─────────────────────────────────────────────────────────────

  it('returns { ok: true } for a fully-valid predefined input', () => {
    expect(validateInputs(validInputs())).toEqual({ ok: true });
  });

  it('returns { ok: true } for valid custom magazine dimensions (inches)', () => {
    const result = validateInputs(
      validInputs({
        magazine: { mode: 'custom', width: 2.55, thickness: 1.0, height: 7.5, units: 'in' },
      }),
    );
    expect(result).toEqual({ ok: true });
  });

  it('returns { ok: true } for valid custom magazine dimensions (mm)', () => {
    const result = validateInputs(
      validInputs({
        magazine: { mode: 'custom', width: 64.77, thickness: 25.4, height: 190.5, units: 'mm' },
      }),
    );
    expect(result).toEqual({ ok: true });
  });

  it('returns { ok: true } for all allowed seam allowances', () => {
    for (const sa of [0.25, 0.375, 0.5] as const) {
      expect(validateInputs(validInputs({ seamAllowance: sa }))).toEqual({ ok: true });
    }
  });

  // ── Invalid cases — each rejection populates the specific field-name key ────

  it('rejects unknown predefined presetId with errors.presetId', () => {
    const result = validateInputs(
      validInputs({
        magazine: { mode: 'predefined', presetId: 'not_a_real_mag', units: 'in' },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveProperty('presetId');
      // Must NOT be a generic _form key
      expect(Object.keys(result.errors)).not.toContain('_form');
    }
  });

  it('rejects negative custom width with errors.width', () => {
    const result = validateInputs(
      validInputs({
        magazine: { mode: 'custom', width: -1, thickness: 1.0, height: 7.5, units: 'in' },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveProperty('width');
    }
  });

  it('rejects NaN custom width with errors.width', () => {
    const result = validateInputs(
      validInputs({
        magazine: { mode: 'custom', width: NaN, thickness: 1.0, height: 7.5, units: 'in' },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveProperty('width');
    }
  });

  it('rejects zero custom thickness with errors.thickness', () => {
    const result = validateInputs(
      validInputs({
        magazine: { mode: 'custom', width: 2.55, thickness: 0, height: 7.5, units: 'in' },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveProperty('thickness');
    }
  });

  it('rejects zero custom height with errors.height', () => {
    const result = validateInputs(
      validInputs({
        magazine: { mode: 'custom', width: 2.55, thickness: 1.0, height: 0, units: 'in' },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveProperty('height');
    }
  });

  it('rejects ease_width > 1" with errors.ease_width', () => {
    const result = validateInputs(validInputs({ ease_width: 1.5 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveProperty('ease_width');
    }
  });

  it('rejects ease_depth < 0 with errors.ease_depth', () => {
    const result = validateInputs(validInputs({ ease_depth: -0.1 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveProperty('ease_depth');
    }
  });

  it('rejects exposed_percentage < 0.40 with errors.exposed_percentage', () => {
    const result = validateInputs(validInputs({ exposed_percentage: 0.2 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveProperty('exposed_percentage');
    }
  });

  it('rejects exposed_percentage > 1.0 with errors.exposed_percentage', () => {
    const result = validateInputs(validInputs({ exposed_percentage: 1.1 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveProperty('exposed_percentage');
    }
  });

  it('rejects invalid seamAllowance (e.g. 0.4) with errors.seamAllowance', () => {
    const result = validateInputs(
      validInputs({ seamAllowance: 0.4 as unknown as 0.25 | 0.375 | 0.5 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveProperty('seamAllowance');
    }
  });

  it('rejects hook_length > flap_length with errors.hook_length', () => {
    const result = validateInputs(
      validInputs({ hook_length: 5.0, flap_length: 3.0 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveProperty('hook_length');
    }
  });

  it('rejects loop_length > flap_length with errors.loop_length', () => {
    const result = validateInputs(
      validInputs({ loop_length: 5.0, flap_length: 3.0 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveProperty('loop_length');
    }
  });

  it('rejects closure_overlap > min(hook_length, loop_length) with errors.closure_overlap', () => {
    const result = validateInputs(
      validInputs({ hook_length: 3.0, loop_length: 4.0, closure_overlap: 5.0 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveProperty('closure_overlap');
    }
  });

  // ── Single invalid field → only that field's key populated ─────────────────

  it('only errors.ease_width is set when only ease_width is invalid', () => {
    const result = validateInputs(validInputs({ ease_width: -1 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors)).toEqual(['ease_width']);
    }
  });

  it('only errors.exposed_percentage is set when only exposed_percentage is invalid', () => {
    const result = validateInputs(validInputs({ exposed_percentage: 0.1 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors)).toEqual(['exposed_percentage']);
    }
  });

  // ── Multi-field failure ─────────────────────────────────────────────────────

  it('reports multiple errors simultaneously when multiple fields are invalid', () => {
    const result = validateInputs(
      validInputs({ ease_width: 2.0, ease_depth: -1 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveProperty('ease_width');
      expect(result.errors).toHaveProperty('ease_depth');
    }
  });
});
