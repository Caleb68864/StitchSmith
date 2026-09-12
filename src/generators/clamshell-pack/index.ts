export type { ClamshellPackInputs, ResolvedInputs, ClamshellPackBuildResult, GeneratorWarning, BuildPatternError, ValidationResult, BomRow, HardwareItem, PocketGrid, StrapProvision } from './types.js';
export { buildPattern, FACE_ID, BACK_ID, GUSSET_ID, LID_STRIP_ID, BOTTOM_ID } from './buildPattern.js';
export type { Result } from './buildPattern.js';
export { validateInputs, resolveInputs, toMm } from './inputs.js';
export { buildBom } from './bom.js';
export { clamshellAssembly } from './assembly3d.js';
export * from './defaults.js';
