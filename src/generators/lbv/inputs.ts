import type { LbvInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import * as D from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';

/** Type/range guard run before the generator's own rules (hardening pass H1). */
const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  panel_width: { kind: 'length' },
  panel_height: { kind: 'length' },
  back_panel_width: { kind: 'length' },
  back_panel_height: { kind: 'length' },
  back_bellow: { kind: 'length' },
  foam_insert: { kind: 'bool' },
  foam_thickness: { kind: 'length' },
  seam_allowance: { kind: 'length' },
  edge_tape_width: { kind: 'length' },
  edge_tape_conceal: { kind: 'length' },
  row_width: { kind: 'length' },
  row_pitch: { kind: 'length' },
  rows_per_panel: { kind: 'count', max: 20 },
  front_cols: { kind: 'count', max: 12 },
  back_cols: { kind: 'count', max: 12 },
  loop_velcro_face: { kind: 'bool' },
  vertical_mark: { kind: 'length' },
  vertical_width: { kind: 'length' },
  vertical_strap_len: { kind: 'length' },
  tab_foldover: { kind: 'length' },
  hardware_wrap: { kind: 'length' },
  drop_adjust: { kind: 'length' },
  pad_length: { kind: 'length' },
  pad_width: { kind: 'length' },
  pad_tab_foldover: { kind: 'length' },
  cross_piece_width: { kind: 'length' },
  cross_piece_angle: { kind: 'angle', max: 90 },
  pad_spread: { kind: 'length' },
  drag_handle: { kind: 'bool' },
  drag_handle_len: { kind: 'length' },
  front_straps: { kind: 'count', max: 6 },
  male_side: { kind: 'enum', allowed: ['right', 'left'] },
  front_strap_positions: { kind: 'numArray', min: 0, max: 5000 },
  adjust_per_location: { kind: 'length' },
  tension_lock_outboard: { kind: 'bool' },
  base_chest: { kind: 'length' },
  belt_width: { kind: 'length' },
  loops_per_panel: { kind: 'count', max: 4 },
  belt_length: { kind: 'length' },
  hydration_webbing: { kind: 'length' },
  pouch_width: { kind: 'length' },
};

const IN = 25.4;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }

export function resolveInputs(inputs: LbvInputs): ResolvedInputs {
  inputs = stripNulls(inputs);
  const units = inputs.units ?? D.DEFAULT_UNITS;
  const d = (v: number | undefined, fallbackMm: number) => (v === undefined || v === null || Number.isNaN(v) ? fallbackMm : toMm(v, units));
  const panel_width = d(inputs.panel_width, D.PANEL_WIDTH_MM);
  const panel_height = d(inputs.panel_height, D.PANEL_HEIGHT_MM);
  const back_panel_width = d(inputs.back_panel_width, D.BACK_PANEL_WIDTH_MM);
  const back_panel_height = d(inputs.back_panel_height, D.BACK_PANEL_HEIGHT_MM);
  const back_bellow = d(inputs.back_bellow, D.BACK_BELLOW_MM);
  const edge_tape_conceal = d(inputs.edge_tape_conceal, D.EDGE_TAPE_CONCEAL_MM);
  const row_width = d(inputs.row_width, D.ROW_WIDTH_MM);
  const front_cols = inputs.front_cols ?? D.FRONT_COLS;
  const back_cols = inputs.back_cols ?? D.BACK_COLS;
  const vertical_strap_len = d(inputs.vertical_strap_len, D.VERTICAL_STRAP_MM);
  const tab_foldover = d(inputs.tab_foldover, D.TAB_FOLDOVER_MM);
  const hardware_wrap = d(inputs.hardware_wrap, D.HARDWARE_WRAP_MM);
  const pad_tab_foldover = d(inputs.pad_tab_foldover, D.PAD_TAB_FOLDOVER_MM);
  const adjust_per_location = d(inputs.adjust_per_location, D.ADJUST_PER_LOCATION_MM);
  const tension_lock_outboard = inputs.tension_lock_outboard ?? false;
  const base_chest = d(inputs.base_chest, D.BASE_CHEST_MM);
  const belt_width = d(inputs.belt_width, D.BELT_WIDTH_MM);
  const loops_per_panel = inputs.loops_per_panel ?? D.LOOPS_PER_PANEL;
  const belt_length = d(inputs.belt_length, D.BELT_LENGTH_MM);
  const pouch_width = d(inputs.pouch_width, D.POUCH_WIDTH_MM);
  // Same guard as the organizer's slot list: a scalar from a hand-edited file
  // must fall back to the default rather than throw inside resolve.
  const positionSource = Array.isArray(inputs.front_strap_positions) ? inputs.front_strap_positions : D.FRONT_STRAP_POSITIONS_MM.map((v) => (units === 'in' ? v / IN : v));
  const positions = positionSource.filter((v) => Number.isFinite(v)).map((v) => toMm(v, units));
  const loop_footprint = belt_width + D.LOOP_FOOTPRINT_EXTRA_MM;
  const foam_margin = edge_tape_conceal + 3;
  return {
    units,
    panel_width, panel_height, back_panel_width, back_panel_height, back_bellow,
    foam_insert: inputs.foam_insert ?? true,
    foam_thickness: inputs.foam_thickness ?? D.FOAM_MM,
    seam_allowance: inputs.seam_allowance ?? D.SEAM_ALLOWANCE_MM,
    edge_tape_width: d(inputs.edge_tape_width, D.EDGE_TAPE_MM),
    edge_tape_conceal,
    row_width,
    row_pitch: d(inputs.row_pitch, D.ROW_PITCH_MM),
    rows_per_panel: inputs.rows_per_panel,
    front_cols, back_cols,
    loop_velcro_face: inputs.loop_velcro_face ?? true,
    vertical_mark: d(inputs.vertical_mark, D.VERTICAL_MARK_MM),
    vertical_width: d(inputs.vertical_width, D.VERTICAL_WIDTH_MM),
    vertical_strap_len, tab_foldover, hardware_wrap,
    drop_adjust: d(inputs.drop_adjust, D.DROP_ADJUST_MM),
    pad_length: d(inputs.pad_length, D.PAD_LENGTH_MM),
    pad_width: d(inputs.pad_width, D.PAD_WIDTH_MM),
    pad_tab_foldover,
    cross_piece_width: d(inputs.cross_piece_width, D.CROSS_PIECE_WIDTH_MM),
    cross_piece_angle: inputs.cross_piece_angle ?? D.CROSS_PIECE_ANGLE_DEG,
    pad_spread: d(inputs.pad_spread, D.PAD_SPREAD_MM),
    drag_handle: inputs.drag_handle ?? true,
    drag_handle_len: d(inputs.drag_handle_len, D.DRAG_HANDLE_LEN_MM),
    front_straps: inputs.front_straps ?? D.FRONT_STRAPS,
    male_side: inputs.male_side ?? 'right',
    front_strap_positions: positions,
    adjust_per_location, tension_lock_outboard, base_chest, belt_width, loops_per_panel, belt_length,
    hydration_webbing: d(inputs.hydration_webbing, D.HYDRATION_WEBBING_MM),
    pouch_width,
    first_mark_from_edge: edge_tape_conceal + row_width,
    front_strip_cut: front_cols * D.COL_PITCH_MM + 2 * D.STRIP_END_MARGIN_MM,
    back_strip_cut: back_cols * D.COL_PITCH_MM + 2 * D.STRIP_END_MARGIN_MM,
    usable_adjustment: vertical_strap_len - 2 * tab_foldover - hardware_wrap,
    fit_min_chest: base_chest,
    fit_max_chest: base_chest + D.ADJUST_LOCATIONS * adjust_per_location + (tension_lock_outboard ? D.TENSION_LOCK_OUTBOARD_MM : 0),
    pad_tab_tuck: pad_tab_foldover / 2,
    back_outer_width: back_panel_width + back_bellow,
    back_outer_height: back_panel_height + back_bellow,
    front_zipper_len: panel_width,
    back_zipper_len: back_panel_width,
    belt_usable: belt_length - (2 + 1) * loops_per_panel * loop_footprint,
    loop_footprint,
    pouches_per_panel: pouch_width > 0 ? Math.floor((front_cols * D.COL_PITCH_MM) / pouch_width + 1e-9) : 0,
    front_strap_cut: adjust_per_location + 2 * tab_foldover + 1.5 * IN,
    side_strap_cut: adjust_per_location + 2 * tab_foldover + 1.5 * IN,
    front_foam_width: Math.max(0, panel_width - 2 * foam_margin),
    front_foam_height: Math.max(0, panel_height - 2 * foam_margin - 0.75 * IN),
    back_foam_width: Math.max(0, back_panel_width - 2 * foam_margin),
    back_foam_height: Math.max(0, back_panel_height - 2 * foam_margin - 0.75 * IN),
  };
}

export function validateInputs(inputs: LbvInputs): ValidationResult {
  inputs = stripNulls(inputs);
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  if (guard.length) return { ok: false, errors: guard };
  const errors: BuildPatternError[] = [];
  const r = resolveInputs(inputs);
  const pos = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be a positive number` }); };
  const nonNeg = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v < 0) errors.push({ field, message: `${label} must be 0 or greater` }); };
  pos('panel_width', 'Panel width'); pos('panel_height', 'Panel height');
  pos('back_panel_width', 'Back panel width'); pos('back_panel_height', 'Back panel height');
  nonNeg('back_bellow', 'Back bellow'); nonNeg('seam_allowance', 'Seam allowance'); nonNeg('foam_thickness', 'Foam thickness');
  pos('edge_tape_width', 'Edge tape width'); nonNeg('edge_tape_conceal', 'Edge tape concealment');
  pos('row_width', 'Row width'); pos('row_pitch', 'Row pitch');
  if (r.row_pitch < r.row_width) errors.push({ field: 'row_pitch', message: 'Row pitch must be at least the row width or the rows overlap' });
  if (!Number.isInteger(r.front_cols) || r.front_cols < 1) errors.push({ field: 'front_cols', message: 'Front columns must be a whole number of at least 1' });
  if (!Number.isInteger(r.back_cols) || r.back_cols < 1) errors.push({ field: 'back_cols', message: 'Back columns must be a whole number of at least 1' });
  if (r.rows_per_panel !== undefined && (!Number.isInteger(r.rows_per_panel) || r.rows_per_panel < 0)) errors.push({ field: 'rows_per_panel', message: 'Rows per panel must be a whole number' });
  pos('vertical_mark', 'Vertical mark'); pos('vertical_width', 'Vertical webbing width');
  if (r.vertical_mark + r.vertical_width / 2 > r.panel_width) errors.push({ field: 'vertical_mark', message: 'The vertical webbing mark is off the panel' });
  pos('vertical_strap_len', 'Vertical strap length'); nonNeg('tab_foldover', 'Tab fold-over'); nonNeg('hardware_wrap', 'Hardware wrap'); pos('drop_adjust', 'Drop adjustment');
  if (r.usable_adjustment <= 0) errors.push({ field: 'vertical_strap_len', message: 'The tabs and hardware consume the whole vertical strap' });
  pos('pad_length', 'Pad length'); pos('pad_width', 'Pad width'); nonNeg('pad_tab_foldover', 'Pad tab fold-over');
  pos('cross_piece_width', 'Cross piece width'); nonNeg('pad_spread', 'Pad spread');
  if (!Number.isFinite(r.cross_piece_angle) || r.cross_piece_angle < 0 || r.cross_piece_angle > 60) errors.push({ field: 'cross_piece_angle', message: 'Cross piece angle must be between 0° and 60°' });
  pos('drag_handle_len', 'Drag handle length');
  if (!Number.isInteger(r.front_straps) || r.front_straps < 1 || r.front_straps > 4) errors.push({ field: 'front_straps', message: 'Front straps must be a whole number from 1 to 4' });
  if (r.front_strap_positions.length !== r.front_straps) errors.push({ field: 'front_strap_positions', message: `Give ${r.front_straps} strap position${r.front_straps === 1 ? '' : 's'} (one per front strap)` });
  if (r.front_strap_positions.some((p) => p < 0 || p > r.panel_height)) errors.push({ field: 'front_strap_positions', message: 'Every front strap position must lie on the panel' });
  pos('adjust_per_location', 'Adjustment per location'); pos('base_chest', 'Base chest');
  pos('belt_width', 'Belt width'); pos('belt_length', 'Belt length');
  if (!Number.isInteger(r.loops_per_panel) || r.loops_per_panel < 1 || r.loops_per_panel > 3) errors.push({ field: 'loops_per_panel', message: 'Belt loops per panel must be 1, 2 or 3' });
  pos('hydration_webbing', 'Hydration webbing'); pos('pouch_width', 'Pouch width');
  if (r.foam_insert && r.foam_thickness <= 0) errors.push({ field: 'foam_thickness', message: 'Foam thickness must be positive when a foam insert is fitted' });
  return errors.length ? { ok: false, errors } : { ok: true };
}
