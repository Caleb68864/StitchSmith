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
 * Half-cross panel geometry. Two of these join at the straight zipper edge, at
 * the top (centre-of-bottom) seam, and down both side arms.
 *
 * The panel has three regions, separated by FOLDS (continuous fabric) at
 * `x = C`, `x = W − C` and `y = C`:
 *   - half the bag bottom: the narrow band above the cutouts
 *   - the face:            the centre of the wide band
 *   - two end arms:        the wide band either side of the face
 *
 * Because those boundaries are folds, the cutout `C` must absorb the seam
 * allowance on the outer edges — every dimension below is fold-to-fold:
 *
 *   arm finished width   = C − sa            and two arms make one end,
 *                                            so 2(C − sa) = finished_depth
 *                                            → C = finished_depth / 2 + sa
 *   face finished width  = W − 2C            = finished_length
 *                                            → W = finished_length + finished_depth + 2·sa
 *   half-bottom depth    = C − sa            = finished_depth / 2
 *   face finished height = H − C − sa        = finished_width
 *                                            → H = finished_width + finished_depth/2 + 2·sa
 *
 * `cornerCutout`, `panelCutWidth` and `halfCrossHeight` are therefore a single
 * coupled system — changing one without the others throws off every finished
 * dimension. The width formula in particular only balances when C includes sa.
 */
export function crossBottomDims(r: ResolvedInputs): CrossBottomDims {
  const sa = r.seam_allowance;
  return {
    cornerCutout: r.finished_depth / 2 + sa,
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

/**
 * The steps say to fold each tab in half over the zipper end and sew it down,
 * so the cut height must survive BOTH operations: halving, then losing `sa` to
 * the seam. Cutting `finished + sa` left only `(finished − sa) / 2` after the
 * fold — 2.5 mm at the default 10 mm allowance, and negative at 15.875 mm
 * (5/8", a value this generator accepts). `2 · (finished + sa)` folds to
 * `finished + sa` and finishes at exactly `finished`.
 */
export function zipperEndTabDims(r: ResolvedInputs): ZipperEndTabDims {
  return {
    width: r.finished_depth + 2 * r.seam_allowance,
    height: 2 * (ZIPPER_END_TAB_FINISHED_HEIGHT + r.seam_allowance),
  };
}

// ─── zipper length ───────────────────────────────────────────────────────────

/** Zipper tape length for a given opening width, rounded up to a stock length. */
export function zipperLengthFor(openingWidth: number): number {
  return roundUpTo(openingWidth + 25, 50);
}

/**
 * Zipper length for the style actually being built. Both the BOM row and the
 * instruction step must quote this same number — they drifted apart once
 * already when each computed its own.
 *
 * Every style uses `zipperLengthFor(<the cut width the zipper spans>)`.
 * Multi-panel previously used `frontBackWidth + 4·sa` instead, which had no
 * derivation behind it and disagreed with the other three styles; it was
 * dropped deliberately (reference inputs: 300 mm → 250 mm). Do not reinstate a
 * per-style term here without a stated reason — the zipper spans the top
 * opening in all four styles, and end tabs are cut as their own pieces.
 */
export function zipperLengthForStyle(r: ResolvedInputs): number {
  switch (r.construction_style) {
    case 'cross-bottom':
      return zipperLengthFor(crossBottomDims(r).panelCutWidth);
    case 'gusset-strip':
      return zipperLengthFor(gussetStripDims(r).panelCutWidth);
    case 'multi-panel':
      return zipperLengthFor(multiPanelDims(r).frontBackWidth);
    default:
      return zipperLengthFor(boxedDims(r).cutWidth);
  }
}
