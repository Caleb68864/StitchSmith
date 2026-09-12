/** Vault numbers for the plate carrier (plate-carriers/*.md). Reference grade unless noted. */
const IN = 25.4;
export const DEFAULT_UNITS = 'in' as const;
/** Standard commercial plate sizes, width × height (plate-sizes-standard.md). 10 × 12 is the safe default. */
export const PLATE_SIZES_MM: Record<'8x10' | '10x12' | '11x14', [number, number]> = { '8x10': [8 * IN, 10 * IN], '10x12': [10 * IN, 12 * IN], '11x14': [11 * IN, 14 * IN] };
/** Corner clip per cut: chord length and angle (plate-cut-sapi/shooter/swimmer.md). Swimmer: taper start and angle from vertical. */
export const CUT_DEFAULTS: Record<'sapi' | 'shooter' | 'swimmer', { clip: number; angle: number }> = {
  sapi: { clip: 2 * IN, angle: 45 },
  shooter: { clip: 2.75 * IN, angle: 50 },
  swimmer: { clip: 3 * IN, angle: 25 },
};
export const POCKET_EASE_MM = 0.375 * IN;
export const SHELL_OVERSIZE_MM = 0.5 * IN;
export const BINDING_WIDTH_MM = 1 * IN;
export const SEAM_ALLOWANCE_MM = 0.375 * IN;
export const COMFORT_FOAM_MM = 6;
export const POCKET_FLAP_MM = 3 * IN;
export const LOOP_FIELD_MM: [number, number] = [6 * IN, 6 * IN];
export const LOOP_FIELD_Y_OFFSET_MM = 1 * IN;
export const STRAP_WIDTH_MM = 2 * IN;
export const PAD_LENGTH_MM = 8 * IN;
export const PAD_FOAM_MM = 6;
export const SHOULDER_STRAP_LENGTH_MM = 16 * IN;
export const STRAP_ADJUST_MM = 3 * IN;
export const CUMMERBUND_WIDTH_MM = 4 * IN;
export const TORSO_CIRCUMFERENCE_MM = 40 * IN;
export const CUMMERBUND_OVERLAP_MM = 2 * IN;
export const TORSO_LENGTH_MM = 17 * IN;
export const SIDE_PLATE_MM: Record<'6x6' | '6x8', [number, number]> = { '6x6': [6 * IN, 6 * IN], '6x8': [6 * IN, 8 * IN] };
/** Placard retention: ~2" of hook/loop engagement is enough (packs/medpack-pouch-system.md). */
export const PLACARD_MIN_ENGAGEMENT_MM = 2 * IN;
/** Laser slots: 1.5" × 0.25" (pals-laser-cut-laminate.md). */
export const LASER_SLOT_MM: [number, number] = [1.5 * IN, 0.25 * IN];
