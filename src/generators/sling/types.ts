/**
 * Padded Two-Point Sling — types.
 *
 * SOE's padded two-point sling: a turned Cordura tube over a closed-cell foam
 * core, webbing tucked ~1" into each pad end and closed with the end stitch
 * (the load path), a one-way tension adapter anchored at the pad's front end,
 * and bare tri-glides at both ends as the open attachment interface
 * (vault accessories/sling-pad-construction.md, sling-two-point-padded-build.md,
 * sling-hardware-interface.md). The vault gives construction, not lengths:
 * every length here is an input with a mock-derived warning at its default.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';

export type ThirdPiece = 'anchor_strap' | 'separate_adjust';
export type EndInterface = 'bare_triglide' | 'buckle_qd' | 'direct_sewn';
export type TurnMethod = 'rod' | 'cord_pull';

export interface SlingInputs {
  units?: 'mm' | 'in';
  /** Webbing width, mm — drives every hardware slot. */
  webbing_width?: number;
  /** Finished pad length, display units. */
  pad_finished_length?: number;
  /** Target finished tube girth (all round), display units. A target, not a cut number. */
  pad_girth?: number;
  /** Foam thickness, mm. */
  foam_thickness?: number;
  /** Foam strip width, display units. */
  foam_width?: number;
  /** Foam set back from each pad-end closing stitch, display units. Default 1/2". */
  foam_setback?: number;
  /** Webbing tucked inside each pad end, display units. Default 1". */
  tuck_depth?: number;
  /** Extra girth cut so the tube turns; tightened at the second pass, display units. Default 1/2". */
  turning_ease?: number;
  seam_allowance?: number;
  /** Long rear tail, display units. */
  rear_tail_length?: number;
  /** Front webbing that runs through the tension adapter (its free end is the pull), display units. */
  adjustment_webbing_length?: number;
  /** Third webbing piece: a short anchor strap for the adapter, or a separate adjustment tail. */
  third_piece?: ThirdPiece;
  /** Anchor strap length when third_piece is anchor_strap, display units. */
  anchor_strap_length?: number;
  end_interface?: EndInterface;
  /** Route the adjustment webbing through both adapter slots (more drag). Default false. */
  route_through_both_slots?: boolean;
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  webbing_width: number;
  pad_finished_length: number;
  pad_girth: number;
  foam_thickness: number;
  foam_width: number;
  foam_setback: number;
  tuck_depth: number;
  turning_ease: number;
  seam_allowance: number;
  rear_tail_length: number;
  adjustment_webbing_length: number;
  third_piece: ThirdPiece;
  anchor_strap_length: number;
  end_interface: EndInterface;
  route_through_both_slots: boolean;
  // Derived
  foam_length: number;
  /** Tube cut width across the girth: girth + turning ease + 2 × SA. */
  tube_cut_width: number;
  /** Tube cut length: pad length + 2 × SA (the ends turn in). */
  tube_cut_length: number;
  /** Finished flat width of the pad (half the girth). */
  pad_flat_width: number;
  turn_method: TurnMethod;
  /** How much webbing the closing stitch actually bites: tuck − setback. */
  webbing_engagement: number;
  /** Rough adjustment travel: adjustment webbing less the tuck and two hardware wraps. */
  adjustment_range: number;
  total_webbing: number;
}

export type WarningSeverity = 'error' | 'warning' | 'info';
export interface GeneratorWarning { id: string; severity: WarningSeverity; message: string; field?: string }
export interface BuildPatternError { field: string; message: string }
export type ValidationResult = { ok: true } | { ok: false; errors: BuildPatternError[] };
export interface HardwareItem { id: string; name: string; quantity: number; notes?: string }
export interface SlingBuildResult { pieces: Piece[]; steps: Step[]; warnings: GeneratorWarning[]; hardware: HardwareItem[]; resolved: ResolvedInputs }
export interface BomRow { id: string; description: string; quantity: number; unit: string; notes?: string }
