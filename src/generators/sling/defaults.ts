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

/**
 * The default project's inputs, in DISPLAY units (inches here, except the three
 * fields the panel labels in mm: webbing width, foam thickness, seam allowance).
 *
 * Every field is filled in. A blank box tells a first-time user nothing about
 * what the generator is going to build, and the eight vault-open lengths each
 * fired their own "[mock-derived] ... defaults to ..." warning when left unset,
 * which buried the three warnings that are actually about this build. The
 * settings panel still flags these fields as mock-derived, so the "measure and
 * confirm" signal stays where the number is.
 */
export const DEFAULT_SLING_INPUTS = {
  units: DEFAULT_UNITS,
  webbing_width: WEBBING_WIDTH_MM,
  pad_finished_length: PAD_LENGTH_MM / IN,
  pad_girth: PAD_GIRTH_MM / IN,
  foam_thickness: FOAM_THICKNESS_MM,
  foam_width: FOAM_WIDTH_MM / IN,
  foam_setback: FOAM_SETBACK_MM / IN,
  tuck_depth: TUCK_DEPTH_MM / IN,
  turning_ease: TURNING_EASE_MM / IN,
  seam_allowance: DEFAULT_SEAM_ALLOWANCE_MM,
  rear_tail_length: REAR_TAIL_MM / IN,
  adjustment_webbing_length: ADJUST_WEBBING_MM / IN,
  third_piece: 'anchor_strap' as const,
  anchor_strap_length: ANCHOR_STRAP_MM / IN,
  end_interface: 'bare_triglide' as const,
  route_through_both_slots: false,
};
