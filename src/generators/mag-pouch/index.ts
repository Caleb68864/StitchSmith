/**
 * Mag Pouch Generator — Public API
 *
 * Usage:
 *   import { buildPattern, validateInputs } from './generators/mag-pouch/index.js';
 *   const result = buildPattern(inputs);
 */

export { buildPattern, detectAkProfile, AK_WARNING_COPY, resolvedWarnings } from './buildPattern.js';
export { validateInputs, MAX_CELL_COUNT } from './inputs.js';
export { toPouchSpec, toCardParams } from './toPouchSpec.js';
export { resolveMagPouch, resolveMagazine, snapUpToGrid, gridError, isFlapRetention } from './resolve.js';
export type { ResolvedMagPouch } from './resolve.js';
export { magazines, getMagazine, MAGAZINE_IDS, PLATFORM_LABELS } from './magazines.js';
export type { MagazineEntry as Magazine, MagazinePlatform } from './magazines.js';
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
  DEFAULT_CONSTRUCTION,
  DEFAULT_CELL_COUNT,
  DEFAULT_FACE_EASE_IN,
  DEFAULT_BACK_HEM_IN,
  DEFAULT_FACE_END_HEM_IN,
  DEFAULT_BOTTOM_STYLE,
  PALS_PITCH_IN,
  RIFLE_CELL_SPAN_IN,
  R308_CELL_SPAN_IN,
} from './defaults.js';
export type {
  MagPouchInputs,
  MagPouchBuildResult,
  MagPouchBom,
  MagPouchBomMaterial,
  MagPouchBomHardware,
  MagPouchMaterialType,
  MagPouchHardwareType,
  MagPouchCutPiece,
  MagPouchDerived,
  MagPouchConstruction,
  BottomStyle,
  CutTag,
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
  MAG_STEP_LID_CLOSURE,
  MAG_STEP_BATCH_NOTE,
} from './steps.js';
