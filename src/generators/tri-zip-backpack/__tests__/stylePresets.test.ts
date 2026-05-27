import { describe, it, expect } from 'vitest';
import {
  STYLE_PRESETS,
  urban_assault,
  tactical,
  hiking,
  camera,
  medical,
  minimalist,
} from '../stylePresets.js';
import { buildPattern } from '../buildPattern.js';
import { patternToSvg } from '../../../lib/pattern-engine/exports/svg.js';
import type { PresetName } from '../types.js';

const ALL_PRESET_NAMES: PresetName[] = [
  'urban_assault', 'tactical', 'hiking', 'camera', 'medical', 'minimalist',
];

describe('STYLE_PRESETS', () => {
  it('exports six named presets', () => {
    expect(Object.keys(STYLE_PRESETS)).toHaveLength(6);
    expect(Object.keys(STYLE_PRESETS)).toEqual(expect.arrayContaining(ALL_PRESET_NAMES));
  });

  it('urban_assault preset has correct parameter values', () => {
    expect(urban_assault.strap_width).toBe(75);
    expect(urban_assault.foam_thickness).toBe(10);
    expect(urban_assault.curve_style).toBe('ergonomic');
    expect(urban_assault.back_panel_shape).toBe('rounded');
    expect(urban_assault.compression_straps).toBe('side');
    expect(urban_assault.hip_belt).toBe('webbing');
    expect(urban_assault.sternum_strap).toBe(true);
    expect(urban_assault.y_split_height_percent).toBe(60);
    expect(urban_assault.center_panel_width_percent).toBe(35);
    expect(urban_assault.zipper_method).toBe('gusseted');
  });

  it('tactical preset has correct parameter values', () => {
    expect(tactical.strap_width).toBe(75);
    expect(tactical.curve_style).toBe('straight');
    expect(tactical.back_panel_shape).toBe('tactical');
    expect(tactical.compression_straps).toBe('side_and_bottom');
    expect(tactical.hip_belt).toBe('padded');
    expect(tactical.y_split_height_percent).toBe(55);
  });

  it('hiking preset has correct parameter values', () => {
    expect(hiking.strap_width).toBe(65);
    expect(hiking.foam_thickness).toBe(12);
    expect(hiking.curve_style).toBe('s_curve');
    expect(hiking.hip_belt).toBe('padded');
    expect(hiking.y_split_height_percent).toBe(65);
  });

  it('camera preset has correct parameter values', () => {
    expect(camera.back_panel_shape).toBe('square');
    expect(camera.laptop_sleeve_attachment).toBe('seam-sewn');
    expect(camera.y_split_height_percent).toBe(50);
    expect(camera.center_panel_width_percent).toBe(45);
  });

  it('medical preset has correct parameter values', () => {
    expect(medical.compression_straps).toBe('none');
    expect(medical.hip_belt).toBe('none');
    expect(medical.sternum_strap).toBe(false);
    expect(medical.y_split_height_percent).toBe(70);
    expect(medical.center_panel_width_percent).toBe(50);
  });

  it('minimalist preset has correct parameter values', () => {
    expect(minimalist.strap_width).toBe(50);
    expect(minimalist.foam_thickness).toBe(6);
    expect(minimalist.compression_straps).toBe('none');
    expect(minimalist.hip_belt).toBe('none');
    expect(minimalist.sternum_strap).toBe(false);
  });

  it('all presets have required fields', () => {
    for (const name of ALL_PRESET_NAMES) {
      const p = STYLE_PRESETS[name];
      expect(p.name).toBe(name);
      expect(typeof p.strap_width).toBe('number');
      expect(typeof p.foam_thickness).toBe('number');
      expect(['straight', 'ergonomic', 's_curve']).toContain(p.curve_style);
      expect(['rounded', 'tactical', 'square']).toContain(p.back_panel_shape);
      expect(['none', 'side', 'side_and_bottom']).toContain(p.compression_straps);
      expect(['none', 'webbing', 'padded']).toContain(p.hip_belt);
      expect(typeof p.sternum_strap).toBe('boolean');
      expect(p.y_split_height_percent).toBeGreaterThan(0);
      expect(p.y_split_height_percent).toBeLessThan(100);
      expect(p.center_panel_width_percent).toBeGreaterThan(0);
      expect(p.center_panel_width_percent).toBeLessThan(100);
      expect(['direct', 'gusseted']).toContain(p.zipper_method);
      expect(typeof p.zipper_gusset_width).toBe('number');
    }
  });

  it('all six presets produce a non-empty Pattern without throwing', () => {
    const baseInputs = { height: 510, width: 300, depth: 200, units: 'mm' as const };
    for (const name of ALL_PRESET_NAMES) {
      const preset = STYLE_PRESETS[name];
      const result = buildPattern({ ...baseInputs, stylePreset: name }, preset);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.pieces.length).toBeGreaterThan(0);
      }
    }
  });

  it('given identical dimensions, six presets produce different SVG output', () => {
    const baseInputs = { height: 510, width: 300, depth: 200, units: 'mm' as const };
    const svgOutputs: string[] = [];

    for (const name of ALL_PRESET_NAMES) {
      const preset = STYLE_PRESETS[name];
      const result = buildPattern({ ...baseInputs, stylePreset: name }, preset);
      expect(result.ok).toBe(true);
      if (result.ok) {
        svgOutputs.push(patternToSvg(result.value));
      }
    }

    // Assert no two SVG outputs are identical
    for (let i = 0; i < svgOutputs.length; i++) {
      for (let j = i + 1; j < svgOutputs.length; j++) {
        expect(svgOutputs[i]).not.toBe(svgOutputs[j]);
      }
    }
  });
});
