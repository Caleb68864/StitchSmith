/**
 * Modular LBV — types.
 *
 * SOE's modular load-bearing vest: two mirrored zippered front panels and a
 * bellowed back panel (every panel a foam-stiffened pocket), Velcro-faced
 * 1.5" PALS rows bartacked at the 1.5" column pitch, a padded shoulder set
 * with an angled cross piece and drag handle, 24" verticals through tension
 * locks, three front straps, snap belt loops on a 2" duty belt
 * (vault rigs/lbvmod-*.md, rigs/lbv-*.md).
 *
 * Convention A: panels are drawn at finished size. Bound (edge-taped)
 * edges carry an explicit 0; only the zipper edges of the front pocket
 * layers carry `seam_allowance`. All lengths the user types are in the
 * display unit; `resolveInputs` normalises to millimetres.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { StrapHardwareItem } from '../../lib/strap-engine/index.js';

export type MaleSide = 'right' | 'left';

export interface LbvInputs {
  units?: 'mm' | 'in';
  /** Front panel width, display units. Vault: never stated — mock-derived default. */
  panel_width?: number;
  /** Front panel height, display units. Vault: never stated — mock-derived default. */
  panel_height?: number;
  /** Back panel width, display units. "Bigger than the fronts" — mock-derived default. */
  back_panel_width?: number;
  /** Back panel height, display units. Mock-derived. */
  back_panel_height?: number;
  /** Bellows oversize on the back panel's outer piece, both axes, display units. Vault: value unstated. */
  back_bellow?: number;
  /** Foam sheet in every panel pocket (rigidity, flotation). Default true. */
  foam_insert?: boolean;
  /** Foam sheet thickness, mm. Default 9.5 (3/8" blue camping pad). */
  foam_thickness?: number;
  /** Seam allowance on the zipper edges, mm. Default 12.7 (1/2"). */
  seam_allowance?: number;
  /** Edge tape width, display units. Default 1" (5038 nylon binding). */
  edge_tape_width?: number;
  /** Panel edge hidden under the edge tape, display units. Default 1/2". */
  edge_tape_conceal?: number;
  /** PALS row webbing width, display units. Default 1.5" (the LBV divergence from the 1" spec). */
  row_width?: number;
  /** Vertical pitch between rows, display units. Vault: never stated ("middle row centred") — mock-derived default 2.5". */
  row_pitch?: number;
  /** Rows per panel. Default: as many as fit the face between the vertical webbing and the top slot. */
  rows_per_panel?: number;
  /** Bartack columns on each front panel. Vault: unresolved (6.5" strips read as 4; the 24-mag claim needs more) — flagged. Default 4. */
  front_cols?: number;
  /** Bartack columns on the back panel. Vault: 4 ("five doesn't line up on anything"). */
  back_cols?: number;
  /** Loop Velcro on the face of every row (lids Velcro up, patches). Default true. */
  loop_velcro_face?: boolean;
  /** Vertical webbing centre line, measured in from each front panel's outer edge, display units. Vault: 4". */
  vertical_mark?: number;
  /** Vertical webbing width, display units. Vault: unstated — mock-derived default 1.5". */
  vertical_width?: number;
  /** Vertical strap pieces from panel to shoulder pad, display units. Vault: 24". */
  vertical_strap_len?: number;
  /** Fold-over pull tab on the strap ends, display units. Vault: 1" ("lose 2 in of that adjustment"). */
  tab_foldover?: number;
  /** Webbing lost wrapping the tension lock, display units. Vault: not stated — mock-derived default 0. */
  hardware_wrap?: number;
  /** Vertical drop the verticals must fund, display units. Vault: 12". */
  drop_adjust?: number;
  /** Shoulder pad length, display units. Vault: never stated — mock-derived. */
  pad_length?: number;
  /** Shoulder pad width, display units. Vault: never stated — mock-derived. */
  pad_width?: number;
  /** Fold-over marked on the shoulder pad tabs, display units. Vault: 1.5" marked → 3/4" tuck. */
  pad_tab_foldover?: number;
  /** Cross piece webbing width, display units. Mock-derived default 1.5". */
  cross_piece_width?: number;
  /** Cross piece angle off the horizontal, degrees; kicks the pads outboard. Vault: unstated — mock-derived. */
  cross_piece_angle?: number;
  /** Gap between the pads' inner edges where the cross piece ties them, display units. Mock-derived. */
  pad_spread?: number;
  /** Drag handle: 2" webbing, staggered fold. Default true. */
  drag_handle?: boolean;
  /** Drag handle webbing cut length, display units. Mock-derived default 8". */
  drag_handle_len?: number;
  /** Front closure straps. Vault: 3. */
  front_straps?: number;
  /** Which side carries the male buckles. Vault: right (97% right-handed). */
  male_side?: MaleSide;
  /** Front strap centres from the panel bottom, display units. Vault: "1 and 9… 6 1/2 so 3 1/4" does not reconcile — mock-derived. */
  front_strap_positions?: number[];
  /** Adjustment at each of the three closure locations, display units. Vault: 12". */
  adjust_per_location?: number;
  /** Move the tension locks outboard (+3" of adjustment, the first big-torso lever). Default false. */
  tension_lock_outboard?: boolean;
  /** Wearer chest the vest fits with every strap at minimum, display units. Mock-derived default 36". */
  base_chest?: number;
  /** Duty belt width, display units. Vault: 2". */
  belt_width?: number;
  /** Belt loops per panel. Vault: 2, never 3. */
  loops_per_panel?: number;
  /** Belt length available for pouches, display units; loops subtract from it. Mock-derived default 36". */
  belt_length?: number;
  /** Hydration carrier webbing across the back panel top, display units. Vault: 10". */
  hydration_webbing?: number;
  /** Pouch width used for the capacity estimate, display units. Default 3" (a Rally Man / rifle cell). */
  pouch_width?: number;
  /** Buckle tab width on the vertical straps, for capacity of the tension lock, mm. Default 1.5" webbing thickness × 2 check is text only. */
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  panel_width: number;
  panel_height: number;
  back_panel_width: number;
  back_panel_height: number;
  back_bellow: number;
  foam_insert: boolean;
  foam_thickness: number;
  seam_allowance: number;
  edge_tape_width: number;
  edge_tape_conceal: number;
  row_width: number;
  row_pitch: number;
  rows_per_panel: number | undefined;
  front_cols: number;
  back_cols: number;
  loop_velcro_face: boolean;
  vertical_mark: number;
  vertical_width: number;
  vertical_strap_len: number;
  tab_foldover: number;
  hardware_wrap: number;
  drop_adjust: number;
  pad_length: number;
  pad_width: number;
  pad_tab_foldover: number;
  cross_piece_width: number;
  cross_piece_angle: number;
  pad_spread: number;
  drag_handle: boolean;
  drag_handle_len: number;
  front_straps: number;
  male_side: MaleSide;
  front_strap_positions: number[];
  adjust_per_location: number;
  tension_lock_outboard: boolean;
  base_chest: number;
  belt_width: number;
  loops_per_panel: number;
  belt_length: number;
  hydration_webbing: number;
  pouch_width: number;
  // Derived
  /** Row end hidden under tape + row width: where the first PALS mark falls from the panel edge. */
  first_mark_from_edge: number;
  /** Strip cut = cols × 1.5" + 2 × 1/4" end margin (6.5" for 4 columns). */
  front_strip_cut: number;
  back_strip_cut: number;
  /** Panel verticals: 24" − 2 × tab − hardware wrap. */
  usable_adjustment: number;
  /** Chest range: base … base + 3 × 12" (+3" with the locks outboard). */
  fit_min_chest: number;
  fit_max_chest: number;
  /** Pad tab tuck = fold-over / 2. */
  pad_tab_tuck: number;
  /** Back outer piece = inner + bellow in both axes. */
  back_outer_width: number;
  back_outer_height: number;
  /** Zipper per panel = its bottom edge. */
  front_zipper_len: number;
  back_zipper_len: number;
  /** Belt real estate left after the loops. */
  belt_usable: number;
  loop_footprint: number;
  /** Rally-Man-class pouches per front panel field. */
  pouches_per_panel: number;
  /** Front closure strap cut: adjustment + two fold-over tabs + the buckle wrap. */
  front_strap_cut: number;
  side_strap_cut: number;
  /** Foam sheet per panel = panel − conceal margin. */
  front_foam_width: number;
  front_foam_height: number;
  back_foam_width: number;
  back_foam_height: number;
}

export type WarningSeverity = 'error' | 'warning' | 'info';
export interface GeneratorWarning { id: string; severity: WarningSeverity; message: string; field?: string }
export interface BuildPatternError { field: string; message: string }
export type ValidationResult = { ok: true } | { ok: false; errors: BuildPatternError[] };
export type HardwareItem = StrapHardwareItem;
export interface LbvBuildResult { pieces: Piece[]; steps: Step[]; warnings: GeneratorWarning[]; hardware: HardwareItem[]; resolved: ResolvedInputs }
export interface BomRow { id: string; description: string; quantity: number; unit: string; notes?: string }
