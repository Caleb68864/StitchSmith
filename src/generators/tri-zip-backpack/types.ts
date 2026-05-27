import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';

export type PresetName =
  | 'urban_assault'
  | 'tactical'
  | 'hiking'
  | 'camera'
  | 'medical'
  | 'minimalist';

export type CurveStyle = 'straight' | 'ergonomic' | 's_curve';
export type BackPanelShape = 'rounded' | 'tactical' | 'square';
export type CompressionStraps = 'none' | 'side' | 'side_and_bottom';
export type HipBelt = 'none' | 'webbing' | 'padded';
export type LaptopSleeveAttachment = 'none' | 'webbing-loop' | 'seam-sewn';
export type ZipperMethod = 'direct' | 'gusseted';
export type FrameSheet = 'none' | 'hdpe' | 'foam';

export interface StylePreset {
  name: PresetName;
  strap_width: number;
  foam_thickness: number;
  curve_style: CurveStyle;
  back_panel_shape: BackPanelShape;
  compression_straps: CompressionStraps;
  hip_belt: HipBelt;
  laptop_sleeve_attachment: LaptopSleeveAttachment;
  sternum_strap: boolean;
  y_split_height_percent: number;
  center_panel_width_percent: number;
  zipper_method: ZipperMethod;
  zipper_gusset_width: number;
  frame_sheet: FrameSheet;
  frame_sheet_margin: number;
}

export interface TriZipInputs {
  height: number;
  width: number;
  depth: number;
  units: 'mm' | 'in';
  stylePreset: PresetName;
  strap_width?: number;
  foam_thickness?: number;
  curve_style?: CurveStyle;
  back_panel_shape?: BackPanelShape;
  compression_straps?: CompressionStraps;
  hip_belt?: HipBelt;
  laptop_sleeve_attachment?: LaptopSleeveAttachment;
  sternum_strap?: boolean;
  y_split_height_percent?: number;
  center_panel_width_percent?: number;
  zipper_method?: ZipperMethod;
  zipper_gusset_width?: number;
  frame_sheet?: FrameSheet;
  frame_sheet_margin?: number;
  split_gusset?: boolean;
  seam_allowance?: number;
  /** Hem allowance (mm) applied to free edges that fold under (laptop sleeve top, gusset long edges). */
  hem_allowance?: number;
}

export interface ResolvedInputs {
  height: number;
  width: number;
  depth: number;
  units: 'mm' | 'in';
  stylePreset: PresetName;
  strap_width: number;
  foam_thickness: number;
  curve_style: CurveStyle;
  back_panel_shape: BackPanelShape;
  compression_straps: CompressionStraps;
  hip_belt: HipBelt;
  laptop_sleeve_attachment: LaptopSleeveAttachment;
  sternum_strap: boolean;
  y_split_height_percent: number;
  center_panel_width_percent: number;
  zipper_method: ZipperMethod;
  zipper_gusset_width: number;
  frame_sheet: FrameSheet;
  frame_sheet_margin: number;
  split_gusset: boolean;
  seam_allowance: number;
  hem_allowance: number;
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export interface BuildPatternError {
  kind: 'seam-length-mismatch' | 'invalid-inputs';
  message: string;
  piece1Id?: string;
  piece2Id?: string;
  sharedPathId?: string;
  length1?: number;
  length2?: number;
}

export interface ModuleResult {
  pieces: Piece[];
  steps: Step[];
}

export interface SeamRef {
  pieceId: string;
  pathId: string;
  length: number;
}
