/**
 * Circle Skirt Generator — Preset sweep angles and global defaults
 */

import type { CircleSkirtPreset, ClosureType, WaistbandType } from './types.js';

// ─── Global defaults ─────────────────────────────────────────────────────────────

export const DEFAULT_SWEEP_ANGLE_DEG = 360;
export const DEFAULT_WAIST_EASE_MM = 20;
export const DEFAULT_CLOSURE: ClosureType = 'side-zip';
export const DEFAULT_WAISTBAND_TYPE: WaistbandType = 'straight';
export const DEFAULT_BAND_HEIGHT_MM = 25;
export const DEFAULT_ELASTIC_WIDTH_MM = 25;
export const DEFAULT_SEAM_ALLOWANCE_MM = 15;
export const DEFAULT_HEM_ALLOWANCE_MM = 20;
export const DEFAULT_FABRIC_WIDTH_MM = 1524; // 60"
export const DEFAULT_UNITS = 'in' as const;
export const DEFAULT_PRESET: CircleSkirtPreset = 'full';

// ─── Preset sweep angles ─────────────────────────────────────────────────────────

export const PRESET_SWEEP_ANGLES: Record<Exclude<CircleSkirtPreset, 'custom'>, number> = {
  quarter: 90,
  half: 180,
  full: 360,
  double: 720,
};

/**
 * Return the sweep angle for a given preset, or undefined for 'custom'.
 */
export function getPresetSweepAngle(preset: CircleSkirtPreset): number | undefined {
  if (preset === 'custom') return undefined;
  return PRESET_SWEEP_ANGLES[preset];
}
