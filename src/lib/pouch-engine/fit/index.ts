export type { FitStyle, EaseValues } from './ease.js';
export { easeDefaults, resolveEase, validateEase } from './ease.js';
export type { ExposedPercentage } from './exposure.js';
export { DEFAULT_EXPOSED_PERCENTAGE, validateExposedPercentage } from './exposure.js';

/**
 * Complete set of fit parameters a caller may supply.
 * All numeric values are in mm (or dimensionless fraction for
 * `exposed_percentage`).
 */
export interface FitParams {
  width_ease: number;
  depth_ease: number;
  height_ease: number;
  fit_style?: import('./ease.js').FitStyle;
  exposed_percentage?: number;
}
