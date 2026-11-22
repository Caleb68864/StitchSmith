import type { BivyInputs, ResolvedInputs, ValidationResult, BuildPatternError, ArchSegment } from './types.js';
import { DEFAULT_UNITS, LENGTH_MM, FLOOR_WIDTH_MM, TUB_HEIGHT_MM, TOP_WIDTH_MM, ZIP_LENGTH_MM, FABRIC_WIDTH_MM, SEAM_ALLOWANCE_MM } from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';
import { chordArc } from '../../lib/pattern-engine/geometry/chordArc.js';

const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  length: { kind: 'length' },
  floor_width: { kind: 'length' },
  tub_height: { kind: 'length' },
  top_width: { kind: 'length' },
  zip_length: { kind: 'length' },
  fabric_width: { kind: 'length' },
  seam_allowance: { kind: 'number', min: 0, max: 100, label: 'Seam allowance' },
  head_gusset: { kind: 'enum', allowed: ['mesh', 'fabric'] },
  zip_side: { kind: 'enum', allowed: ['left', 'right'] },
};

const IN = 25.4;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** The gusset's cut outline: the arch offset out by the allowance, the chord down by it, joined square at the ends. */
export function gussetCut(arch: ArchSegment, sa: number): { w: number; h: number } {
  const half = (arch.radius + sa) * Math.sin(arch.theta / 2);
  // θ ≤ π, so the offset arc is widest at its ends; its top is the rise + the allowance above the chord.
  return { w: 2 * half, h: arch.rise + 2 * sa };
}

/** Normalise to millimetres and derive every cut size in one place. Never throws. */
export function resolveInputs(inputs: BivyInputs): ResolvedInputs {
  inputs = stripNulls(inputs ?? {});
  const units = inputs.units === 'mm' || inputs.units === 'in' ? inputs.units : DEFAULT_UNITS;
  const d = (v: unknown, fb: number) => (fin(v) ? toMm(v, units) : fb);
  const length = d(inputs.length, LENGTH_MM);
  const floor_width = d(inputs.floor_width, FLOOR_WIDTH_MM);
  const tub_height = d(inputs.tub_height, TUB_HEIGHT_MM);
  const top_width = d(inputs.top_width, TOP_WIDTH_MM);
  const zip_length = d(inputs.zip_length, ZIP_LENGTH_MM);
  const fabric_width = d(inputs.fabric_width, FABRIC_WIDTH_MM);
  const seam_allowance = fin(inputs.seam_allowance) ? inputs.seam_allowance : SEAM_ALLOWANCE_MM;
  const a = chordArc(floor_width, top_width);
  const arch = a.ok ? { radius: a.value.radius, theta: a.value.theta, rise: a.value.rise } : null;
  const s = seam_allowance;
  const g = arch ? gussetCut(arch, s) : { w: NaN, h: NaN };
  return {
    units, length, floor_width, tub_height, top_width, zip_length, fabric_width, seam_allowance,
    head_gusset: inputs.head_gusset === 'fabric' ? 'fabric' : 'mesh',
    zip_side: inputs.zip_side === 'right' ? 'right' : 'left',
    arch,
    head_height: tub_height + (arch ? arch.rise : NaN),
    floor_cut_length: length + 2 * tub_height + 2 * s,
    floor_cut_width: floor_width + 2 * tub_height + 2 * s,
    top_cut_length: length + 2 * s,
    top_cut_width: top_width + 2 * s,
    gusset_cut_width: g.w,
    gusset_cut_height: g.h,
  };
}

const inch = (mm: number) => `${(mm / IN).toFixed(2).replace(/\.?0+$/, '')}"`;

export function validateInputs(inputs: BivyInputs): ValidationResult {
  inputs = stripNulls(inputs ?? {});
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  if (guard.length) return { ok: false, errors: guard };
  const errors: BuildPatternError[] = [];
  const r = resolveInputs(inputs);
  const pos = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be a positive number.` }); };
  pos('length', 'Floor length');
  pos('floor_width', 'Floor width');
  pos('tub_height', 'Tub height');
  pos('top_width', 'Top width');
  pos('zip_length', 'Side zipper');
  pos('fabric_width', 'Fabric width');
  if (errors.length) return { ok: false, errors };
  if (r.top_width <= r.floor_width) errors.push({ field: 'top_width', message: `The top (${inch(r.top_width)}) must be wider than the ${inch(r.floor_width)} floor: the difference is the room above you.` });
  else if (!r.arch) errors.push({ field: 'top_width', message: `A ${inch(r.top_width)} top over a ${inch(r.floor_width)} floor is more than a half-circle; the end gussets cannot close it. Narrow the top or widen the floor.` });
  if (r.zip_length > r.length) errors.push({ field: 'zip_length', message: `A ${inch(r.zip_length)} zipper is longer than the ${inch(r.length)} side it runs along.` });
  if (r.floor_cut_width > r.fabric_width + 1e-6) errors.push({ field: 'floor_width', message: `The floor needs ${inch(r.floor_cut_width)} across (the width, both tub sides and the allowance) and the fabric is ${inch(r.fabric_width)}.` });
  if (r.top_cut_width > r.fabric_width + 1e-6) errors.push({ field: 'top_width', message: `The top needs ${inch(r.top_cut_width)} across and the fabric is ${inch(r.fabric_width)}.` });
  return errors.length ? { ok: false, errors } : { ok: true };
}
