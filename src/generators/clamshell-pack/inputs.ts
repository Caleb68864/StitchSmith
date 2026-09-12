import type { ClamshellPackInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import * as D from './defaults.js';
import { PALS_COL_PITCH_MM } from '../../lib/pattern-engine/primitives/palsField.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';

/** Type/range guard run before the generator's own rules (hardening pass H1). */
const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  pocket_grid: { kind: 'enum', allowed: ['custom', '2x2', '3x3'] },
  width: { kind: 'length' },
  height: { kind: 'length' },
  depth: { kind: 'length' },
  lid_depth: { kind: 'length' },
  equal_split: { kind: 'bool' },
  zipper_lip: { kind: 'length' },
  zipper_underwrap: { kind: 'length' },
  hoop_overcut: { kind: 'length' },
  seam_allowance: { kind: 'length' },
  fold_in: { kind: 'length' },
  zipper_clearance: { kind: 'length' },
  pals_style: { kind: 'enum', allowed: ['sewn', 'fabricated', 'laser'] },
  pals_rows_side: { kind: 'count', max: 20 },
  pals_rows_face: { kind: 'count', max: 20 },
  pals_rows_bottom: { kind: 'count', max: 10 },
  pals_cols_side: { kind: 'count', max: 10 },
  edge_offset: { kind: 'length' },
  handle: { kind: 'bool' },
  handle_bow: { kind: 'length' },
  handle_fold_under: { kind: 'length' },
  compression_straps_per_side: { kind: 'count', max: 4 },
  compression_extra: { kind: 'length' },
  interior_loop: { kind: 'bool' },
  loop_strip_width: { kind: 'length' },
  loop_gap: { kind: 'length' },
  strap_provision: { kind: 'enum', allowed: ['none', 'tabs', 'tabs_and_stow'] },
  strap_tab_spacing: { kind: 'length' },
};

const IN = 25.4;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }

export function resolveInputs(inputs: ClamshellPackInputs): ResolvedInputs {
  inputs = stripNulls(inputs);
  const units = inputs.units ?? D.DEFAULT_UNITS;
  const d = (v: number | undefined, fallbackMm: number) => (v === undefined || v === null || Number.isNaN(v) ? fallbackMm : toMm(v, units));
  const pocket_grid = inputs.pocket_grid ?? 'custom';
  const grid = pocket_grid === 'custom' ? null : D.POCKET_GRID_FOOTPRINT_MM[pocket_grid];
  const width = grid ? grid.width : d(inputs.width, D.WIDTH_MM);
  const height = grid ? grid.height : d(inputs.height, D.HEIGHT_MM);
  const depth = d(inputs.depth, D.DEPTH_MM);
  const equal_split = inputs.equal_split ?? false;
  const lid_depth = equal_split ? depth / 2 : d(inputs.lid_depth, D.LID_DEPTH_MM);
  const zipper_lip = d(inputs.zipper_lip, D.ZIPPER_LIP_MM);
  const zipper_underwrap = d(inputs.zipper_underwrap, D.ZIPPER_UNDERWRAP_MM);
  const hoop_overcut = d(inputs.hoop_overcut, D.HOOP_OVERCUT_MM);
  const seam_allowance = d(inputs.seam_allowance, D.SEAM_ALLOWANCE_MM);
  const fold_in = d(inputs.fold_in, D.FOLD_IN_MM);
  const zipper_clearance = d(inputs.zipper_clearance, D.ZIPPER_CLEARANCE_MM);
  const edge_offset = d(inputs.edge_offset, D.EDGE_OFFSET_MM);
  const handle_bow = d(inputs.handle_bow, D.HANDLE_BOW_MM);
  const handle_fold_under = d(inputs.handle_fold_under, D.HANDLE_FOLD_UNDER_MM);
  const compression_extra = d(inputs.compression_extra, D.COMPRESSION_EXTRA_MM);
  const loop_strip_width = d(inputs.loop_strip_width, D.LOOP_STRIP_WIDTH_MM);
  const loop_gap = d(inputs.loop_gap, D.LOOP_GAP_MM);
  const strap_provision = inputs.strap_provision ?? 'tabs_and_stow';
  const base_depth = depth - lid_depth;
  const hoop_length = 2 * height + width + 2 * zipper_underwrap;
  const bottom_finished_length = width - 2 * zipper_underwrap;
  const interior_loop = inputs.interior_loop ?? true;
  const loop_strips_per_wall = interior_loop ? Math.max(0, Math.floor((height - 2 * edge_offset + loop_gap) / (loop_strip_width + loop_gap))) : 0;
  return {
    units, pocket_grid, width, height, depth, lid_depth, equal_split, zipper_lip, zipper_underwrap, hoop_overcut, seam_allowance, fold_in, zipper_clearance,
    pals_style: inputs.pals_style ?? 'sewn',
    pals_rows_side: inputs.pals_rows_side ?? D.PALS_ROWS_SIDE,
    pals_rows_face: inputs.pals_rows_face ?? D.PALS_ROWS_FACE,
    pals_rows_bottom: inputs.pals_rows_bottom ?? D.PALS_ROWS_BOTTOM,
    pals_cols_side: inputs.pals_cols_side ?? D.PALS_COLS_SIDE,
    edge_offset,
    handle: inputs.handle ?? true,
    handle_bow, handle_fold_under,
    compression_straps_per_side: inputs.compression_straps_per_side ?? D.COMPRESSION_STRAPS_PER_SIDE,
    compression_extra,
    interior_loop, loop_strip_width, loop_gap,
    strap_provision,
    strap_tab_spacing: d(inputs.strap_tab_spacing, D.STRAP_TAB_SPACING_MM),
    base_depth,
    hoop_length,
    hoop_cut_length: hoop_length + hoop_overcut,
    gusset_cut_width: base_depth + zipper_lip + seam_allowance,
    lid_cut_width: lid_depth + zipper_lip + seam_allowance,
    bottom_cut_width: depth + 2 * fold_in,
    bottom_nominal_length: bottom_finished_length + 2 * fold_in,
    bottom_finished_length,
    side_work_area: height - edge_offset - seam_allowance,
    side_pals_budget: base_depth - zipper_clearance,
    face_pals_cols: Math.max(0, Math.floor((width - 2 * edge_offset) / PALS_COL_PITCH_MM + 1e-9)),
    handle_cut_length: width + handle_bow + 2 * handle_fold_under,
    handle_core_length: width,
    compression_strap_length: depth + compression_extra,
    strap_tab_count: strap_provision === 'none' ? 0 : D.STRAP_TAB_COUNT,
    loop_strips_per_wall,
    loop_strip_cut_length: width - 2 * seam_allowance + D.VELCRO_OVERCUT_MM,
  };
}

export function validateInputs(inputs: ClamshellPackInputs): ValidationResult {
  inputs = stripNulls(inputs);
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  if (guard.length) return { ok: false, errors: guard };
  const errors: BuildPatternError[] = [];
  const r = resolveInputs(inputs);
  const pos = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be a positive number` }); };
  const nonNeg = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v < 0) errors.push({ field, message: `${label} must be 0 or greater` }); };
  const count = (field: keyof ResolvedInputs, label: string, max: number) => { const v = r[field] as number; if (!Number.isInteger(v) || v < 0 || v > max) errors.push({ field, message: `${label} must be a whole number from 0 to ${max}` }); };
  pos('width', 'Width'); pos('height', 'Height'); pos('depth', 'Depth'); pos('lid_depth', 'Lid depth');
  nonNeg('zipper_lip', 'Zipper lip'); nonNeg('zipper_underwrap', 'Zipper underwrap'); nonNeg('hoop_overcut', 'Hoop overcut');
  nonNeg('seam_allowance', 'Seam allowance'); nonNeg('fold_in', 'Fold-in'); nonNeg('zipper_clearance', 'Zipper clearance'); nonNeg('edge_offset', 'Edge offset');
  nonNeg('handle_bow', 'Handle bow'); nonNeg('handle_fold_under', 'Handle fold-under'); nonNeg('compression_extra', 'Compression strap extra');
  pos('loop_strip_width', 'Loop strip width'); nonNeg('loop_gap', 'Loop gap'); nonNeg('strap_tab_spacing', 'Strap tab spacing');
  count('pals_rows_side', 'Side PALS rows', 20); count('pals_rows_face', 'Face PALS rows', 20); count('pals_rows_bottom', 'Bottom PALS rows', 10); count('pals_cols_side', 'Side PALS columns', 10);
  count('compression_straps_per_side', 'Compression straps per side', 4);
  if (r.lid_depth >= r.depth) errors.push({ field: 'lid_depth', message: `Lid depth ${(r.lid_depth / IN).toFixed(2)}" leaves no base gusset in a ${(r.depth / IN).toFixed(2)}" depth` });
  if (2 * r.zipper_underwrap >= r.width) errors.push({ field: 'zipper_underwrap', message: 'The zipper underwraps meet: nothing left for the bottom strip' });
  if (r.side_work_area <= 0) errors.push({ field: 'edge_offset', message: 'Edge offset and seam allowance leave no side work area' });
  if (r.strap_tab_spacing >= r.width) errors.push({ field: 'strap_tab_spacing', message: 'Strap tabs would sit outside the back panel' });
  return errors.length ? { ok: false, errors } : { ok: true };
}
