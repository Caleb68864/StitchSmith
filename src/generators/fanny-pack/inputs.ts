import type { FannyPackInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import { DEFAULT_UNITS, WIDTH_MM, HEIGHT_MM, DEPTH_MM, SEAM_ALLOWANCE_MM, ZIPPER_LIP_MM, LID_ANGLE_DEG, GROMMET_INSET_MM, BELT_MIN_MM, BELT_MAX_MM, BELT_TAIL_MM, CORD_ANCHOR_DROP_MM } from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';

/** Bottom drainage grommets: 0, 2 or 4 (vault bags/fanny-pack-drainage-grommets.md). */
export const MAX_GROMMETS = 4;

/** Type/range guard run before the generator's own rules (hardening pass H1). */
const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  width: { kind: 'length' },
  height: { kind: 'length' },
  depth: { kind: 'length' },
  seam_allowance: { kind: 'length' },
  lid_drop_target: { kind: 'enum', allowed: ['closed', 'partial', 'fully_open'] },
  lid_angle_deg: { kind: 'angle', max: 180 },
  lid_extension: { kind: 'length' },
  zipper_edge_finish: { kind: 'enum', allowed: ['fold', 'tape'] },
  zipper_lip: { kind: 'length' },
  drawbridge_limiter: { kind: 'bool' },
  bottom_grommets: { kind: 'count', max: MAX_GROMMETS },
  belt_webbing: { kind: 'length' },
  belt_min: { kind: 'length' },
  belt_max: { kind: 'length' },
  edge_tape_color: { kind: 'string' },
};

const IN = 25.4;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }

/** Lid-drop heuristic: the zipper panel must run down each side by about the bag depth for the lid to lie flat. */
export function lidExtensionHeuristic(target: ResolvedInputs['lid_drop_target'], angleDeg: number, depth: number): number {
  if (target === 'closed') return 0;
  if (target === 'fully_open') return depth;
  const a = Math.min(180, Math.max(0, angleDeg));
  return (depth * a) / 180;
}

export function resolveInputs(inputs: FannyPackInputs): ResolvedInputs {
  inputs = stripNulls(inputs);
  const units = inputs.units ?? DEFAULT_UNITS;
  const d = (v: number | undefined, fallbackMm: number) => (v === undefined || v === null || Number.isNaN(v) ? fallbackMm : toMm(v, units));
  const width = d(inputs.width, WIDTH_MM);
  const height = d(inputs.height, HEIGHT_MM);
  const depth = d(inputs.depth, DEPTH_MM);
  const sa = d(inputs.seam_allowance, SEAM_ALLOWANCE_MM);
  const lid_drop_target = inputs.lid_drop_target ?? 'fully_open';
  const lid_angle_deg = inputs.lid_angle_deg ?? LID_ANGLE_DEG;
  const heuristic = lidExtensionHeuristic(lid_drop_target, lid_angle_deg, depth);
  const overridden = inputs.lid_extension !== undefined && inputs.lid_extension !== null && !Number.isNaN(inputs.lid_extension);
  const lid_extension = overridden ? toMm(inputs.lid_extension as number, units) : heuristic;
  const zipper_edge_finish = inputs.zipper_edge_finish ?? 'fold';
  const zipper_lip = d(inputs.zipper_lip, ZIPPER_LIP_MM);
  const bottom_grommets = inputs.bottom_grommets ?? 0;
  const belt_webbing = inputs.belt_webbing ?? 1.5;
  const belt_min = d(inputs.belt_min, BELT_MIN_MM);
  const belt_max = d(inputs.belt_max, BELT_MAX_MM);
  const zipper_panel_length = width + 2 * lid_extension;
  const zipper_half_depth = depth / 2;
  const rising_side = height - lid_extension;
  const rising_gusset_length = width + 2 * rising_side;
  const lipExtra = zipper_edge_finish === 'fold' ? zipper_lip : 0;
  const chordR = Math.max(0, height - CORD_ANCHOR_DROP_MM);
  const angle = lid_drop_target === 'closed' ? 0 : lid_drop_target === 'fully_open' ? 180 : lid_angle_deg;
  const chord = 2 * chordR * Math.sin((Math.min(angle, 179) * Math.PI) / 360);
  // validateInputs caps this at 4, but the page resolves on every keystroke and
  // does not wait for validation: an unclamped Array.from({length: 1e9}) here
  // exhausted the heap and took the tab with it while the user was still typing.
  const n = Number.isFinite(bottom_grommets) ? Math.max(0, Math.min(MAX_GROMMETS, Math.floor(bottom_grommets))) : 0;
  const grommet_positions = n === 0 ? [] : Array.from({ length: n }, (_, i) => (width * (i + 1)) / (n + 1));
  return {
    units, width, height, depth, seam_allowance: sa, lid_drop_target, lid_angle_deg, lid_extension, lid_extension_overridden: overridden,
    zipper_edge_finish, zipper_lip, drawbridge_limiter: inputs.drawbridge_limiter ?? false, bottom_grommets, belt_webbing, belt_min, belt_max,
    edge_tape_color: inputs.edge_tape_color ?? 'black',
    lid_extension_heuristic: heuristic,
    zipper_panel_length,
    zipper_panel_cut_length: zipper_panel_length + 2 * sa,
    zipper_half_depth,
    zipper_half_cut_height: zipper_half_depth + sa + lipExtra,
    rising_side,
    rising_gusset_length,
    rising_gusset_cut_length: rising_gusset_length + 2 * sa,
    gusset_cut_height: depth + 2 * sa,
    panel_cut_width: width + 2 * sa,
    panel_cut_height: height + 2 * sa,
    zipper_length: zipper_panel_length + 2 * IN,
    edge_tape_length: zipper_edge_finish === 'tape' ? 2 * zipper_panel_length : 0,
    drawbridge_cord_length: 2 * chord,
    grommet_positions,
    grommet_inset: GROMMET_INSET_MM,
    belt_cut_length: belt_max + BELT_TAIL_MM,
    volume_l: (width * height * depth) / 1e6,
  };
}

export function validateInputs(inputs: FannyPackInputs): ValidationResult {
  inputs = stripNulls(inputs);
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  if (guard.length) return { ok: false, errors: guard };
  const errors: BuildPatternError[] = [];
  const r = resolveInputs(inputs);
  const pos = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be a positive number` }); };
  const nonNeg = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v < 0) errors.push({ field, message: `${label} must be 0 or greater` }); };
  pos('width', 'Width'); pos('height', 'Height'); pos('depth', 'Depth');
  nonNeg('seam_allowance', 'Seam allowance');
  nonNeg('lid_extension', 'Lid extension');
  nonNeg('zipper_lip', 'Zipper lip');
  if (!['closed', 'partial', 'fully_open'].includes(r.lid_drop_target)) errors.push({ field: 'lid_drop_target', message: 'Lid drop target must be closed, partial or fully open' });
  if (!Number.isFinite(r.lid_angle_deg) || r.lid_angle_deg <= 0 || r.lid_angle_deg > 180) errors.push({ field: 'lid_angle_deg', message: 'Lid angle must be between 0 and 180 degrees' });
  if (r.rising_side < r.seam_allowance) errors.push({ field: 'lid_extension', message: `A ${(r.lid_extension / IN).toFixed(2)}" extension leaves no rising side on a ${(r.height / IN).toFixed(2)}" tall bag; the zipper panel would meet the bottom.` });
  if (![0, 2, 4].includes(r.bottom_grommets)) errors.push({ field: 'bottom_grommets', message: 'Grommets must be 0, 2 or 4' });
  if (r.bottom_grommets > 0 && r.depth < 2 * r.grommet_inset + 0.5 * IN) errors.push({ field: 'bottom_grommets', message: `A ${(r.depth / IN).toFixed(2)}" bottom cannot keep a grommet 1/2" clear of both seams` });
  if (![1, 1.5].includes(r.belt_webbing)) errors.push({ field: 'belt_webbing', message: 'Belt webbing must be 1" or 1.5"' });
  pos('belt_min', 'Shortest belt setting'); pos('belt_max', 'Longest belt setting');
  if (r.belt_max < r.belt_min) errors.push({ field: 'belt_max', message: 'Longest belt setting must be at least the shortest' });
  return errors.length ? { ok: false, errors } : { ok: true };
}
