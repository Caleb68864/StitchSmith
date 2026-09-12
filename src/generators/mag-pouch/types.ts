/**
 * Mag Pouch Generator — Type Definitions
 *
 * All public types for the mag-pouch generator.  Magazine dimensions are stored
 * in inches in `magazines.ts` and converted to mm at the input boundary.
 */

import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { MagazinePlatform } from './magazines.js';

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
  /** Platform for a custom magazine (drives cell span, AK hem, .308 handling). Default 'custom'. */
  platform?: MagazinePlatform;
}

// ─── Construction / Retention / Attachment / Drainage ─────────────────────────

/**
 * folded_t     — one-piece folded body (front → bottom → back, wings fold round
 *                the sides); single cell; seam-allowance construction.
 * pleated_card — SOE card: hemmed back panel + folded double face pleated into
 *                N cells; hems baked in, no seam allowance offset.
 */
export type MagPouchConstruction = 'folded_t' | 'pleated_card';

/** How a pleated-card cell bottom is closed. */
export type BottomStyle = 'cradle' | 'pleat' | 'open';

/**
 * Retention styles.
 *   flap_*          — lid folded over the mag top (integral with the back)
 *   open_top_bungee — bungee laced through face bars with a pull tab
 *   velcro_dot      — interior loop both walls + 1" hook square on the mag
 *   kydex_wedge     — interior loop both walls + bought platform-keyed wedge
 *   none            — friction only (cell depth is the retention)
 */
export type RetentionStyle =
  | 'flap_velcro'
  | 'flap_snap'
  | 'flap_fastex'
  | 'open_top_bungee'
  | 'velcro_dot'
  | 'kydex_wedge'
  | 'none';

export type AttachmentStyle =
  | 'pals'
  | 'molle'
  | 'malice'
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
  /** Bottom drainage — folded_t only (the card's cradle/open bottoms drain by nature). */
  drainage: DrainageStyle;
  /** Seam allowance in inches (folded_t).  Must be one of the three allowed values. */
  seamAllowance: SeamAllowance;
  /** Construction method. Default 'folded_t'. */
  construction?: MagPouchConstruction;
  /** Cells side by side (pleated_card). Default 1. folded_t requires 1. */
  cell_count?: number;
  /**
   * Finished span of one cell across the back, inches. Derived when omitted:
   * PALS mounts snap to a multiple of 1.5" (3.0" rifle, 4.5" for .308); other
   * mounts use magazine width + ease.
   */
  cell_span?: number;
  /**
   * Face fabric per cell, inches (pleated_card). Derived when omitted:
   * mag_width + 2 × mag_thickness + face_ease (≈ 4.875" for a rifle mag).
   */
  face_per_cell?: number;
  /** Cell bottom (pleated_card). Default 'cradle'. */
  bottom_style?: BottomStyle;
  /** Back panel hem, inches (pleated_card). Default 1.0. */
  back_hem?: number;
  /** Face end hem, inches (pleated_card). Default 0.5. */
  face_end_hem?: number;
  /** Hem the face raw-edge meeting (+0.75" face). Default true for AK, false otherwise. */
  ak_face_hem?: boolean;
  /** Three 1" PALS bars per cell on the face (pleated_card). Default true; forced on by bungee retention. */
  face_pals?: boolean;
  /** Line both interior walls of every cell with loop (pleated_card). Default true. */
  interior_loop?: boolean;
  /** Lateral ease added to the magazine width (inches). Default: 0.25". */
  ease_width?: number;
  /** Front-to-back ease added to the magazine depth (inches). Default: 0.25". */
  ease_depth?: number;
  /**
   * Coverage: fraction of magazine height INSIDE the pouch (the pouch is this
   * fraction of the mag height; the rest stands proud for the grab).
   * Range [0.40, 1.0].  Default: 0.70.  Key kept for project-file compatibility.
   */
  exposed_percentage?: number;
  /** Length of the hook-side velcro strip (inches).  Default: 3". */
  hook_length?: number;
  /** Length of the loop-side velcro strip (inches).  Default: hook + 1" travel = 4". */
  loop_length?: number;
  /** How far the lid closure reaches down the face (inches).  Default: 2.5". */
  closure_overlap?: number;
  /**
   * Total lid length (inches).  Derived when omitted: 2 × exposed mag height
   * (up behind the mag and back down to the mouth) + cell depth + closure_overlap.
   * hook_length and loop_length must not exceed it.
   */
  flap_length?: number;
  /** Grommet size identifier.  Default: '#0'. */
  grommet_size?: string;
  /**
   * One-piece lid pull channel: the lid tip folds back on itself to form a finger
   * channel (inches, added to the lid length). Default 1.5" for a Velcro lid, 0 for
   * other lids. 1" was the too-small sample (rigs/subgun-lid-pull-channel.md).
   */
  pull_channel_depth?: number;
  /**
   * Hourglass aesthetic: the side seams are inset an extra 1/4" per side so the
   * empty pouch pinches in. Purely cosmetic and costs labour; default off
   * (mag-pouches/mag-pouch-hourglass-aesthetic.md).
   */
  hourglass_aesthetic?: boolean;
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
  | 'wedge'
  | 'clip'
  | 'other';

/**
 * How a cut length should be treated on the bench (vault
 * reference/technique-stitch-shrinkage.md): Velcro and long webbing runs draw
 * in as they are sewn, so they are cut long and trimmed after.
 */
export type CutTag = 'cut-to-net' | 'trim-after-sew' | 'mock-derived';

export interface MagPouchBomMaterial {
  id: string;
  name: string;
  type: MagPouchMaterialType;
  notes?: string;
  /** Cut width in mm, when the material is a strip. */
  cutWidthMm?: number;
  /** Cut length in mm, when the material is a strip. */
  cutLengthMm?: number;
  quantity?: number;
  cutTag?: CutTag;
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

/** One row of the cut list (a pattern piece with its cut envelope). */
export interface MagPouchCutPiece {
  id: string;
  name: string;
  widthMm: number;
  sizeMm: number;
  quantity: number;
  notes?: string;
}

/** Numbers the generator derived, surfaced so the builder can sanity-check them. */
export interface MagPouchDerived {
  construction: MagPouchConstruction;
  platform: MagazinePlatform;
  cellCount: number;
  /** Cell span on the back, inches. */
  cellSpanIn: number;
  /** PALS columns the back spans (pals/molle mounts). */
  palsColumns: number;
  /** Face fabric per cell, inches (pleated_card). */
  facePerCellIn?: number;
  /** Pucker per side, inches (pleated_card). */
  puckerPerSideIn?: number;
  /** Finished pouch/card height, inches. */
  pouchHeightIn: number;
  /** Magazine standing proud of the mouth, inches. */
  exposedHeightIn: number;
  /** Lid length, inches (0 when no lid). */
  flapLengthIn: number;
  /** Back PALS rows that fit. */
  palsRows: number;
  /** Worst-case layer count the machine must sew through. */
  maxLayers: number;
  /** True when bungee retention commits the pouch to one platform. */
  caliberLocked: boolean;
}

// ─── Build result ──────────────────────────────────────────────────────────────

export interface MagPouchBuildResult {
  pattern: Pattern;
  warnings: string[];
  bom: MagPouchBom;
  steps: Step[];
  cutPieces: MagPouchCutPiece[];
  derived: MagPouchDerived;
}

// ─── Validation ────────────────────────────────────────────────────────────────

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };
