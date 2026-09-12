import type { TriZipInputs, ResolvedInputs, StylePreset, Result, BuildPatternError } from './types.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';

/** Type/range guard run before the generator's own rules (hardening pass H1). */
const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  height: { kind: 'length' },
  width: { kind: 'length' },
  depth: { kind: 'length' },
  stylePreset: { kind: 'enum', allowed: ['urban_assault', 'tactical', 'hiking', 'camera', 'medical', 'minimalist'] },
  strap_width: { kind: 'length', min: 1, max: 5000 },
  foam_thickness: { kind: 'length', min: 0.5, max: 5000 },
  curve_style: { kind: 'enum', allowed: ['straight', 'ergonomic', 's_curve'] },
  back_panel_shape: { kind: 'enum', allowed: ['rounded', 'tactical', 'square'] },
  compression_straps: { kind: 'enum', allowed: ['none', 'side', 'side_and_bottom'] },
  hip_belt: { kind: 'enum', allowed: ['none', 'webbing', 'padded'] },
  laptop_sleeve_attachment: { kind: 'enum', allowed: ['none', 'webbing-loop', 'seam-sewn'] },
  sternum_strap: { kind: 'bool' },
  y_split_height_percent: { kind: 'percent' },
  center_panel_width_percent: { kind: 'percent' },
  zipper_method: { kind: 'enum', allowed: ['direct', 'gusseted'] },
  zipper_gusset_width: { kind: 'length', max: 5000 },
  frame_sheet: { kind: 'enum', allowed: ['none', 'hdpe', 'foam'] },
  frame_sheet_margin: { kind: 'length', max: 5000 },
  split_gusset: { kind: 'bool' },
  seam_allowance: { kind: 'length', max: 5000 },
  hem_allowance: { kind: 'length', max: 5000 },
  strap_architecture: { kind: 'enum', allowed: ['foam_sandwich_mesh', 'webbing_tacked_ends', 'webbing_through_quilted', 'crushable_sleeve', 'none'] },
  strap_edge_finish: { kind: 'enum', allowed: ['bound', 'turned'] },
  strap_webbing_width: { kind: 'length', max: 5000 },
  strap_pad_length: { kind: 'length', min: 1, max: 5000 },
  strap_hardware: { kind: 'enum', allowed: ['ladderlock', 'side_release', 'tri_glide'] },
};

const IN_TO_MM = 25.4;

export function toMm(value: number, units: 'mm' | 'in'): number {
  return units === 'in' ? value * IN_TO_MM : value;
}

export function validateInputs(inputs: TriZipInputs): Result<true, BuildPatternError> {
  inputs = stripNulls(inputs);
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'mm'));
  if (guard.length) return { ok: false, error: { kind: 'invalid-inputs', message: guard[0].message, field: guard[0].field } };
  if (inputs.stylePreset === undefined) return { ok: false, error: { kind: 'invalid-inputs', message: 'stylePreset is required (urban_assault, tactical, hiking, camera, medical or minimalist).', field: 'stylePreset' } };
  const { height, width, depth, units } = inputs;
  const hMm = toMm(height, units);
  const wMm = toMm(width, units);
  const dMm = toMm(depth, units);

  if (!isFinite(hMm) || hMm <= 0) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'height must be a positive finite number' } };
  }
  if (!isFinite(wMm) || wMm <= 0) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'width must be a positive finite number' } };
  }
  if (!isFinite(dMm) || dMm <= 0) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'depth must be a positive finite number' } };
  }

  const yp = inputs.y_split_height_percent;
  if (yp !== undefined && (yp < 1 || yp > 99)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'y_split_height_percent must be between 1 and 99' } };
  }
  const cp = inputs.center_panel_width_percent;
  if (cp !== undefined && (cp < 1 || cp > 99)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'center_panel_width_percent must be between 1 and 99' } };
  }

  if (inputs.seam_allowance !== undefined && (!isFinite(inputs.seam_allowance) || inputs.seam_allowance < 0)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'seam_allowance must be a non-negative finite number' } };
  }
  if (inputs.hem_allowance !== undefined && (!isFinite(inputs.hem_allowance) || inputs.hem_allowance < 0)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'hem_allowance must be a non-negative finite number' } };
  }
  if (inputs.strap_webbing_width !== undefined && (!isFinite(inputs.strap_webbing_width) || inputs.strap_webbing_width <= 0)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'strap_webbing_width must be a positive finite number', field: 'strap_webbing_width' } };
  }
  if (inputs.strap_pad_length !== undefined && (!isFinite(inputs.strap_pad_length) || inputs.strap_pad_length <= 0)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'strap_pad_length must be a positive finite number', field: 'strap_pad_length' } };
  }

  return { ok: true, value: true };
}

export function resolveInputs(inputs: TriZipInputs, preset: StylePreset): ResolvedInputs {
  inputs = stripNulls(inputs);
  const hMm = toMm(inputs.height, inputs.units);
  const wMm = toMm(inputs.width, inputs.units);
  const dMm = toMm(inputs.depth, inputs.units);
  const padLength = inputs.strap_pad_length ?? defaultStrapPadLength(hMm);

  return {
    height: hMm,
    width: wMm,
    depth: dMm,
    units: inputs.units,
    stylePreset: inputs.stylePreset,
    strap_width: inputs.strap_width ?? preset.strap_width,
    foam_thickness: inputs.foam_thickness ?? preset.foam_thickness,
    curve_style: inputs.curve_style ?? preset.curve_style,
    back_panel_shape: inputs.back_panel_shape ?? preset.back_panel_shape,
    compression_straps: inputs.compression_straps ?? preset.compression_straps,
    hip_belt: inputs.hip_belt ?? preset.hip_belt,
    laptop_sleeve_attachment: inputs.laptop_sleeve_attachment ?? preset.laptop_sleeve_attachment,
    sternum_strap: inputs.sternum_strap ?? preset.sternum_strap,
    y_split_height_percent: inputs.y_split_height_percent ?? preset.y_split_height_percent,
    center_panel_width_percent: inputs.center_panel_width_percent ?? preset.center_panel_width_percent,
    zipper_method: inputs.zipper_method ?? preset.zipper_method,
    zipper_gusset_width: inputs.zipper_gusset_width ?? preset.zipper_gusset_width,
    frame_sheet: inputs.frame_sheet ?? preset.frame_sheet,
    frame_sheet_margin: inputs.frame_sheet_margin ?? preset.frame_sheet_margin,
    split_gusset: inputs.split_gusset ?? false,
    seam_allowance: inputs.seam_allowance ?? 10,
    hem_allowance: inputs.hem_allowance ?? 25,
    strap_architecture: inputs.strap_architecture ?? 'foam_sandwich_mesh',
    strap_edge_finish: inputs.strap_edge_finish ?? 'bound',
    strap_webbing_width: inputs.strap_webbing_width ?? 25,
    strap_pad_length: padLength,
    strap_tail_length: strapTailLength(hMm, padLength, dMm),
    strap_hardware: inputs.strap_hardware ?? 'ladderlock',
  };
}

/** Padded length defaults to 0.75 × bag height, clamped to a wearable 250–550 mm. */
export function defaultStrapPadLength(heightMm: number): number {
  return Math.min(550, Math.max(250, Math.round(heightMm * 0.75)));
}

/**
 * Free tail webbing below the pad. The pad ends part-way down the back; the
 * tail must reach the lower anchor at the bottom side of the bag, wrap the
 * gusset, and leave adjustment. Depth is a REQUIRED term — the medpack build
 * cut its straps 3" short by copying a cut list without the gusset dimension
 * (vault packs/medpack-shoulder-harness.md).
 */
export const STRAP_ADJUST_RANGE_MM = 200;
export function strapTailLength(heightMm: number, padLengthMm: number, depthMm: number): number {
  return Math.max(150, Math.round(heightMm - padLengthMm + depthMm + STRAP_ADJUST_RANGE_MM));
}

export function computeVolumeLiters(inputs: TriZipInputs): number {
  const h = toMm(inputs.height, inputs.units);
  const w = toMm(inputs.width, inputs.units);
  const d = toMm(inputs.depth, inputs.units);
  return (h * w * d) / 1_000_000;
}
