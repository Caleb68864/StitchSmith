import type { BeanieInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import { DEFAULT_UNITS, HEAD_CIRCUMFERENCE_MM, EASE_MM, CROWN_HEIGHT_MM, GORES, CUFF_HEIGHT_MM, HEM_DEPTH_MM, SEAM_ALLOWANCE_MM, MIN_GORES, MAX_GORES } from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';
import { domeGores } from '../../lib/pattern-engine/geometry/gore.js';
import { resolveHem } from '../../lib/pattern-engine/primitives/hem.js';

const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  head_circumference: { kind: 'length' },
  ease: { kind: 'number', min: -500, max: 500, label: 'Ease' },
  crown_height: { kind: 'length' },
  gores: { kind: 'count', max: MAX_GORES },
  finish: { kind: 'enum', allowed: ['cuff', 'hem'] },
  cuff_height: { kind: 'length' },
  hem_depth: { kind: 'length' },
  seam_allowance: { kind: 'number', min: 0, max: 100, label: 'Seam allowance' },
};

const IN = 25.4;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function resolveInputs(inputs: BeanieInputs): ResolvedInputs {
  inputs = stripNulls(inputs ?? {});
  const units = inputs.units === 'mm' || inputs.units === 'in' ? inputs.units : DEFAULT_UNITS;
  const d = (v: unknown, fb: number) => (fin(v) ? toMm(v, units) : fb);
  const head_circumference = d(inputs.head_circumference, HEAD_CIRCUMFERENCE_MM);
  const ease = d(inputs.ease, EASE_MM);
  const crown_height = d(inputs.crown_height, CROWN_HEIGHT_MM);
  const gores = fin(inputs.gores) ? inputs.gores : GORES;
  const finish = inputs.finish === 'hem' ? 'hem' : 'cuff';
  const hem = resolveHem({ depth: Math.max(0, d(inputs.hem_depth, HEM_DEPTH_MM)), fold: 'single' });
  const seam_allowance = fin(inputs.seam_allowance) ? inputs.seam_allowance : SEAM_ALLOWANCE_MM;
  const circumference = head_circumference + ease;
  const g = Number.isInteger(gores) && gores >= MIN_GORES ? domeGores(circumference, crown_height, gores) : null;
  const ok = g && g.ok ? g.value : null;
  return {
    units, head_circumference, ease, crown_height, gores, finish,
    cuff_height: d(inputs.cuff_height, CUFF_HEIGHT_MM),
    hem_depth: hem.ok ? hem.value.depth : 0,
    seam_allowance,
    circumference,
    gore_length: ok ? ok.length : NaN,
    gore_base: ok ? 2 * ok.samples[0].half : NaN,
    samples: ok ? ok.samples : [],
    base_allowance: finish === 'hem' ? (hem.ok ? hem.value.allowance : 0) : seam_allowance,
  };
}

const inch = (mm: number) => `${(mm / IN).toFixed(2).replace(/\.?0+$/, '')}"`;

export function validateInputs(inputs: BeanieInputs): ValidationResult {
  inputs = stripNulls(inputs ?? {});
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  if (guard.length) return { ok: false, errors: guard };
  const errors: BuildPatternError[] = [];
  const r = resolveInputs(inputs);
  const pos = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be a positive number.` }); };
  pos('head_circumference', 'Head circumference');
  pos('crown_height', 'Crown height');
  if (r.finish === 'cuff') pos('cuff_height', 'Cuff height');
  if (!Number.isInteger(r.gores) || r.gores < MIN_GORES || r.gores > MAX_GORES) errors.push({ field: 'gores', message: `Gores must be a whole number from ${MIN_GORES} to ${MAX_GORES}.` });
  if (errors.length) return { ok: false, errors };
  if (!(r.circumference > 0)) errors.push({ field: 'ease', message: `An ease of ${inch(r.ease)} leaves no beanie round a ${inch(r.head_circumference)} head.` });
  else if (r.ease < -0.2 * r.head_circumference) errors.push({ field: 'ease', message: `${inch(-r.ease)} of negative ease is more than a fifth of the head; even a stretch fabric will not get over the head.` });
  return errors.length ? { ok: false, errors } : { ok: true };
}
