/**
 * Gaiters (roadmap item 10e, apparel beyond the skirt: gaiters first) — types.
 *
 * One shaped piece per leg (cut as a mirrored pair): the flat development of
 * a tapered tube (`geometry/frustum.ts`) from the calf to over the boot,
 * opening down the front with a hook-and-loop overlap or a zipper, an
 * elastic channel at the top (the Hem primitive at the channel depth), a
 * hemmed bottom that drops at the front over the laces, an instep strap
 * under the boot and a lace hook at the front.
 *
 * Sewn fabrics only. NO VAULT NUMBERS: every length is a common starting
 * point in `PLACEHOLDERS`, flagged `mock-derived` until measured.
 * Lengths in display units except `seam_allowance` (mm). Convention B.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { HemFold } from '../../lib/pattern-engine/primitives/hem.js';

export type GaiterClosure = 'velcro' | 'zipper';

export interface GaiterInputs {
  units?: 'mm' | 'in';
  /** Height along the leg at the back, top edge to bottom edge, display units. Placeholder 12" — mock-derived. */
  height?: number;
  /** Round the calf at the top, over clothing, display units. Placeholder 15" — mock-derived. */
  top_circumference?: number;
  /** Round the boot at the bottom edge, display units. Placeholder 17" — mock-derived. */
  bottom_circumference?: number;
  /** How much lower the bottom edge sits at the front (over the laces) than at the back, display units. Placeholder 1.5" — mock-derived. */
  front_drop?: number;
  /** Hook-and-loop overlap (default) or a zipper down the front. */
  closure?: GaiterClosure;
  /** Hook-and-loop overlap width, display units. Placeholder 1" — mock-derived. Velcro only. */
  overlap?: number;
  /** Hem depth on the bottom (and the front edges for hook-and-loop), display units. Placeholder 1/2" — mock-derived. */
  hem_depth?: number;
  /** Top elastic channel depth, display units. Placeholder 3/4" — mock-derived. */
  channel_depth?: number;
  hem_fold?: HemFold;
  /** Top elastic cut length as a percentage of the top circumference. Placeholder 90 % — mock-derived. */
  elastic_pct?: number;
  /** Instep strap (cord or webbing) per gaiter, display units. Placeholder 9" — mock-derived. */
  instep_strap_length?: number;
  /** Usable fabric width, display units. Placeholder 58" — mock-derived. */
  fabric_width?: number;
  /** Seam allowance, mm, on the front edges where a zipper is sewn in. Placeholder 12.7 mm — mock-derived. */
  seam_allowance?: number;
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  height: number;
  top_circumference: number;
  bottom_circumference: number;
  front_drop: number;
  closure: GaiterClosure;
  overlap: number;
  hem_depth: number;
  channel_depth: number;
  hem_fold: HemFold;
  elastic_pct: number;
  instep_strap_length: number;
  fabric_width: number;
  seam_allowance: number;
  // Derived
  hem_allowance: number;
  channel_allowance: number;
  /** Allowance beyond each finished front edge: [underlap side, overlap side]. */
  front_allowance: [number, number];
  /** Front edge length, finished (top to the dropped bottom). */
  front_length: number;
  elastic_length: number;
  /** Cut bounding box of one gaiter, or NaN when the shape cannot be laid out. */
  cut_width: number;
  cut_height: number;
}

export type WarningSeverity = 'error' | 'warning' | 'info';
export interface GeneratorWarning { id: string; severity: WarningSeverity; message: string; field?: string }
export interface BuildPatternError { field: string; message: string }
export type ValidationResult = { ok: true } | { ok: false; errors: BuildPatternError[] };
export interface HardwareItem { id: string; name: string; quantity: number; notes?: string }
export interface GaiterBuildResult { pieces: Piece[]; steps: Step[]; warnings: GeneratorWarning[]; hardware: HardwareItem[]; resolved: ResolvedInputs }
export interface BomRow { id: string; description: string; quantity: number; unit: string; notes?: string }
