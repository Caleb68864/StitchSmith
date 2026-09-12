import type { RollTopSackInputs, ResolvedInputs, Result, BuildPatternError } from './types.js';
import { DEFAULT_COLLAR_HEIGHT_MM } from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';

/** Type/range guard run before the generator's own rules (hardening pass H1). */
const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  bottom_length: { kind: 'length' },
  bottom_width: { kind: 'length' },
  height_when_rolled: { kind: 'length' },
  collar_height: { kind: 'length' },
  seam_allowance: { kind: 'length', max: 5000 },
};

const IN_TO_MM = 25.4;

export function toMm(value: number, units: 'mm' | 'in'): number {
  return units === 'in' ? value * IN_TO_MM : value;
}

export function validateInputs(inputs: RollTopSackInputs): Result<true, BuildPatternError> {
  inputs = stripNulls(inputs);
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'mm'));
  if (guard.length) return { ok: false, error: { kind: 'invalid-inputs', message: guard[0].message } };
  const { bottom_length, bottom_width, height_when_rolled, units } = inputs;

  const lenMm = toMm(bottom_length, units);
  const widMm = toMm(bottom_width, units);
  const hMm = toMm(height_when_rolled, units);

  if (!isFinite(lenMm) || lenMm <= 0) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'bottom_length must be a positive finite number' } };
  }
  if (!isFinite(widMm) || widMm <= 0) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'bottom_width must be a positive finite number' } };
  }
  if (!isFinite(hMm) || hMm <= 0) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'height_when_rolled must be a positive finite number' } };
  }

  if (inputs.collar_height !== undefined) {
    const collarMm = toMm(inputs.collar_height, units);
    if (!isFinite(collarMm) || collarMm <= 0) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'collar_height must be a positive finite number' } };
    }
  }

  if (inputs.seam_allowance !== undefined && (!isFinite(inputs.seam_allowance) || inputs.seam_allowance < 0)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'seam_allowance must be a non-negative finite number' } };
  }

  return { ok: true, value: true };
}

export function resolveInputs(inputs: RollTopSackInputs): ResolvedInputs {
  inputs = stripNulls(inputs);
  const { units } = inputs;
  return {
    bottom_length: toMm(inputs.bottom_length, units),
    bottom_width: toMm(inputs.bottom_width, units),
    height_when_rolled: toMm(inputs.height_when_rolled, units),
    collar_height: inputs.collar_height !== undefined
      ? toMm(inputs.collar_height, units)
      : DEFAULT_COLLAR_HEIGHT_MM,
    seam_allowance: inputs.seam_allowance ?? 9.5,
    units,
  };
}
