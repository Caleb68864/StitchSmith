import { describe, it, expect } from 'vitest';
import { resolveInputs, validateInputs } from '../inputs.js';

// ─── resolveInputs ───────────────────────────────────────────────────────────────

describe('resolveInputs — preset defaults', () => {
  it('pencil preset returns correct dimensions', () => {
    const r = resolveInputs({ preset: 'pencil' });
    expect(r.finished_length).toBe(220);
    expect(r.finished_width).toBe(120);
    expect(r.finished_depth).toBe(30);
  });

  it('pencil preset returns correct non-dimension defaults', () => {
    const r = resolveInputs({ preset: 'pencil' });
    expect(r.seam_allowance).toBe(10);
    expect(r.zip_gauge).toBe('#3');
    expect(r.grosgrain_width).toBe(15.875);
    expect(r.pull_loops).toBe(true);
  });

  it('edc preset returns correct dimensions', () => {
    const r = resolveInputs({ preset: 'edc' });
    expect(r.finished_length).toBe(180);
    expect(r.finished_width).toBe(100);
    expect(r.finished_depth).toBe(40);
  });

  it('toiletry preset returns correct dimensions', () => {
    const r = resolveInputs({ preset: 'toiletry' });
    expect(r.finished_length).toBe(280);
    expect(r.finished_width).toBe(150);
    expect(r.finished_depth).toBe(60);
  });

  it('user override wins over pencil preset length', () => {
    const r = resolveInputs({ preset: 'pencil', finished_length: 250 });
    expect(r.finished_length).toBe(250);
    expect(r.finished_width).toBe(120); // still from preset
  });

  it('user override wins over pencil preset SA', () => {
    const r = resolveInputs({ preset: 'pencil', seam_allowance: 0 });
    expect(r.seam_allowance).toBe(0);
  });

  it('no-arg call defaults to pencil preset', () => {
    const r = resolveInputs({});
    expect(r.preset).toBe('pencil');
    expect(r.finished_length).toBe(220);
  });

  it('custom preset with all dims resolves correctly', () => {
    const r = resolveInputs({
      preset: 'custom',
      finished_length: 300,
      finished_width: 200,
      finished_depth: 50,
    });
    expect(r.finished_length).toBe(300);
    expect(r.finished_width).toBe(200);
    expect(r.finished_depth).toBe(50);
    expect(r.preset).toBe('custom');
  });
});

// ─── validateInputs — specific behavioral checks ─────────────────────────────────

describe('validateInputs — behavioral spec cases', () => {
  it('boxing constraint rejected: depth/2 >= width (220×120×300)', () => {
    const result = validateInputs({
      finished_length: 220,
      finished_width: 120,
      finished_depth: 300,
      preset: 'custom',
    });
    expect(result.ok).toBe(false);
  });

  it('boxing constraint passes: depth/2 < width (220×120×130)', () => {
    const result = validateInputs({
      finished_length: 220,
      finished_width: 120,
      finished_depth: 130,
      preset: 'custom',
    });
    expect(result.ok).toBe(true);
  });

  it('SA=0 is valid', () => {
    const result = validateInputs({
      finished_length: 180,
      finished_width: 100,
      finished_depth: 40,
      seam_allowance: 0,
      preset: 'custom',
    });
    expect(result.ok).toBe(true);
  });

  it('custom preset without dimensions yields ok: false with missing-field messages', () => {
    const result = validateInputs({ preset: 'custom' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const fields = result.errors.map((e) => e.field);
      expect(fields).toContain('finished_length');
      expect(fields).toContain('finished_width');
      expect(fields).toContain('finished_depth');
      // messages should reference "required"
      expect(result.errors[0].message).toMatch(/required/i);
    }
  });
});

// ─── validateInputs — all validation paths ────────────────────────────────────────

describe('validateInputs — validation rule coverage', () => {
  it('negative finished_length is invalid', () => {
    const r = validateInputs({ preset: 'custom', finished_length: -10, finished_width: 100, finished_depth: 40 });
    expect(r.ok).toBe(false);
  });

  it('zero finished_width is invalid', () => {
    const r = validateInputs({ preset: 'custom', finished_length: 200, finished_width: 0, finished_depth: 40 });
    expect(r.ok).toBe(false);
  });

  it('Infinity finished_depth is invalid', () => {
    const r = validateInputs({ preset: 'custom', finished_length: 200, finished_width: 100, finished_depth: Infinity });
    expect(r.ok).toBe(false);
  });

  it('NaN seam_allowance is invalid', () => {
    const r = validateInputs({ preset: 'pencil', seam_allowance: NaN });
    expect(r.ok).toBe(false);
  });

  it('negative seam_allowance is invalid', () => {
    const r = validateInputs({ preset: 'pencil', seam_allowance: -1 });
    expect(r.ok).toBe(false);
  });

  it('invalid zip_gauge is invalid', () => {
    const r = validateInputs({ preset: 'pencil', zip_gauge: '#7' as '#3' });
    expect(r.ok).toBe(false);
  });

  it('#5 zip_gauge is valid', () => {
    const r = validateInputs({ preset: 'pencil', zip_gauge: '#5' });
    expect(r.ok).toBe(true);
  });

  it('zero grosgrain_width with pull_loops=true is invalid', () => {
    const r = validateInputs({ preset: 'pencil', pull_loops: true, grosgrain_width: 0 });
    expect(r.ok).toBe(false);
  });

  it('zero grosgrain_width with pull_loops=false is valid', () => {
    const r = validateInputs({ preset: 'pencil', pull_loops: false, grosgrain_width: 0 });
    expect(r.ok).toBe(true);
  });

  it('pencil preset with all defaults is valid', () => {
    const r = validateInputs({ preset: 'pencil' });
    expect(r.ok).toBe(true);
  });

  it('edc preset with all defaults is valid', () => {
    const r = validateInputs({ preset: 'edc' });
    expect(r.ok).toBe(true);
  });

  it('toiletry preset with all defaults is valid', () => {
    const r = validateInputs({ preset: 'toiletry' });
    expect(r.ok).toBe(true);
  });

  it('boxing edge: depth/2 exactly equal to width is invalid', () => {
    // finished_depth/2 = 100 = finished_width = 100 → must be strictly less
    const r = validateInputs({ preset: 'custom', finished_length: 200, finished_width: 100, finished_depth: 200 });
    expect(r.ok).toBe(false);
  });

  it('boxing edge: depth/2 just under width is valid', () => {
    // 99/2 = 49.5 < 100
    const r = validateInputs({ preset: 'custom', finished_length: 200, finished_width: 100, finished_depth: 99 });
    expect(r.ok).toBe(true);
  });

  it('pencil preset with SA=0 override is valid', () => {
    const r = validateInputs({ preset: 'pencil', seam_allowance: 0 });
    expect(r.ok).toBe(true);
  });

  it('zipper warning is emitted when zipper exceeds cut_width (always true)', () => {
    // cut_width = finished_length + 2*sa; zipper = ceil((cut_width+25)/50)*50
    // For any reasonable finished_length, zipper > cut_width — warning always fires
    const r = validateInputs({ preset: 'pencil' });
    expect(r.ok).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toMatch(/zipper/i);
  });

  it('custom preset: large depth/2 exactly violates boxing constraint', () => {
    const r = validateInputs({
      preset: 'custom',
      finished_length: 300,
      finished_width: 80,
      finished_depth: 160, // 160/2 = 80 = width — not strictly less
    });
    expect(r.ok).toBe(false);
  });

  it('resolveInputs pencil returns full preset object', () => {
    const r = resolveInputs({ preset: 'pencil' });
    expect(r).toMatchObject({
      finished_length: 220,
      finished_width: 120,
      finished_depth: 30,
      seam_allowance: 10,
      zip_gauge: '#3',
      grosgrain_width: 15.875,
      pull_loops: true,
    });
  });
});
