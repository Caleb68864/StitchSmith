/**
 * Fanny Pack — types.
 *
 * SOE's Tactical Fanny Pack 2.0 as reconstructed from the vault: a back panel
 * and a front panel on a hoop made of a zipper panel (across the top and down
 * the sides by the lid-drop extension) and a rising gusset (bottom and the
 * lower sides). The lid is the front panel plus the front zipper half; how far
 * the zipper panel extends down the sides sets how far the lid can fall
 * (bags/fanny-pack-lid-drop-tuning.md). Options: drawbridge cord limiter,
 * bottom drainage grommets, tape-or-fold zipper edges, dual-mode belt.
 *
 * The vault gives rules, not a cut list: every body dimension and belt length
 * is an input carrying a mock-derived warning. Convention B: cut sizes include
 * the seam allowance; every cut edge carries an explicit 0.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';

export type LidDropTarget = 'closed' | 'partial' | 'fully_open';
export type ZipperEdgeFinish = 'fold' | 'tape';
export type BeltWebbing = 1 | 1.5;

export interface FannyPackInputs {
  units?: 'mm' | 'in';
  /** Finished width along the belt, display units. Default 10" (starting point, not a vault number). */
  width?: number;
  /** Finished height, display units. Default 6". */
  height?: number;
  /** Finished depth, display units. Default 3". */
  depth?: number;
  /** Seam allowance, display units. Default 1/2". */
  seam_allowance?: number;
  /** How far the lid should fall. Default fully_open. */
  lid_drop_target?: LidDropTarget;
  /** Lid angle for `partial`, degrees from closed. Default 90. */
  lid_angle_deg?: number;
  /** Override for the zipper-panel extension down each side, display units. Default: the heuristic (≈ depth for fully open). */
  lid_extension?: number;
  /** Raw edge behind the zipper: fold (cut 1" longer, fold over) or edge tape. Default fold. */
  zipper_edge_finish?: ZipperEdgeFinish;
  /** Zipper lip fold-over, display units. Default 1" (the measured rule of thumb). */
  zipper_lip?: number;
  /** Paracord loops between lid and body that stop the lid at the target angle. Default false. */
  drawbridge_limiter?: boolean;
  /** Bottom drainage grommets: 0, 2 or 4. Default 0. */
  bottom_grommets?: 0 | 2 | 4;
  /** Belt webbing width in inches. Default 1.5. */
  belt_webbing?: BeltWebbing;
  /** Shortest belt setting (waist), display units. Default 28" — measure the wearer. */
  belt_min?: number;
  /** Longest belt setting (sling across the torso), display units. Default 52". */
  belt_max?: number;
  /** Edge tape colour for the BOM. Default black. */
  edge_tape_color?: string;
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  width: number;
  height: number;
  depth: number;
  seam_allowance: number;
  lid_drop_target: LidDropTarget;
  lid_angle_deg: number;
  lid_extension: number;
  lid_extension_overridden: boolean;
  zipper_edge_finish: ZipperEdgeFinish;
  zipper_lip: number;
  drawbridge_limiter: boolean;
  bottom_grommets: 0 | 2 | 4;
  belt_webbing: BeltWebbing;
  belt_min: number;
  belt_max: number;
  edge_tape_color: string;
  // Derived (mm)
  /** Heuristic extension the lid-drop target implies before any override. */
  lid_extension_heuristic: number;
  /** Finished zipper panel length: width + both extensions. */
  zipper_panel_length: number;
  zipper_panel_cut_length: number;
  /** Each zipper half's finished depth (equal split). */
  zipper_half_depth: number;
  zipper_half_cut_height: number;
  /** Rising side height: height − extension. */
  rising_side: number;
  rising_gusset_length: number;
  rising_gusset_cut_length: number;
  gusset_cut_height: number;
  panel_cut_width: number;
  panel_cut_height: number;
  zipper_length: number;
  edge_tape_length: number;
  /** Cord per side for the drawbridge loops. */
  drawbridge_cord_length: number;
  /** Where the grommet centres sit along the bottom run, from the left bottom corner. */
  grommet_positions: number[];
  grommet_inset: number;
  belt_cut_length: number;
  volume_l: number;
}

export type WarningSeverity = 'error' | 'warning' | 'info';
export interface GeneratorWarning { id: string; severity: WarningSeverity; message: string; field?: string }
export interface BuildPatternError { field: string; message: string }
export type ValidationResult = { ok: true } | { ok: false; errors: BuildPatternError[] };
export interface HardwareItem { id: string; name: string; quantity: number; notes?: string }
export interface FannyPackBuildResult { pieces: Piece[]; steps: Step[]; warnings: GeneratorWarning[]; hardware: HardwareItem[]; resolved: ResolvedInputs }
export interface BomRow { id: string; description: string; quantity: number; unit: string; notes?: string }
