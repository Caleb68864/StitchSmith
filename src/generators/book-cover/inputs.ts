import type { BookCoverInputs, ResolvedInputs, Result, BuildPatternError } from './types.js';
import { DEFAULT_SEAM_ALLOWANCE_MM, DEFAULT_TOP_BOTTOM_HEM_MM, BOOK_PRESETS, FOLDOVER_PRESETS } from './defaults.js';

const IN_TO_MM = 25.4;

export function toMm(value: number, units: 'mm' | 'in'): number {
  return units === 'in' ? value * IN_TO_MM : value;
}

function isPositiveFinite(n: number): boolean {
  return isFinite(n) && n > 0;
}

export function validateInputs(inputs: BookCoverInputs): Result<true, BuildPatternError> {
  const { units } = inputs;

  // Validate book_preset
  let preset = BOOK_PRESETS.find(p => p.id === inputs.book_preset);
  if (inputs.book_preset !== undefined && !preset) {
    return { ok: false, error: { kind: 'invalid-inputs', message: `Unknown book preset: "${inputs.book_preset}"` } };
  }

  // Validate foldover_preset
  if (inputs.foldover_preset !== undefined) {
    if (!FOLDOVER_PRESETS.find(p => p.id === inputs.foldover_preset)) {
      return { ok: false, error: { kind: 'invalid-inputs', message: `Unknown foldover preset: "${inputs.foldover_preset}"` } };
    }
  }

  // Validate width_ease
  if (inputs.width_ease !== undefined) {
    if (!isFinite(inputs.width_ease) || inputs.width_ease < 0) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'width_ease must be a non-negative finite number' } };
    }
  }

  // Validate spine_bulge
  if (inputs.spine_bulge !== undefined) {
    if (!isFinite(inputs.spine_bulge) || inputs.spine_bulge < 0) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'spine_bulge must be a non-negative finite number' } };
    }
  }

  // Resolve effective dimensions (user input overrides preset)
  const bookH = inputs.book_height !== undefined ? toMm(inputs.book_height, units) : (preset?.book_height_mm ?? NaN);
  const bookW = inputs.book_width !== undefined ? toMm(inputs.book_width, units) : (preset?.book_width_mm ?? NaN);
  const spineW = inputs.spine_width !== undefined ? toMm(inputs.spine_width, units) : (preset?.spine_width_mm ?? NaN);
  const flapD = inputs.flap_depth !== undefined ? toMm(inputs.flap_depth, units) : (preset?.flap_depth_mm ?? NaN);

  if (!isPositiveFinite(bookH)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'book_height must be a positive finite number' } };
  }
  if (!isPositiveFinite(bookW)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'book_width must be a positive finite number' } };
  }
  if (!isPositiveFinite(spineW)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'spine_width must be a positive finite number' } };
  }
  if (!isPositiveFinite(flapD)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'flap_depth must be a positive finite number' } };
  }

  if (inputs.seam_allowance !== undefined) {
    if (!isFinite(inputs.seam_allowance) || inputs.seam_allowance < 0) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'seam_allowance must be a non-negative finite number' } };
    }
  }

  const hem = DEFAULT_TOP_BOTTOM_HEM_MM;

  if (inputs.outer_pocket !== undefined) {
    const p = inputs.outer_pocket;
    if (!isPositiveFinite(p.width) || p.width >= bookW) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'outer_pocket width must be positive and less than book_width' } };
    }
    if (!isPositiveFinite(p.height) || p.height >= bookH) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'outer_pocket height must be positive and less than book_height' } };
    }
  }

  if (inputs.inner_pocket !== undefined) {
    const p = inputs.inner_pocket;
    if (!isPositiveFinite(p.width) || p.width >= bookW) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'inner_pocket width must be positive and less than book_width' } };
    }
    if (!isPositiveFinite(p.height) || p.height >= bookH) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'inner_pocket height must be positive and less than book_height' } };
    }
  }

  if (inputs.pen_holder !== undefined) {
    const ph = inputs.pen_holder;
    if (!Number.isInteger(ph.count) || ph.count < 1) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'pen_holder count must be an integer >= 1' } };
    }
    if (!isFinite(ph.slot_width) || ph.slot_width <= 0) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'pen_holder slot_width must be a positive finite number' } };
    }
    const totalStripWidth = ph.count * ph.slot_width;
    if (totalStripWidth > bookH - 2 * hem) {
      return { ok: false, error: { kind: 'invalid-inputs', message: `pen_holder total strip width (${totalStripWidth}) exceeds available book_height minus hems (${bookH - 2 * hem})` } };
    }
  }

  return { ok: true, value: true };
}

export function resolveInputs(inputs: BookCoverInputs): ResolvedInputs {
  const { units } = inputs;

  const preset = inputs.book_preset ? BOOK_PRESETS.find(p => p.id === inputs.book_preset) : undefined;

  const book_height = inputs.book_height !== undefined ? toMm(inputs.book_height, units) : (preset?.book_height_mm ?? NaN);
  const book_width = inputs.book_width !== undefined ? toMm(inputs.book_width, units) : (preset?.book_width_mm ?? NaN);
  const spine_width = inputs.spine_width !== undefined ? toMm(inputs.spine_width, units) : (preset?.spine_width_mm ?? NaN);
  const flap_depth = inputs.flap_depth !== undefined ? toMm(inputs.flap_depth, units) : (preset?.flap_depth_mm ?? NaN);

  const is_hardcover = inputs.is_hardcover ?? preset?.is_hardcover ?? false;
  const width_ease = inputs.width_ease ?? Math.max(6.35, spine_width * 0.5);
  const spine_bulge = inputs.spine_bulge ?? (is_hardcover ? 6.35 : 0);

  return {
    book_height,
    book_width,
    spine_width,
    flap_depth,
    seam_allowance: inputs.seam_allowance ?? DEFAULT_SEAM_ALLOWANCE_MM,
    top_bottom_hem: DEFAULT_TOP_BOTTOM_HEM_MM,
    units,
    book_preset: inputs.book_preset,
    foldover_preset: inputs.foldover_preset,
    width_ease,
    spine_bulge,
    is_hardcover,
    outer_pocket: inputs.outer_pocket,
    inner_pocket: inputs.inner_pocket,
    pen_holder: inputs.pen_holder,
  };
}
