/**
 * Flap component specification for the pouch engine.
 *
 * A flap is the material that extends beyond the top opening of a pouch
 * and folds over to retain the carried object.  It may be integrated into
 * the body piece (as a fold region) or cut as a separate piece.
 */

export type FlapStyle = 'square' | 'rounded' | 'pointed' | 'none';

export interface FlapSpec {
  /** Visual / structural shape of the flap's free edge. */
  style: FlapStyle;
  /**
   * How tall the flap extends beyond the pouch opening in mm.
   * Required when `style !== 'none'`.
   */
  length_mm?: number;
  /**
   * Corner radius in mm, applicable when style is 'rounded'.
   * Defaults to `length_mm / 4` when omitted.
   */
  corner_radius_mm?: number;
}

/** Default flap specification (no flap). */
export const defaultFlapSpec: FlapSpec = {
  style: 'none',
};

/**
 * Validate a FlapSpec, returning an array of error strings.
 * An empty array means the spec is valid.
 */
export function validateFlapSpec(flap: FlapSpec): string[] {
  const errors: string[] = [];
  if (flap.style !== 'none') {
    if (flap.length_mm === undefined) {
      errors.push(
        `flap.length_mm is required when flap.style is '${flap.style}'`,
      );
    } else if (!Number.isFinite(flap.length_mm) || flap.length_mm <= 0) {
      errors.push(
        `flap.length_mm must be a positive finite number (got ${flap.length_mm})`,
      );
    }
    if (
      flap.corner_radius_mm !== undefined &&
      (!Number.isFinite(flap.corner_radius_mm) || flap.corner_radius_mm < 0)
    ) {
      errors.push(
        `flap.corner_radius_mm must be a non-negative finite number (got ${flap.corner_radius_mm})`,
      );
    }
  }
  return errors;
}
