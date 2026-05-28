/**
 * Mag Pouch Generator — Public API
 *
 * Usage:
 *   import { buildPattern, validateInputs } from './generators/mag-pouch/index.js';
 *   const result = buildPattern(inputs);
 */

export { buildPattern, detectAkProfile, AK_WARNING_COPY } from './buildPattern.js';
export { validateInputs } from './inputs.js';
export { toPouchSpec } from './toPouchSpec.js';
export { magazines, getMagazine, MAGAZINE_IDS } from './magazines.js';
export type { MagazineEntry as Magazine } from './magazines.js';
export { AK_MAGAZINES, AK_THRESHOLD_HEIGHT_IN, AK_THRESHOLD_THICKNESS_IN } from './unsupportedMagazines.js';
export {
  DEFAULT_EASE_WIDTH_IN,
  DEFAULT_EASE_DEPTH_IN,
  DEFAULT_EXPOSED_PERCENTAGE,
  DEFAULT_SEAM_ALLOWANCE_IN,
  DEFAULT_HOOK_LENGTH_IN,
  DEFAULT_LOOP_LENGTH_IN,
  DEFAULT_CLOSURE_OVERLAP_IN,
  DEFAULT_GROMMET_SIZE,
} from './defaults.js';
export type {
  MagPouchInputs,
  MagPouchBuildResult,
  MagPouchBom,
  MagPouchBomMaterial,
  MagPouchBomHardware,
  MagPouchMaterialType,
  MagPouchHardwareType,
  ValidationResult,
  RetentionStyle,
  AttachmentStyle,
  DrainageStyle,
  SeamAllowance,
  Units,
  MagazineSpec,
} from './types.js';
export {
  MAG_STEP_CUT,
  MAG_STEP_ASSEMBLE,
  MAG_STEP_ATTACH,
  MAG_STEP_FINISH,
} from './steps.js';
