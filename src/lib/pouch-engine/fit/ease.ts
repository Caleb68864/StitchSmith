import type { CarriedObject } from '../object/CarriedObject.js';

/** Named fit styles that map to default ease values. */
export type FitStyle = 'snug' | 'standard' | 'relaxed';

/** Resolved ease values, all in mm. */
export interface EaseValues {
  width_ease: number;
  depth_ease: number;
  height_ease: number;
}

/** Default ease (mm) for each named fit style. */
export const easeDefaults: Record<FitStyle, EaseValues> = {
  snug: { width_ease: 2, depth_ease: 2, height_ease: 0 },
  standard: { width_ease: 6, depth_ease: 6, height_ease: 0 },
  relaxed: { width_ease: 12, depth_ease: 10, height_ease: 0 },
};

/**
 * Resolve ease values for a given fit style, merging any explicit
 * per-axis overrides supplied by the caller.
 */
export function resolveEase(
  fitStyle: FitStyle = 'standard',
  overrides: Partial<EaseValues> = {},
): EaseValues {
  const base = easeDefaults[fitStyle];
  return {
    width_ease: overrides.width_ease ?? base.width_ease,
    depth_ease: overrides.depth_ease ?? base.depth_ease,
    height_ease: overrides.height_ease ?? base.height_ease,
  };
}

/**
 * Validate that ease values are non-negative and finite.
 * Returns an array of error strings (empty = OK).
 */
export function validateEase(ease: EaseValues, _obj?: CarriedObject): string[] {
  const errors: string[] = [];
  for (const [key, val] of Object.entries(ease)) {
    if (!Number.isFinite(val) || val < 0) {
      errors.push(`ease.${key} must be a finite non-negative number (got ${val})`);
    }
  }
  return errors;
}
