/**
 * Zip Pouch Generator — shared cut dimensions
 *
 * Single source of truth for every construction style's cut geometry.
 * `buildPattern.ts` (what gets drawn) and `bom.ts` (what the cut list says)
 * both read from here so the two cannot drift apart.
 *
 * Convention: every dimension returned here is a CUT dimension with seam
 * allowance already baked in. Pieces built from these values therefore declare
 * explicit per-edge `seamAllowances: 0` so the exporter does not offset them a
 * second time.
 */

import type { ResolvedInputs } from './types.js';

/** Finished height of a zipper end tab, before seam allowance is added. */
export const ZIPPER_END_TAB_FINISHED_HEIGHT = 15;

export function roundUpTo(value: number, multiple: number): number {
  return Math.ceil(value / multiple) * multiple;
}

// ─── boxed (default) ─────────────────────────────────────────────────────────

export interface BoxedDims {
  cutWidth: number;
  cutHeight: number;
}

export function boxedDims(r: ResolvedInputs): BoxedDims {
  return {
    cutWidth: r.finished_length + 2 * r.seam_allowance,
    cutHeight: r.finished_width + r.finished_depth / 2 + r.seam_allowance,
  };
}

// ─── cross-bottom ────────────────────────────────────────────────────────────

export interface CrossBottomDims {
  /** Corner cutout, square, one at each top corner. */
  cornerCutout: number;
  /** Full panel width, including the two fold-up end arms. */
  panelCutWidth: number;
  /** Panel height: face + half the bag bottom + SA at the zipper and centre seam. */
  halfCrossHeight: number;
}

/**
 * Half-cross panel geometry. Two of these join at the straight zipper edge and
 * at the top (centre-of-bottom) seam.
 *
 * Height decomposes as:
 *   face             finished_width
 * + half the bottom  finished_depth / 2   (the band above the corner cutouts)
 * + zipper SA        seam_allowance
 * + centre-seam SA   seam_allowance
 *
 * The two panels are separate pieces joined across the bag bottom, so the top
 * edge is a seam and carries its own allowance — it is not a fold.
 */
export function crossBottomDims(r: ResolvedInputs): CrossBottomDims {
  const sa = r.seam_allowance;
  return {
    cornerCutout: r.finished_depth / 2,
    panelCutWidth: r.finished_length + r.finished_depth + 2 * sa,
    halfCrossHeight: r.finished_width + r.finished_depth / 2 + 2 * sa,
  };
}

// ─── gusset-strip ────────────────────────────────────────────────────────────

export interface GussetStripDims {
  panelCutWidth: number;
  panelCutHeight: number;
  gussetCutWidth: number;
  gussetCutHeight: number;
  /** Registration notches at the two U-gusset corners. */
  notchX1: number;
  notchX2: number;
  /** Front-zipper variant: the front panel split either side of the zipper. */
  frontTopHeight: number;
  frontBottomHeight: number;
  /** Front-zipper variant: gusset wrapping all four sides. */
  fullGussetWidth: number;
}

/**
 * Gusset-strip geometry.
 *
 * The U-shaped strip runs [SA][width][length][width][SA] across its width, so
 * the two corners — where the strip turns from the bag side onto the bottom —
 * sit at `sa + width` and `sa + width + length`.
 *
 * In the front-zipper variant the front panel is cut in two. Splitting creates
 * a new seam, so each strip carries SA on BOTH of its own long edges (the
 * gusset edge and the new zipper edge). The pair therefore totals
 * `finished_width + 4·sa`, not the unsplit panel's `finished_width + 2·sa`.
 */
export function gussetStripDims(r: ResolvedInputs): GussetStripDims {
  const sa = r.seam_allowance;
  return {
    panelCutWidth: r.finished_length + 2 * sa,
    panelCutHeight: r.finished_width + 2 * sa,
    gussetCutWidth: 2 * r.finished_width + r.finished_length + 2 * sa,
    gussetCutHeight: r.finished_depth + 2 * sa,
    notchX1: sa + r.finished_width,
    notchX2: sa + r.finished_width + r.finished_length,
    frontTopHeight: r.zip_from_top + 2 * sa,
    frontBottomHeight: r.finished_width - r.zip_from_top + 2 * sa,
    fullGussetWidth: 2 * r.finished_length + 2 * r.finished_width + 2 * sa,
  };
}

// ─── multi-panel ─────────────────────────────────────────────────────────────

export interface MultiPanelDims {
  frontBackWidth: number;
  frontBackHeight: number;
  bottomWidth: number;
  bottomHeight: number;
  endWidth: number;
  endHeight: number;
}

export function multiPanelDims(r: ResolvedInputs): MultiPanelDims {
  const sa = r.seam_allowance;
  return {
    frontBackWidth: r.finished_length + 2 * sa,
    frontBackHeight: r.finished_width + 2 * sa,
    bottomWidth: r.finished_length + 2 * sa,
    bottomHeight: r.finished_depth + 2 * sa,
    endWidth: r.finished_width + 2 * sa,
    endHeight: r.finished_depth + 2 * sa,
  };
}

// ─── zipper end tabs (gusset-strip + multi-panel) ────────────────────────────

export interface ZipperEndTabDims {
  width: number;
  height: number;
}

export function zipperEndTabDims(r: ResolvedInputs): ZipperEndTabDims {
  return {
    width: r.finished_depth + 2 * r.seam_allowance,
    height: ZIPPER_END_TAB_FINISHED_HEIGHT + r.seam_allowance,
  };
}

// ─── zipper length ───────────────────────────────────────────────────────────

/** Zipper tape length for a given opening width, rounded up to a stock length. */
export function zipperLengthFor(openingWidth: number): number {
  return roundUpTo(openingWidth + 25, 50);
}
