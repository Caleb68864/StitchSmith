/** Vault numbers for the SOE tactical organizer (bags/soe-tactical-organizer.md). */
const IN = 25.4;
export const DEFAULT_UNITS = 'in' as const;
export const POUCH_WIDTH_MM = 5 * IN;
export const POCKET_HEIGHT_MM = 5 * IN;
export const BODY_HEM_MM = 1 * IN;
export const PANEL_HEM_MM = 0.25 * IN;
export const PRODUCTION_HEM_MIN_MM = 0.5 * IN;
export const SIDE_SEAM_MM = 0.25 * IN;
export const SIDE_FOLD_MM = 1 * IN;
export const PANEL_EXTRA_WIDTH_MM = 1.25 * IN;
export const SLOT_WIDTHS_MM = [1.25 * IN, 1.25 * IN];
export const VELCRO_STRIPS = 2;
export const VELCRO_STRIP_WIDTH_MM = 1.5 * IN;
export const VELCRO_GAP_MM = 0.5 * IN;
/** Bellows deeper than this want a real gusset. */
export const BELLOWS_MAX_MM = 0.5 * IN;
/** One pen wants 7/8"–1"; 1 1/4" holds two sloppily. */
export const PEN_SLOT_HONEST_MM = 1 * IN;
export const CONTENTS_HEIGHT_MM = 5 * IN;
export const NOTEBOOK_3X5_MM: [number, number, number] = [3 * IN, 5 * IN, 0.4 * IN];
