/**
 * Top quilt placeholders. NONE of these is a vault number: the vault was not
 * available when the generator was built (owner decision 2026-11-16), so each
 * is a typical starting point with a `mock-derived` note until it is checked
 * against the vault or a test sleep.
 */
import type { QuiltInputs } from './types.js';

const IN = 25.4;
export const DEFAULT_UNITS = 'in' as const;

/** Placeholder 78" head to foot. */
export const LENGTH_MM = 78 * IN;
/** Placeholder 54" across the shoulders. */
export const SHOULDER_WIDTH_MM = 54 * IN;
/** Placeholder 40" across the foot. */
export const FOOT_WIDTH_MM = 40 * IN;
/** Placeholder 20" footbox. */
export const FOOTBOX_LENGTH_MM = 20 * IN;
/** Placeholder 58" usable fabric width. */
export const FABRIC_WIDTH_MM = 58 * IN;
/** Placeholder 2" loft. */
export const LOFT_MM = 2 * IN;
/** Placeholder 6" chamber pitch. */
export const BAFFLE_SPACING_MM = 6 * IN;
/** Placeholder 3 % shell differential. */
export const SHELL_DIFFERENTIAL_PCT = 3;
/** Placeholder 850 in³/oz fill power. */
export const FILL_POWER = 850;
/** Placeholder 10 % overstuff. */
export const OVERSTUFF_PCT = 10;
/** Placeholder 1/2" seam allowance, mm. */
export const SEAM_ALLOWANCE_MM = 12.7;
/** Placeholder 3/4" underquilt end channel (shock cord suspension). */
export const END_CHANNEL_MM = 0.75 * IN;

/**
 * Every placeholder input with its label and value (mm for lengths, a percent,
 * in³/oz for fill power, mm for the seam allowance whatever the unit). The
 * mock-derived note and the tests walk this list, so a new placeholder cannot
 * go unflagged.
 */
export const PLACEHOLDERS: readonly { field: keyof QuiltInputs; label: string; mm: number; kind: 'length' | 'percent' | 'fill_power' | 'sa' }[] = [
  { field: 'length', label: 'Length head to foot', mm: LENGTH_MM, kind: 'length' },
  { field: 'shoulder_width', label: 'Shoulder width', mm: SHOULDER_WIDTH_MM, kind: 'length' },
  { field: 'foot_width', label: 'Foot width', mm: FOOT_WIDTH_MM, kind: 'length' },
  { field: 'footbox_length', label: 'Footbox length', mm: FOOTBOX_LENGTH_MM, kind: 'length' },
  { field: 'fabric_width', label: 'Usable fabric width', mm: FABRIC_WIDTH_MM, kind: 'length' },
  { field: 'loft', label: 'Loft', mm: LOFT_MM, kind: 'length' },
  { field: 'baffle_spacing', label: 'Chamber spacing', mm: BAFFLE_SPACING_MM, kind: 'length' },
  { field: 'shell_differential', label: 'Shell differential', mm: SHELL_DIFFERENTIAL_PCT, kind: 'percent' },
  { field: 'fill_power', label: 'Fill power', mm: FILL_POWER, kind: 'fill_power' },
  { field: 'overstuff', label: 'Overstuff', mm: OVERSTUFF_PCT, kind: 'percent' },
  { field: 'seam_allowance', label: 'Seam allowance', mm: SEAM_ALLOWANCE_MM, kind: 'sa' },
  { field: 'end_channel', label: 'End channel', mm: END_CHANNEL_MM, kind: 'length' },
];
