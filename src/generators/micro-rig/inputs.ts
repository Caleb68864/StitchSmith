import type { MicroRigInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import { getMagazine } from '../mag-pouch/magazines.js';
import {
  DEFAULT_UNITS, PANEL_WIDTH_PRESETS_MM, PANEL_HEIGHT_MM, UTILITY_W_MM, UTILITY_H_MM, UTILITY_D_MM,
  CLOSURE_VELCRO_DROP_MM, INTERIOR_VELCRO_DROP_MM, BUCKLE_EDGE_OFFSET_MM, GAP_WIDTH_MM, BUCKLE_SETBACK_MM,
  PALS_ROW_PITCH_MM, PALS_TOP_DROP_MM, PALS_COLUMN_PITCH_MM, FACE_EASE_MM, DEFAULT_SEAM_ALLOWANCE_MM, EDGE_MARGIN_MM, DEFAULT_MAGAZINE,
} from './defaults.js';

const IN = 25.4;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }

/** Snap up to the PALS column grid (1.5"); a rifle cell is 3", never 2.8". */
export function snapUpToGrid(mm: number, pitch = PALS_COLUMN_PITCH_MM): number {
  return Math.ceil(mm / pitch - 1e-9) * pitch;
}

export function resolveInputs(inputs: MicroRigInputs): ResolvedInputs {
  const units = inputs.units ?? DEFAULT_UNITS;
  const d = (v: number | undefined, fallbackMm: number) => (v === undefined || v === null || Number.isNaN(v) ? fallbackMm : toMm(v, units));
  const preset = inputs.panel_width_preset ?? 'standard_13';
  const panel_width = preset === 'custom' ? d(inputs.panel_width, PANEL_WIDTH_PRESETS_MM.standard_13) : PANEL_WIDTH_PRESETS_MM[preset];
  const panel_height = d(inputs.panel_height, PANEL_HEIGHT_MM);
  const pocket_set = inputs.pocket_set ?? 'mag_cells';
  const magId = inputs.magazine_preset_id ?? DEFAULT_MAGAZINE;
  const m = getMagazine(magId) ?? getMagazine(DEFAULT_MAGAZINE)!;
  const mag = { width: m.width * IN, thickness: m.thickness * IN, height: m.height * IN, platform: m.platform, description: m.description };
  const cell_count = pocket_set === 'mag_cells' ? (inputs.cell_count ?? 4) : 0;
  const cell_span_derived = inputs.cell_span === undefined;
  const cell_span = cell_span_derived ? snapUpToGrid(mag.width + 0.25 * IN) : toMm(inputs.cell_span!, units);
  const face_per_cell = inputs.face_per_cell === undefined ? mag.width + 2 * mag.thickness + FACE_EASE_MM : toMm(inputs.face_per_cell, units);
  const cell_height = d(inputs.cell_height, panel_height - 1 * IN);
  const utility_pocket = pocket_set === 'mag_cells' && (inputs.utility_pocket ?? true);
  const side_pals_columns = inputs.side_pals_columns ?? 1;
  const edge_margin = d(inputs.edge_margin, EDGE_MARGIN_MM);
  const split_front = inputs.split_front ?? false;
  const gap_width = d(inputs.gap_width, GAP_WIDTH_MM);
  const mag_span = cell_count * cell_span;
  const buckle_edge_offset = Math.min(BUCKLE_EDGE_OFFSET_MM, panel_width / 3);
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
    width_needed: mag_span + (utility_pocket ? UTILITY_W_MM : 0) + 2 * edge_margin,
    side_pals_rows: Math.max(0, Math.floor((panel_height - PALS_TOP_DROP_MM - 0.5 * IN) / PALS_ROW_PITCH_MM) + 1),
    total_front_width: split_front ? 2 * panel_width + gap_width : panel_width,
  };
}

export function validateInputs(inputs: MicroRigInputs): ValidationResult {
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
  if (r.pocket_set === 'mag_cells') {
    if (!Number.isInteger(r.cell_count) || r.cell_count < 1 || r.cell_count > 8) errors.push({ field: 'cell_count', message: 'Cells must be a whole number from 1 to 8' });
    pos('cell_span', 'Cell span');
    pos('face_per_cell', 'Face per cell');
    pos('cell_height', 'Cell height');
    if (r.cell_height > r.panel_height) errors.push({ field: 'cell_height', message: 'Cell height cannot exceed the panel height' });
    if (r.face_per_cell < r.cell_span) errors.push({ field: 'face_per_cell', message: 'Face per cell must be at least the cell span' });
    if (inputs.magazine_preset_id !== undefined && !getMagazine(inputs.magazine_preset_id)) errors.push({ field: 'magazine_preset_id', message: 'Unknown magazine preset' });
  }
  if (!Number.isInteger(r.side_pals_columns) || r.side_pals_columns < 0 || r.side_pals_columns > 2) errors.push({ field: 'side_pals_columns', message: 'Side PALS columns must be 0, 1 or 2' });
  if (!Number.isInteger(r.bottom_loop_count) || r.bottom_loop_count < 0 || r.bottom_loop_count > 6) errors.push({ field: 'bottom_loop_count', message: 'Bottom loops must be a whole number from 0 to 6' });
  if (r.split_front) {
    if (!Number.isFinite(r.gap_width) || r.gap_width < 0) errors.push({ field: 'gap_width', message: 'Gap width must be 0 or greater' });
    pos('buckle_setback', 'Buckle setback');
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
