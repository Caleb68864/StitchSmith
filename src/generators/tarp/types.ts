/**
 * Flat / A-frame tarp (roadmap item 10a) — types.
 *
 * Two panels joined by a flat-felled ridge seam (or one panel with no ridge
 * seam), optional catenary ("cat cut") ridge and eaves, hemmed ends and eaves,
 * box-X reinforcement patches with grosgrain tie-out loops.
 *
 * Sewn fabrics only (silnylon, silpoly): DCF and other taped or bonded
 * construction are out of scope (owner decision 2026-11-16).
 *
 * NO VAULT NUMBERS. The MYOG vault's shelter notes are reference material and
 * were not available when this was built, so every length here is a
 * placeholder with a `mock-derived` warning until checked against the vault.
 *
 * All lengths the user types are in the display unit except `seam_allowance`,
 * which is millimetres like every other generator's; `resolveInputs`
 * normalises everything to millimetres.
 *
 * Convention B: panels are drawn at CUT size with the ridge seam allowance
 * and the hems baked in, explicit 0 on every edge, the ridge stitch line drawn.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { HemFold } from '../../lib/pattern-engine/primitives/hem.js';

export type TarpConstruction = 'ridge_seam' | 'single_panel';
export type TarpCutStyle = 'flat' | 'cat_cut';

export interface TarpInputs {
  units?: 'mm' | 'in';
  /** Two panels and a flat-felled ridge seam (default), or one panel when the whole width fits the fabric. */
  construction?: TarpConstruction;
  /** Straight edges, or catenary curves on the ridge and eaves (default). */
  cut_style?: TarpCutStyle;
  /** Finished length along the ridge, display units. Placeholder 10' — mock-derived. */
  ridge_length?: number;
  /** Finished width eave to eave, measured flat across the ridge, display units. Placeholder 8' — mock-derived. */
  width?: number;
  /** Cat-cut depth of the ridge seam at mid-span, display units. Placeholder 2" — mock-derived. Ridge seam only. */
  ridge_sag?: number;
  /** Cat-cut depth of each eave at mid-span, display units. Placeholder 3" — mock-derived. */
  eave_sag?: number;
  /** Usable fabric width (selvedge to selvedge, less any unusable edge), display units. Placeholder 58" — mock-derived. */
  fabric_width?: number;
  /** Ridge seam allowance, mm (flat-felled). Placeholder 1/2" — mock-derived. */
  seam_allowance?: number;
  /** Finished hem depth on the ends and eaves, display units. Placeholder 1/2" — mock-derived. */
  hem_depth?: number;
  /** Double-fold rolled hem (default: silnylon frays, the roll encloses the raw edge) or the vault's single fold marked at double. */
  hem_fold?: HemFold;
  /** Floor every hem at 1/2" (the vault's production rule). Default false. */
  production_mode?: boolean;
  /** Tie-outs along each eave between the corners. Placeholder 1 (mid-eave) — mock-derived. */
  eave_tieouts?: number;
  /** Tie-outs at both ends of the ridge. Default true. */
  ridge_tieouts?: boolean;
  /** Side of the square reinforcement patch at each tie-out, display units. Placeholder 3" — mock-derived. */
  patch_size?: number;
  /** Grosgrain cut per tie-out loop, display units. Placeholder 5" — mock-derived. */
  loop_length?: number;
  /** Grosgrain width, display units. Placeholder 5/8" — mock-derived. */
  loop_width?: number;
  /** Ridgeline height for the pitch check (eaves staked to the ground), display units. Placeholder 42" — mock-derived. */
  ridge_height?: number;
}

export interface TieOut {
  id: string;
  kind: 'corner' | 'eave' | 'ridge';
  /** Finished point on the edge, in the panel's flat mm. */
  at: { x: number; y: number };
  /** Patch square, in the panel's flat mm (ridge patches: the half on this panel). */
  patch: { x0: number; y0: number; x1: number; y1: number };
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  construction: TarpConstruction;
  cut_style: TarpCutStyle;
  ridge_length: number;
  width: number;
  ridge_sag: number;
  eave_sag: number;
  fabric_width: number;
  seam_allowance: number;
  hem_depth: number;
  /** Requested hem depth before the production floor. */
  hem_depth_requested: number;
  hem_raised: boolean;
  hem_fold: HemFold;
  production_mode: boolean;
  eave_tieouts: number;
  ridge_tieouts: boolean;
  patch_size: number;
  loop_length: number;
  loop_width: number;
  ridge_height: number;
  // Derived
  /** Fabric beyond each finished hemmed edge (depth single, 2 × depth double). */
  hem_allowance: number;
  /** Mark line distance in from the raw edge (2 × hem depth). */
  hem_mark: number;
  panel_count: 1 | 2;
  /** Finished panel depth from the ridge stitch line (or eave) to the eave at the ends. */
  panel_finished_width: number;
  /** Finished panel depth at mid-span, after both cat cuts. */
  panel_mid_width: number;
  panel_cut_length: number;
  panel_cut_width: number;
  /** Fabric to buy: panels laid end to end along the roll. */
  fabric_length: number;
  ridge_curve_length: number;
  eave_curve_length: number;
  /** Tie-out loops on the whole tarp. */
  tieout_count: number;
  /** Panel angle from horizontal on the pitch check, degrees. */
  pitch_deg: number;
  /** Ground footprint across the ridge with the eaves staked, mm (0 when they cannot reach). */
  footprint_width: number;
  /** Eave height above the ground when the panel is too short to reach it, mm. */
  eave_clearance: number;
}

export type WarningSeverity = 'error' | 'warning' | 'info';
export interface GeneratorWarning { id: string; severity: WarningSeverity; message: string; field?: string }
export interface BuildPatternError { field: string; message: string }
export type ValidationResult = { ok: true } | { ok: false; errors: BuildPatternError[] };
export interface HardwareItem { id: string; name: string; quantity: number; notes?: string }
export interface TarpBuildResult { pieces: Piece[]; steps: Step[]; warnings: GeneratorWarning[]; hardware: HardwareItem[]; resolved: ResolvedInputs; tieouts: TieOut[] }
export interface BomRow { id: string; description: string; quantity: number; unit: string; notes?: string }
