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
