import type { BookCoverInputs, ResolvedInputs, Result, BuildPatternError } from './types.js';
import { DEFAULT_SEAM_ALLOWANCE_MM, DEFAULT_TOP_BOTTOM_HEM_MM } from './defaults.js';

const IN_TO_MM = 25.4;

export function toMm(value: number, units: 'mm' | 'in'): number {
  return units === 'in' ? value * IN_TO_MM : value;
}

function isPositiveFinite(n: number): boolean {
  return isFinite(n) && n > 0;
}

export function validateInputs(inputs: BookCoverInputs): Result<true, BuildPatternError> {
  const { units } = inputs;

  const bookH = toMm(inputs.book_height, units);
  const bookW = toMm(inputs.book_width, units);
  const spineW = toMm(inputs.spine_width, units);
  const flapD = toMm(inputs.flap_depth, units);

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
  return {
    book_height: toMm(inputs.book_height, units),
    book_width: toMm(inputs.book_width, units),
    spine_width: toMm(inputs.spine_width, units),
    flap_depth: toMm(inputs.flap_depth, units),
    seam_allowance: inputs.seam_allowance ?? DEFAULT_SEAM_ALLOWANCE_MM,
    top_bottom_hem: DEFAULT_TOP_BOTTOM_HEM_MM,
    units,
    outer_pocket: inputs.outer_pocket,
    inner_pocket: inputs.inner_pocket,
    pen_holder: inputs.pen_holder,
  };
}
