/**
 * Drafting engine, step 1 (roadmap 10f): the body measurement set.
 *
 * Every number here is the wearer's own measurement, typed in; there is no
 * size chart (a standard chart such as ASTM D5585 or ISO 8559 is not in the
 * repo, so none is encoded). Each girth carries its own ease, added before
 * any block is drafted. Lengths are measured as a dressmaker does:
 *
 * - chest, waist, hip, neck, bicep, wrist: girths round the body;
 * - nape_to_waist: back neck bone down the spine to the natural waist;
 * - scye_depth: back neck bone down to the level of the armpit;
 * - waist_to_hip: down the side from the waist to the fullest hip;
 * - shoulder_width: across the back, shoulder point to shoulder point;
 * - arm_length: shoulder point over the bent elbow to the wrist bone.
 *
 * Units: the caller's display unit in, millimetres out.
 */
export type Units = 'mm' | 'in';

export const MEASUREMENT_KEYS = [
  'chest', 'waist', 'hip', 'neck', 'bicep', 'wrist',
  'nape_to_waist', 'scye_depth', 'waist_to_hip', 'shoulder_width', 'arm_length',
] as const;
export type MeasurementKey = (typeof MEASUREMENT_KEYS)[number];

/** The girths that take ease; lengths are drafted as measured. */
export const GIRTH_KEYS = ['chest', 'waist', 'hip', 'neck', 'bicep', 'wrist'] as const;
export type GirthKey = (typeof GIRTH_KEYS)[number];

export const MEASUREMENT_LABELS: Record<MeasurementKey, string> = {
  chest: 'Chest', waist: 'Waist', hip: 'Hip', neck: 'Neck', bicep: 'Bicep', wrist: 'Wrist',
  nape_to_waist: 'Nape to waist', scye_depth: 'Scye depth (nape to armpit level)', waist_to_hip: 'Waist to hip',
  shoulder_width: 'Shoulder width (across the back)', arm_length: 'Arm length (shoulder to wrist)',
};

export type MeasurementInput = Partial<Record<MeasurementKey, number>> & { ease?: Partial<Record<GirthKey, number>> };

/** Resolved, in mm: the body as measured, the ease, and the eased girths a block is drafted to. */
export interface Measurements {
  body: Record<MeasurementKey, number>;
  ease: Record<GirthKey, number>;
  /** Girths with their ease added; lengths as measured. */
  eased: Record<MeasurementKey, number>;
}

export interface MeasurementIssue { field: string; message: string }
export type MeasurementResult = { ok: true; value: Measurements } | { ok: false; errors: MeasurementIssue[] };

const IN = 25.4;
const toMm = (v: number, u: Units) => (u === 'in' ? v * IN : v);
const fmt = (mm: number, u: Units) => (u === 'in' ? `${(mm / IN).toFixed(2).replace(/\.?0+$/, '')}"` : `${Math.round(mm)} mm`);

/**
 * Convert, ease and check a measurement set. Every measurement is required
 * (no default stands in for a body); ease defaults to 0 and may be negative
 * for a stretch fabric, but never below the body.
 */
export function resolveMeasurements(input: MeasurementInput, units: Units): MeasurementResult {
  const errors: MeasurementIssue[] = [];
  const body = {} as Record<MeasurementKey, number>;
  for (const k of MEASUREMENT_KEYS) {
    const v = input[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) errors.push({ field: k, message: `${MEASUREMENT_LABELS[k]} is a measurement you take: enter it (a positive number).` });
    else body[k] = toMm(v, units);
  }
  const ease = {} as Record<GirthKey, number>;
  for (const k of GIRTH_KEYS) {
    const e = input.ease?.[k];
    if (e !== undefined && (typeof e !== 'number' || !Number.isFinite(e))) errors.push({ field: `ease.${k}`, message: `${MEASUREMENT_LABELS[k]} ease must be a number.` });
    ease[k] = typeof e === 'number' && Number.isFinite(e) ? toMm(e, units) : 0;
  }
  if (errors.length) return { ok: false, errors };
  const eased = { ...body };
  for (const k of GIRTH_KEYS) {
    eased[k] = body[k] + ease[k];
    if (!(eased[k] > 0.5 * body[k])) errors.push({ field: `ease.${k}`, message: `${fmt(-ease[k], units)} of negative ease on a ${fmt(body[k], units)} ${MEASUREMENT_LABELS[k].toLowerCase()} is more than half of it.` });
  }
  // Relations a real body satisfies; a failure is almost always a typo or swapped field.
  if (body.scye_depth >= body.nape_to_waist) errors.push({ field: 'scye_depth', message: `Scye depth (${fmt(body.scye_depth, units)}) must be less than nape to waist (${fmt(body.nape_to_waist, units)}): the armpit is above the waist.` });
  if (body.wrist >= body.bicep) errors.push({ field: 'wrist', message: `The wrist (${fmt(body.wrist, units)}) must be smaller than the bicep (${fmt(body.bicep, units)}).` });
  if (body.neck >= body.chest) errors.push({ field: 'neck', message: `The neck (${fmt(body.neck, units)}) must be smaller than the chest (${fmt(body.chest, units)}).` });
  if (body.shoulder_width >= body.chest / 2) errors.push({ field: 'shoulder_width', message: `A ${fmt(body.shoulder_width, units)} shoulder width is half the chest or more; measure across the back, shoulder point to shoulder point.` });
  return errors.length ? { ok: false, errors } : { ok: true, value: { body, ease, eased } };
}
