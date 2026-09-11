/**
 * Mag Pouch Generator — toPouchSpec
 *
 * Converts `MagPouchInputs` into the engine-agnostic `PouchSpec` consumed by
 * `buildPouch()`.  All measurements are converted to millimetres here; every
 * derived number comes from `resolveMagPouch` so the spec, the BOM and the
 * step text agree.
 */

import type { MagPouchInputs } from './types.js';
import type { PouchSpec, PleatedCardParams } from '../../lib/pouch-engine/construction/ConstructionStrategy.js';
import { resolveMagPouch, akFaceHemIn, inToMm, type ResolvedMagPouch } from './resolve.js';

/** Build the pleated-card parameter block (mm) from a resolved pouch. */
export function toCardParams(r: ResolvedMagPouch): PleatedCardParams {
  return {
    cellCount: r.cellCount,
    cellSpan: inToMm(r.cellSpanIn),
    facePerCell: inToMm(r.facePerCellIn),
    cardHeight: inToMm(r.pouchHeightIn),
    backHem: inToMm(r.backHemIn),
    faceEndHem: inToMm(r.faceEndHemIn),
    faceBottomHem: inToMm(akFaceHemIn(r)),
    flapLength: inToMm(r.flapLengthIn),
    bottomStyle: r.bottomStyle,
    exposedHeight: inToMm(r.exposedHeightIn),
    objectDepth: inToMm(r.cellDepthIn),
  };
}

/**
 * Convert `MagPouchInputs` to a `PouchSpec` ready for the pouch engine.
 *
 * - `object` is the bare magazine in mm; ease travels in `fit`.
 * - For a PALS mount the width ease is widened so the internal width lands on
 *   the 1.5" grid (a rifle cell is 3", not 2.8").
 * - Coverage (`exposed_percentage`) is passed through unchanged: the engine
 *   computes `internal_height = object.height × coverage`.
 * - A lid is generated for flap retention styles; its length is derived from
 *   the exposed magazine height + cell depth + closure overlap.
 */
export function toPouchSpec(inputs: MagPouchInputs): PouchSpec {
  const r = resolveMagPouch(inputs);

  const spec: PouchSpec = {
    object: {
      width: inToMm(r.magIn.width),
      depth: inToMm(r.magIn.thickness),
      height: inToMm(r.magIn.height),
    },
    fit: {
      width_ease: inToMm(r.cellSpanIn - r.magIn.width),
      depth_ease: inToMm(r.easeDepthIn),
      height_ease: 0,
      exposed_percentage: r.coverage,
    },
    construction: r.construction,
    seamAllowance: inToMm(r.seamAllowanceIn),
    units: 'mm',
    flap: r.hasFlap
      ? { style: 'square', length_mm: inToMm(r.flapLengthIn) }
      : { style: 'none' },
  };

  if (r.construction === 'pleated_card') {
    spec.card = toCardParams(r);
  }

  return spec;
}
