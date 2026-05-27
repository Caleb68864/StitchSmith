/**
 * Boxed-gusset construction strategy — STUB.
 *
 * Boxed gusset uses a separate rectangular gusset panel that wraps around the
 * bottom and two sides of the pouch, joined to the front and back panels.
 * This results in precise interior dimensions and clean corner geometry.
 *
 * This strategy is not yet implemented.  Calling it throws {@link NotImplementedError}.
 */

import type { ConstructionStrategy } from './ConstructionStrategy.js';
import { NotImplementedError } from './ConstructionStrategy.js';

export interface BoxedGussetDefaults {
  /** Seam allowance for the gusset join in mm. */
  gusset_seam_allowance: number;
  /** Corner treatment for the bottom corners. */
  bottom_corner_treatment: 'square' | 'boxed' | 'trimmed';
  exposed_percentage: number;
  flap_length_pct: number;
}

export const boxedGussetDefaults: Partial<BoxedGussetDefaults> = {
  gusset_seam_allowance: 9.5,
  bottom_corner_treatment: 'square',
  exposed_percentage: 1.0,
  flap_length_pct: 0.4,
};

export const boxedGusset: ConstructionStrategy = function boxedGusset(_spec) {
  throw new NotImplementedError('boxed_gusset');
};
