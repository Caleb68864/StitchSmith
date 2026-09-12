export type {
  PaddedStrapInputs, ResolvedInputs, PaddedStrapBuildResult, GeneratorWarning, BuildPatternError, ValidationResult, BomRow,
  StrapMode, RoutingSide, StrapCurve, PadArchitecture, EdgeFinish, StrapHardware,
} from './types.js';
export { buildPattern, PAD_PIECE_ID, CROSS_STRAP_PIECE_ID, PALS_ROW_PIECE_ID, CHANNEL_BAR_PIECE_ID, CHANNEL_GAP_MM } from './buildPattern.js';
export type { Result } from './buildPattern.js';
export { validateInputs, resolveInputs, deriveTailLength, toMm } from './inputs.js';
export { buildBom } from './bom.js';
export * from './defaults.js';
