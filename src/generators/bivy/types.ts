/**
 * Bathtub-floor bivy (roadmap item 10d) — types.
 *
 * Four pieces: a bathtub floor whose sides rise a tub height all round with
 * folded (seamless) corners, a top panel sewn to the tub's top edge, and two
 * end gussets (head and foot) that close the arch the wider top makes over
 * the floor. A side zipper in the top-to-tub seam from the head.
 *
 * Sewn fabrics only (owner decision 2026-11-16). NO VAULT NUMBERS: every
 * length is a placeholder listed in `PLACEHOLDERS` with a `mock-derived` note.
 *
 * Lengths are display units except `seam_allowance` (mm). Convention B: every
 * piece at cut size with the allowance baked in, explicit 0 on every edge, the
 * sew lines drawn.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';

export type BivyHeadGusset = 'mesh' | 'fabric';
export type BivyZipSide = 'left' | 'right';

export interface BivyInputs {
  units?: 'mm' | 'in';
  /** Finished floor length inside, display units. Placeholder 84" — mock-derived. */
  length?: number;
  /** Finished floor width, display units. Placeholder 26" — mock-derived. */
  floor_width?: number;
  /** Tub side height, display units. Placeholder 5" — mock-derived. */
  tub_height?: number;
  /** Finished width of the top panel laid flat (edge to edge across the arch), display units. Placeholder 40" — mock-derived. */
  top_width?: number;
  /** Side zipper from the head corner along one long seam, display units. Placeholder 48" — mock-derived. */
  zip_length?: number;
  /** Usable fabric width, display units. Placeholder 58" — mock-derived. */
  fabric_width?: number;
  /** Seam allowance, mm. Placeholder 12.7 mm — mock-derived. */
  seam_allowance?: number;
  /** Head gusset in no-see-um mesh (default) or the top fabric. */
  head_gusset?: BivyHeadGusset;
  /** Which long side the zipper is on, lying on your back looking up. Default left. */
  zip_side?: BivyZipSide;
}

export interface ArchSegment {
  /** Radius of the circular arch, mm. */
  radius: number;
  /** Angle the arc subtends, radians. */
  theta: number;
  /** Rise of the arch above its chord, mm. */
  rise: number;
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  length: number;
  floor_width: number;
  tub_height: number;
  top_width: number;
  zip_length: number;
  fabric_width: number;
  seam_allowance: number;
  head_gusset: BivyHeadGusset;
  zip_side: BivyZipSide;
  // Derived
  /** The end arch: an arc of the top width over a chord of the floor width, or null when it cannot close. */
  arch: ArchSegment | null;
  /** Inside height at the middle of the head end: tub height + arch rise. */
  head_height: number;
  floor_cut_length: number;
  floor_cut_width: number;
  top_cut_length: number;
  top_cut_width: number;
  /** Gusset cut bounding box. */
  gusset_cut_width: number;
  gusset_cut_height: number;
}

export type WarningSeverity = 'error' | 'warning' | 'info';
export interface GeneratorWarning { id: string; severity: WarningSeverity; message: string; field?: string }
export interface BuildPatternError { field: string; message: string }
export type ValidationResult = { ok: true } | { ok: false; errors: BuildPatternError[] };
export interface HardwareItem { id: string; name: string; quantity: number; notes?: string }
export interface BivyBuildResult { pieces: Piece[]; steps: Step[]; warnings: GeneratorWarning[]; hardware: HardwareItem[]; resolved: ResolvedInputs }
export interface BomRow { id: string; description: string; quantity: number; unit: string; notes?: string }
