export type { GaiterInputs, ResolvedInputs, GaiterBuildResult, GeneratorWarning, BuildPatternError, ValidationResult, BomRow, HardwareItem, GaiterClosure } from './types.js';
export { buildPattern, shapeOf, GAITER_ID, FABRIC_ID } from './buildPattern.js';
export type { Result } from './buildPattern.js';
export { gaiterShape } from './geometry.js';
export { validateInputs, resolveInputs, toMm } from './inputs.js';
export { buildBom } from './bom.js';
export * from './defaults.js';
export { gaiterAssembly } from './assembly3d.js';
export type { GaiterAssembly } from './assembly3d.js';
