// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, getPreset, resolveInputs, buildTriZipBom, triZipZipperLengthMm } from '../index.js';

describe('Tri-Zip hardware BOM', () => {
  const inputs = { height: 450, width: 300, depth: 150, units: 'mm' as const, stylePreset: 'urban_assault' as const, sternum_strap: true, hip_belt: 'padded' as const, compression_straps: 'side_and_bottom' as const };
  it('lists the zipper tape, three locking sliders, strap hardware, sternum, hip and compression hardware', () => {
    const r = buildPattern(inputs, getPreset('urban_assault'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.value.hardware.map((h) => h.id);
    expect(ids).toContain('zipper-coil-8');
    expect(r.value.hardware.find((h) => h.id === 'zipper-slider-locking')!.quantity).toBe(3);
    expect(ids.some((id) => id.startsWith('strap-'))).toBe(true);
    expect(ids).toContain('sternum-buckle');
    expect(ids).toContain('hip-buckle');
    expect(r.value.hardware.find((h) => h.id === 'compression-ladderlock')!.quantity).toBe(4);
  });
  it('zipper length = two side runs + the split run + spare, and the BOM shrinks with the options off', () => {
    const res = resolveInputs(inputs, getPreset('urban_assault'));
    expect(triZipZipperLengthMm(res)).toBeCloseTo(2 * 450 + 450 * res.y_split_height_percent / 100 + 100, 6);
    const bare = buildTriZipBom(resolveInputs({ ...inputs, sternum_strap: false, hip_belt: 'none', compression_straps: 'none' }, getPreset('urban_assault')));
    expect(bare.map((h) => h.id)).toEqual(['zipper-coil-8', 'zipper-slider-locking', 'zipper-stop']);
  });
});
