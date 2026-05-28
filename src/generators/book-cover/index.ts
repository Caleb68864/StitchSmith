export type {
  BookCoverInputs,
  ResolvedInputs,
  BookCoverBuildResult,
  PocketConfig,
  PenHolderConfig,
  ClosureConfig,
  LiningConfig,
  CardSlotsConfig,
  BookmarkRibbonConfig,
  InternalZipPocketConfig,
  MeshPocketConfig,
  TacticalConfig,
  ResolvedTacticalConfig,
  InterfacingKind,
  ZipperGauge,
  ElasticTension,
  BuildPatternError,
  Bom,
  Result,
} from './types.js';

export { buildPattern } from './buildPattern.js';
export { validateInputs, resolveInputs, toMm } from './inputs.js';
export { buildBom } from './bom.js';
export {
  DEFAULT_SEAM_ALLOWANCE_MM,
  DEFAULT_TOP_BOTTOM_HEM_MM,
  DEFAULT_PEN_HOLDER_HEIGHT_MM,
  BOOK_PRESETS,
  FOLDOVER_PRESETS,
  ZIPPER_GAUGE_DEFAULTS,
  CLOSURE_DEFAULTS,
  LINING_DEFAULTS,
  CARD_SLOTS_DEFAULTS,
  BOOKMARK_RIBBON_DEFAULTS,
  INTERNAL_ZIP_POCKET_DEFAULTS,
  MESH_POCKET_DEFAULTS,
  TACTICAL_DEFAULTS,
} from './defaults.js';
export type {
  BookPreset,
  FoldoverPreset,
  ZipperGaugeDefaults,
} from './defaults.js';
