/**
 * Bivy placeholders. NONE is a vault number (the vault was not available;
 * owner decisions 2026-11-16 and 2026-11-21): each is a common-practice
 * starting point with a `mock-derived` note until checked.
 */
import type { BivyInputs } from './types.js';

const IN = 25.4;
export const DEFAULT_UNITS = 'in' as const;

/** Placeholder 84" (7') inside length. */
export const LENGTH_MM = 84 * IN;
/** Placeholder 26" floor. */
export const FLOOR_WIDTH_MM = 26 * IN;
/** Placeholder 5" tub sides. */
export const TUB_HEIGHT_MM = 5 * IN;
/** Placeholder 40" top laid flat. */
export const TOP_WIDTH_MM = 40 * IN;
/** Placeholder 48" side zipper. */
export const ZIP_LENGTH_MM = 48 * IN;
/** Placeholder 58" usable fabric width. */
export const FABRIC_WIDTH_MM = 58 * IN;
/** Placeholder 1/2" seam allowance, mm. */
export const SEAM_ALLOWANCE_MM = 12.7;
/** Placeholder 30": where a J zipper crosses the top, from the head (about chest height). */
export const J_FROM_HEAD_MM = 30 * IN;
/** Placeholder 6": the brim channel's distance from the head edge of the top. */
export const BRIM_FROM_HEAD_MM = 6 * IN;
/** Placeholder 1" brim channel (a wire or a short pole). */
export const BRIM_CHANNEL_MM = 1 * IN;

export const PLACEHOLDERS: readonly { field: keyof BivyInputs; label: string; mm: number; kind: 'length' | 'sa' }[] = [
  { field: 'length', label: 'Floor length', mm: LENGTH_MM, kind: 'length' },
  { field: 'floor_width', label: 'Floor width', mm: FLOOR_WIDTH_MM, kind: 'length' },
  { field: 'tub_height', label: 'Tub height', mm: TUB_HEIGHT_MM, kind: 'length' },
  { field: 'top_width', label: 'Top width (flat)', mm: TOP_WIDTH_MM, kind: 'length' },
  { field: 'zip_length', label: 'Side zipper', mm: ZIP_LENGTH_MM, kind: 'length' },
  { field: 'fabric_width', label: 'Usable fabric width', mm: FABRIC_WIDTH_MM, kind: 'length' },
  { field: 'seam_allowance', label: 'Seam allowance', mm: SEAM_ALLOWANCE_MM, kind: 'sa' },
  { field: 'j_from_head', label: 'J zipper from the head', mm: J_FROM_HEAD_MM, kind: 'length' },
  { field: 'brim_from_head', label: 'Brim from the head', mm: BRIM_FROM_HEAD_MM, kind: 'length' },
  { field: 'brim_channel', label: 'Brim channel', mm: BRIM_CHANNEL_MM, kind: 'length' },
];
