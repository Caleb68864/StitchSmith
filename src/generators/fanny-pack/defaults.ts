/** Fanny pack defaults. Body sizes are starting points (no vault cut list); the rules are SOE's. */
const IN = 25.4;
export const DEFAULT_UNITS = 'in' as const;
export const WIDTH_MM = 10 * IN;
export const HEIGHT_MM = 6 * IN;
export const DEPTH_MM = 3 * IN;
export const SEAM_ALLOWANCE_MM = 0.5 * IN;
/** The measured rule of thumb: a folded zipper lip consumes 1" beyond the finished edge. */
export const ZIPPER_LIP_MM = 1 * IN;
export const LID_ANGLE_DEG = 90;
/** Grommets sit at least this far from any seam so the ring clears the stitching. */
export const GROMMET_INSET_MM = 0.5 * IN;
export const GROMMET_PATCH_MM = 1.5 * IN;
export const BELT_MIN_MM = 28 * IN;
export const BELT_MAX_MM = 52 * IN;
/** Tail beyond the longest setting so the buckle and tri-glide have something to hold. */
export const BELT_TAIL_MM = 6 * IN;
/** Cord anchors sit this far below the top edge of the lid and body interiors. */
export const CORD_ANCHOR_DROP_MM = 1 * IN;
/** SOE's v1.5 rebuild added 3"/side and the lid still did not fall open; v2 added 4"/side. */
export const SOE_V15_EXTENSION_MM = 3 * IN;
export const SOE_V2_EXTENSION_MM = 4 * IN;
