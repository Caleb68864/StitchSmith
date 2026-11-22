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

export const PLACEHOLDERS: readonly { field: keyof BivyInputs; label: string; mm: number; kind: 'length' | 'sa' }[] = [
  { field: 'length', label: 'Floor length', mm: LENGTH_MM, kind: 'length' },
  { field: 'floor_width', label: 'Floor width', mm: FLOOR_WIDTH_MM, kind: 'length' },
  { field: 'tub_height', label: 'Tub height', mm: TUB_HEIGHT_MM, kind: 'length' },
  { field: 'top_width', label: 'Top width (flat)', mm: TOP_WIDTH_MM, kind: 'length' },
  { field: 'zip_length', label: 'Side zipper', mm: ZIP_LENGTH_MM, kind: 'length' },
  { field: 'fabric_width', label: 'Usable fabric width', mm: FABRIC_WIDTH_MM, kind: 'length' },
  { field: 'seam_allowance', label: 'Seam allowance', mm: SEAM_ALLOWANCE_MM, kind: 'sa' },
];
