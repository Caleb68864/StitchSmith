import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { Material } from '../../lib/pattern-engine/materials/Material.js';
import type { Hardware } from '../../lib/pattern-engine/materials/Hardware.js';

export interface PocketConfig {
  width: number;
  height: number;
  position?: 'front' | 'back';
}

export interface PenHolderConfig {
  count: number;
  slot_width: number;
  height?: number;
}

export type ZipperGauge = '#3' | '#5' | '#10';
export type ElasticTension = 'light' | 'standard' | 'firm';

export type ClosureConfig =
  | { kind: 'none' }
  | { kind: 'zipper'; gauge: ZipperGauge; corner_radius?: number }
  | { kind: 'elastic'; width_mm?: number; tension?: ElasticTension; attach_offset?: number }
  | { kind: 'snap'; count?: number }
  | { kind: 'flap-buckle'; strap_width?: number; buckle_size?: number };

export type InterfacingKind = 'fusible' | 'sew-in' | 'hdpe' | 'eva' | 'none';

export interface LiningConfig {
  enabled: boolean;
  interfacing?: InterfacingKind;
  fabric?: string;
}

export interface CardSlotsConfig {
  count: number;
  slot_height?: number;
}

export interface BookmarkRibbonConfig {
  count: number;
  width_mm?: number;
}

export interface InternalZipPocketConfig {
  width?: number;
  height?: number;
  gauge?: ZipperGauge;
}

export interface MeshPocketConfig {
  width?: number;
  height?: number;
}

export interface TacticalConfig {
  enabled: boolean;
  velcro_panel_width?: number;
  velcro_panel_height?: number;
}

export interface ResolvedTacticalConfig {
  enabled: boolean;
  velcro_panel_width: number;
  velcro_panel_height: number;
}

export interface BookCoverInputs {
  book_height?: number;
  book_width?: number;
  spine_width?: number;
  flap_depth?: number;
  seam_allowance?: number;
  units: 'mm' | 'in';
  book_preset?: string;
  foldover_preset?: 'tactical' | 'civilian';
  width_ease?: number;
  spine_bulge?: number;
  is_hardcover?: boolean;
  outer_pocket?: PocketConfig;
  inner_pocket?: PocketConfig;
  pen_holder?: PenHolderConfig;
  closure?: ClosureConfig;
  lining?: LiningConfig;
  card_slots?: CardSlotsConfig;
  bookmark_ribbon?: BookmarkRibbonConfig;
  internal_zip_pocket?: InternalZipPocketConfig;
  mesh_pocket?: MeshPocketConfig;
  tactical?: TacticalConfig;
}

export interface ResolvedInputs {
  book_height: number;
  book_width: number;
  spine_width: number;
  flap_depth: number;
  seam_allowance: number;
  top_bottom_hem: number;
  units: 'mm' | 'in';
  book_preset?: string;
  foldover_preset?: 'tactical' | 'civilian';
  width_ease: number;
  spine_bulge: number;
  is_hardcover: boolean;
  outer_pocket?: PocketConfig;
  inner_pocket?: PocketConfig;
  pen_holder?: PenHolderConfig;
  closure?: ClosureConfig;
  lining?: LiningConfig;
  card_slots?: CardSlotsConfig;
  bookmark_ribbon?: BookmarkRibbonConfig;
  internal_zip_pocket?: InternalZipPocketConfig;
  mesh_pocket?: MeshPocketConfig;
  tactical?: ResolvedTacticalConfig;
}

export interface Bom {
  materials: Material[];
  hardware: Hardware[];
  notes: string[];
}

export interface BookCoverBuildResult {
  pieces: Piece[];
  steps: Step[];
  bom: Bom;
  warnings: string[];
}

export interface BuildPatternError {
  kind: 'invalid-inputs';
  message: string;
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
