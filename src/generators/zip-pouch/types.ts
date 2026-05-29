/**
 * Zip Pouch Generator — Type Definitions
 */

import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';

// ─── Presets ────────────────────────────────────────────────────────────────────

export type ZipPouchPreset = 'pencil' | 'edc' | 'toiletry' | 'custom';

// ─── Construction styles ────────────────────────────────────────────────────────

export type ConstructionStyle = 'boxed' | 'cross-bottom' | 'gusset-strip' | 'multi-panel';

// ─── Zipper position ────────────────────────────────────────────────────────────

export type ZipperPosition = 'top' | 'front';

// ─── Generator inputs ───────────────────────────────────────────────────────────

export interface ZipPouchInputs {
  /** Finished interior length in mm (or inches when units = 'in'). */
  finished_length?: number;
  /** Finished interior width (height of bag face) in mm. */
  finished_width?: number;
  /** Finished interior depth (gusset / boxing) in mm. */
  finished_depth?: number;
  /** Unit system for user-facing dimension inputs. */
  units?: 'mm' | 'in';
  /** Seam allowance in mm. Default 10. SA=0 is valid. */
  seam_allowance?: number;
  /** YKK coil zipper gauge. Default '#3'. */
  zip_gauge?: '#3' | '#5';
  /** Grosgrain ribbon width in mm. Default 15.875 (5/8"). */
  grosgrain_width?: number;
  /** Whether to include grosgrain pull loops. Default true. */
  pull_loops?: boolean;
  /** Size preset. Default 'pencil'. */
  preset?: ZipPouchPreset;
  /** Construction method. Default 'boxed'. */
  construction_style?: ConstructionStyle;
  /** Zipper position (gusset-strip only). Default 'top'. */
  zipper_position?: ZipperPosition;
  /** Zipper placement from top in mm (front-zip only). */
  zip_from_top?: number;
}

// ─── Resolved (fully defaulted) inputs ─────────────────────────────────────────

export interface ResolvedInputs {
  finished_length: number;
  finished_width: number;
  finished_depth: number;
  units: 'mm' | 'in';
  seam_allowance: number;
  zip_gauge: '#3' | '#5';
  grosgrain_width: number;
  pull_loops: boolean;
  preset: ZipPouchPreset;
  construction_style: ConstructionStyle;
  zipper_position: ZipperPosition;
  zip_from_top: number;
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

export type Result<T> =
  | { ok: true; value: T; warnings: string[] }
  | { ok: false; errors: BuildPatternError[]; warnings: string[] };

// ─── Validation-only result ─────────────────────────────────────────────────────

export type ValidationResult =
  | { ok: true; warnings: string[] }
  | { ok: false; errors: BuildPatternError[]; warnings: string[] };

// ─── Build result ───────────────────────────────────────────────────────────────

export interface ZipPouchBuildResult {
  pattern: Pattern;
  warnings: string[];
  bom: BomRow[];
  steps: Step[];
}
