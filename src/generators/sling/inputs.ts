import type { SlingInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import {
  DEFAULT_UNITS, FOAM_SETBACK_MM, TUCK_DEPTH_MM, TURNING_EASE_MM, DEFAULT_SEAM_ALLOWANCE_MM, WEBBING_WIDTH_MM, PAD_LENGTH_MM, PAD_GIRTH_MM,
  FOAM_THICKNESS_MM, FOAM_WIDTH_MM, REAR_TAIL_MM, ADJUST_WEBBING_MM, ANCHOR_STRAP_MM, ROD_TURN_MIN_FLAT_WIDTH_MM, HARDWARE_WRAP_MM,
} from './defaults.js';

const IN = 25.4;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }

export function resolveInputs(inputs: SlingInputs): ResolvedInputs {
  const units = inputs.units ?? DEFAULT_UNITS;
  const d = (v: number | undefined, fallbackMm: number) => (v === undefined || v === null || Number.isNaN(v) ? fallbackMm : toMm(v, units));
  const webbing_width = inputs.webbing_width ?? WEBBING_WIDTH_MM;
  const pad_finished_length = d(inputs.pad_finished_length, PAD_LENGTH_MM);
  const pad_girth = d(inputs.pad_girth, PAD_GIRTH_MM);
  const foam_setback = d(inputs.foam_setback, FOAM_SETBACK_MM);
  const tuck_depth = d(inputs.tuck_depth, TUCK_DEPTH_MM);
  const turning_ease = d(inputs.turning_ease, TURNING_EASE_MM);
  const seam_allowance = inputs.seam_allowance ?? DEFAULT_SEAM_ALLOWANCE_MM;
  const rear_tail_length = d(inputs.rear_tail_length, REAR_TAIL_MM);
  const adjustment_webbing_length = d(inputs.adjustment_webbing_length, ADJUST_WEBBING_MM);
  const third_piece = inputs.third_piece ?? 'anchor_strap';
  const anchor_strap_length = d(inputs.anchor_strap_length, ANCHOR_STRAP_MM);
  const pad_flat_width = pad_girth / 2;
  return {
    units,
    webbing_width,
    pad_finished_length,
    pad_girth,
    foam_thickness: inputs.foam_thickness ?? FOAM_THICKNESS_MM,
    foam_width: d(inputs.foam_width, FOAM_WIDTH_MM),
    foam_setback,
    tuck_depth,
    turning_ease,
    seam_allowance,
    rear_tail_length,
    adjustment_webbing_length,
    third_piece,
    anchor_strap_length,
    end_interface: inputs.end_interface ?? 'bare_triglide',
    route_through_both_slots: inputs.route_through_both_slots ?? false,
    foam_length: pad_finished_length - 2 * foam_setback,
    tube_cut_width: pad_girth + turning_ease + 2 * seam_allowance,
    tube_cut_length: pad_finished_length + 2 * seam_allowance,
    pad_flat_width,
    turn_method: pad_flat_width < ROD_TURN_MIN_FLAT_WIDTH_MM ? 'cord_pull' : 'rod',
    webbing_engagement: tuck_depth - foam_setback,
    adjustment_range: Math.max(0, adjustment_webbing_length - tuck_depth - 2 * HARDWARE_WRAP_MM),
    total_webbing: rear_tail_length + adjustment_webbing_length + (third_piece === 'anchor_strap' ? anchor_strap_length : adjustment_webbing_length) + 2 * tuck_depth,
  };
}

export function validateInputs(inputs: SlingInputs): ValidationResult {
  const errors: BuildPatternError[] = [];
  const r = resolveInputs(inputs);
  const pos = (field: keyof ResolvedInputs, label: string) => {
    const v = r[field] as number;
    if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be a positive number` });
  };
  const nonNeg = (field: keyof ResolvedInputs, label: string) => {
    const v = r[field] as number;
    if (!Number.isFinite(v) || v < 0) errors.push({ field, message: `${label} must be 0 or greater` });
  };
  pos('webbing_width', 'Webbing width');
  pos('pad_finished_length', 'Pad length');
  pos('pad_girth', 'Pad girth');
  pos('foam_width', 'Foam width');
  nonNeg('foam_thickness', 'Foam thickness');
  nonNeg('foam_setback', 'Foam setback');
  pos('tuck_depth', 'Tuck depth');
  nonNeg('turning_ease', 'Turning ease');
  nonNeg('seam_allowance', 'Seam allowance');
  pos('rear_tail_length', 'Rear tail');
  pos('adjustment_webbing_length', 'Adjustment webbing');
  if (r.third_piece === 'anchor_strap') pos('anchor_strap_length', 'Anchor strap');
  if (r.foam_length <= 0) errors.push({ field: 'foam_setback', message: 'Foam setback leaves no foam: the two setbacks exceed the pad length' });
  if (r.webbing_engagement <= 0) errors.push({ field: 'tuck_depth', message: 'The closing stitch must bite the webbing: tuck depth must exceed the foam setback' });
  if (r.pad_flat_width < r.webbing_width) errors.push({ field: 'pad_girth', message: 'The pad is narrower than the webbing; half the girth must cover the webbing' });
  if (r.foam_width > r.pad_flat_width) errors.push({ field: 'foam_width', message: 'Foam is wider than the flattened pad' });
  return errors.length ? { ok: false, errors } : { ok: true };
}
