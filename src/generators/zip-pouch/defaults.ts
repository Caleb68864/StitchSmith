/**
 * Zip Pouch Generator — Preset defaults and global defaults
 */

import type { ZipPouchPreset, ResolvedInputs, ConstructionStyle } from './types.js';

// ─── Global defaults (applied when no preset or custom preset) ──────────────────

export const DEFAULT_SEAM_ALLOWANCE_MM = 10;
export const DEFAULT_CONSTRUCTION_STYLE: ConstructionStyle = 'boxed';
export const DEFAULT_ZIP_GAUGE = '#3' as const;
export const DEFAULT_GROSGRAIN_WIDTH_MM = 15.875; // 5/8"
export const DEFAULT_PULL_LOOPS = true;
export const DEFAULT_UNITS = 'mm' as const;
export const DEFAULT_PRESET: ZipPouchPreset = 'pencil';

// ─── Preset dimension tables ────────────────────────────────────────────────────

export type PresetDimensions = Pick<
  ResolvedInputs,
  'finished_length' | 'finished_width' | 'finished_depth'
>;

export const PRESET_DEFAULTS: Record<Exclude<ZipPouchPreset, 'custom'>, PresetDimensions> = {
  pencil: {
    finished_length: 220,
    finished_width: 120,
    finished_depth: 30,
  },
  edc: {
    finished_length: 180,
    finished_width: 100,
    finished_depth: 40,
  },
  toiletry: {
    finished_length: 280,
    finished_width: 150,
    finished_depth: 60,
  },
};

/**
 * Return the dimension defaults for a given preset, or undefined for 'custom'.
 */
export function getPresetDimensions(preset: ZipPouchPreset): PresetDimensions | undefined {
  if (preset === 'custom') return undefined;
  return PRESET_DEFAULTS[preset];
}
