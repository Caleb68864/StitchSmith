export type { HammockInputs, ResolvedInputs, HammockBuildResult, GeneratorWarning, BuildPatternError, ValidationResult, BomRow, HardwareItem, HammockEndStyle, HammockSideEdge } from './types.js';
export { buildPattern, bodyGeometry, BODY_ID, FABRIC_ID, NET_ID, MESH_ID } from './buildPattern.js';
export type { Result, BodyGeometry } from './buildPattern.js';
export { validateInputs, resolveInputs, toMm, toKg } from './inputs.js';
export { buildBom } from './bom.js';
export * from './defaults.js';
