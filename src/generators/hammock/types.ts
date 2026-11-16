/**
 * Gathered-end hammock (roadmap item 10b) — types.
 *
 * One rectangle of fabric: the long sides hemmed (or left on the selvedge),
 * each end finished as a channel (a hem deep enough to take a cord) or as a
 * whipping tail (a rolled raw edge with a marked whip line), gathered and hung
 * on a structural ridgeline whose length is derived from the body length.
 *
 * Sewn fabrics only (owner decision 2026-11-16). NO VAULT NUMBERS: every
 * length here is a placeholder listed in `PLACEHOLDERS` with a `mock-derived`
 * note until it is checked against the vault.
 *
 * Lengths the user types are in the display unit except `seam_allowance`,
 * which is millimetres like every other generator's. Weights are in pounds
 * when the display unit is inches and kilograms when it is millimetres.
 *
 * Convention B: the body is drawn at CUT size with the hems and channels
 * baked in, explicit 0 on every edge, the channel stitch lines drawn.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { HemFold } from '../../lib/pattern-engine/primitives/hem.js';

export type HammockEndStyle = 'channel' | 'whipping';
export type HammockSideEdge = 'hem' | 'selvedge';

export interface HammockInputs {
  units?: 'mm' | 'in';
  /** Channel ends (default; a cord through each channel) or whipped ends. */
  end_style?: HammockEndStyle;
  /** Hemmed long sides (default) or the fabric's selvedge left as the edge. */
  side_edge?: HammockSideEdge;
  /** Finished length, gather to gather (channel crease or whip line), display units. Placeholder 132" (11') — mock-derived. */
  length?: number;
  /** Finished width across the body, display units. Placeholder 58" — mock-derived. */
  width?: number;
  /** Usable fabric width, display units. Placeholder 60" — mock-derived. */
  fabric_width?: number;
  /** Finished side hem depth, display units. Placeholder 1/2" — mock-derived. Also the rolled hem on a whipping tail. */
  side_hem_depth?: number;
  /** Finished channel depth (crease to stitch line), display units. Placeholder 1 1/4" — mock-derived. Channel ends only. */
  channel_depth?: number;
  /** Tail beyond each whip line, display units. Placeholder 3" — mock-derived. Whipping ends only. */
  whip_tail?: number;
  /** Rolled (default) or single fold marked at double, for the side hems and the channels. */
  hem_fold?: HemFold;
  /** Floor every hem at 1/2". Default false. */
  production_mode?: boolean;
  /** Structural ridgeline as a percentage of the finished length. Placeholder 83 % — mock-derived. */
  ridgeline_pct?: number;
  /** Seam allowance, mm. A gathered-end hammock has no joining seam, so it resolves to 0; accepted for the generator contract. */
  seam_allowance?: number;
  /** Heaviest occupant, lb (in) or kg (mm). Optional; with `fabric_rating` it drives the load check. */
  occupant_weight?: number;
  /** The fabric maker's rated load for a hammock of this fabric, lb (in) or kg (mm). Optional. */
  fabric_rating?: number;
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  end_style: HammockEndStyle;
  side_edge: HammockSideEdge;
  length: number;
  width: number;
  fabric_width: number;
  side_hem_depth: number;
  channel_depth: number;
  whip_tail: number;
  hem_fold: HemFold;
  production_mode: boolean;
  ridgeline_pct: number;
  seam_allowance: number;
  /** kg, or NaN when not entered. */
  occupant_kg: number;
  /** kg, or NaN when not entered. */
  rating_kg: number;
  // Derived
  /** Fabric beyond each finished long side (0 on a selvedge). */
  side_allowance: number;
  /** Fabric beyond each finished end: the channel's allowance, or the whip tail plus its rolled hem. */
  end_allowance: number;
  /** Production mode raised a hem. */
  hem_raised: boolean;
  cut_length: number;
  cut_width: number;
  /** Fabric to buy off the roll. */
  fabric_length: number;
  /** Fabric left across the roll after the body is cut. */
  fabric_trim: number;
  /** Structural ridgeline, finished eye to eye. */
  ridgeline_length: number;
}

export type WarningSeverity = 'error' | 'warning' | 'info';
export interface GeneratorWarning { id: string; severity: WarningSeverity; message: string; field?: string }
export interface BuildPatternError { field: string; message: string }
export type ValidationResult = { ok: true } | { ok: false; errors: BuildPatternError[] };
export interface HardwareItem { id: string; name: string; quantity: number; notes?: string }
export interface HammockBuildResult { pieces: Piece[]; steps: Step[]; warnings: GeneratorWarning[]; hardware: HardwareItem[]; resolved: ResolvedInputs }
export interface BomRow { id: string; description: string; quantity: number; unit: string; notes?: string }
