/**
 * Zip Pouch Generator — Input validation and resolution
 *
 * `validateInputs` enforces all constraints from Requirements 3–4.
 * `resolveInputs` fills in defaults from the selected preset and global defaults.
 */

import type {
  ZipPouchInputs,
  ResolvedInputs,
  ValidationResult,
  BuildPatternError,
} from './types.js';
import {
  DEFAULT_SEAM_ALLOWANCE_MM,
  DEFAULT_ZIP_GAUGE,
  DEFAULT_GROSGRAIN_WIDTH_MM,
  DEFAULT_PULL_LOOPS,
  DEFAULT_UNITS,
  DEFAULT_PRESET,
  getPresetDimensions,
} from './defaults.js';

const VALID_ZIP_GAUGES = new Set(['#3', '#5']);

/**
 * Merge preset dimension defaults with user-supplied overrides to produce
 * fully-resolved inputs. Does NOT run validation — call `validateInputs`
 * after (or before) as needed.
 */
export function resolveInputs(inputs: ZipPouchInputs): ResolvedInputs {
  const preset = inputs.preset ?? DEFAULT_PRESET;
  const presetDims = getPresetDimensions(preset);

  const finished_length =
    inputs.finished_length ?? presetDims?.finished_length ?? NaN;
  const finished_width =
    inputs.finished_width ?? presetDims?.finished_width ?? NaN;
  const finished_depth =
    inputs.finished_depth ?? presetDims?.finished_depth ?? NaN;

  return {
    preset,
    finished_length,
    finished_width,
    finished_depth,
    units: inputs.units ?? DEFAULT_UNITS,
    seam_allowance: inputs.seam_allowance ?? DEFAULT_SEAM_ALLOWANCE_MM,
    zip_gauge: inputs.zip_gauge ?? DEFAULT_ZIP_GAUGE,
    grosgrain_width: inputs.grosgrain_width ?? DEFAULT_GROSGRAIN_WIDTH_MM,
    pull_loops: inputs.pull_loops ?? DEFAULT_PULL_LOOPS,
  };
}

/**
 * Validate a `ZipPouchInputs` object (resolving defaults internally).
 *
 * Errors are hard failures; warnings are advisory and do not block export.
 * Returns `{ ok: true, warnings }` or `{ ok: false, errors, warnings }`.
 */
export function validateInputs(inputs: ZipPouchInputs): ValidationResult {
  const resolved = resolveInputs(inputs);
  const errors: BuildPatternError[] = [];
  const warnings: string[] = [];

  // ── Dimension fields ───────────────────────────────────────────────────────────

  if (
    resolved.finished_length === undefined ||
    !Number.isFinite(resolved.finished_length) ||
    resolved.finished_length <= 0
  ) {
    errors.push({
      field: 'finished_length',
      message:
        resolved.preset === 'custom'
          ? 'finished_length is required for the custom preset and must be a positive finite number.'
          : 'finished_length must be a positive finite number.',
    });
  }

  if (
    resolved.finished_width === undefined ||
    !Number.isFinite(resolved.finished_width) ||
    resolved.finished_width <= 0
  ) {
    errors.push({
      field: 'finished_width',
      message:
        resolved.preset === 'custom'
          ? 'finished_width is required for the custom preset and must be a positive finite number.'
          : 'finished_width must be a positive finite number.',
    });
  }

  if (
    resolved.finished_depth === undefined ||
    !Number.isFinite(resolved.finished_depth) ||
    resolved.finished_depth <= 0
  ) {
    errors.push({
      field: 'finished_depth',
      message:
        resolved.preset === 'custom'
          ? 'finished_depth is required for the custom preset and must be a positive finite number.'
          : 'finished_depth must be a positive finite number.',
    });
  }

  // ── Boxing constraint (only checked when dimensions are otherwise valid) ────────

  const dimensionsValid =
    Number.isFinite(resolved.finished_length) &&
    resolved.finished_length > 0 &&
    Number.isFinite(resolved.finished_width) &&
    resolved.finished_width > 0 &&
    Number.isFinite(resolved.finished_depth) &&
    resolved.finished_depth > 0;

  if (dimensionsValid) {
    const boxingOffset = resolved.finished_depth / 2;
    if (boxingOffset >= resolved.finished_width) {
      errors.push({
        field: 'finished_depth',
        message:
          `Boxing constraint violated: finished_depth / 2 (${boxingOffset} mm) must be ` +
          `less than finished_width (${resolved.finished_width} mm). ` +
          'Reduce finished_depth or increase finished_width.',
      });
    }
  }

  // ── Seam allowance ─────────────────────────────────────────────────────────────

  const sa = resolved.seam_allowance;
  if (!Number.isFinite(sa) || sa < 0) {
    errors.push({
      field: 'seam_allowance',
      message: `seam_allowance must be a finite number ≥ 0 (got ${sa}). SA=0 produces cut dimensions equal to finished dimensions.`,
    });
  }

  // ── Zip gauge ──────────────────────────────────────────────────────────────────

  if (!VALID_ZIP_GAUGES.has(resolved.zip_gauge)) {
    errors.push({
      field: 'zip_gauge',
      message: `zip_gauge must be '#3' or '#5' (got '${resolved.zip_gauge}').`,
    });
  }

  // ── Grosgrain width ────────────────────────────────────────────────────────────

  if (resolved.pull_loops) {
    if (!Number.isFinite(resolved.grosgrain_width) || resolved.grosgrain_width <= 0) {
      errors.push({
        field: 'grosgrain_width',
        message: `grosgrain_width must be a positive finite number when pull_loops is true (got ${resolved.grosgrain_width}).`,
      });
    }
  }

  // ── Non-blocking warning: zipper length vs panel width ─────────────────────────

  if (dimensionsValid && Number.isFinite(sa) && sa >= 0) {
    const cutWidth = resolved.finished_length + 2 * sa;
    const zipperLengthRaw = cutWidth + 25;
    const zipperLength = Math.ceil(zipperLengthRaw / 50) * 50;
    if (zipperLength > cutWidth) {
      warnings.push(
        `Zipper may be longer than the panel; consider a shorter zipper or wider bag. ` +
          `(cut_width=${cutWidth} mm, zipper_length=${zipperLength} mm)`,
      );
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }
  return { ok: true, warnings };
}
