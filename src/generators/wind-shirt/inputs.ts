import type { WindShirtInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import {
  DEFAULT_UNITS, EXAMPLE_BODY_MM, EASE_MM, SHOULDER_DROP_MM, CAP_EASE_MM, HEM_DEPTH_MM, CUFF_CHANNEL_MM, ELASTIC_PCT,
  ZIP_LENGTH_MM, BINDING_WIDTH_MM, FABRIC_WIDTH_MM, SEAM_ALLOWANCE_MM,
} from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';
import { MEASUREMENT_KEYS, type MeasurementKey } from '../../lib/pattern-engine/drafting/measurements.js';
import { resolveHem } from '../../lib/pattern-engine/primitives/hem.js';
import { draftShirt } from './draft.js';

const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  body: { kind: 'enum', allowed: ['straight', 'shaped'] },
  ...Object.fromEntries(MEASUREMENT_KEYS.map((k) => [k, { kind: 'length' as const }])),
  ...Object.fromEntries(['ease_chest', 'ease_waist', 'ease_hip', 'ease_neck', 'ease_bicep', 'ease_wrist'].map((k) => [k, { kind: 'number' as const, min: -1000, max: 1000, label: k.replace('_', ' ') }])),
  shoulder_drop: { kind: 'length' },
  cap_ease: { kind: 'number', min: -100, max: 200, label: 'Cap ease' },
  hem_depth: { kind: 'length' },
  cuff_channel: { kind: 'length' },
  elastic_pct: { kind: 'number', min: 0, max: 100, label: 'Cuff elastic' },
  zip_length: { kind: 'length' },
  binding_width: { kind: 'length' },
  fabric_width: { kind: 'length' },
  seam_allowance: { kind: 'number', min: 0, max: 100, label: 'Seam allowance' },
};

const IN = 25.4;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function resolveInputs(inputs: WindShirtInputs): ResolvedInputs {
  inputs = stripNulls(inputs ?? {});
  const units = inputs.units === 'mm' || inputs.units === 'in' ? inputs.units : DEFAULT_UNITS;
  const d = (v: unknown, fb: number) => (fin(v) ? toMm(v, units) : fb);
  const measurements = Object.fromEntries(MEASUREMENT_KEYS.map((k) => [k, d(inputs[k], EXAMPLE_BODY_MM[k])])) as Record<MeasurementKey, number>;
  const ease = {
    chest: d(inputs.ease_chest, EASE_MM.chest), waist: d(inputs.ease_waist, EASE_MM.waist), hip: d(inputs.ease_hip, EASE_MM.hip),
    neck: d(inputs.ease_neck, EASE_MM.neck), bicep: d(inputs.ease_bicep, EASE_MM.bicep), wrist: d(inputs.ease_wrist, EASE_MM.wrist),
  };
  const hem = resolveHem({ depth: Math.max(0, d(inputs.hem_depth, HEM_DEPTH_MM)), fold: 'single' });
  const cuff = resolveHem({ depth: Math.max(0, d(inputs.cuff_channel, CUFF_CHANNEL_MM)), fold: 'double' });
  const elastic_pct = fin(inputs.elastic_pct) ? inputs.elastic_pct : ELASTIC_PCT;
  return {
    units, body: inputs.body === 'shaped' ? 'shaped' : 'straight',
    shoulder_drop: d(inputs.shoulder_drop, SHOULDER_DROP_MM),
    cap_ease: d(inputs.cap_ease, CAP_EASE_MM),
    hem_depth: hem.ok ? hem.value.depth : 0,
    cuff_channel: cuff.ok ? cuff.value.depth : 0,
    elastic_pct,
    zip_length: d(inputs.zip_length, ZIP_LENGTH_MM),
    binding_width: d(inputs.binding_width, BINDING_WIDTH_MM),
    fabric_width: d(inputs.fabric_width, FABRIC_WIDTH_MM),
    seam_allowance: fin(inputs.seam_allowance) ? inputs.seam_allowance : SEAM_ALLOWANCE_MM,
    measurements, ease,
    hem_allowance: hem.ok ? hem.value.allowance : 0,
    cuff_allowance: cuff.ok ? cuff.value.allowance : 0,
    elastic_length: (elastic_pct / 100) * measurements.wrist,
  };
}

const inch = (mm: number) => `${(mm / IN).toFixed(2).replace(/\.?0+$/, '')}"`;

export function validateInputs(inputs: WindShirtInputs): ValidationResult {
  inputs = stripNulls(inputs ?? {});
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  if (guard.length) return { ok: false, errors: guard };
  const r = resolveInputs(inputs);
  const errors: BuildPatternError[] = [];
  const pos = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be a positive number.` }); };
  pos('hem_depth', 'Hem depth');
  pos('cuff_channel', 'Cuff channel');
  pos('zip_length', 'Neck zipper');
  pos('binding_width', 'Neck binding');
  pos('fabric_width', 'Fabric width');
  if (!(r.elastic_pct > 0)) errors.push({ field: 'elastic_pct', message: 'Cuff elastic must be more than 0 % of the wrist.' });
  if (errors.length) return { ok: false, errors };
  const d = draftShirt(r);
  if (!d.ok) return { ok: false, errors: d.errors };
  if (r.zip_length >= r.measurements.scye_depth + r.measurements.waist_to_hip) errors.push({ field: 'zip_length', message: `A ${inch(r.zip_length)} neck zipper runs too far down the front.` });
  const widest = Math.max(d.value.back.width, d.value.front.width);
  if (widest > r.fabric_width + 1e-6) errors.push({ field: 'fabric_width', message: `The body pieces need ${inch(widest)} of fabric across and the fabric is ${inch(r.fabric_width)}.` });
  return errors.length ? { ok: false, errors } : { ok: true };
}
