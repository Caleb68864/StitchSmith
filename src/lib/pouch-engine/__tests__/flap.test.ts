// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { validateFlapSpec, defaultFlapSpec } from '../components/flap.js';
import type { FlapSpec } from '../components/flap.js';

describe('defaultFlapSpec', () => {
  it('default style is none', () => {
    expect(defaultFlapSpec.style).toBe('none');
  });
});

describe('validateFlapSpec', () => {
  it('accepts a none flap without length_mm', () => {
    expect(validateFlapSpec({ style: 'none' })).toHaveLength(0);
  });

  it('accepts a valid square flap with length_mm', () => {
    const flap: FlapSpec = { style: 'square', length_mm: 76 };
    expect(validateFlapSpec(flap)).toHaveLength(0);
  });

  it('accepts a valid rounded flap with corner_radius_mm', () => {
    const flap: FlapSpec = { style: 'rounded', length_mm: 50, corner_radius_mm: 12 };
    expect(validateFlapSpec(flap)).toHaveLength(0);
  });

  it('rejects a non-none flap without length_mm', () => {
    const errors = validateFlapSpec({ style: 'square' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('length_mm');
  });

  it('rejects a flap with zero length_mm', () => {
    const errors = validateFlapSpec({ style: 'pointed', length_mm: 0 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a flap with negative corner_radius_mm', () => {
    const errors = validateFlapSpec({ style: 'rounded', length_mm: 50, corner_radius_mm: -5 });
    expect(errors.length).toBeGreaterThan(0);
  });
});
