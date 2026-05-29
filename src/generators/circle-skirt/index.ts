export type {
  CircleSkirtInputs,
  ResolvedInputs,
  BomRow,
  BuildPatternError,
  ValidationResult,
  Result,
} from './types.js';

export type { CircleSkirtBuildResult } from './buildPattern.js';

export { buildPattern } from './buildPattern.js';
export { buildBom } from './bom.js';
export { validateInputs, resolveInputs } from './inputs.js';
export {
  DEFAULT_SWEEP_ANGLE_DEG,
  DEFAULT_WAIST_EASE_MM,
  DEFAULT_CLOSURE,
  DEFAULT_WAISTBAND_TYPE,
  DEFAULT_BAND_HEIGHT_MM,
  DEFAULT_ELASTIC_WIDTH_MM,
  DEFAULT_SEAM_ALLOWANCE_MM,
  DEFAULT_HEM_ALLOWANCE_MM,
  DEFAULT_FABRIC_WIDTH_MM,
  DEFAULT_UNITS,
  DEFAULT_PRESET,
  PRESET_SWEEP_ANGLES,
  getPresetSweepAngle,
} from './defaults.js';
