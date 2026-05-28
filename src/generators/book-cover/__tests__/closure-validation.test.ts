import { describe, it, expect } from 'vitest';
import { validateInputs, resolveInputs } from '../inputs.js';
import type { BookCoverInputs } from '../types.js';

const BASE: BookCoverInputs = {
  units: 'mm',
  book_height: 210,
  book_width: 148,
  spine_width: 15,
  flap_depth: 65,
};

describe('validateInputs — closure: zipper', () => {
  it('accepts #5 with corner_radius above minimum', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#5', corner_radius: 30 } });
    expect(result.ok).toBe(true);
  });

  it('rejects #5 with corner_radius below 25.4 mm minimum', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#5', corner_radius: 20 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/25\.4/);
  });

  it('accepts #3 with corner_radius above 12.7 mm minimum', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#3', corner_radius: 15 } });
    expect(result.ok).toBe(true);
  });

  it('rejects #3 with corner_radius below 12.7 mm minimum', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#3', corner_radius: 10 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/12\.7/);
  });

  it('accepts #10 with corner_radius above 38.1 mm minimum', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#10', corner_radius: 40 } });
    expect(result.ok).toBe(true);
  });

  it('rejects #10 with corner_radius below 38.1 mm minimum', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#10', corner_radius: 35 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/38\.1/);
  });

  it('accepts zipper without corner_radius (uses default)', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#5' } });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid gauge value', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#7' as '#5' } });
    expect(result.ok).toBe(false);
  });
});

describe('validateInputs — closure: elastic', () => {
  it('accepts valid elastic config', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'elastic', width_mm: 25.4, tension: 'standard' } });
    expect(result.ok).toBe(true);
  });

  it('accepts elastic without optional fields', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'elastic' } });
    expect(result.ok).toBe(true);
  });

  it('rejects elastic with negative width_mm', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'elastic', width_mm: -5 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/width_mm/);
  });

  it('rejects elastic with invalid tension', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'elastic', tension: 'heavy' as 'firm' } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/tension/);
  });
});

describe('validateInputs — closure: snap', () => {
  it('accepts snap count 1', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'snap', count: 1 } });
    expect(result.ok).toBe(true);
  });

  it('accepts snap count 2', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'snap', count: 2 } });
    expect(result.ok).toBe(true);
  });

  it('rejects snap count 3', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'snap', count: 3 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/count must be 1 or 2/);
  });

  it('rejects snap count 0', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'snap', count: 0 } });
    expect(result.ok).toBe(false);
  });

  it('accepts snap without count (uses default)', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'snap' } });
    expect(result.ok).toBe(true);
  });
});

describe('validateInputs — closure: flap-buckle', () => {
  it('accepts valid flap-buckle config', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'flap-buckle', strap_width: 25.4, buckle_size: 25.4 } });
    expect(result.ok).toBe(true);
  });

  it('accepts flap-buckle without optional fields', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'flap-buckle' } });
    expect(result.ok).toBe(true);
  });

  it('rejects flap-buckle with negative strap_width', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'flap-buckle', strap_width: -10 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/strap_width/);
  });

  it('rejects flap-buckle with zero buckle_size', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'flap-buckle', buckle_size: 0 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/buckle_size/);
  });
});

describe('validateInputs — closure: none and absent', () => {
  it('accepts closure: none', () => {
    const result = validateInputs({ ...BASE, closure: { kind: 'none' } });
    expect(result.ok).toBe(true);
  });

  it('accepts no closure field', () => {
    const result = validateInputs(BASE);
    expect(result.ok).toBe(true);
  });
});

describe('resolveInputs — closure default population', () => {
  it('populates zipper #5 corner_radius to 31.75 mm', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#5' } });
    expect(resolved.closure).toMatchObject({ kind: 'zipper', gauge: '#5', corner_radius: 31.75 });
  });

  it('populates zipper #3 corner_radius to 19.05 mm', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#3' } });
    expect(resolved.closure).toMatchObject({ kind: 'zipper', gauge: '#3', corner_radius: 19.05 });
  });

  it('populates zipper #10 corner_radius to 50.8 mm', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#10' } });
    expect(resolved.closure).toMatchObject({ kind: 'zipper', gauge: '#10', corner_radius: 50.8 });
  });

  it('preserves explicit corner_radius if provided', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#5', corner_radius: 35 } });
    expect(resolved.closure).toMatchObject({ corner_radius: 35 });
  });

  it('populates elastic defaults', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'elastic' } });
    expect(resolved.closure).toMatchObject({ kind: 'elastic', width_mm: 25.4, tension: 'standard' });
  });

  it('populates snap default count', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'snap' } });
    expect(resolved.closure).toMatchObject({ kind: 'snap', count: 2 });
  });

  it('populates flap-buckle defaults', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'flap-buckle' } });
    expect(resolved.closure).toMatchObject({ kind: 'flap-buckle', strap_width: 25.4, buckle_size: 25.4 });
  });

  it('leaves closure undefined when not provided', () => {
    const resolved = resolveInputs(BASE);
    expect(resolved.closure).toBeUndefined();
  });
});
