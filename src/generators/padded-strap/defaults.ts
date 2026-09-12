/**
 * Defaults. Numbers marked "Open" in the vault are carried as inputs with a
 * mock-derived warning, never as silent truth (rigs/harness-h-geometry.md:
 * "no pad length, pad width, foam thickness … mock up the pad and the H
 * crossing height in scrap on your own torso first").
 */
const IN = 25.4;

export const DEFAULT_UNITS = 'in' as const;
export const DEFAULT_MODE = 'pack_pair' as const;

/** Pack pair: 400 mm pad, 60 mm wide, 8 mm foam — vault reference/technique-shoulder-strap-construction.md sweet spot. */
export const PACK_PAD_LENGTH_MM = 400;
export const PACK_PAD_WIDTH_MM = 60;
export const PACK_FOAM_MM = 8;
export const PACK_WEBBING_MM = 25;
export const PACK_TORSO_MM = 500;
export const PACK_GUSSET_MM = 150;
/** Adjustment left in the tail after it reaches the lower anchor (Tri-Zip uses the same 200 mm). */
export const TAIL_ADJUST_RANGE_MM = 200;
export const TAIL_MIN_MM = 150;

/** H-harness: 1.5" webbing, four side-release corners, 8" of chest adjustment — Confirmed in the vault. */
export const H_WEBBING_MM = 1.5 * IN;
export const H_CHEST_ADJUST_MM = 8 * IN;
export const H_SLOT_PITCH_MM = 1 * IN;
export const H_HYDRATION_CHANNELS = 2;
export const H_FRONT_PALS_ROWS = 2;
/** H-harness pad, cross-strap height, spread and drop legs — Open in the vault (mock-derived). */
export const H_PAD_LENGTH_MM = 400;
export const H_PAD_WIDTH_MM = 2.5 * IN;
/** ~3/8" blue camping-pad foam, "unchanged for 30 years" (rigs/lbvmod-harness-geometry.md) — best guess for the H set. */
export const H_FOAM_MM = 10;
export const H_CROSS_STRAP_HEIGHT_MM = 150;
export const H_PAD_SPREAD_MM = 150;
export const H_DROP_LEG_MM = 300;

export const DEFAULT_SEAM_ALLOWANCE_MM = 10;
/** PALS row pitch and webbing (plate-carriers/pals-sewn-webbing.md). */
export const PALS_ROW_PITCH_MM = 2 * IN;
export const PALS_WEBBING_MM = 1 * IN;
/** Fold-over on a webbing end round a buckle bar (vault: 1.25"). */
export const BUCKLE_FOLD_MM = 1.25 * IN;
