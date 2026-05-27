/**
 * Mag Pouch Generator — Type Definitions
 *
 * All public types for the mag-pouch generator.  Magazine dimensions are stored
 * in inches in `magazines.ts` and converted to mm at the input boundary.
 */

import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';

// ─── Magazine spec ─────────────────────────────────────────────────────────────

export type Units = 'in' | 'mm';

export interface MagazineSpec {
  mode: 'predefined' | 'custom';
  /** Required when mode === 'predefined'. Must be a key in `magazines.ts`. */
  presetId?: string;
  /** Custom width (mode === 'custom'); unit determined by `units`. */
  width?: number;
  /** Custom thickness (mode === 'custom'); unit determined by `units`. */
  thickness?: number;
  /** Custom height (mode === 'custom'); unit determined by `units`. */
  height?: number;
  units: Units;
}

// ─── Retention / Attachment / Drainage ────────────────────────────────────────

/**
 * Retention styles available in v1.
 * NOTE: `removable_flap` is intentionally excluded from this union.  Adding it
 * requires coordinated updates to the engine and UI; it must not be silently
 * added here without those changes.
 */
export type RetentionStyle =
  | 'flap_velcro'
  | 'flap_snap'
  | 'flap_fastex'
  | 'open_top_bungee';

export type AttachmentStyle =
  | 'pals'
  | 'molle'
  | 'belt_loop'
  | 'alice'
  | 'velcro_panel';

export type DrainageStyle = 'open_corner' | 'sewn_closed' | 'grommet';

/** Valid seam allowance values (inches). */
export type SeamAllowance = 0.25 | 0.375 | 0.5;

// ─── Generator inputs ──────────────────────────────────────────────────────────

export interface MagPouchInputs {
  magazine: MagazineSpec;
  retention: RetentionStyle;
  attachment: AttachmentStyle;
  drainage: DrainageStyle;
  /** Seam allowance in inches.  Must be one of the three allowed values. */
  seamAllowance: SeamAllowance;
  /** Lateral ease added to the magazine width (inches). Default: 0.25". */
  ease_width?: number;
  /** Front-to-back ease added to the magazine depth (inches). Default: 0.25". */
  ease_depth?: number;
  /**
   * Fraction of magazine height that remains exposed above the pouch opening.
   * Range [0.40, 1.0].  Default: 0.70.
   */
  exposed_percentage?: number;
  /** Length of the hook-side velcro strip (inches).  Default: 3". */
  hook_length?: number;
  /** Length of the loop-side velcro strip (inches).  Default: 4". */
  loop_length?: number;
  /** Overlap of closure hardware (inches).  Default: 2.5". */
  closure_overlap?: number;
  /**
   * Total flap length (inches).  Computed from `exposed_percentage` when omitted.
   * hook_length and loop_length must not exceed this value.
   */
  flap_length?: number;
  /** Grommet size identifier.  Default: '#0'. */
  grommet_size?: string;
}

// ─── BOM types ─────────────────────────────────────────────────────────────────

export type MagPouchMaterialType =
  | 'fabric'
  | 'webbing'
  | 'velcro-hook'
  | 'velcro-loop'
  | 'cord'
  | 'other';

export type MagPouchHardwareType =
  | 'snap'
  | 'fastex'
  | 'cord-lock'
  | 'grommet'
  | 'buckle'
  | 'other';

export interface MagPouchBomMaterial {
  id: string;
  name: string;
  type: MagPouchMaterialType;
  notes?: string;
}

export interface MagPouchBomHardware {
  id: string;
  name: string;
  type: MagPouchHardwareType;
  quantity: number;
  notes?: string;
}

export interface MagPouchBom {
  materials: MagPouchBomMaterial[];
  hardware: MagPouchBomHardware[];
}

// ─── Build result ──────────────────────────────────────────────────────────────

export interface MagPouchBuildResult {
  pattern: Pattern;
  warnings: string[];
  bom: MagPouchBom;
  steps: Step[];
}

// ─── Validation ────────────────────────────────────────────────────────────────

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };
