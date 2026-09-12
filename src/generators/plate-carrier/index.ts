export type { PlateCarrierInputs, ResolvedInputs, PlateCarrierBuildResult, GeneratorWarning, BuildPatternError, ValidationResult, BomRow, HardwareItem, PlatePreset, PlateCut, FrontField, BackField, CummerbundStyle, SidePlate, QrBuckle, ShoulderStyle } from './types.js';
export { buildPattern, FRONT_SHELL_ID, BACK_SHELL_ID, FRONT_POCKET_ID, BACK_POCKET_ID, POCKET_FLAP_ID, SHOULDER_PAD_ID, SHOULDER_WEBBING_ID, CUMMERBUND_ID, CUMMERBUND_LAMINATE_ID, SIDE_PLATE_POCKET_ID, LOOP_FIELD_ID } from './buildPattern.js';
export type { Result } from './buildPattern.js';
export { validateInputs, resolveInputs, toMm, plateOutline } from './inputs.js';
export { buildBom } from './bom.js';
export { plateCarrierAssembly, STRAP_LEFT_ID, STRAP_RIGHT_ID, CB_LEFT_ID, CB_RIGHT_ID } from './assembly3d.js';
export type { PlateCarrierAssembly } from './assembly3d.js';
export * from './defaults.js';
