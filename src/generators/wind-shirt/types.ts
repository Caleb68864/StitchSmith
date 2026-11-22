/**
 * Wind shirt (roadmap 10f step 4): a pullover with set-in sleeves on the
 * drafting engine — bodice block (`drafting/bodice.ts`) for the back and
 * front, sleeve block (`drafting/sleeve.ts`) solved against its armhole, a
 * quarter zip at the front neck, a bound neck, a hemmed body and elastic
 * cuff channels.
 *
 * Measurements are the wearer's inputs. The default project leaves them
 * empty and drafts from an EXAMPLE body (one person, not a size chart; none
 * is sourced), named in the one `mock-derived` note until replaced. Lengths
 * in display units except `seam_allowance` (mm). Convention B.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { MeasurementKey } from '../../lib/pattern-engine/drafting/measurements.js';

export type ShirtBody = 'straight' | 'shaped';

export type WindShirtInputs = Partial<Record<MeasurementKey, number>> & {
  units?: 'mm' | 'in';
  /** Straight body (default: the side seam runs straight down at the eased chest) or shaped to the waist and hip. */
  body?: ShirtBody;
  ease_chest?: number;
  ease_waist?: number;
  ease_hip?: number;
  ease_neck?: number;
  ease_bicep?: number;
  ease_wrist?: number;
  /** Shoulder point below the neck point, display units. Placeholder 1.75" — mock-derived. */
  shoulder_drop?: number;
  /** Sleeve cap length over the armhole, display units. Placeholder 1/2" — mock-derived. */
  cap_ease?: number;
  hem_depth?: number;
  cuff_channel?: number;
  /** Cuff elastic as a percentage of the body wrist. Placeholder 85 % — mock-derived. */
  elastic_pct?: number;
  zip_length?: number;
  binding_width?: number;
  fabric_width?: number;
  seam_allowance?: number;
};

export interface SeamLengths {
  /** One side: back shoulder vs front shoulder. */
  shoulder: [number, number];
  side: [number, number];
  /** One side: back armhole + front armhole vs the sleeve cap. */
  armhole: number;
  cap: number;
  underseam: [number, number];
  /** Whole neckline (back + front, both sides) vs the binding's sew length. */
  neckline: number;
  binding: number;
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  body: ShirtBody;
  shoulder_drop: number;
  cap_ease: number;
  hem_depth: number;
  cuff_channel: number;
  elastic_pct: number;
  zip_length: number;
  binding_width: number;
  fabric_width: number;
  seam_allowance: number;
  /** Measurements as drafted (display-unit inputs, or the example body). */
  measurements: Record<MeasurementKey, number>;
  ease: Record<'chest' | 'waist' | 'hip' | 'neck' | 'bicep' | 'wrist', number>;
  hem_allowance: number;
  cuff_allowance: number;
  elastic_length: number;
}

export type WarningSeverity = 'error' | 'warning' | 'info';
export interface GeneratorWarning { id: string; severity: WarningSeverity; message: string; field?: string }
export interface BuildPatternError { field: string; message: string }
export type ValidationResult = { ok: true } | { ok: false; errors: BuildPatternError[] };
export interface HardwareItem { id: string; name: string; quantity: number; notes?: string }
export interface WindShirtBuildResult { pieces: Piece[]; steps: Step[]; warnings: GeneratorWarning[]; hardware: HardwareItem[]; resolved: ResolvedInputs; seams: SeamLengths }
export interface BomRow { id: string; description: string; quantity: number; unit: string; notes?: string }
