/**
 * Hammock placeholders. NONE of these is a vault number: the vault was not
 * available when the generator was built (owner decision 2026-11-16), so each
 * is a typical gathered-end starting point with a `mock-derived` note until
 * it is checked against the vault or a real hang.
 */
import type { HammockInputs } from './types.js';

const IN = 25.4;
export const DEFAULT_UNITS = 'in' as const;

/** Placeholder 11' gather to gather. */
export const LENGTH_MM = 132 * IN;
/** Placeholder 58" finished width. */
export const WIDTH_MM = 58 * IN;
/** Placeholder 60" usable fabric width (hammock nylons and polyesters are commonly sold about this wide). */
export const FABRIC_WIDTH_MM = 60 * IN;
/** Placeholder 1/2" side hem. */
export const SIDE_HEM_DEPTH_MM = 0.5 * IN;
/** Placeholder 1 1/4" channel: room for a continuous loop or a doubled cord. */
export const CHANNEL_DEPTH_MM = 1.25 * IN;
/** Placeholder 3" tail beyond each whip line. */
export const WHIP_TAIL_MM = 3 * IN;
/** Placeholder 83 % structural ridgeline (a common figure, not a vault number). */
export const RIDGELINE_PCT = 83;
/** Placeholder 10' tree strap (a common length, not a vault number). */
export const STRAP_LENGTH_MM = 120 * IN;

/**
 * Every placeholder input with its label and value (mm for lengths, a percentage
 * for the ridgeline). The mock-derived note and the tests walk this list, so a
 * new placeholder cannot go unflagged.
 */
export const PLACEHOLDERS: readonly { field: keyof HammockInputs; label: string; mm: number; kind: 'length' | 'percent' }[] = [
  { field: 'length', label: 'Length gather to gather', mm: LENGTH_MM, kind: 'length' },
  { field: 'width', label: 'Finished width', mm: WIDTH_MM, kind: 'length' },
  { field: 'fabric_width', label: 'Usable fabric width', mm: FABRIC_WIDTH_MM, kind: 'length' },
  { field: 'side_hem_depth', label: 'Side hem depth', mm: SIDE_HEM_DEPTH_MM, kind: 'length' },
  { field: 'channel_depth', label: 'Channel depth', mm: CHANNEL_DEPTH_MM, kind: 'length' },
  { field: 'whip_tail', label: 'Whip tail', mm: WHIP_TAIL_MM, kind: 'length' },
  { field: 'ridgeline_pct', label: 'Structural ridgeline', mm: RIDGELINE_PCT, kind: 'percent' },
  { field: 'strap_length', label: 'Tree strap', mm: STRAP_LENGTH_MM, kind: 'length' },
];
