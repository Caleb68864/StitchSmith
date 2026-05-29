/**
 * Circle Skirt Generator — Type Definitions
 */

// ─── Presets ────────────────────────────────────────────────────────────────────

export type CircleSkirtPreset = 'quarter' | 'half' | 'full' | 'double' | 'custom';

export type ClosureType = 'side-zip' | 'back-zip' | 'elastic';

export type WaistbandType = 'straight' | 'elastic-casing';

// ─── Generator inputs ───────────────────────────────────────────────────────────

export interface CircleSkirtInputs {
  /** Finished waist circumference in mm (or inches when units = 'in'). No ease included. */
  waist_circumference?: number;
  /** Skirt length from waist to hem in mm. */
  skirt_length?: number;
  /** Total sweep angle in degrees. Default 360. */
  sweep_angle_deg?: number;
  /** Waist ease to add to circumference in mm. Default 20. */
  waist_ease?: number;
  /** Closure type. Default 'side-zip'. */
  closure?: ClosureType;
  /** Waistband construction type. Default 'straight'. */
  waistband_type?: WaistbandType;
  /** Straight waistband height in mm. Default 25. */
  band_height?: number;
  /** Elastic width for casing in mm. Default 25. */
  elastic_width?: number;
  /** Seam allowance in mm. Default 15. SA=0 is valid. */
  seam_allowance?: number;
  /** Hem allowance in mm. Default 20. */
  hem_allowance?: number;
  /** Fabric width in mm. Default 1524 (60"). */
  fabric_width?: number;
  /** Unit system for user-facing inputs. Default 'in'. */
  units?: 'mm' | 'in';
  /** Size/fullness preset. */
  preset?: CircleSkirtPreset;
  /** Hip circumference in mm (used for elastic-casing). If not provided, derived from waist+100. */
  hip_circumference?: number;
}

// ─── Resolved (fully defaulted + derived) inputs ───────────────────────────────

export interface ResolvedInputs {
  waist_circumference: number;
  skirt_length: number;
  sweep_angle_deg: number;
  waist_ease: number;
  closure: ClosureType;
  waistband_type: WaistbandType;
  band_height: number;
  elastic_width: number;
  seam_allowance: number;
  hem_allowance: number;
  fabric_width: number;
  units: 'mm' | 'in';
  preset: CircleSkirtPreset;
  hip_circumference: number;
  /** Effective waist used for r calculation (waist+ease for zip; hip for elastic). */
  effective_waist: number;
  /** Inner (waist) radius — finished, no SA. */
  r: number;
  /** Outer (hem) radius — finished, no SA. */
  R: number;
  /** Cut inner radius (r − seam_allowance, min 1). */
  cut_inner_r: number;
  /** Cut outer radius (R + hem_allowance). */
  cut_outer_r: number;
  /** Sweep angle per panel in degrees. */
  panel_sweep_deg: number;
  /** Number of panels. */
  num_panels: number;
}

// ─── BOM ────────────────────────────────────────────────────────────────────────

export interface BomRow {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  notes?: string;
}

// ─── Errors / warnings ─────────────────────────────────────────────────────────

export interface BuildPatternError {
  field: string;
  message: string;
}

// ─── Validation result ──────────────────────────────────────────────────────────

export type ValidationResult =
  | { ok: true; warnings: string[] }
  | { ok: false; errors: BuildPatternError[]; warnings: string[] };

// ─── Generic result ─────────────────────────────────────────────────────────────

export type Result<T> =
  | { ok: true; value: T; warnings: string[] }
  | { ok: false; errors: BuildPatternError[]; warnings: string[] };
