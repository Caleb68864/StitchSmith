import type { Piece } from '../../pattern-engine/graph/Piece.js';
import type { Step } from '../../pattern-engine/instructions/Step.js';
import type { CarriedObject } from '../object/CarriedObject.js';
import type { FitParams } from '../fit/index.js';
import type { FlapSpec } from '../components/flap.js';
import type { ClosureSpec } from '../components/closure.js';

/** The construction methods supported by the pouch engine. */
export type ConstructionMethod =
  | 'folded_t'
  | 'pleated_card'
  | 'boxed_gusset'
  | 'center_gusset'
  | 'taco';

/** How the bottom of a pleated-card cell is closed. */
export type CardBottomStyle = 'cradle' | 'pleat' | 'open';

/**
 * Parameters for the `pleated_card` construction — a hemmed back panel with a
 * folded, double-layer face pleated into N side-by-side cells (the SOE
 * "4-pack single rifle mag card"). All values in mm.
 *
 * Every dimension here is a FINISHED dimension except the hems; the strategy
 * derives cut sizes as `finished + hems` (hems fold once, raw edge to a mark
 * at twice the hem depth). See `docs` in the vault:
 * mag-pouches/mag-pouch-4pack-single-dimensions.md.
 */
export interface PleatedCardParams {
  /** Number of side-by-side cells. */
  cellCount: number;
  /** Finished span of one cell across the back panel. */
  cellSpan: number;
  /** Face fabric consumed per cell (span + pucker each side). */
  facePerCell: number;
  /** Finished card height — how deep the object sits. */
  cardHeight: number;
  /** Single-fold hem on every back-panel edge. */
  backHem: number;
  /** Single-fold hem on each face end. */
  faceEndHem: number;
  /**
   * Extra face height, hemmed over where the two raw edges meet at the cell
   * bottom (the AK variant). 0 leaves the raw edges meeting unhemmed.
   */
  faceBottomHem: number;
  /** Lid length above the card, cut integral with the back. 0 = open top. */
  flapLength: number;
  bottomStyle: CardBottomStyle;
  /** Object height standing proud of the mouth, mm — places the lid creases. Default 0 (none). */
  exposedHeight?: number;
  /** Object depth the lid wraps over the top, mm. Default 0. */
  objectDepth?: number;
}

/** Full specification passed to `buildPouch` and to each strategy. */
export interface PouchSpec {
  object: CarriedObject;
  fit?: Partial<FitParams>;
  construction: ConstructionMethod;
  /** Uniform seam allowance in mm (applied to all cut edges). */
  seamAllowance: number;
  units?: 'mm';
  flap?: FlapSpec;
  closure?: ClosureSpec;
  /** Required when `construction === 'pleated_card'`. */
  card?: PleatedCardParams;
}

/** Value returned by `buildPouch`. */
export interface PouchResult {
  pattern: import('../../pattern-engine/graph/Pattern.js').Pattern;
  warnings: string[];
  /** Strategy assembly steps, in build order. */
  steps: Step[];
}

/**
 * Every construction strategy must conform to this signature.
 *
 * @param spec - The full {@link PouchSpec} including resolved fit parameters.
 * @returns    Flat pieces and assembly steps for the chosen construction method.
 */
export interface ConstructionStrategy {
  (spec: PouchSpec): { pieces: Piece[]; steps: Step[]; warnings: string[] };
}

/**
 * Raised by stub strategies that have not yet been implemented.
 * The message MUST contain the construction method name.
 */
export class NotImplementedError extends Error {
  override name = 'NotImplementedError';

  constructor(method: ConstructionMethod) {
    super(
      `Construction method '${method}' is not yet implemented. ` +
        `Consider using 'folded_t' which is fully supported.`,
    );
  }
}
