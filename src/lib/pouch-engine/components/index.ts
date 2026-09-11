export type { FlapStyle, FlapSpec } from './flap.js';
export { defaultFlapSpec, validateFlapSpec } from './flap.js';
export type { ClosureStyle, ClosureSpec } from './closure.js';
export { defaultClosureSpec, validateClosureSpec } from './closure.js';
export type { AttachmentStyle, AttachmentSpec, AttachmentResult } from './attachment.js';
export {
  buildAttachment,
  palsRowCount,
  palsColumnCount,
  PALS_ROW_PITCH_MM,
  PALS_COLUMN_PITCH_MM,
  PALS_WEBBING_WIDTH_MM,
} from './attachment.js';
export type { DrainageStyle, DrainageSpec, DrainageResult } from './drainage.js';
export { buildDrainage, GROMMET_EXPOSURE_WARNING } from './drainage.js';
export type { RetentionStyle, RetentionSpec, RetentionResult } from './retention.js';
export { buildRetention, INTERIOR_LOOP_WIDTH_MM, HOOK_DOT_SIZE_MM } from './retention.js';
export type { CradleSpec, CradleResult } from './cradle.js';
export { buildCradles, CRADLE_DEFAULT_LENGTH_MM } from './cradle.js';
export type { FacePalsSpec, FacePalsResult } from './facePals.js';
export { buildFacePals, FACE_PALS_BARS_PER_CELL } from './facePals.js';
