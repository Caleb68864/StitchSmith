/**
 * Beanie (roadmap 10e, apparel) — types.
 *
 * A crown of N gores developed from an ellipsoid dome (base circumference
 * = head + ease, height = the crown height), joined to a folded cuff band
 * or finished with a hem. No drafting engine needed: the gores are the flat
 * development of the dome's meridian strips.
 *
 * Measurements are user inputs; the placeholders are flagged `mock-derived`
 * starting points, never a size chart (none is sourced). Lengths in display
 * units except `seam_allowance` (mm). Convention B.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';

export type BeanieFinish = 'cuff' | 'hem';

export interface BeanieInputs {
  units?: 'mm' | 'in';
  /** Round the head at the brow, display units. Placeholder 22" — mock-derived (measure). */
  head_circumference?: number;
  /** Added to the head circumference (negative for a snug stretch fabric), display units. Placeholder −1" — mock-derived. */
  ease?: number;
  /** Finished crown height, brim seam to top, display units. Placeholder 7" — mock-derived. */
  crown_height?: number;
  /** Number of gores. Placeholder 6 — mock-derived. */
  gores?: number;
  /** A folded cuff band (default) or a hemmed edge. */
  finish?: BeanieFinish;
  /** Finished cuff height (folded), display units. Placeholder 2.5" — mock-derived. Cuff only. */
  cuff_height?: number;
  /** Hem depth, display units. Placeholder 1/2" — mock-derived. Hem only. */
  hem_depth?: number;
  /** Seam allowance, mm. Placeholder 9.5 mm (3/8") — mock-derived. */
  seam_allowance?: number;
}

export interface GoreSample {
  /** Distance up the gore's centre line from the base, mm (meridian arc length). */
  s: number;
  /** Half the gore's width there, mm. */
  half: number;
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  head_circumference: number;
  ease: number;
  crown_height: number;
  gores: number;
  finish: BeanieFinish;
  cuff_height: number;
  hem_depth: number;
  seam_allowance: number;
  // Derived
  /** Finished circumference at the base (head + ease). */
  circumference: number;
  /** Gore length up its centre line, base to apex, mm. */
  gore_length: number;
  /** Gore width at the base, mm. */
  gore_base: number;
  samples: GoreSample[];
  /** Hem allowance beyond the base on a hemmed beanie, 0 with a cuff. */
  base_allowance: number;
}

export type WarningSeverity = 'error' | 'warning' | 'info';
export interface GeneratorWarning { id: string; severity: WarningSeverity; message: string; field?: string }
export interface BuildPatternError { field: string; message: string }
export type ValidationResult = { ok: true } | { ok: false; errors: BuildPatternError[] };
export interface HardwareItem { id: string; name: string; quantity: number; notes?: string }
export interface BeanieBuildResult { pieces: Piece[]; steps: Step[]; warnings: GeneratorWarning[]; hardware: HardwareItem[]; resolved: ResolvedInputs }
export interface BomRow { id: string; description: string; quantity: number; unit: string; notes?: string }
