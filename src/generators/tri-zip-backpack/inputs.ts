import type { TriZipInputs, ResolvedInputs, StylePreset, Result, BuildPatternError } from './types.js';

const IN_TO_MM = 25.4;

export function toMm(value: number, units: 'mm' | 'in'): number {
  return units === 'in' ? value * IN_TO_MM : value;
}

export function validateInputs(inputs: TriZipInputs): Result<true, BuildPatternError> {
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

  return { ok: true, value: true };
}

export function resolveInputs(inputs: TriZipInputs, preset: StylePreset): ResolvedInputs {
  const hMm = toMm(inputs.height, inputs.units);
  const wMm = toMm(inputs.width, inputs.units);
  const dMm = toMm(inputs.depth, inputs.units);

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
  };
}

export function computeVolumeLiters(inputs: TriZipInputs): number {
  const h = toMm(inputs.height, inputs.units);
  const w = toMm(inputs.width, inputs.units);
  const d = toMm(inputs.depth, inputs.units);
  return (h * w * d) / 1_000_000;
}
