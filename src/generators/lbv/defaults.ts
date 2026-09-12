/**
 * Vault numbers for the modular LBV (rigs/lbvmod-*.md). Numbers the transcripts
 * never state are marked MOCK and surface as mock-derived warnings.
 */
const IN = 25.4;
export const DEFAULT_UNITS = 'in' as const;
/** MOCK: no panel dimension is spoken in either video; the old LBV's 9" back strap zone is the only anchor. */
export const PANEL_WIDTH_MM = 9 * IN;
export const PANEL_HEIGHT_MM = 11 * IN;
export const BACK_PANEL_WIDTH_MM = 11 * IN;
export const BACK_PANEL_HEIGHT_MM = 11 * IN;
/** MOCK: "bellowed out" — value unstated; mock in paper. */
export const BACK_BELLOW_MM = 0.75 * IN;
/** Walmart blue camping pad, ~3/8" — every SOE shoulder set for 30 years. */
export const FOAM_MM = 9.5;
export const SEAM_ALLOWANCE_MM = 0.5 * IN;
/** 5038 1" nylon edge tape; 1/2" of the panel edge disappears under it. */
export const EDGE_TAPE_MM = 1 * IN;
export const EDGE_TAPE_CONCEAL_MM = 0.5 * IN;
/** The modular interface: 1.5" scuba webbing rows at the 1.5" column pitch. */
export const ROW_WIDTH_MM = 1.5 * IN;
export const COL_PITCH_MM = 1.5 * IN;
/** MOCK: vertical row spacing is never stated; 1.5" row + the spec's 1" gap. */
export const ROW_PITCH_MM = 2.5 * IN;
export const STRIP_END_MARGIN_MM = 0.25 * IN;
/** Back panel: 4 columns. Front: unresolved — 6.5" strips read as 4. */
export const BACK_COLS = 4;
export const FRONT_COLS = 4;
/** Vertical webbing marked at 4" from the panel edge; 24" strap pieces; 1" pull tabs; 12" of drop. */
export const VERTICAL_MARK_MM = 4 * IN;
export const VERTICAL_WIDTH_MM = 1.5 * IN;
export const VERTICAL_STRAP_MM = 24 * IN;
export const TAB_FOLDOVER_MM = 1 * IN;
export const HARDWARE_WRAP_MM = 0;
export const DROP_ADJUST_MM = 12 * IN;
/** MOCK: pad length/width and the cross piece are "never stated". */
export const PAD_LENGTH_MM = 10 * IN;
export const PAD_WIDTH_MM = 2.5 * IN;
export const PAD_TAB_FOLDOVER_MM = 1.5 * IN;
export const CROSS_PIECE_WIDTH_MM = 1.5 * IN;
export const CROSS_PIECE_ANGLE_DEG = 15;
export const PAD_SPREAD_MM = 6 * IN;
export const DRAG_HANDLE_WIDTH_MM = 2 * IN;
export const DRAG_HANDLE_LEN_MM = 8 * IN;
/** Three front straps, males from the wearer's right; 12" at each of three locations. */
export const FRONT_STRAPS = 3;
export const ADJUST_PER_LOCATION_MM = 12 * IN;
export const ADJUST_LOCATIONS = 3;
export const TENSION_LOCK_OUTBOARD_MM = 3 * IN;
/** MOCK: the strap positions ("1 and 9… 6 1/2 so 3 1/4") do not reconcile. */
export const FRONT_STRAP_POSITIONS_MM = [1 * IN, 5 * IN, 9 * IN];
export const BASE_CHEST_MM = 36 * IN;
/** 2" duty belt, two loops per panel, never three. */
export const BELT_WIDTH_MM = 2 * IN;
export const LOOPS_PER_PANEL = 2;
export const LOOPS_MAX = 2;
export const BELT_LENGTH_MM = 36 * IN;
/** 10" hydration webbing plus 3.5" and 3" attachment pieces. */
export const HYDRATION_WEBBING_MM = 10 * IN;
export const ATTACH_PIECE_A_MM = 3.5 * IN;
export const ATTACH_PIECE_B_MM = 3 * IN;
export const POUCH_WIDTH_MM = 3 * IN;
/** Load attachments get two stitch lines ~1/4" apart; channel mouths stay 1" open. */
export const DOUBLE_STITCH_GAP_MM = 0.25 * IN;
export const CHANNEL_MOUTH_MM = 1 * IN;
/** Back panel loop tape 1" off the bottom, 1.5" wide. */
export const BACK_LOOP_TAPE_OFFSET_MM = 1 * IN;
export const BACK_LOOP_TAPE_WIDTH_MM = 1.5 * IN;
/** Belt loop footprint on the belt: belt width plus an inch of loop. MOCK. */
export const LOOP_FOOTPRINT_EXTRA_MM = 1 * IN;
