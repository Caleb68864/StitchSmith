/**
 * Taco construction strategy — STUB.
 *
 * Taco construction folds a single piece in half (like a taco shell) and
 * stitches the two short ends to form the sides.  Produces a simple, fast
 * construction suitable for shallow pouches.
 *
 * This strategy is not yet implemented.  Calling it throws {@link NotImplementedError}.
 */

import type { ConstructionStrategy } from './ConstructionStrategy.js';
import { NotImplementedError } from './ConstructionStrategy.js';

export interface TacoDefaults {
  side_seam_allowance: number;
  exposed_percentage: number;
  flap_length_pct: number;
}

export const tacoDefaults: Partial<TacoDefaults> = {
  side_seam_allowance: 9.5,
  exposed_percentage: 1.0,
  flap_length_pct: 0.4,
};

export const taco: ConstructionStrategy = function taco(_spec) {
  throw new NotImplementedError('taco');
};
