/**
 * Beanie placeholders: starting points to replace with a measurement, never
 * a sourced size chart. Each is flagged `mock-derived` until entered.
 */
import type { BeanieInputs } from './types.js';

const IN = 25.4;
export const DEFAULT_UNITS = 'in' as const;
export const HEAD_CIRCUMFERENCE_MM = 22 * IN;
export const EASE_MM = -1 * IN;
export const CROWN_HEIGHT_MM = 7 * IN;
export const GORES = 6;
export const CUFF_HEIGHT_MM = 2.5 * IN;
export const HEM_DEPTH_MM = 0.5 * IN;
export const SEAM_ALLOWANCE_MM = 9.5;
export const MIN_GORES = 3;
export const MAX_GORES = 12;

export const PLACEHOLDERS: readonly { field: keyof BeanieInputs; label: string; mm: number; kind: 'length' | 'count' | 'sa' }[] = [
  { field: 'head_circumference', label: 'Head circumference', mm: HEAD_CIRCUMFERENCE_MM, kind: 'length' },
  { field: 'ease', label: 'Ease', mm: EASE_MM, kind: 'length' },
  { field: 'crown_height', label: 'Crown height', mm: CROWN_HEIGHT_MM, kind: 'length' },
  { field: 'gores', label: 'Gores', mm: GORES, kind: 'count' },
  { field: 'cuff_height', label: 'Cuff height', mm: CUFF_HEIGHT_MM, kind: 'length' },
  { field: 'hem_depth', label: 'Hem depth', mm: HEM_DEPTH_MM, kind: 'length' },
  { field: 'seam_allowance', label: 'Seam allowance', mm: SEAM_ALLOWANCE_MM, kind: 'sa' },
];
