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
  DEFAULT_CONSTRUCTION_STYLE,
  DEFAULT_ZIPPER_POSITION,
  getPresetDimensions,
} from './defaults.js';

const VALID_ZIP_GAUGES = new Set(['#3', '#5']);

const MM_PER_INCH = 25.4;

/**
 * Merge preset dimension defaults with user-supplied overrides to produce
 * fully-resolved inputs. Does NOT run validation — call `validateInputs`
 * after (or before) as needed.
 *
 * **Every length on `ResolvedInputs` is in MILLIMETRES**, whatever unit the
 * user is working in. `units` is retained only to label output.
 *
 * `ZipPouchInputs` carries lengths in the user's display unit — the settings
 * panel rewrites the numbers when the unit is switched — but the pattern
 * engine, the `defaults.ts` constants (`DEFAULT_SEAM_ALLOWANCE_MM`,
 * `DEFAULT_GROSGRAIN_WIDTH_MM`), the zipper stock-length rounding and every
 * "mm" in the BOM and step text are all millimetre-based. Converting once,
 * here, is what keeps those true. Without it, inch inputs were drawn as though
 * they were millimetres: a 7.09 in pouch produced a 15.39-unit zipper end tab
 * beside 4.72-unit panels, and the BOM labelled inch numbers "mm".
 */
export function resolveInputs(inputs: ZipPouchInputs): ResolvedInputs {
  const preset = inputs.preset ?? DEFAULT_PRESET;
  const presetDims = getPresetDimensions(preset);
  const units = inputs.units ?? DEFAULT_UNITS;

  // User-supplied lengths arrive in `units`; preset dimensions and the
  // DEFAULT_*_MM constants are already millimetres.
  const toMm = (v: number | undefined): number | undefined =>
    v === undefined || !Number.isFinite(v) ? v : units === 'in' ? v * MM_PER_INCH : v;

  const finished_length =
    toMm(inputs.finished_length) ?? presetDims?.finished_length ?? NaN;
  const finished_width =
    toMm(inputs.finished_width) ?? presetDims?.finished_width ?? NaN;
  const finished_depth =
    toMm(inputs.finished_depth) ?? presetDims?.finished_depth ?? NaN;

  return {
    preset,
    finished_length,
    finished_width,
    finished_depth,
    units,
    seam_allowance: toMm(inputs.seam_allowance) ?? DEFAULT_SEAM_ALLOWANCE_MM,
    zip_gauge: inputs.zip_gauge ?? DEFAULT_ZIP_GAUGE,
    grosgrain_width: toMm(inputs.grosgrain_width) ?? DEFAULT_GROSGRAIN_WIDTH_MM,
    pull_loops: inputs.pull_loops ?? DEFAULT_PULL_LOOPS,
    construction_style: inputs.construction_style ?? DEFAULT_CONSTRUCTION_STYLE,
    zipper_position: inputs.zipper_position ?? DEFAULT_ZIPPER_POSITION,
    zip_from_top: toMm(inputs.zip_from_top) ?? Math.round(finished_width / 2),
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

  // Boxing constraint applies only to 'boxed', which folds a corner triangle out
  // of the panel: the fold eats into the panel height, so depth/2 must stay under
  // finished_width or the triangle consumes the whole panel.
  //
  // 'cross-bottom' used to be listed here, when it drew a full-cross panel. The
  // half-cross panel has no such degeneracy — the corner is a CUTOUT, not a fold,
  // and the three regions stay positive for any depth:
  //   face width  W − 2C = finished_length          > 0 always
  //   face height H − C − sa = finished_width       > 0 always
  //   arm         C − sa = finished_depth / 2       > 0 always
  // Keeping the guard rejected drawable patterns (e.g. 300 × 40 × 100 mm) with a
  // message about folded-corner construction that no longer described the piece.
  const styleUsesBoxing = resolved.construction_style === 'boxed';
  if (dimensionsValid && styleUsesBoxing) {
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

  // ── Zipper placement from top (front-zip gusset-strip construction) ─────────────

  if (dimensionsValid) {
    const zipFromTop = resolved.zip_from_top;
    if (
      !Number.isFinite(zipFromTop) ||
      zipFromTop <= 0 ||
      zipFromTop >= resolved.finished_width
    ) {
      errors.push({
        field: 'zip_from_top',
        message:
          `zip_from_top must be greater than 0 and less than finished_width ` +
          `(got ${zipFromTop} mm; finished_width=${resolved.finished_width} mm).`,
      });
    } else if (resolved.zipper_position === 'front' && zipFromTop < 20) {
      warnings.push(
        `The front-top strip is narrower than 2 cm (zip_from_top=${zipFromTop} mm); ` +
          `consider increasing the zipper placement for an easier-to-sew strip.`,
      );
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
