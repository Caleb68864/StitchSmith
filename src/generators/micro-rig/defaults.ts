/** Vault numbers for the micro rig platform. Confirmed unless marked. */
const IN = 25.4;
export const DEFAULT_UNITS = 'in' as const;
export const PANEL_WIDTH_PRESETS_MM: Record<Exclude<import('./types.js').PanelWidthPreset, 'custom'>, number> = {
  stacked_10_5: 10.5 * IN,
  standard_13: 13 * IN,
  r308_14: 14 * IN,
  pals_16: 16 * IN,
  pals_19: 19 * IN,
};
export const PANEL_HEIGHT_MM = 7 * IN;
/** Utility pocket: 6 × 6, 3" off the body — constant wherever present. */
export const UTILITY_W_MM = 6 * IN;
export const UTILITY_H_MM = 6 * IN;
export const UTILITY_D_MM = 3 * IN;
export const UTILITY_LOOP_FIELD_MM: [number, number] = [3 * IN, 6 * IN];
/** Closure Velcro and interior loop strip both sit 2 1/4" down from the top. */
export const CLOSURE_VELCRO_DROP_MM = 2.25 * IN;
export const INTERIOR_VELCRO_DROP_MM = 2.25 * IN;
export const INTERIOR_VELCRO_HEIGHT_MM = 3 * IN;
/** Shoulder-strap buckles on the FRONT layer, 4" from each edge (8" apart on a 16" panel). */
export const BUCKLE_EDGE_OFFSET_MM = 4 * IN;
export const DANGLER_FIELD_MM: [number, number] = [11 * IN, 6 * IN];
export const ELASTIC_PITCH_MM = 1.5 * IN;
export const ELASTIC_LOOP_LEN_MM = 3 * IN;
/** Side PALS: 1" webbing rows at a 2" pitch, top bar 1 1/2" down (unverified). */
export const PALS_ROW_PITCH_MM = 2 * IN;
export const PALS_WEBBING_MM = 1 * IN;
export const PALS_TOP_DROP_MM = 1.5 * IN;
export const PALS_COLUMN_PITCH_MM = 1.5 * IN;
/** Split front join (vault split-front-center-join.md). */
export const GAP_WIDTH_MM = 2.25 * IN;
export const BUCKLE_SETBACK_MM = 3 * IN;
export const JOIN_BUCKLES = 4;
export const ANTIFLOP_CELL_MM = 3 * IN;
/** Face per cell ease over mag_w + 2·mag_t (mag pouch rule, vault micro-rig-mag-cell-sizing.md). */
export const FACE_EASE_MM = (5 / 16) * IN;
export const MIN_PUCKER_PER_SIDE_MM = 0.9 * IN;
export const DEFAULT_SEAM_ALLOWANCE_MM = 9.5;
export const EDGE_MARGIN_MM = 0.5 * IN;
/** Suspension webbing: 1.5" straps, ~30" of adjustment beyond a 5'2" wearer. */
export const STRAP_WEBBING_MM = 1.5 * IN;
export const SHOULDER_STRAP_LEN_MM = 54 * IN;
export const WAIST_STRAP_LEN_MM = 48 * IN;
export const DEFAULT_MAGAZINE = 'ar15_30_round';
/** Stacked cells (vault rigs/stacked-mag-cell-geometry.md) — the block lives in the pouch engine. */
export {
  STACK_EASE_MM, STACK_EASE_MIN_MM, WRAP_ALLOWANCE_MM, WRAP_ALLOWANCE_MIN_MM, STACK_COVERAGE, DIVIDER_LAYERS_MM, CRADLE_END_MM,
} from '../../lib/pouch-engine/fit/stacked.js';
export const CRADLE_WIDTH_MM = 2 * IN;
export const MED_ZONE_MM = 3 * IN;
export const PULL_TAB_MM = 3.5 * IN;
export const CELL_VELCRO_MM = 2 * IN;
export const FRONT_POUCH_BOTTOM_HEM_MM = 1 * IN;
export const POUCH_END_HEM_MM = 0.5 * IN;
/** Loaded magazine weight, lb, by platform (vault stacked-rig-308-adaptation.md). */
export const MAG_WEIGHT_LB: Record<string, number> = { rifle_556: 1.6, rifle_308: 2.4, ak: 1.8, custom: 1.8 };
export const WEIGHT_WARN_LB = 15;
