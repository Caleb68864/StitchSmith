import type { MicroRigInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import { getMagazine } from '../mag-pouch/magazines.js';
import {
  DEFAULT_UNITS, PANEL_WIDTH_PRESETS_MM, PANEL_HEIGHT_MM, UTILITY_W_MM, UTILITY_H_MM, UTILITY_D_MM,
  CLOSURE_VELCRO_DROP_MM, INTERIOR_VELCRO_DROP_MM, BUCKLE_EDGE_OFFSET_MM, GAP_WIDTH_MM, BUCKLE_SETBACK_MM,
  PALS_ROW_PITCH_MM, PALS_TOP_DROP_MM, PALS_COLUMN_PITCH_MM, FACE_EASE_MM, DEFAULT_SEAM_ALLOWANCE_MM, EDGE_MARGIN_MM, DEFAULT_MAGAZINE,
  STACK_EASE_MM, STACK_EASE_MIN_MM, WRAP_ALLOWANCE_MM, WRAP_ALLOWANCE_MIN_MM, STACK_COVERAGE, DIVIDER_LAYERS_MM, CRADLE_WIDTH_MM, CRADLE_END_MM, MED_ZONE_MM, PULL_TAB_MM, MAG_WEIGHT_LB,
} from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';

/** Type/range guard run before the generator's own rules (hardening pass H1). */
const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  panel_width_preset: { kind: 'enum', allowed: ['stacked_10_5', 'standard_13', 'r308_14', 'pals_16', 'pals_19', 'custom'] },
  panel_width: { kind: 'length' },
  panel_height: { kind: 'length' },
  pocket_set: { kind: 'enum', allowed: ['mag_cells', 'stacked_cells', 'blank_pals'] },
  magazine_preset_id: { kind: 'string' },
  cell_count: { kind: 'count', max: 8 },
  cell_span: { kind: 'length' },
  face_per_cell: { kind: 'length' },
  cell_height: { kind: 'length' },
  utility_pocket: { kind: 'bool' },
  cells_deep: { kind: 'count', max: 2 },
  stack_ease: { kind: 'length' },
  wrap_allowance: { kind: 'length' },
  coverage: { kind: 'ratio' },
  cradle_width: { kind: 'length' },
  cradle_drop: { kind: 'length' },
  med_zone: { kind: 'bool' },
  pull_tab_length: { kind: 'length' },
  side_pals_columns: { kind: 'count', max: 6 },
  bottom_loop_count: { kind: 'count', max: 8 },
  split_front: { kind: 'bool' },
  gap_width: { kind: 'length' },
  buckle_setback: { kind: 'length' },
  suspension: { kind: 'enum', allowed: ['webbing_straps', 'h_harness'] },
  dangler_field: { kind: 'bool' },
  seam_allowance: { kind: 'length' },
  edge_margin: { kind: 'length' },
};

const IN = 25.4;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }

/** Snap up to the PALS column grid (1.5"); a rifle cell is 3", never 2.8". */
export function snapUpToGrid(mm: number, pitch = PALS_COLUMN_PITCH_MM): number {
  return Math.ceil(mm / pitch - 1e-9) * pitch;
}

export function resolveInputs(inputs: MicroRigInputs): ResolvedInputs {
  inputs = stripNulls(inputs);
  const units = inputs.units ?? DEFAULT_UNITS;
  const d = (v: number | undefined, fallbackMm: number) => (v === undefined || v === null || Number.isNaN(v) ? fallbackMm : toMm(v, units));
  const preset = inputs.panel_width_preset ?? 'standard_13';
  const panel_width = preset === 'custom' ? d(inputs.panel_width, PANEL_WIDTH_PRESETS_MM.standard_13) : PANEL_WIDTH_PRESETS_MM[preset];
  const panel_height = d(inputs.panel_height, PANEL_HEIGHT_MM);
  const pocket_set = inputs.pocket_set ?? 'mag_cells';
  const magId = inputs.magazine_preset_id ?? DEFAULT_MAGAZINE;
  const m = getMagazine(magId) ?? getMagazine(DEFAULT_MAGAZINE)!;
  const mag = { width: m.width * IN, thickness: m.thickness * IN, height: m.height * IN, platform: m.platform, description: m.description };
  const stacked = pocket_set === 'stacked_cells';
  const cell_count = pocket_set === 'blank_pals' ? 0 : (inputs.cell_count ?? (stacked ? 2 : 4));
  const cells_deep = stacked ? (inputs.cells_deep ?? 2) : 1;
  const stack_ease = d(inputs.stack_ease, STACK_EASE_MM);
  const wrap_allowance = d(inputs.wrap_allowance, WRAP_ALLOWANCE_MM);
  const coverage = inputs.coverage ?? STACK_COVERAGE;
  // Stacked: the magazine stands flat side out, so the rear cell consumes its front-to-back depth (no PALS snap —
  // a 3.5" .308 cell does not line up with the grid, and the vault says so). Pleated: PALS-snapped span.
  const rear_cell_width = mag.width + stack_ease;
  const cell_span_derived = inputs.cell_span === undefined;
  const cell_span = stacked ? (cell_span_derived ? rear_cell_width : toMm(inputs.cell_span!, units)) : (cell_span_derived ? snapUpToGrid(mag.width + 0.25 * IN) : toMm(inputs.cell_span!, units));
  const face_per_cell = inputs.face_per_cell === undefined ? mag.width + 2 * mag.thickness + FACE_EASE_MM : toMm(inputs.face_per_cell, units);
  const pouch_height = coverage * mag.height;
  const cell_height = stacked ? pouch_height : d(inputs.cell_height, panel_height - 1 * IN);
  const utility_pocket = pocket_set === 'mag_cells' && (inputs.utility_pocket ?? true);
  const med_zone = stacked && (inputs.med_zone ?? true);
  const side_pals_columns = inputs.side_pals_columns ?? 1;
  const edge_margin = d(inputs.edge_margin, EDGE_MARGIN_MM);
  const split_front = inputs.split_front ?? false;
  const gap_width = d(inputs.gap_width, GAP_WIDTH_MM);
  const mag_span = cell_count * cell_span;
  const buckle_edge_offset = Math.min(BUCKLE_EDGE_OFFSET_MM, panel_width / 3);
  const stack_depth = cells_deep * mag.thickness + (cells_deep - 1) * DIVIDER_LAYERS_MM;
  const cradle_drop = d(inputs.cradle_drop, 0);
  const magCount = cell_count * cells_deep;
  return {
    units,
    panel_width_preset: preset,
    panel_width,
    panel_height,
    pocket_set,
    magazine_preset_id: m.id,
    mag,
    cell_count,
    cell_span,
    cell_span_derived,
    face_per_cell,
    cell_height,
    utility_pocket,
    utility_width: UTILITY_W_MM,
    utility_height: UTILITY_H_MM,
    utility_depth: UTILITY_D_MM,
    side_pals_columns,
    bottom_loop_count: inputs.bottom_loop_count ?? 2,
    split_front,
    gap_width,
    buckle_setback: d(inputs.buckle_setback, BUCKLE_SETBACK_MM),
    suspension: inputs.suspension ?? 'webbing_straps',
    dangler_field: inputs.dangler_field ?? true,
    seam_allowance: inputs.seam_allowance ?? DEFAULT_SEAM_ALLOWANCE_MM,
    edge_margin,
    mag_span,
    pucker_per_side: (face_per_cell - cell_span) / 2,
    internal_velcro_length: panel_width - 1 * IN,
    closure_velcro_drop: CLOSURE_VELCRO_DROP_MM,
    interior_velcro_drop: INTERIOR_VELCRO_DROP_MM,
    buckle_edge_offset,
    buckle_spacing: panel_width - 2 * buckle_edge_offset,
    width_needed: mag_span + (utility_pocket ? UTILITY_W_MM : 0) + (med_zone ? MED_ZONE_MM : 0) + 2 * edge_margin,
    side_pals_rows: Math.max(0, Math.floor((panel_height - PALS_TOP_DROP_MM - 0.5 * IN) / PALS_ROW_PITCH_MM) + 1),
    total_front_width: split_front ? 2 * panel_width + gap_width : panel_width,
    cells_deep,
    stack_ease,
    wrap_allowance,
    coverage,
    cradle_width: d(inputs.cradle_width, CRADLE_WIDTH_MM),
    cradle_drop,
    med_zone,
    med_zone_width: MED_ZONE_MM,
    pull_tab_length: d(inputs.pull_tab_length, PULL_TAB_MM),
    rear_cell_width,
    front_cell_mark: rear_cell_width + wrap_allowance,
    stack_depth,
    pouch_height,
    mag_exposed_height: mag.height - pouch_height - cradle_drop,
    cradle_length: stack_depth + 2 * CRADLE_END_MM + cradle_drop,
    grommet_count: stacked ? magCount : 0,
    cord_count: stacked ? magCount : 0,
    pull_tab_count: stacked ? magCount : 0,
    loaded_weight_lb: magCount * (MAG_WEIGHT_LB[mag.platform] ?? MAG_WEIGHT_LB.custom),
    split_pull: mag.platform === 'ak',
    pals_aligned: Math.abs(cell_span / PALS_COLUMN_PITCH_MM - Math.round(cell_span / PALS_COLUMN_PITCH_MM)) < 1e-6,
  };
}

export function validateInputs(inputs: MicroRigInputs): ValidationResult {
  inputs = stripNulls(inputs);
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  if (guard.length) return { ok: false, errors: guard };
  const errors: BuildPatternError[] = [];
  const r = resolveInputs(inputs);
  const pos = (field: keyof ResolvedInputs, label: string) => {
    const v = r[field] as number;
    if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be a positive number` });
  };
  pos('panel_width', 'Panel width');
  pos('panel_height', 'Panel height');
  if (!Number.isFinite(r.seam_allowance) || r.seam_allowance < 0) errors.push({ field: 'seam_allowance', message: 'Seam allowance must be 0 or greater' });
  if (!Number.isFinite(r.edge_margin) || r.edge_margin < 0) errors.push({ field: 'edge_margin', message: 'Edge margin must be 0 or greater' });
  if (r.pocket_set === 'stacked_cells') {
    if (!Number.isInteger(r.cell_count) || r.cell_count < 1 || r.cell_count > 6) errors.push({ field: 'cell_count', message: 'Columns must be a whole number from 1 to 6' });
    if (r.cells_deep !== 1 && r.cells_deep !== 2) errors.push({ field: 'cells_deep', message: 'Cells deep must be 1 or 2' });
    if (!Number.isFinite(r.stack_ease) || r.stack_ease < STACK_EASE_MIN_MM) errors.push({ field: 'stack_ease', message: 'Ease must be at least 1/4" — sizing to one magazine exactly locks out its fatter cousins' });
    if (!Number.isFinite(r.wrap_allowance) || r.wrap_allowance < WRAP_ALLOWANCE_MIN_MM || r.wrap_allowance > r.mag.thickness + 1e-6) errors.push({ field: 'wrap_allowance', message: 'Wrap allowance must be between 1/4" and the magazine thickness' });
    if (!Number.isFinite(r.coverage) || r.coverage < 0.3 || r.coverage > 1) errors.push({ field: 'coverage', message: 'Coverage must be between 0.3 and 1' });
    pos('cradle_width', 'Cradle width');
    if (!Number.isFinite(r.cradle_drop) || r.cradle_drop < 0) errors.push({ field: 'cradle_drop', message: 'Cradle drop must be 0 or greater' });
    pos('pull_tab_length', 'Pull tab length');
    if (inputs.magazine_preset_id !== undefined && !getMagazine(inputs.magazine_preset_id)) errors.push({ field: 'magazine_preset_id', message: `"${String(inputs.magazine_preset_id)}" is not a magazine this build knows. Pick one from the magazine list, or enter the cell sizes by hand.` });
  }
  if (r.pocket_set === 'mag_cells') {
    if (!Number.isInteger(r.cell_count) || r.cell_count < 1 || r.cell_count > 8) errors.push({ field: 'cell_count', message: 'Cells must be a whole number from 1 to 8' });
    pos('cell_span', 'Cell span');
    pos('face_per_cell', 'Face per cell');
    pos('cell_height', 'Cell height');
    if (r.cell_height > r.panel_height) errors.push({ field: 'cell_height', message: 'Cell height cannot exceed the panel height' });
    if (r.face_per_cell < r.cell_span) errors.push({ field: 'face_per_cell', message: 'Face per cell must be at least the cell span' });
    if (inputs.magazine_preset_id !== undefined && !getMagazine(inputs.magazine_preset_id)) errors.push({ field: 'magazine_preset_id', message: `"${String(inputs.magazine_preset_id)}" is not a magazine this build knows. Pick one from the magazine list, or enter the cell sizes by hand.` });
  }
  if (!Number.isInteger(r.side_pals_columns) || r.side_pals_columns < 0 || r.side_pals_columns > 2) errors.push({ field: 'side_pals_columns', message: 'Side PALS columns must be 0, 1 or 2' });
  if (!Number.isInteger(r.bottom_loop_count) || r.bottom_loop_count < 0 || r.bottom_loop_count > 6) errors.push({ field: 'bottom_loop_count', message: 'Bottom loops must be a whole number from 0 to 6' });
  if (r.split_front) {
    if (!Number.isFinite(r.gap_width) || r.gap_width < 0) errors.push({ field: 'gap_width', message: 'Gap width must be 0 or greater' });
    pos('buckle_setback', 'Buckle setback');
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
