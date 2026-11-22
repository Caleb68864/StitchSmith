/**
 * Tarp placeholders. NONE of these is a vault number: the vault's shelter
 * notes were not available when the generator was built (owner decision
 * 2026-11-16), so each one is a starting point with a `mock-derived`
 * warning until it is checked against the vault or a real build.
 */
import type { TarpInputs } from './types.js';

const IN = 25.4;
export const DEFAULT_UNITS = 'in' as const;

/** Placeholder 10' ridge. */
export const RIDGE_LENGTH_MM = 120 * IN;
/** Placeholder 8' eave to eave. */
export const WIDTH_MM = 96 * IN;
/** Placeholder 2" cat cut on the ridge seam. */
export const RIDGE_SAG_MM = 2 * IN;
/** Placeholder 3" cat cut on each eave. */
export const EAVE_SAG_MM = 3 * IN;
/** Placeholder 58" usable width (a 60" roll less its selvedges). */
export const FABRIC_WIDTH_MM = 58 * IN;
/** Placeholder 1/2" flat-felled ridge seam allowance, mm. */
export const SEAM_ALLOWANCE_MM = 0.5 * IN;
/** Placeholder 1/2" hem. */
export const HEM_DEPTH_MM = 0.5 * IN;
/** Placeholder: one tie-out mid-eave. */
export const EAVE_TIEOUTS = 1;
/** Placeholder 3" square patch. */
export const PATCH_SIZE_MM = 3 * IN;
/** Placeholder 5" grosgrain per loop (folded in half, ends sewn into the hem). */
export const LOOP_LENGTH_MM = 5 * IN;
/** Placeholder 5/8" grosgrain. */
export const LOOP_WIDTH_MM = 0.625 * IN;
/** Placeholder 42" ridgeline for the pitch check. */
export const RIDGE_HEIGHT_MM = 42 * IN;
export const MAX_EAVE_TIEOUTS = 6;
/** Placeholder 8' of cord per guyline (a common pre-cut guyline length; not a vault number). */
export const GUYLINE_LENGTH_MM = 96 * IN;

/**
 * Every placeholder input, with its label and its value in millimetres
 * (`seam_allowance` is mm-native; `eave_tieouts` is a count). The
 * mock-derived note and the tests walk this list, so a new placeholder
 * cannot go unflagged.
 */
export const PLACEHOLDERS: readonly { field: keyof TarpInputs; label: string; mm: number; kind: 'length' | 'count' | 'mm' }[] = [
  { field: 'ridge_length', label: 'Ridge length', mm: RIDGE_LENGTH_MM, kind: 'length' },
  { field: 'width', label: 'Width eave to eave', mm: WIDTH_MM, kind: 'length' },
  { field: 'ridge_sag', label: 'Ridge cat-cut depth', mm: RIDGE_SAG_MM, kind: 'length' },
  { field: 'eave_sag', label: 'Eave cat-cut depth', mm: EAVE_SAG_MM, kind: 'length' },
  { field: 'fabric_width', label: 'Usable fabric width', mm: FABRIC_WIDTH_MM, kind: 'length' },
  { field: 'seam_allowance', label: 'Ridge seam allowance', mm: SEAM_ALLOWANCE_MM, kind: 'mm' },
  { field: 'hem_depth', label: 'Hem depth', mm: HEM_DEPTH_MM, kind: 'length' },
  { field: 'eave_tieouts', label: 'Tie-outs per eave', mm: EAVE_TIEOUTS, kind: 'count' },
  { field: 'patch_size', label: 'Reinforcement patch', mm: PATCH_SIZE_MM, kind: 'length' },
  { field: 'loop_length', label: 'Tie-out loop grosgrain', mm: LOOP_LENGTH_MM, kind: 'length' },
  { field: 'loop_width', label: 'Grosgrain width', mm: LOOP_WIDTH_MM, kind: 'length' },
  { field: 'ridge_height', label: 'Ridgeline height (pitch check)', mm: RIDGE_HEIGHT_MM, kind: 'length' },
  { field: 'guyline_length', label: 'Cord per guyline', mm: GUYLINE_LENGTH_MM, kind: 'length' },
];
