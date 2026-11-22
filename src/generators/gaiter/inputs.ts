import type { GaiterInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import {
  DEFAULT_UNITS, HEIGHT_MM, TOP_CIRCUMFERENCE_MM, BOTTOM_CIRCUMFERENCE_MM, FRONT_DROP_MM, OVERLAP_MM, HEM_DEPTH_MM,
  CHANNEL_DEPTH_MM, ELASTIC_PCT, INSTEP_STRAP_MM, FABRIC_WIDTH_MM, SEAM_ALLOWANCE_MM,
} from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';
import { resolveHem } from '../../lib/pattern-engine/primitives/hem.js';
import { gaiterShape } from './geometry.js';

const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  height: { kind: 'length' },
  top_circumference: { kind: 'length' },
  bottom_circumference: { kind: 'length' },
  front_drop: { kind: 'length' },
  closure: { kind: 'enum', allowed: ['velcro', 'zipper'] },
  overlap: { kind: 'length' },
  hem_depth: { kind: 'length' },
  channel_depth: { kind: 'length' },
  hem_fold: { kind: 'enum', allowed: ['single', 'double'] },
  elastic_pct: { kind: 'number', min: 0, max: 100, label: 'Elastic length' },
  instep_strap_length: { kind: 'length' },
  fabric_width: { kind: 'length' },
  seam_allowance: { kind: 'number', min: 0, max: 100, label: 'Seam allowance' },
};

const IN = 25.4;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function resolveInputs(inputs: GaiterInputs): ResolvedInputs {
  inputs = stripNulls(inputs ?? {});
  const units = inputs.units === 'mm' || inputs.units === 'in' ? inputs.units : DEFAULT_UNITS;
  const d = (v: unknown, fb: number) => (fin(v) ? toMm(v, units) : fb);
  const closure = inputs.closure === 'zipper' ? 'zipper' : 'velcro';
  // Rolled by default, as on the shelter line: gaiter nylons fray.
  const hem_fold = inputs.hem_fold === 'single' ? 'single' : 'double';
  const height = d(inputs.height, HEIGHT_MM);
  const top_circumference = d(inputs.top_circumference, TOP_CIRCUMFERENCE_MM);
  const bottom_circumference = d(inputs.bottom_circumference, BOTTOM_CIRCUMFERENCE_MM);
  const front_drop = d(inputs.front_drop, FRONT_DROP_MM);
  const overlap = closure === 'velcro' ? d(inputs.overlap, OVERLAP_MM) : 0;
  const hemOf = (depth: number) => { const h = resolveHem({ depth: Math.max(0, depth), fold: hem_fold }); return h.ok ? h.value : { depth: 0, allowance: 0 }; };
  const hem = hemOf(d(inputs.hem_depth, HEM_DEPTH_MM));
  const chan = hemOf(d(inputs.channel_depth, CHANNEL_DEPTH_MM));
  const seam_allowance = fin(inputs.seam_allowance) ? inputs.seam_allowance : SEAM_ALLOWANCE_MM;
  const front_allowance: [number, number] = closure === 'velcro' ? [hem.allowance, overlap + hem.allowance] : [seam_allowance, seam_allowance];
  const elastic_pct = fin(inputs.elastic_pct) ? inputs.elastic_pct : ELASTIC_PCT;
  const shape = height > 0 && top_circumference > 0 && bottom_circumference > 0 && front_drop >= 0
    ? gaiterShape({ top: top_circumference, bottom: bottom_circumference, height, drop: front_drop, channelAllowance: chan.allowance, hemAllowance: hem.allowance, front: front_allowance })
    : null;
  return {
    units, height, top_circumference, bottom_circumference, front_drop, closure, overlap,
    hem_depth: hem.depth, channel_depth: chan.depth, hem_fold, elastic_pct,
    instep_strap_length: d(inputs.instep_strap_length, INSTEP_STRAP_MM),
    fabric_width: d(inputs.fabric_width, FABRIC_WIDTH_MM),
    seam_allowance,
    hem_allowance: hem.allowance,
    channel_allowance: chan.allowance,
    front_allowance,
    front_length: height + front_drop,
    elastic_length: (elastic_pct / 100) * top_circumference,
    cut_width: shape ? shape.width : NaN,
    cut_height: shape ? shape.height : NaN,
  };
}

const inch = (mm: number) => `${(mm / IN).toFixed(2).replace(/\.?0+$/, '')}"`;

export function validateInputs(inputs: GaiterInputs): ValidationResult {
  inputs = stripNulls(inputs ?? {});
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  if (guard.length) return { ok: false, errors: guard };
  const errors: BuildPatternError[] = [];
  const r = resolveInputs(inputs);
  const pos = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be a positive number.` }); };
  pos('height', 'Height');
  pos('top_circumference', 'Top circumference');
  pos('bottom_circumference', 'Bottom circumference');
  pos('channel_depth', 'Elastic channel');
  pos('fabric_width', 'Fabric width');
  pos('instep_strap_length', 'Instep strap');
  if (r.closure === 'velcro') pos('overlap', 'Hook-and-loop overlap');
  if (!(r.elastic_pct > 0)) errors.push({ field: 'elastic_pct', message: 'Elastic length must be more than 0 % of the top circumference.' });
  if (!(r.front_drop >= 0)) errors.push({ field: 'front_drop', message: 'Front drop must be 0 or greater.' });
  if (errors.length) return { ok: false, errors };
  if (r.front_drop >= r.height / 2) errors.push({ field: 'front_drop', message: `A ${inch(r.front_drop)} front drop is more than half the ${inch(r.height)} height.` });
  if (!Number.isFinite(r.cut_width)) errors.push({ field: 'bottom_circumference', message: `A ${inch(r.top_circumference)} top and a ${inch(r.bottom_circumference)} bottom are too different for a ${inch(r.height)} gaiter: the flat piece would wrap round on itself.` });
  else if (r.cut_width > r.fabric_width + 1e-6) errors.push({ field: 'fabric_width', message: `One gaiter needs ${inch(r.cut_width)} of fabric across and the fabric is ${inch(r.fabric_width)}.` });
  return errors.length ? { ok: false, errors } : { ok: true };
}
