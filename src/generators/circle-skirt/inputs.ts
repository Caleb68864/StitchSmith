/**
 * Circle Skirt Generator — Input validation and resolution
 *
 * `validateInputs` enforces all constraints from Requirements 3–4.
 * `resolveInputs` fills in defaults, computes derived fields (r, R, cut radii,
 * panel count).
 *
 * UNITS: `resolveInputs` normalises to MILLIMETRES. Body/garment measurements
 * (waist_circumference, skirt_length, hip_circumference) arrive in the user's
 * display unit and are converted here; ease, seam/hem allowance, band height,
 * elastic width and fabric width are always mm and pass through untouched.
 * Every `ResolvedInputs` length is therefore mm.
 *
 * This used to be documented as "the UI layer's responsibility", but no UI file
 * ever did it: the three buildPattern call sites passed raw inputs straight
 * through, so the shipped default (units:'in', waist 28, length 24) built a
 * 51.6 mm panel — a 1/25-scale skirt — while its mm-based seam and hem
 * allowances stayed full size. Converting once here also covers validateInputs,
 * which delegates to this function.
 */

import type {
  CircleSkirtInputs,
  ResolvedInputs,
  ValidationResult,
  BuildPatternError,
} from './types.js';
import {
  DEFAULT_SWEEP_ANGLE_DEG,
  DEFAULT_WAIST_EASE_MM,
  DEFAULT_CLOSURE,
  DEFAULT_WAISTBAND_TYPE,
  DEFAULT_BAND_HEIGHT_MM,
  DEFAULT_ELASTIC_WIDTH_MM,
  DEFAULT_SEAM_ALLOWANCE_MM,
  DEFAULT_HEM_ALLOWANCE_MM,
  DEFAULT_FABRIC_WIDTH_MM,
  DEFAULT_UNITS,
  DEFAULT_PRESET,
  getPresetSweepAngle,
} from './defaults.js';

const MM_PER_INCH = 25.4;

/**
 * Fill all optional fields with defaults, compute the preset's sweep angle,
 * and derive r, R, cut radii, num_panels, panel_sweep_deg, and effective_waist.
 *
 * Does NOT run validation — call `validateInputs` separately as needed.
 */
export function resolveInputs(inputs: CircleSkirtInputs): ResolvedInputs {
  const preset = inputs.preset ?? DEFAULT_PRESET;

  const presetSweep = getPresetSweepAngle(preset);
  const sweep_angle_deg = inputs.sweep_angle_deg ?? presetSweep ?? DEFAULT_SWEEP_ANGLE_DEG;

  const units = inputs.units ?? DEFAULT_UNITS;

  // Body/garment measurements are entered in the user's display unit — the
  // settings panel labels them `(${units})`. Everything else (ease, seam and
  // hem allowance, band height, elastic width, fabric width) is always mm and
  // is labelled "(mm)" in the panel regardless of the toggle. Convert only the
  // former, once, here — see the file header for why this lives in resolve.
  const toMm = (v: number): number =>
    units === 'in' && Number.isFinite(v) ? v * MM_PER_INCH : v;

  const waist_circumference = toMm(inputs.waist_circumference ?? NaN);
  const skirt_length = toMm(inputs.skirt_length ?? NaN);
  const waist_ease = inputs.waist_ease ?? DEFAULT_WAIST_EASE_MM;
  const seam_allowance = inputs.seam_allowance ?? DEFAULT_SEAM_ALLOWANCE_MM;
  const hem_allowance = inputs.hem_allowance ?? DEFAULT_HEM_ALLOWANCE_MM;
  const closure = inputs.closure ?? DEFAULT_CLOSURE;
  const waistband_type = inputs.waistband_type ?? DEFAULT_WAISTBAND_TYPE;
  const band_height = inputs.band_height ?? DEFAULT_BAND_HEIGHT_MM;
  const elastic_width = inputs.elastic_width ?? DEFAULT_ELASTIC_WIDTH_MM;
  const fabric_width = inputs.fabric_width ?? DEFAULT_FABRIC_WIDTH_MM;
  // Same class as waist_circumference; its fallback is waist(mm) + 100 mm.
  const hip_circumference = inputs.hip_circumference !== undefined
    ? toMm(inputs.hip_circumference)
    : waist_circumference + 100;

  // Elastic-casing uses hip as base (must pass over hips); zip closures use waist+ease.
  const effective_waist =
    closure === 'elastic'
      ? hip_circumference
      : waist_circumference + waist_ease;

  // Core circle-skirt math
  const theta_rad = sweep_angle_deg * (Math.PI / 180);
  const r = Number.isFinite(effective_waist) && theta_rad > 0
    ? effective_waist / theta_rad
    : NaN;
  const R = Number.isFinite(r) && Number.isFinite(skirt_length)
    ? r + skirt_length
    : NaN;

  const cut_inner_r = Number.isFinite(r) ? Math.max(1, r - seam_allowance) : NaN;
  const cut_outer_r = Number.isFinite(R) ? R + hem_allowance : NaN;

  // Piecing: keep every panel arc ≤ 90°
  const num_panels = Math.max(2, Math.ceil(sweep_angle_deg / 90));
  const panel_sweep_deg = sweep_angle_deg / num_panels;

  return {
    waist_circumference,
    skirt_length,
    sweep_angle_deg,
    waist_ease,
    closure,
    waistband_type,
    band_height,
    elastic_width,
    seam_allowance,
    hem_allowance,
    fabric_width,
    units,
    preset,
    hip_circumference,
    effective_waist,
    r,
    R,
    cut_inner_r,
    cut_outer_r,
    num_panels,
    panel_sweep_deg,
  };
}

/**
 * Validate a `CircleSkirtInputs` object (resolving defaults internally).
 *
 * Errors are hard failures; warnings are advisory and do not block export.
 */
export function validateInputs(inputs: CircleSkirtInputs): ValidationResult {
  const resolved = resolveInputs(inputs);
  const errors: BuildPatternError[] = [];
  const warnings: string[] = [];

  // ── waist_circumference ────────────────────────────────────────────────────────
  if (!Number.isFinite(resolved.waist_circumference) || resolved.waist_circumference <= 0) {
    errors.push({
      field: 'waist_circumference',
      message: 'waist_circumference must be a positive finite number.',
    });
  }

  // ── skirt_length ───────────────────────────────────────────────────────────────
  if (!Number.isFinite(resolved.skirt_length) || resolved.skirt_length <= 0) {
    errors.push({
      field: 'skirt_length',
      message: 'skirt_length must be a positive finite number.',
    });
  }

  // ── sweep_angle_deg ────────────────────────────────────────────────────────────
  if (
    !Number.isFinite(resolved.sweep_angle_deg) ||
    resolved.sweep_angle_deg < 45 ||
    resolved.sweep_angle_deg > 720
  ) {
    errors.push({
      field: 'sweep_angle_deg',
      message: `sweep_angle_deg must be in [45, 720] (got ${resolved.sweep_angle_deg}).`,
    });
  }

  // ── seam_allowance ─────────────────────────────────────────────────────────────
  if (!Number.isFinite(resolved.seam_allowance) || resolved.seam_allowance < 0) {
    errors.push({
      field: 'seam_allowance',
      message: `seam_allowance must be a finite number ≥ 0 (got ${resolved.seam_allowance}).`,
    });
  }

  // ── hem_allowance ──────────────────────────────────────────────────────────────
  if (!Number.isFinite(resolved.hem_allowance) || resolved.hem_allowance < 0) {
    errors.push({
      field: 'hem_allowance',
      message: `hem_allowance must be a finite number ≥ 0 (got ${resolved.hem_allowance}).`,
    });
  }

  // ── fabric_width ───────────────────────────────────────────────────────────────
  if (!Number.isFinite(resolved.fabric_width) || resolved.fabric_width <= 0) {
    errors.push({
      field: 'fabric_width',
      message: `fabric_width must be a positive finite number (got ${resolved.fabric_width}).`,
    });
  }

  // ── waist_ease ─────────────────────────────────────────────────────────────────
  if (!Number.isFinite(resolved.waist_ease) || resolved.waist_ease < 0) {
    errors.push({
      field: 'waist_ease',
      message: `waist_ease must be a finite number ≥ 0 (got ${resolved.waist_ease}).`,
    });
  }

  // ── band_height (straight waistband only) ─────────────────────────────────────
  if (resolved.waistband_type === 'straight') {
    if (!Number.isFinite(resolved.band_height) || resolved.band_height <= 0) {
      errors.push({
        field: 'band_height',
        message: `band_height must be a positive finite number when waistband_type is 'straight' (got ${resolved.band_height}).`,
      });
    }
  }

  // ── elastic_width (elastic-casing only) ───────────────────────────────────────
  if (resolved.waistband_type === 'elastic-casing') {
    if (!Number.isFinite(resolved.elastic_width) || resolved.elastic_width <= 0) {
      errors.push({
        field: 'elastic_width',
        message: `elastic_width must be a positive finite number when waistband_type is 'elastic-casing' (got ${resolved.elastic_width}).`,
      });
    }
  }

  // ── Non-blocking warnings ──────────────────────────────────────────────────────

  if (Number.isFinite(resolved.sweep_angle_deg) && resolved.sweep_angle_deg > 360) {
    warnings.push(
      'Multi-circle skirt requires significant piecing — confirm yardage.',
    );
  }

  if (
    resolved.waistband_type === 'straight' &&
    Number.isFinite(resolved.band_height) &&
    resolved.band_height > 30
  ) {
    warnings.push(
      'Straight waistbands taller than 30mm may fit poorly — consider contour waistband.',
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }
  return { ok: true, warnings };
}
