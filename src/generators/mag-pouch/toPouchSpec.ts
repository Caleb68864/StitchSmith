/**
 * Mag Pouch Generator — toPouchSpec
 *
 * Converts `MagPouchInputs` into the engine-agnostic `PouchSpec` consumed by
 * `buildPouch()`.  All measurements are converted to millimetres here.
 */

import type { MagPouchInputs } from './types.js';
import type { PouchSpec } from '../../lib/pouch-engine/construction/ConstructionStrategy.js';
import { getMagazine } from './magazines.js';
import {
  DEFAULT_EASE_WIDTH_IN,
  DEFAULT_EASE_DEPTH_IN,
  DEFAULT_EXPOSED_PERCENTAGE,
  DEFAULT_HOOK_LENGTH_IN,
} from './defaults.js';

const IN_TO_MM = 25.4;

function inToMm(inches: number): number {
  return inches * IN_TO_MM;
}

/**
 * Resolve magazine dimensions (in inches) from `MagPouchInputs`.
 * Returns `{ width, thickness, height }` in inches.
 *
 * @throws {Error} if the preset ID is unknown.
 */
function resolveMagazineDimsIn(inputs: MagPouchInputs): {
  width: number;
  thickness: number;
  height: number;
} {
  if (inputs.magazine.mode === 'predefined') {
    const id = inputs.magazine.presetId!;
    const entry = getMagazine(id);
    if (!entry) {
      throw new Error(
        `Unknown magazine preset "${id}". ` +
          'Use one of the predefined IDs from magazines.ts.',
      );
    }
    return { width: entry.width, thickness: entry.thickness, height: entry.height };
  }

  // Custom mode
  const { width, thickness, height, units } = inputs.magazine;
  const u = units ?? 'in';

  if (width === undefined || thickness === undefined || height === undefined) {
    throw new Error(
      'Custom magazine must specify width, thickness, and height.',
    );
  }

  // Normalise to inches for consistent downstream handling
  const toIn = (v: number) => (u === 'mm' ? v / IN_TO_MM : v);
  return {
    width: toIn(width),
    thickness: toIn(thickness),
    height: toIn(height),
  };
}

/**
 * Convert `MagPouchInputs` to a `PouchSpec` ready for the pouch engine.
 *
 * - Magazine dimensions (inches) are converted to mm.
 * - Ease values (inches) are applied to object width and depth.
 * - Seam allowance (inches) is converted to mm.
 * - Construction method is always `'folded_t'` for v1.
 * - A square flap is generated for flap-retention styles; bungee gets no flap.
 */
export function toPouchSpec(inputs: MagPouchInputs): PouchSpec {
  const magIn = resolveMagazineDimsIn(inputs);

  const easeWidthIn = inputs.ease_width ?? DEFAULT_EASE_WIDTH_IN;
  const easeDepthIn = inputs.ease_depth ?? DEFAULT_EASE_DEPTH_IN;
  const exposedPct = inputs.exposed_percentage ?? DEFAULT_EXPOSED_PERCENTAGE;
  const saIn = inputs.seamAllowance;
  const hookLenIn = inputs.hook_length ?? DEFAULT_HOOK_LENGTH_IN;

  // Object dimensions: bare magazine dimensions in mm.
  // Ease is passed separately via `fit.width_ease` / `fit.depth_ease` so the
  // engine applies it during the calculation pipeline, not here.
  const objectWidth = inToMm(magIn.width);
  const objectDepth = inToMm(magIn.thickness);
  const objectHeight = inToMm(magIn.height);

  // Flap length is based on the closure hook length as a minimum
  // (the flap must be long enough to accommodate the hook strip + overlap)
  const flapLengthIn = inputs.flap_length ?? hookLenIn;
  const flapLengthMm = inToMm(flapLengthIn);

  // Build flap spec for retention styles that have a flap
  const hasFLap =
    inputs.retention === 'flap_velcro' ||
    inputs.retention === 'flap_snap' ||
    inputs.retention === 'flap_fastex';

  const spec: PouchSpec = {
    object: {
      width: objectWidth,
      depth: objectDepth,
      height: objectHeight,
    },
    fit: {
      width_ease: inToMm(easeWidthIn),
      depth_ease: inToMm(easeDepthIn),
      height_ease: 0,
      exposed_percentage: exposedPct,
    },
    construction: 'folded_t',
    seamAllowance: inToMm(saIn),
    units: 'mm',
    flap: hasFLap
      ? { style: 'square', length_mm: flapLengthMm }
      : { style: 'none' },
  };

  return spec;
}
