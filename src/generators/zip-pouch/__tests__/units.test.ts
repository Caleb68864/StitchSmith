import { describe, it, expect } from 'vitest';
import { convertInputsUnits, convertPresetDimsToUnits } from '../../../components/zip-pouch/ZipPouchSettingsPanel.js';
import { resolveInputs } from '../inputs.js';
import { buildPattern } from '../buildPattern.js';
import { zipperEndTabDims } from '../dimensions.js';
import { PRESET_DEFAULTS } from '../defaults.js';

// ─── handleUnitsChange mm→in ─────────────────────────────────────────────────

describe('handleUnitsChange mm→in', () => {
  it('converts finished_length 220mm to ~8.66in', () => {
    const changes = convertInputsUnits({ finished_length: 220, units: 'mm' }, 'in');
    expect(changes.finished_length).toBeCloseTo(8.66, 1);
    expect(changes.units).toBe('in');
    expect(changes.preset).toBe('custom');
  });

  it('converts all numeric fields mm→in and rounds to 2dp', () => {
    const inputs = {
      finished_length: 220,
      finished_width: 120,
      finished_depth: 30,
      seam_allowance: 10,
      grosgrain_width: 15.875,
      units: 'mm' as const,
    };
    const changes = convertInputsUnits(inputs, 'in');
    expect(changes.finished_length).toBe(8.66);
    expect(changes.finished_width).toBe(4.72);
    expect(changes.finished_depth).toBe(1.18);
    expect(changes.seam_allowance).toBe(0.39);
    expect(changes.grosgrain_width).toBe(0.63);
  });

  it('skips undefined fields', () => {
    const changes = convertInputsUnits({ units: 'mm' }, 'in');
    expect(changes.finished_length).toBeUndefined();
  });
});

// ─── handleUnitsChange in→mm ─────────────────────────────────────────────────

describe('handleUnitsChange in→mm', () => {
  it('converts finished_length 8.66in to 220mm', () => {
    const changes = convertInputsUnits({ finished_length: 8.66, units: 'in' }, 'mm');
    expect(changes.finished_length).toBe(220);
    expect(changes.units).toBe('mm');
    expect(changes.preset).toBe('custom');
  });

  it('rounds to nearest integer when converting in→mm', () => {
    const changes = convertInputsUnits({ finished_length: 4.72, finished_width: 1.18, units: 'in' }, 'mm');
    expect(changes.finished_length).toBe(120);
    expect(changes.finished_width).toBe(30);
  });
});

// ─── preset selection while units === 'in' ────────────────────────────────────

describe('preset selection while units=in (convertPresetDimsToUnits)', () => {
  it('converts pencil preset dims to inches', () => {
    const dims = PRESET_DEFAULTS.pencil; // 220 × 120 × 30
    const converted = convertPresetDimsToUnits(dims, 'in');
    expect(converted.finished_length).toBeCloseTo(8.66, 1);
    expect(converted.finished_width).toBeCloseTo(4.72, 1);
    expect(converted.finished_depth).toBeCloseTo(1.18, 1);
  });

  it('returns original dims unchanged when units=mm', () => {
    const dims = PRESET_DEFAULTS.pencil;
    const result = convertPresetDimsToUnits(dims, 'mm');
    expect(result).toBe(dims);
  });

  it('converts edc preset dims to inches', () => {
    const dims = PRESET_DEFAULTS.edc; // 180 × 100 × 40
    const converted = convertPresetDimsToUnits(dims, 'in');
    expect(converted.finished_length).toBeCloseTo(7.09, 1);
    expect(converted.finished_width).toBeCloseTo(3.94, 1);
    expect(converted.finished_depth).toBeCloseTo(1.57, 1);
  });
});

// ─── ResolvedInputs is always millimetres ────────────────────────────────────
// ZipPouchInputs carries the user's display unit, but the engine, the
// DEFAULT_*_MM constants, the zipper stock-length rounding and every "mm" in
// the BOM and step text are millimetre-based. resolveInputs converts once.

describe('resolveInputs — unit normalisation', () => {
  it('converts inch lengths to mm', () => {
    const r = resolveInputs({
      preset: 'custom',
      units: 'in',
      finished_length: 8,
      finished_width: 4,
      finished_depth: 2,
      seam_allowance: 0.5,
    });
    expect(r.finished_length).toBeCloseTo(203.2, 6);
    expect(r.finished_width).toBeCloseTo(101.6, 6);
    expect(r.finished_depth).toBeCloseTo(50.8, 6);
    expect(r.seam_allowance).toBeCloseTo(12.7, 6);
    expect(r.units).toBe('in'); // retained for labelling only
  });

  it('leaves mm lengths untouched', () => {
    const r = resolveInputs({
      preset: 'custom',
      units: 'mm',
      finished_length: 203.2,
      seam_allowance: 12.7,
    });
    expect(r.finished_length).toBe(203.2);
    expect(r.seam_allowance).toBe(12.7);
  });

  it('does not convert the mm defaults when the user is in inches', () => {
    const r = resolveInputs({ preset: 'custom', units: 'in', finished_width: 4 });
    expect(r.seam_allowance).toBe(10);        // DEFAULT_SEAM_ALLOWANCE_MM
    expect(r.grosgrain_width).toBeCloseTo(15.875, 6);
  });

  it('inch and equivalent mm inputs produce identical geometry', () => {
    const asIn = buildPattern({
      preset: 'custom', units: 'in', construction_style: 'multi-panel',
      finished_length: 8, finished_width: 4, finished_depth: 2, seam_allowance: 0.5,
    });
    const asMm = buildPattern({
      preset: 'custom', units: 'mm', construction_style: 'multi-panel',
      finished_length: 203.2, finished_width: 101.6, finished_depth: 50.8, seam_allowance: 12.7,
    });
    expect(asIn.ok && asMm.ok).toBe(true);
    if (!asIn.ok || !asMm.ok) return;
    expect(asIn.value.bom).toEqual(asMm.value.bom);
    expect(asIn.value.pieces.map((p) => p.id)).toEqual(asMm.value.pieces.map((p) => p.id));
  });

  it('no piece is wildly out of scale with the others (the mm-literal bug)', () => {
    const r = buildPattern({
      preset: 'custom', units: 'in', construction_style: 'multi-panel',
      finished_length: 8, finished_width: 4, finished_depth: 2, seam_allowance: 0.5,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const heights = r.value.pieces.map((p) => {
      const cut = p.paths.find((pa) => pa.id.endsWith(':cut'))!;
      const ys = cut.edges.flatMap((e) => [e.start.y, e.end.y]);
      return Math.max(...ys) - Math.min(...ys);
    });
    // Before normalisation the zipper end tab was 15.39 "inches" tall beside
    // 4.72-inch panels — a >3x outlier that tripled the exported page height.
    expect(Math.max(...heights) / Math.min(...heights)).toBeLessThan(3);
  });
});

// ─── Zipper end tab survives being folded ────────────────────────────────────

describe('zipperEndTabDims — fold allowance', () => {
  it.each([0, 5, 10, 15.875])('sa=%s: tab still has positive height after folding and seaming', (sa) => {
    const r = resolveInputs({
      preset: 'custom', units: 'mm',
      finished_length: 180, finished_width: 100, finished_depth: 40,
      seam_allowance: sa,
    });
    const tab = zipperEndTabDims(r);
    // The steps say to fold in half, then sew at `sa`.
    expect(tab.height / 2 - sa).toBeGreaterThan(0);
    expect(tab.height / 2 - sa).toBeCloseTo(15, 6); // ZIPPER_END_TAB_FINISHED_HEIGHT
  });
});
