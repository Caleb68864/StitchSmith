/**
 * Center-gusset construction strategy — STUB.
 *
 * Center gusset places a gusset strip along the bottom center of the pouch,
 * with the front and back panels stitched to it.  Useful for wider, flatter
 * pouches where a boxed gusset would be overkill.
 *
 * This strategy is not yet implemented.  Calling it throws {@link NotImplementedError}.
 */

import type { ConstructionStrategy } from './ConstructionStrategy.js';
import { NotImplementedError } from './ConstructionStrategy.js';

export interface CenterGussetDefaults {
  gusset_width_mm: number;
  gusset_seam_allowance: number;
  exposed_percentage: number;
  flap_length_pct: number;
}

export const centerGussetDefaults: Partial<CenterGussetDefaults> = {
  gusset_seam_allowance: 9.5,
  exposed_percentage: 1.0,
  flap_length_pct: 0.4,
};

export const centerGusset: ConstructionStrategy = function centerGusset(_spec) {
  throw new NotImplementedError('center_gusset');
};
