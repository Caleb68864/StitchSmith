/**
 * Gaiter placeholders: common starting points for a mid-height hiking
 * gaiter, NOT vault numbers or measurements (owner decisions 2026-11-16 and
 * 2026-11-21). Each is flagged `mock-derived` until measured on the leg and
 * boot it is for.
 */
import type { GaiterInputs } from './types.js';

const IN = 25.4;
export const DEFAULT_UNITS = 'in' as const;
export const HEIGHT_MM = 12 * IN;
export const TOP_CIRCUMFERENCE_MM = 15 * IN;
export const BOTTOM_CIRCUMFERENCE_MM = 17 * IN;
export const FRONT_DROP_MM = 1.5 * IN;
export const OVERLAP_MM = 1 * IN;
export const HEM_DEPTH_MM = 0.5 * IN;
export const CHANNEL_DEPTH_MM = 0.75 * IN;
export const ELASTIC_PCT = 90;
export const INSTEP_STRAP_MM = 9 * IN;
export const FABRIC_WIDTH_MM = 58 * IN;
export const SEAM_ALLOWANCE_MM = 12.7;

export const PLACEHOLDERS: readonly { field: keyof GaiterInputs; label: string; mm: number; kind: 'length' | 'percent' | 'sa' }[] = [
  { field: 'height', label: 'Height', mm: HEIGHT_MM, kind: 'length' },
  { field: 'top_circumference', label: 'Top circumference', mm: TOP_CIRCUMFERENCE_MM, kind: 'length' },
  { field: 'bottom_circumference', label: 'Bottom circumference', mm: BOTTOM_CIRCUMFERENCE_MM, kind: 'length' },
  { field: 'front_drop', label: 'Front drop', mm: FRONT_DROP_MM, kind: 'length' },
  { field: 'overlap', label: 'Hook-and-loop overlap', mm: OVERLAP_MM, kind: 'length' },
  { field: 'hem_depth', label: 'Hem depth', mm: HEM_DEPTH_MM, kind: 'length' },
  { field: 'channel_depth', label: 'Elastic channel', mm: CHANNEL_DEPTH_MM, kind: 'length' },
  { field: 'elastic_pct', label: 'Elastic length', mm: ELASTIC_PCT, kind: 'percent' },
  { field: 'instep_strap_length', label: 'Instep strap', mm: INSTEP_STRAP_MM, kind: 'length' },
  { field: 'fabric_width', label: 'Usable fabric width', mm: FABRIC_WIDTH_MM, kind: 'length' },
  { field: 'seam_allowance', label: 'Seam allowance', mm: SEAM_ALLOWANCE_MM, kind: 'sa' },
];
