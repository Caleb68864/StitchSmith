/**
 * Zip Pouch Generator — public entry point
 *
 * Re-exports the public API consumed by UI components and tests.
 */

export type { ZipPouchInputs, ZipPouchBuildResult, BomRow, ValidationResult } from './types.js';
export { validateInputs, resolveInputs } from './inputs.js';
export { buildPattern } from './buildPattern.js';
export { buildBom } from './bom.js';
export {
  DEFAULT_SEAM_ALLOWANCE_MM,
  DEFAULT_ZIP_GAUGE,
  DEFAULT_GROSGRAIN_WIDTH_MM,
  DEFAULT_PULL_LOOPS,
  DEFAULT_UNITS,
  DEFAULT_PRESET,
  PRESET_DEFAULTS,
  getPresetDimensions,
} from './defaults.js';
