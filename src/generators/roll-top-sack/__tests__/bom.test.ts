import { describe, it, expect } from 'vitest';
import { buildBom } from '../bom.js';
import { DEFAULT_WEBBING_WIDTH_MM, DEFAULT_BUCKLE_SIZE_MM } from '../defaults.js';
import { resolveInputs } from '../inputs.js';

const BASE_INPUTS = {
  bottom_length: 200,
  bottom_width: 100,
  height_when_rolled: 300,
  units: 'mm' as const,
};

describe('buildBom', () => {
  it('returns a BOM with materials, hardware, and notes arrays', () => {
    const resolved = resolveInputs(BASE_INPUTS);
    const bom = buildBom(resolved);
    expect(Array.isArray(bom.materials)).toBe(true);
    expect(Array.isArray(bom.hardware)).toBe(true);
    expect(Array.isArray(bom.notes)).toBe(true);
  });

  it('includes at least one fabric material', () => {
    const bom = buildBom(resolveInputs(BASE_INPUTS));
    const fabric = bom.materials.find(m => m.type === 'fabric');
    expect(fabric).toBeDefined();
  });

  it('includes at least one webbing material with correct width', () => {
    const bom = buildBom(resolveInputs(BASE_INPUTS));
    const webbing = bom.materials.find(m => m.type === 'webbing');
    expect(webbing).toBeDefined();
    expect(webbing!.widthMm).toBe(DEFAULT_WEBBING_WIDTH_MM);
  });

  it('includes a buckle hardware item with correct size', () => {
    const bom = buildBom(resolveInputs(BASE_INPUTS));
    const buckle = bom.hardware.find(h => h.type === 'buckle');
    expect(buckle).toBeDefined();
    expect(buckle!.sizeMm).toBe(DEFAULT_BUCKLE_SIZE_MM);
  });

  it('webbing length accounts for bottom_width + 2 * collar_height + 100mm ease', () => {
    const resolved = resolveInputs(BASE_INPUTS);
    const bom = buildBom(resolved);
    const expectedWebbingLength = resolved.bottom_width + 2 * resolved.collar_height + 100;
    const webbing = bom.materials.find(m => m.type === 'webbing');
    expect(webbing).toBeDefined();
    // Notes or name should reference the computed length
    expect(webbing!.notes).toContain(Math.round(expectedWebbingLength).toString());
  });

  it('notes array is non-empty', () => {
    const bom = buildBom(resolveInputs(BASE_INPUTS));
    expect(bom.notes.length).toBeGreaterThan(0);
  });

  it('all hardware items have a quantity >= 1', () => {
    const bom = buildBom(resolveInputs(BASE_INPUTS));
    bom.hardware.forEach(h => expect(h.quantity).toBeGreaterThanOrEqual(1));
  });

  it('all materials have non-empty id and name', () => {
    const bom = buildBom(resolveInputs(BASE_INPUTS));
    bom.materials.forEach(m => {
      expect(m.id.length).toBeGreaterThan(0);
      expect(m.name.length).toBeGreaterThan(0);
    });
  });
});
