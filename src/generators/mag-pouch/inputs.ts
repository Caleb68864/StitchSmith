/**
 * Mag Pouch Generator — Input validation
 *
 * `validateInputs` is the single entry point for validating `MagPouchInputs`.
 * It returns either `{ ok: true }` or `{ ok: false; errors: Record<string,
 * string> }` where each key is a field name and the value is a human-readable
 * error message.
 */

import type { MagPouchInputs, ValidationResult } from './types.js';
import { getMagazine } from './magazines.js';
import {
  DEFAULT_EASE_WIDTH_IN,
  DEFAULT_EASE_DEPTH_IN,
  DEFAULT_EXPOSED_PERCENTAGE,
  DEFAULT_HOOK_LENGTH_IN,
  DEFAULT_LOOP_LENGTH_IN,
  DEFAULT_CLOSURE_OVERLAP_IN,
  DEFAULT_SEAM_ALLOWANCE_IN,
} from './defaults.js';

const VALID_SA: ReadonlySet<number> = new Set([0.25, 0.375, 0.5]);

const IN_TO_MM = 25.4;

function toIn(value: number, units: 'in' | 'mm'): number {
  return units === 'mm' ? value / IN_TO_MM : value;
}

/**
 * Validate `MagPouchInputs` and return a result object.
 *
 * The `errors` map keys are field names (`'width'`, `'thickness'`, etc.).
 * Multiple fields may fail simultaneously; all errors are collected.
 */
export function validateInputs(inputs: MagPouchInputs): ValidationResult {
  const errors: Record<string, string> = {};

  // ── Magazine dimensions ──────────────────────────────────────────────────────

  if (inputs.magazine.mode === 'predefined') {
    const id = inputs.magazine.presetId;
    if (!id) {
      errors['presetId'] = 'presetId is required when magazine.mode is "predefined".';
    } else {
      const entry = getMagazine(id);
      if (!entry) {
        errors['presetId'] = `Unknown magazine preset "${id}". ` +
          'Use one of the predefined IDs from magazines.ts.';
      }
    }
  } else {
    // Custom mode — validate width, thickness, height
    const { width, thickness, height, units } = inputs.magazine;
    const u = units ?? 'in';

    if (width === undefined || !Number.isFinite(width) || width <= 0) {
      errors['width'] = 'width must be a positive finite number.';
    }
    if (thickness === undefined || !Number.isFinite(thickness) || thickness <= 0) {
      errors['thickness'] = 'thickness must be a positive finite number.';
    }
    if (height === undefined || !Number.isFinite(height) || height <= 0) {
      errors['height'] = 'height must be a positive finite number.';
    }

    // Convert NaN check (already covered above, but belt-and-suspenders for 0)
    if (width !== undefined && Number.isFinite(width) && width === 0) {
      errors['width'] = 'width must be greater than zero.';
    }
    if (thickness !== undefined && Number.isFinite(thickness) && thickness === 0) {
      errors['thickness'] = 'thickness must be greater than zero.';
    }
    if (height !== undefined && Number.isFinite(height) && height === 0) {
      errors['height'] = 'height must be greater than zero.';
    }
    void u; // units validated by type system
  }

  // ── Ease ─────────────────────────────────────────────────────────────────────

  const easeWidth = inputs.ease_width ?? DEFAULT_EASE_WIDTH_IN;
  const easeDepth = inputs.ease_depth ?? DEFAULT_EASE_DEPTH_IN;

  if (!Number.isFinite(easeWidth) || easeWidth < 0 || easeWidth > 1) {
    errors['ease_width'] =
      `ease_width must be a finite number in [0, 1"] (got ${easeWidth}).`;
  }
  if (!Number.isFinite(easeDepth) || easeDepth < 0 || easeDepth > 1) {
    errors['ease_depth'] =
      `ease_depth must be a finite number in [0, 1"] (got ${easeDepth}).`;
  }

  // ── Exposed percentage ───────────────────────────────────────────────────────

  const exposedPct = inputs.exposed_percentage ?? DEFAULT_EXPOSED_PERCENTAGE;
  if (!Number.isFinite(exposedPct) || exposedPct < 0.40 || exposedPct > 1.0) {
    errors['exposed_percentage'] =
      `exposed_percentage must be in [0.40, 1.0] (got ${exposedPct}).`;
  }

  // ── Seam allowance ───────────────────────────────────────────────────────────

  const sa = inputs.seamAllowance ?? DEFAULT_SEAM_ALLOWANCE_IN;
  if (!VALID_SA.has(sa as number)) {
    errors['seamAllowance'] =
      `seamAllowance must be one of 0.25, 0.375, or 0.5 (got ${sa}).`;
  }

  // ── Closure parameters ───────────────────────────────────────────────────────

  const hookLen = inputs.hook_length ?? DEFAULT_HOOK_LENGTH_IN;
  const loopLen = inputs.loop_length ?? DEFAULT_LOOP_LENGTH_IN;
  const overlap = inputs.closure_overlap ?? DEFAULT_CLOSURE_OVERLAP_IN;

  if (!Number.isFinite(hookLen) || hookLen < 0) {
    errors['hook_length'] = `hook_length must be a non-negative finite number (got ${hookLen}).`;
  }
  if (!Number.isFinite(loopLen) || loopLen < 0) {
    errors['loop_length'] = `loop_length must be a non-negative finite number (got ${loopLen}).`;
  }
  if (!Number.isFinite(overlap) || overlap < 0) {
    errors['closure_overlap'] =
      `closure_overlap must be a non-negative finite number (got ${overlap}).`;
  }

  // Flap length constraint checks
  const flapLen = inputs.flap_length;
  if (flapLen !== undefined) {
    if (!Number.isFinite(flapLen) || flapLen <= 0) {
      errors['flap_length'] =
        `flap_length must be a positive finite number (got ${flapLen}).`;
    } else {
      if (Number.isFinite(hookLen) && hookLen > flapLen) {
        errors['hook_length'] =
          `hook_length (${hookLen}") must not exceed flap_length (${flapLen}").`;
      }
      if (Number.isFinite(loopLen) && loopLen > flapLen) {
        errors['loop_length'] =
          `loop_length (${loopLen}") must not exceed flap_length (${flapLen}").`;
      }
    }
  }

  // overlap must not exceed min(hook, loop)
  if (
    Number.isFinite(hookLen) &&
    Number.isFinite(loopLen) &&
    Number.isFinite(overlap)
  ) {
    const minHL = Math.min(hookLen, loopLen);
    if (overlap > minHL) {
      errors['closure_overlap'] =
        `closure_overlap (${overlap}") must not exceed min(hook_length, loop_length) = ${minHL}".`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}
