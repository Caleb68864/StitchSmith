/** Vault numbers for the SOE fat clamshell medpack (packs/medpack-overview.md and siblings). */
const IN = 25.4;
export const DEFAULT_UNITS = 'in' as const;
export const WIDTH_MM = 11 * IN;
export const HEIGHT_MM = 16 * IN;
export const DEPTH_MM = 6 * IN;
/** SOE's standard medpack depth; every wrap-around length on the standard cut list assumes it. */
export const STANDARD_DEPTH_MM = 3 * IN;
export const LID_DEPTH_MM = 1.5 * IN;
export const ZIPPER_LIP_MM = 1 * IN;
export const ZIPPER_UNDERWRAP_MM = 1.75 * IN;
export const HOOP_OVERCUT_MM = 0.5 * IN;
export const SEAM_ALLOWANCE_MM = 0.5 * IN;
export const FOLD_IN_MM = 0.5 * IN;
export const ZIPPER_CLEARANCE_MM = 0;
export const PALS_ROWS_SIDE = 7;
export const PALS_ROWS_FACE = 5;
export const PALS_ROWS_BOTTOM = 3;
export const PALS_COLS_SIDE = 3;
export const EDGE_OFFSET_MM = 1 * IN;
export const HANDLE_BOW_MM = 2 * IN;
export const HANDLE_FOLD_UNDER_MM = 2 * IN;
export const HANDLE_WEBBING_WIDTH_MM = 2 * IN;
export const HANDLE_CORE_WIDTH_MM = 1 * IN;
export const COMPRESSION_STRAPS_PER_SIDE = 2;
export const COMPRESSION_EXTRA_MM = 6 * IN;
export const LOOP_STRIP_WIDTH_MM = 2 * IN;
export const LOOP_GAP_MM = 0.5 * IN;
/** Velcro is cut this much long and trimmed after sewing (technique-stitch-shrinkage). */
export const VELCRO_OVERCUT_MM = 2 * IN;
export const STRAP_TAB_SPACING_MM = 4 * IN;
export const STRAP_TAB_LENGTH_MM = 3 * IN;
export const STRAP_TAB_WEBBING_MM = 2 * IN;
export const STRAP_TAB_COUNT = 6;
export const LOWER_ANCHOR_RISE_MM = 1 * IN;
export const STERNUM_LENGTHS_IN = [18, 24] as const;
/** Pocket grid → footprint (medpack-pouch-system.md). */
export const POCKET_GRID_FOOTPRINT_MM: Record<'2x2' | '3x3', { width: number; height: number }> = {
  '2x2': { width: 11 * IN, height: 16 * IN },
  '3x3': { width: 15 * IN, height: 24 * IN },
};
