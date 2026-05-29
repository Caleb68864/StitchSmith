import { describe, it, expect } from 'vitest';
import { convertInputsUnits, convertPresetDimsToUnits } from '../../../components/zip-pouch/ZipPouchSettingsPanel.js';
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
