import type { StylePreset, PresetName } from './types.js';

export const urban_assault: StylePreset = {
  name: 'urban_assault',
  strap_width: 75,
  foam_thickness: 10,
  curve_style: 'ergonomic',
  back_panel_shape: 'rounded',
  compression_straps: 'side',
  hip_belt: 'webbing',
  laptop_sleeve_attachment: 'webbing-loop',
  sternum_strap: true,
  y_split_height_percent: 60,
  center_panel_width_percent: 35,
  zipper_method: 'gusseted',
  zipper_gusset_width: 25,
  frame_sheet: 'none',
  frame_sheet_margin: 10,
};

export const tactical: StylePreset = {
  name: 'tactical',
  strap_width: 75,
  foam_thickness: 10,
  curve_style: 'straight',
  back_panel_shape: 'tactical',
  compression_straps: 'side_and_bottom',
  hip_belt: 'padded',
  laptop_sleeve_attachment: 'webbing-loop',
  sternum_strap: true,
  y_split_height_percent: 55,
  center_panel_width_percent: 40,
  zipper_method: 'gusseted',
  zipper_gusset_width: 25,
  frame_sheet: 'none',
  frame_sheet_margin: 10,
};

export const hiking: StylePreset = {
  name: 'hiking',
  strap_width: 65,
  foam_thickness: 12,
  curve_style: 's_curve',
  back_panel_shape: 'rounded',
  compression_straps: 'side',
  hip_belt: 'padded',
  laptop_sleeve_attachment: 'none',
  sternum_strap: true,
  y_split_height_percent: 65,
  center_panel_width_percent: 30,
  zipper_method: 'gusseted',
  zipper_gusset_width: 25,
  frame_sheet: 'none',
  frame_sheet_margin: 10,
};

export const camera: StylePreset = {
  name: 'camera',
  strap_width: 65,
  foam_thickness: 8,
  curve_style: 'ergonomic',
  back_panel_shape: 'square',
  compression_straps: 'side',
  hip_belt: 'webbing',
  laptop_sleeve_attachment: 'seam-sewn',
  sternum_strap: true,
  y_split_height_percent: 50,
  center_panel_width_percent: 45,
  zipper_method: 'gusseted',
  zipper_gusset_width: 25,
  frame_sheet: 'none',
  frame_sheet_margin: 10,
};

export const medical: StylePreset = {
  name: 'medical',
  strap_width: 70,
  foam_thickness: 10,
  curve_style: 'straight',
  back_panel_shape: 'square',
  compression_straps: 'none',
  hip_belt: 'none',
  laptop_sleeve_attachment: 'seam-sewn',
  sternum_strap: false,
  y_split_height_percent: 70,
  center_panel_width_percent: 50,
  zipper_method: 'gusseted',
  zipper_gusset_width: 25,
  frame_sheet: 'none',
  frame_sheet_margin: 10,
};

export const minimalist: StylePreset = {
  name: 'minimalist',
  strap_width: 50,
  foam_thickness: 6,
  curve_style: 'straight',
  back_panel_shape: 'rounded',
  compression_straps: 'none',
  hip_belt: 'none',
  laptop_sleeve_attachment: 'seam-sewn',
  sternum_strap: false,
  y_split_height_percent: 60,
  center_panel_width_percent: 35,
  zipper_method: 'gusseted',
  zipper_gusset_width: 25,
  frame_sheet: 'none',
  frame_sheet_margin: 10,
};

export const STYLE_PRESETS: Record<PresetName, StylePreset> = {
  urban_assault,
  tactical,
  hiking,
  camera,
  medical,
  minimalist,
};

export function getPreset(name: PresetName): StylePreset {
  return STYLE_PRESETS[name];
}
