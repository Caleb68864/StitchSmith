import type { PaddedStrapInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import {
  DEFAULT_UNITS, DEFAULT_MODE, DEFAULT_SEAM_ALLOWANCE_MM,
  PACK_PAD_LENGTH_MM, PACK_PAD_WIDTH_MM, PACK_FOAM_MM, PACK_WEBBING_MM, PACK_TORSO_MM, PACK_GUSSET_MM, TAIL_ADJUST_RANGE_MM, TAIL_MIN_MM,
  H_WEBBING_MM, H_CHEST_ADJUST_MM, H_SLOT_PITCH_MM, H_HYDRATION_CHANNELS, H_FRONT_PALS_ROWS,
  H_PAD_LENGTH_MM, H_PAD_WIDTH_MM, H_FOAM_MM, H_CROSS_STRAP_HEIGHT_MM, H_PAD_SPREAD_MM, H_DROP_LEG_MM,
} from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';

/** Type/range guard run before the generator's own rules (hardening pass H1). */
const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  mode: { kind: 'enum', allowed: ['pack_pair', 'h_harness'] },
  pad_length: { kind: 'length' },
  pad_width: { kind: 'length' },
  foam_thickness: { kind: 'length', max: 5000 },
  curve: { kind: 'enum', allowed: ['straight', 'j_curve', 's_curve'] },
  architecture: { kind: 'enum', allowed: ['foam_sandwich_mesh', 'webbing_tacked_ends', 'webbing_through_quilted', 'crushable_sleeve', 'none'] },
  edge_finish: { kind: 'enum', allowed: ['bound', 'turned'] },
  webbing_width: { kind: 'length', max: 5000 },
  hardware: { kind: 'enum', allowed: ['ladderlock', 'side_release', 'tri_glide'] },
  seam_allowance: { kind: 'length', max: 5000 },
  torso_length: { kind: 'length' },
  gusset_depth: { kind: 'length' },
  tail_length: { kind: 'length' },
  cross_strap_height: { kind: 'length' },
  pad_spread: { kind: 'length' },
  chest_adjust_range: { kind: 'length' },
  slot_pitch: { kind: 'length' },
  drop_leg_length: { kind: 'length' },
  hydration_channels: { kind: 'count', max: 4 },
  front_pals_rows: { kind: 'count', max: 12 },
  routing_side: { kind: 'enum', allowed: ['left', 'right', 'both', 'none'] },
};

const IN = 25.4;

export function toMm(value: number, units: 'mm' | 'in'): number {
  return units === 'in' ? value * IN : value;
}

/**
 * Free tail below the pad for a pack strap: reach the lower anchor at the
 * bottom of the bag, wrap the gusset, leave adjustment. Depth is a required
 * term (vault packs/medpack-shoulder-harness.md — the build that cut its
 * straps 3" short copied a cut list without the gusset).
 */
export function deriveTailLength(torsoMm: number, padLengthMm: number, gussetMm: number): number {
  return Math.max(TAIL_MIN_MM, Math.round(torsoMm - padLengthMm + gussetMm + TAIL_ADJUST_RANGE_MM));
}

export function resolveInputs(inputs: PaddedStrapInputs): ResolvedInputs {
  inputs = stripNulls(inputs);
  const units = inputs.units ?? DEFAULT_UNITS;
  const mode = inputs.mode ?? DEFAULT_MODE;
  const h = mode === 'h_harness';
  const d = (v: number | undefined, fallbackMm: number) => (v === undefined || v === null || Number.isNaN(v) ? fallbackMm : toMm(v, units));

  const pad_length = d(inputs.pad_length, h ? H_PAD_LENGTH_MM : PACK_PAD_LENGTH_MM);
  const pad_width = d(inputs.pad_width, h ? H_PAD_WIDTH_MM : PACK_PAD_WIDTH_MM);
  const torso_length = d(inputs.torso_length, PACK_TORSO_MM);
  const gusset_depth = d(inputs.gusset_depth, PACK_GUSSET_MM);
  const drop_leg_length = d(inputs.drop_leg_length, H_DROP_LEG_MM);
  const tailOverride = inputs.tail_length !== undefined && inputs.tail_length !== null && !Number.isNaN(inputs.tail_length);
  const tail_length = h
    ? drop_leg_length
    : tailOverride ? toMm(inputs.tail_length!, units) : deriveTailLength(torso_length, pad_length, gusset_depth);

  const cross_strap_height = d(inputs.cross_strap_height, H_CROSS_STRAP_HEIGHT_MM);
  const pad_spread = d(inputs.pad_spread, H_PAD_SPREAD_MM);
  const chest_adjust_range = inputs.chest_adjust_range ?? H_CHEST_ADJUST_MM;
  const slot_pitch = inputs.slot_pitch ?? H_SLOT_PITCH_MM;
  const webbing_width = inputs.webbing_width ?? (h ? H_WEBBING_MM : PACK_WEBBING_MM);

  return {
    units,
    mode,
    pad_length,
    pad_width,
    foam_thickness: inputs.foam_thickness ?? (h ? H_FOAM_MM : PACK_FOAM_MM),
    curve: inputs.curve ?? (h ? 'straight' : 'j_curve'),
    architecture: inputs.architecture ?? (h ? 'webbing_through_quilted' : 'foam_sandwich_mesh'),
    edge_finish: inputs.edge_finish ?? 'bound',
    webbing_width,
    hardware: inputs.hardware ?? (h ? 'side_release' : 'ladderlock'),
    seam_allowance: inputs.seam_allowance ?? DEFAULT_SEAM_ALLOWANCE_MM,
    torso_length,
    gusset_depth,
    tail_length,
    tail_derived: !h && !tailOverride,
    cross_strap_height,
    pad_spread,
    chest_adjust_range,
    slot_pitch,
    drop_leg_length,
    hydration_channels: inputs.hydration_channels ?? H_HYDRATION_CHANNELS,
    front_pals_rows: inputs.front_pals_rows ?? H_FRONT_PALS_ROWS,
    routing_side: inputs.routing_side ?? 'left',
    // Sewn to each pad across its full width, then the spread, then the slotted adjustment.
    cross_strap_length: 2 * pad_width + pad_spread + chest_adjust_range,
    slot_count: slot_pitch > 0 ? Math.floor(chest_adjust_range / slot_pitch) + 1 : 0,
  };
}

export function validateInputs(inputs: PaddedStrapInputs): ValidationResult {
  inputs = stripNulls(inputs);
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  if (guard.length) return { ok: false, errors: guard };
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
  pos('pad_length', 'Pad length');
  pos('pad_width', 'Pad width');
  pos('webbing_width', 'Webbing width');
  nonNeg('foam_thickness', 'Foam thickness');
  nonNeg('seam_allowance', 'Seam allowance');
  if (r.mode === 'pack_pair') {
    pos('torso_length', 'Torso length');
    nonNeg('gusset_depth', 'Gusset depth');
    pos('tail_length', 'Tail length');
  } else {
    pos('cross_strap_height', 'Cross strap height');
    nonNeg('pad_spread', 'Pad spread');
    nonNeg('chest_adjust_range', 'Chest adjustment');
    pos('slot_pitch', 'Slot pitch');
    pos('drop_leg_length', 'Drop leg length');
    if (!Number.isInteger(r.hydration_channels) || r.hydration_channels < 0 || r.hydration_channels > 6) errors.push({ field: 'hydration_channels', message: 'Hydration channels must be a whole number from 0 to 6' });
    if (!Number.isInteger(r.front_pals_rows) || r.front_pals_rows < 0 || r.front_pals_rows > 4) errors.push({ field: 'front_pals_rows', message: 'Front PALS rows must be a whole number from 0 to 4' });
    if (r.cross_strap_height >= r.pad_length) errors.push({ field: 'cross_strap_height', message: 'Cross strap height must be less than the pad length' });
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
