import type { Piece } from '../../pattern-engine/graph/Piece.js';
import type { Step } from '../../pattern-engine/instructions/Step.js';
import type { CarriedObject } from '../object/CarriedObject.js';
import type { FitParams } from '../fit/index.js';
import type { FlapSpec } from '../components/flap.js';
import type { ClosureSpec } from '../components/closure.js';

/** The four construction methods supported by the pouch engine. */
export type ConstructionMethod =
  | 'folded_t'
  | 'boxed_gusset'
  | 'center_gusset'
  | 'taco';

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
}

/** Value returned by `buildPouch`. */
export interface PouchResult {
  pattern: import('../../pattern-engine/graph/Pattern.js').Pattern;
  warnings: string[];
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
