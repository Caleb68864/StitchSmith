/**
 * Micro Rig Platform — types.
 *
 * The SOE micro rig chassis: a 7"-tall panel that is itself a flat pocket
 * (two Cordura layers closed at the perimeter, ripped open along the top with
 * a Velcro closure), a pleated mag-cell face sewn to its front, a utility
 * pocket, side PALS, bottom elastic loops, and a suspension module. Panel
 * width is the one real size parameter (vault rigs/micro-rig-common-platform.md,
 * micro-rig-panel-platform.md, ep13-panel-width-budget.md, split-front-center-join.md).
 *
 * Lengths the user types are in the display unit; `resolveInputs` normalises
 * everything to millimetres.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';

export type PanelWidthPreset = 'stacked_10_5' | 'standard_13' | 'r308_14' | 'pals_16' | 'pals_19' | 'custom';
export type PocketSet = 'mag_cells' | 'blank_pals';
export type Suspension = 'webbing_straps' | 'h_harness';

export interface MicroRigInputs {
  units?: 'mm' | 'in';
  panel_width_preset?: PanelWidthPreset;
  /** Custom panel width, display units (used when preset is 'custom'). */
  panel_width?: number;
  /** Panel height, display units. Vault: 7" nominal (PALS variants listed 6.5"). */
  panel_height?: number;
  pocket_set?: PocketSet;
  /** Magazine preset id from the mag pouch's magazine table (mag_cells). */
  magazine_preset_id?: string;
  /** Cells on the front, side by side (mag_cells). Default 4. */
  cell_count?: number;
  /** Override the finished cell span, display units (else PALS-snapped from the magazine). */
  cell_span?: number;
  /** Override the face fabric per cell, display units (else mag_w + 2·mag_t + 5/16"). */
  face_per_cell?: number;
  /** Cell height on the panel, display units. Default panel height − 1". */
  cell_height?: number;
  /** 6 × 6 × 3" utility pocket on the outboard end. Default true (mag_cells). */
  utility_pocket?: boolean;
  /** PALS columns on each end of the panel (0–2). Default 1. */
  side_pals_columns?: number;
  /** Elastic loops along the bottom edge. Default 2. */
  bottom_loop_count?: number;
  /** Two half-panels joined at the sternum with buckles. Default false. */
  split_front?: boolean;
  /** Sternum gap between halves, display units. Vault: a little over 2" (2.25). */
  gap_width?: number;
  /** Join buckle strap anchor setback from the panel edge, display units. Vault: 3". */
  buckle_setback?: number;
  suspension?: Suspension;
  /** Hook field on the outside back for a dangler pouch (11 × 6"). Default true. */
  dangler_field?: boolean;
  /** Seam allowance, mm. Default 9.5 (3/8"). */
  seam_allowance?: number;
  /** Margin between the mag section / utility pocket and the panel edge, display units. Default 0.5". */
  edge_margin?: number;
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  panel_width_preset: PanelWidthPreset;
  panel_width: number;
  panel_height: number;
  pocket_set: PocketSet;
  magazine_preset_id: string;
  /** Magazine body, mm. */
  mag: { width: number; thickness: number; height: number; platform: string; description: string };
  cell_count: number;
  cell_span: number;
  cell_span_derived: boolean;
  face_per_cell: number;
  cell_height: number;
  utility_pocket: boolean;
  utility_width: number;
  utility_height: number;
  utility_depth: number;
  side_pals_columns: number;
  bottom_loop_count: number;
  split_front: boolean;
  gap_width: number;
  buckle_setback: number;
  suspension: Suspension;
  dangler_field: boolean;
  seam_allowance: number;
  edge_margin: number;
  // Derived
  mag_span: number;
  pucker_per_side: number;
  internal_velcro_length: number;
  closure_velcro_drop: number;
  interior_velcro_drop: number;
  buckle_edge_offset: number;
  buckle_spacing: number;
  /** Space the width budget needs: mag span + utility + margins. */
  width_needed: number;
  /** Rows of side PALS the panel height allows. */
  side_pals_rows: number;
  /** Total front width when split: 2 × panel + gap. */
  total_front_width: number;
}

export type WarningSeverity = 'error' | 'warning' | 'info';
export interface GeneratorWarning { id: string; severity: WarningSeverity; message: string; field?: string }
export interface BuildPatternError { field: string; message: string }
export type ValidationResult = { ok: true } | { ok: false; errors: BuildPatternError[] };

export interface HardwareItem { id: string; name: string; quantity: number; notes?: string }

export interface MicroRigBuildResult {
  pieces: Piece[];
  steps: Step[];
  warnings: GeneratorWarning[];
  hardware: HardwareItem[];
  resolved: ResolvedInputs;
}

export interface BomRow { id: string; description: string; quantity: number; unit: string; notes?: string }
