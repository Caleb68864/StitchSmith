// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { validateClosureSpec, defaultClosureSpec } from '../components/closure.js';
import type { ClosureSpec } from '../components/closure.js';

describe('defaultClosureSpec', () => {
  it('default style is none', () => {
    expect(defaultClosureSpec.style).toBe('none');
  });
});

describe('validateClosureSpec', () => {
  it('accepts a none closure', () => {
    expect(validateClosureSpec({ style: 'none' })).toHaveLength(0);
  });

  it('accepts a valid hook_and_loop closure with width_mm', () => {
    const spec: ClosureSpec = { style: 'hook_and_loop', width_mm: 50 };
    expect(validateClosureSpec(spec)).toHaveLength(0);
  });

  it('accepts a magnetic_snap with offset_from_edge_mm', () => {
    const spec: ClosureSpec = {
      style: 'magnetic_snap',
      width_mm: 18,
      offset_from_edge_mm: 25,
    };
    expect(validateClosureSpec(spec)).toHaveLength(0);
  });

  it('rejects a non-none closure with zero width_mm', () => {
    const errors = validateClosureSpec({ style: 'buckle', width_mm: 0 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a closure with negative height_mm', () => {
    const errors = validateClosureSpec({ style: 'magnetic_snap', height_mm: -5 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a closure with negative offset_from_edge_mm', () => {
    const errors = validateClosureSpec({
      style: 'magnetic_snap',
      offset_from_edge_mm: -10,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
