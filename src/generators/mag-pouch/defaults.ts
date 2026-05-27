/**
 * Mag Pouch Generator — v1 Default Values
 *
 * All inch values have their mm equivalents (× 25.4) listed for reference.
 * Metric values in comments are rounded to 2 decimal places for readability;
 * runtime uses the exact × 25.4 conversion unless noted.
 */

/** Lateral ease (width direction), inches.  6.35 mm. */
export const DEFAULT_EASE_WIDTH_IN = 0.25;

/** Front-to-back ease (depth direction), inches.  6.35 mm. */
export const DEFAULT_EASE_DEPTH_IN = 0.25;

/**
 * Fraction of magazine height exposed above the pouch opening.
 * 0.70 = 70 % of the magazine body is above the pouch mouth.
 */
export const DEFAULT_EXPOSED_PERCENTAGE = 0.70;

/**
 * Seam allowance, inches.  9.525 mm (spec rounds to 9.5 mm).
 * Allowed values: 0.25, 0.375, 0.5.
 */
export const DEFAULT_SEAM_ALLOWANCE_IN: 0.25 | 0.375 | 0.5 = 0.375;

/** Hook-side velcro strip length, inches.  76.2 mm. */
export const DEFAULT_HOOK_LENGTH_IN = 3.0;

/** Loop-side velcro strip length, inches.  101.6 mm. */
export const DEFAULT_LOOP_LENGTH_IN = 4.0;

/** Closure hardware overlap, inches.  63.5 mm. */
export const DEFAULT_CLOSURE_OVERLAP_IN = 2.5;

/** Grommet size identifier.  #0 = 1/4-inch ID grommet. */
export const DEFAULT_GROMMET_SIZE = '#0';

// ─── Derived mm values (computed from inch defaults) ───────────────────────────

const IN_TO_MM = 25.4;

export const DEFAULT_EASE_WIDTH_MM = DEFAULT_EASE_WIDTH_IN * IN_TO_MM;    // 6.35
export const DEFAULT_EASE_DEPTH_MM = DEFAULT_EASE_DEPTH_IN * IN_TO_MM;    // 6.35
export const DEFAULT_SEAM_ALLOWANCE_MM = DEFAULT_SEAM_ALLOWANCE_IN * IN_TO_MM; // 9.525
export const DEFAULT_HOOK_LENGTH_MM = DEFAULT_HOOK_LENGTH_IN * IN_TO_MM;   // 76.2
export const DEFAULT_LOOP_LENGTH_MM = DEFAULT_LOOP_LENGTH_IN * IN_TO_MM;   // 101.6
export const DEFAULT_CLOSURE_OVERLAP_MM = DEFAULT_CLOSURE_OVERLAP_IN * IN_TO_MM; // 63.5
