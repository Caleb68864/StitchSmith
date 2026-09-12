/** Defaults. Only setback, tuck and the hardware rules come from the vault; every length is a placeholder. */
const IN = 25.4;
export const DEFAULT_UNITS = 'in' as const;
export const FOAM_SETBACK_MM = 0.5 * IN;
export const TUCK_DEPTH_MM = 1 * IN;
export const TURNING_EASE_MM = 0.5 * IN;
export const DEFAULT_SEAM_ALLOWANCE_MM = 9.5;
/** Placeholders (mock-derived). */
export const WEBBING_WIDTH_MM = 1.25 * IN;
export const PAD_LENGTH_MM = 16 * IN;
export const PAD_GIRTH_MM = 4 * IN;
export const FOAM_THICKNESS_MM = 6;
export const FOAM_WIDTH_MM = 1.5 * IN;
export const REAR_TAIL_MM = 30 * IN;
export const ADJUST_WEBBING_MM = 24 * IN;
export const ANCHOR_STRAP_MM = 4 * IN;
/** Below this finished flat width a rod will not turn the tube: tack 550 cord inside and pull. */
export const ROD_TURN_MIN_FLAT_WIDTH_MM = 1.5 * IN;
/** Webbing wrapped round a tri-glide or the adapter, per end. */
export const HARDWARE_WRAP_MM = 2 * IN;
export const CORD_LOOP_MM = 6 * IN;
