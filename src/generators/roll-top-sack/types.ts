import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { Material } from '../../lib/pattern-engine/materials/Material.js';
import type { Hardware } from '../../lib/pattern-engine/materials/Hardware.js';

export interface RollTopSackInputs {
  bottom_length: number;
  bottom_width: number;
  height_when_rolled: number;
  collar_height?: number;
  seam_allowance?: number;
  units: 'mm' | 'in';
}

export interface ResolvedInputs {
  bottom_length: number;
  bottom_width: number;
  height_when_rolled: number;
  collar_height: number;
  seam_allowance: number;
  units: 'mm' | 'in';
}

export interface Bom {
  materials: Material[];
  hardware: Hardware[];
  notes: string[];
}

export interface RollTopSackBuildResult {
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
