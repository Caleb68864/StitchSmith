/**
 * Wind shirt placeholders. The measurements are an EXAMPLE body (one person,
 * inches), not a size chart: replace them with the wearer's. The rest are
 * construction starting points. All flagged `mock-derived` until entered.
 */
import type { WindShirtInputs } from './types.js';
import type { MeasurementKey } from '../../lib/pattern-engine/drafting/measurements.js';

const IN = 25.4;
export const DEFAULT_UNITS = 'in' as const;

export const EXAMPLE_BODY_MM: Record<MeasurementKey, number> = {
  chest: 40 * IN, waist: 34 * IN, hip: 40 * IN, neck: 15.5 * IN, bicep: 13 * IN, wrist: 7 * IN,
  nape_to_waist: 18 * IN, scye_depth: 9 * IN, waist_to_hip: 8 * IN, shoulder_width: 17.5 * IN, arm_length: 25 * IN,
};
export const EASE_MM = { chest: 6 * IN, waist: 6 * IN, hip: 6 * IN, neck: 1 * IN, bicep: 3 * IN, wrist: 4 * IN } as const;
export const SHOULDER_DROP_MM = 1.75 * IN;
export const CAP_EASE_MM = 0.5 * IN;
export const HEM_DEPTH_MM = 1 * IN;
export const CUFF_CHANNEL_MM = 0.75 * IN;
export const ELASTIC_PCT = 85;
export const ZIP_LENGTH_MM = 10 * IN;
export const BINDING_WIDTH_MM = 1.5 * IN;
export const FABRIC_WIDTH_MM = 58 * IN;
export const SEAM_ALLOWANCE_MM = 9.5;

type P = { field: keyof WindShirtInputs; label: string; mm: number; kind: 'length' | 'percent' | 'sa' };
const M: P[] = (Object.keys(EXAMPLE_BODY_MM) as MeasurementKey[]).map((k) => ({ field: k, label: `${k.replace(/_/g, ' ')} (example body)`, mm: EXAMPLE_BODY_MM[k], kind: 'length' }));
export const PLACEHOLDERS: readonly P[] = [
  ...M,
  { field: 'ease_chest', label: 'Chest ease', mm: EASE_MM.chest, kind: 'length' },
  { field: 'ease_waist', label: 'Waist ease', mm: EASE_MM.waist, kind: 'length' },
  { field: 'ease_hip', label: 'Hip ease', mm: EASE_MM.hip, kind: 'length' },
  { field: 'ease_neck', label: 'Neck ease', mm: EASE_MM.neck, kind: 'length' },
  { field: 'ease_bicep', label: 'Bicep ease', mm: EASE_MM.bicep, kind: 'length' },
  { field: 'ease_wrist', label: 'Wrist ease', mm: EASE_MM.wrist, kind: 'length' },
  { field: 'shoulder_drop', label: 'Shoulder drop', mm: SHOULDER_DROP_MM, kind: 'length' },
  { field: 'cap_ease', label: 'Cap ease', mm: CAP_EASE_MM, kind: 'length' },
  { field: 'hem_depth', label: 'Hem depth', mm: HEM_DEPTH_MM, kind: 'length' },
  { field: 'cuff_channel', label: 'Cuff channel', mm: CUFF_CHANNEL_MM, kind: 'length' },
  { field: 'elastic_pct', label: 'Cuff elastic', mm: ELASTIC_PCT, kind: 'percent' },
  { field: 'zip_length', label: 'Neck zipper', mm: ZIP_LENGTH_MM, kind: 'length' },
  { field: 'binding_width', label: 'Neck binding', mm: BINDING_WIDTH_MM, kind: 'length' },
  { field: 'fabric_width', label: 'Usable fabric width', mm: FABRIC_WIDTH_MM, kind: 'length' },
  { field: 'seam_allowance', label: 'Seam allowance', mm: SEAM_ALLOWANCE_MM, kind: 'sa' },
];
