import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { PadArchitecture, EdgeFinish, StrapHardware } from '../../lib/strap-engine/types.js';

export type { PadArchitecture as StrapArchitecture, EdgeFinish as StrapEdgeFinish, StrapHardware };

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
  /** Shoulder pad build. Default 'foam_sandwich_mesh' (shell + closed-cell foam + spacer mesh, bound). */
  strap_architecture?: PadArchitecture;
  /** Shoulder pad edge finish. Default 'bound'. */
  strap_edge_finish?: EdgeFinish;
  /** Load-bearing strap webbing width, mm. Default 25. */
  strap_webbing_width?: number;
  /** Padded length, mm. Default 0.75 × bag height, clamped to 250–550. */
  strap_pad_length?: number;
  /** Lower-anchor hardware. Default 'ladderlock'. */
  strap_hardware?: StrapHardware;
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
  strap_architecture: PadArchitecture;
  strap_edge_finish: EdgeFinish;
  strap_webbing_width: number;
  strap_pad_length: number;
  /** Free tail webbing below the pad, mm — derived from height, pad length AND gusset depth. */
  strap_tail_length: number;
  strap_hardware: StrapHardware;
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
  /**
   * Optional input-field key the message refers to (e.g. `'panel_height'`).
   * UI can use this to highlight the offending input directly without
   * regex-matching the message string. See docs/notes/polish-pass-learnings.md L6.
   */
  field?: string;
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
