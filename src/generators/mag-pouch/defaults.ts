/**
 * Mag Pouch Generator — Default Values
 *
 * All inch values have their mm equivalents (× 25.4) listed for reference.
 * Values marked "vault" come from the SOE build research in the MYOG vault;
 * the note path is given so the provenance can be checked.
 */

/** Lateral ease (width direction), inches.  6.35 mm. */
export const DEFAULT_EASE_WIDTH_IN = 0.25;

/** Front-to-back ease (depth direction), inches.  6.35 mm. */
export const DEFAULT_EASE_DEPTH_IN = 0.25;

/**
 * Coverage: fraction of the magazine height that sits INSIDE the pouch.
 * 0.70 = the pouch is 70 % of the magazine height; 30 % stands proud for the
 * grab. Vault: slot_depth / mag_length ≈ 0.7–0.8 (rigs/microrig-velcro-dot-retention.md);
 * the SOE 4-pack card is 5.5" on a 7.5" mag = 0.73.
 *
 * The input key is still `exposed_percentage` for project-file compatibility.
 */
export const DEFAULT_EXPOSED_PERCENTAGE = 0.70;

/**
 * Seam allowance, inches.  9.525 mm (spec rounds to 9.5 mm).
 * Allowed values: 0.25, 0.375, 0.5. Applies to the folded-T construction only;
 * the pleated card is hemmed (see DEFAULT_BACK_HEM_IN / DEFAULT_FACE_END_HEM_IN).
 */
export const DEFAULT_SEAM_ALLOWANCE_IN: 0.25 | 0.375 | 0.5 = 0.375;

/** Hook-side velcro strip length, inches.  76.2 mm. (3×3 lid closure is the SOE fixed hook patch.) */
export const DEFAULT_HOOK_LENGTH_IN = 3.0;

/** Loop-side velcro strip length, inches.  101.6 mm.  = hook + 1" of travel (vault: loop field = hook + travel). */
export const DEFAULT_LOOP_LENGTH_IN = 4.0;

/** Closure hardware overlap onto the face, inches.  63.5 mm. */
export const DEFAULT_CLOSURE_OVERLAP_IN = 2.5;

/** Grommet size identifier.  #0 = 1/4-inch ID grommet. */
export const DEFAULT_GROMMET_SIZE = '#0';

// ─── Construction / cell defaults (vault) ─────────────────────────────────────

/** Default construction. */
export const DEFAULT_CONSTRUCTION = 'folded_t' as const;

/** Cells side by side. 1 = a single pouch. */
export const DEFAULT_CELL_COUNT = 1;

/** PALS column pitch, inches. Immutable by spec (vault mag-pouches/pals-grid-vs-cell-width.md). */
export const PALS_PITCH_IN = 1.5;

/** Rifle cell span on a PALS mount, inches (two columns). */
export const RIFLE_CELL_SPAN_IN = 3.0;

/** .308 cell span, inches — off the PALS grid (vault rigs/mag-cell-width-308.md). */
export const R308_CELL_SPAN_IN = 3.5;

/**
 * Face ease added on top of `mag_width + 2 × mag_thickness` to get face fabric
 * per cell, inches. Calibrated so a 2.55 × 1.0 rifle mag gives 4.86" ≈ the
 * 4 7/8" per cell measured on the SOE 4-pack card (vault
 * mag-pouches/mag-pouch-4pack-single-dimensions.md).
 */
export const DEFAULT_FACE_EASE_IN = 0.3125;

/** Back panel hem, inches — SOE floor spec: any sewer can hem 1". */
export const DEFAULT_BACK_HEM_IN = 1.0;

/** Face end hem, inches (as measured on the 4-pack card: 20.5" cut → 19.5" hemmed). */
export const DEFAULT_FACE_END_HEM_IN = 0.5;

/** Extra face height hemmed over at the raw-edge meeting for AK mags, inches. */
export const AK_FACE_HEM_IN = 0.75;

/** Default cell bottom for the pleated card. */
export const DEFAULT_BOTTOM_STYLE = 'cradle' as const;

/** Standard SOE bungee cut per cell, inches; expect ~18" for fat cord. */
export const DEFAULT_BUNGEE_LENGTH_IN = 16;

/** Pull tab length for bungee retention, inches (vault rigs/r308-bungee-retention-over-top.md). */
export const DEFAULT_PULL_TAB_LENGTH_IN = 3.5;

// ─── Derived mm values (computed from inch defaults) ───────────────────────────

const IN_TO_MM = 25.4;

export const DEFAULT_EASE_WIDTH_MM = DEFAULT_EASE_WIDTH_IN * IN_TO_MM;    // 6.35
export const DEFAULT_EASE_DEPTH_MM = DEFAULT_EASE_DEPTH_IN * IN_TO_MM;    // 6.35
export const DEFAULT_SEAM_ALLOWANCE_MM = DEFAULT_SEAM_ALLOWANCE_IN * IN_TO_MM; // 9.525
export const DEFAULT_HOOK_LENGTH_MM = DEFAULT_HOOK_LENGTH_IN * IN_TO_MM;   // 76.2
export const DEFAULT_LOOP_LENGTH_MM = DEFAULT_LOOP_LENGTH_IN * IN_TO_MM;   // 101.6
export const DEFAULT_CLOSURE_OVERLAP_MM = DEFAULT_CLOSURE_OVERLAP_IN * IN_TO_MM; // 63.5
