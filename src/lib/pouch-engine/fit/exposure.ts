/**
 * exposed_percentage – the fraction of the carried object's height that
 * the pouch encases.  1.0 = full coverage; 0.75 = three-quarters, etc.
 *
 * This multiplier is applied to `CarriedObject.height` during the
 * `internalDimensions` pipeline step to compute `internal_height`.
 */
export type ExposedPercentage = number; // 0 < n ≤ 1.0

/** Default exposure: the pouch encloses the full object height. */
export const DEFAULT_EXPOSED_PERCENTAGE: ExposedPercentage = 1.0;

/**
 * Validate that an `exposed_percentage` value is in the half-open interval
 * (0, 1].  Returns an array of error strings (empty = valid).
 */
export function validateExposedPercentage(pct: unknown): string[] {
  if (typeof pct !== 'number' || !Number.isFinite(pct)) {
    return [`exposed_percentage must be a finite number (got ${pct})`];
  }
  if (pct <= 0 || pct > 1) {
    return [`exposed_percentage must be in the range (0, 1] (got ${pct})`];
  }
  return [];
}
