import type { UnitSystem } from './units.js';
import { mmToInches } from './units.js';

export function formatDimension(valueMm: number, units: UnitSystem): string {
  if (units === 'in') {
    return `${mmToInches(valueMm).toFixed(2)} in`;
  }
  return `${valueMm.toFixed(1)} mm`;
}

export function formatNumber(value: number, units: UnitSystem): string {
  if (units === 'in') {
    return mmToInches(value).toFixed(2);
  }
  return value.toFixed(1);
}
