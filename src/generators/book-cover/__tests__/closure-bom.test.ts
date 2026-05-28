import { describe, it, expect } from 'vitest';
import { resolveInputs } from '../inputs.js';
import { buildBom } from '../bom.js';
import type { BookCoverInputs } from '../types.js';

const BASE: BookCoverInputs = {
  units: 'mm',
  book_height: 210,
  book_width: 148,
  spine_width: 15,
  flap_depth: 65,
};

describe('buildBom — closure: zipper', () => {
  it('emits a zipper hardware row for #5 gauge', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#5' } });
    const bom = buildBom(resolved);
    const zipperRow = bom.hardware.find(h => h.type === 'zipper');
    expect(zipperRow).toBeDefined();
    expect(zipperRow!.name).toMatch(/#5/);
    expect(zipperRow!.notes).toMatch(/mm/);
  });

  it('zipper notes include #5 gauge identifier', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#5' } });
    const bom = buildBom(resolved);
    const zipperRow = bom.hardware.find(h => h.type === 'zipper');
    expect(zipperRow!.notes).toMatch(/#5/);
  });

  it('zipper length is derived from cover perimeter (numeric mm in notes)', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#5' } });
    const bom = buildBom(resolved);
    const zipperRow = bom.hardware.find(h => h.type === 'zipper');
    const match = zipperRow!.notes!.match(/(\d+)\s*mm/);
    expect(match).not.toBeNull();
    const lengthMm = parseInt(match![1], 10);
    // Cover perimeter = 2*(210 + 2*148 + 15 + 2*65) = 2*(210+296+15+130) = 2*651 = 1302, +50 = 1352
    expect(lengthMm).toBeGreaterThan(1000);
  });

  it('emits a zipper hardware row for #3 gauge', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#3' } });
    const bom = buildBom(resolved);
    const zipperRow = bom.hardware.find(h => h.type === 'zipper');
    expect(zipperRow).toBeDefined();
    expect(zipperRow!.name).toMatch(/#3/);
  });

  it('emits exactly one hardware row for zipper closure', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'zipper', gauge: '#10' } });
    const bom = buildBom(resolved);
    expect(bom.hardware).toHaveLength(1);
  });
});

describe('buildBom — closure: flap-buckle', () => {
  it('emits two hardware rows for flap-buckle', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'flap-buckle', strap_width: 25.4, buckle_size: 25.4 } });
    const bom = buildBom(resolved);
    expect(bom.hardware).toHaveLength(2);
  });

  it('first row is buckle type', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'flap-buckle', strap_width: 25.4, buckle_size: 25.4 } });
    const bom = buildBom(resolved);
    const buckleRow = bom.hardware.find(h => h.type === 'buckle');
    expect(buckleRow).toBeDefined();
    expect(buckleRow!.id).toBe('closure-buckle');
  });

  it('second row is webbing', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'flap-buckle', strap_width: 25.4, buckle_size: 25.4 } });
    const bom = buildBom(resolved);
    const webbingRow = bom.hardware.find(h => h.id === 'closure-webbing');
    expect(webbingRow).toBeDefined();
    expect(webbingRow!.name).toMatch(/webbing/i);
  });

  it('uses default strap_width when not provided', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'flap-buckle' } });
    const bom = buildBom(resolved);
    const webbingRow = bom.hardware.find(h => h.id === 'closure-webbing');
    expect(webbingRow!.sizeMm).toBe(25.4);
  });
});

describe('buildBom — closure: snap', () => {
  it('emits snap hardware row with count 2', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'snap', count: 2 } });
    const bom = buildBom(resolved);
    const snapRow = bom.hardware.find(h => h.type === 'snap');
    expect(snapRow).toBeDefined();
    expect(snapRow!.quantity).toBe(2);
  });

  it('emits snap hardware row with count 1', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'snap', count: 1 } });
    const bom = buildBom(resolved);
    const snapRow = bom.hardware.find(h => h.type === 'snap');
    expect(snapRow).toBeDefined();
    expect(snapRow!.quantity).toBe(1);
  });
});

describe('buildBom — closure: elastic', () => {
  it('emits an elastic hardware row', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'elastic', width_mm: 25.4 } });
    const bom = buildBom(resolved);
    const elasticRow = bom.hardware.find(h => h.id === 'closure-elastic');
    expect(elasticRow).toBeDefined();
    expect(elasticRow!.sizeMm).toBe(25.4);
  });
});

describe('buildBom — closure: none and absent', () => {
  it('emits no hardware rows for closure: none', () => {
    const resolved = resolveInputs({ ...BASE, closure: { kind: 'none' } });
    const bom = buildBom(resolved);
    expect(bom.hardware).toHaveLength(0);
  });

  it('emits no hardware rows when closure is absent (same as today)', () => {
    const resolved = resolveInputs(BASE);
    const bom = buildBom(resolved);
    expect(bom.hardware).toHaveLength(0);
  });

  it('hardware array length with no closure matches original behavior', () => {
    const resolved = resolveInputs(BASE);
    const bom = buildBom(resolved);
    const originalHardwareCount = 0;
    expect(bom.hardware).toHaveLength(originalHardwareCount);
  });
});
