import type { HammockInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import { DEFAULT_UNITS, LENGTH_MM, WIDTH_MM, FABRIC_WIDTH_MM, SIDE_HEM_DEPTH_MM, CHANNEL_DEPTH_MM, WHIP_TAIL_MM, RIDGELINE_PCT, STRAP_LENGTH_MM } from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';
import { resolveHem } from '../../lib/pattern-engine/primitives/hem.js';

/** Type/range guard run before the generator's own rules (hardening pass H1). */
const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  end_style: { kind: 'enum', allowed: ['channel', 'whipping'] },
  side_edge: { kind: 'enum', allowed: ['hem', 'selvedge'] },
  length: { kind: 'length' },
  width: { kind: 'length' },
  fabric_width: { kind: 'length' },
  side_hem_depth: { kind: 'length' },
  channel_depth: { kind: 'length' },
  whip_tail: { kind: 'length' },
  hem_fold: { kind: 'enum', allowed: ['single', 'double'] },
  production_mode: { kind: 'bool' },
  ridgeline_pct: { kind: 'number', min: 0, max: 100, label: 'Structural ridgeline' },
  seam_allowance: { kind: 'number', min: 0, max: 100, label: 'Seam allowance' },
  occupant_weight: { kind: 'number', min: 0, max: 1000, label: 'Occupant weight' },
  fabric_rating: { kind: 'number', min: 0, max: 1000, label: 'Fabric rating' },
  layers: { kind: 'count', max: 2 },
  suspension: { kind: 'enum', allowed: ['none', 'tree_straps'] },
  strap_length: { kind: 'length' },
};

const IN = 25.4;
const LB = 0.45359237;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }
/** Display weight (lb with inches, kg with millimetres) to kg. */
export function toKg(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * LB : v; }
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Normalise to millimetres and derive every cut dimension in one place, so the
 * pattern, the BOM and the page cannot disagree. Never throws.
 */
export function resolveInputs(inputs: HammockInputs): ResolvedInputs {
  inputs = stripNulls(inputs ?? {});
  const units = inputs.units === 'mm' || inputs.units === 'in' ? inputs.units : DEFAULT_UNITS;
  const d = (v: unknown, fallbackMm: number) => (fin(v) ? toMm(v, units) : fallbackMm);
  const end_style = inputs.end_style === 'whipping' ? 'whipping' : 'channel';
  const side_edge = inputs.side_edge === 'selvedge' ? 'selvedge' : 'hem';
  const length = d(inputs.length, LENGTH_MM);
  const width = d(inputs.width, WIDTH_MM);
  const fabric_width = d(inputs.fabric_width, FABRIC_WIDTH_MM);
  // Rolled by default, like the tarp: hammock nylon frays (decisions.md 2026-11-16).
  const hem_fold = inputs.hem_fold === 'single' ? 'single' : 'double';
  const production_mode = inputs.production_mode === true;
  const sideReq = d(inputs.side_hem_depth, SIDE_HEM_DEPTH_MM);
  const chanReq = d(inputs.channel_depth, CHANNEL_DEPTH_MM);
  const whip_tail = d(inputs.whip_tail, WHIP_TAIL_MM);
  const hemOf = (depth: number) => { const h = resolveHem({ depth: Math.max(0, depth), fold: hem_fold, productionMode: production_mode }); return h.ok ? h.value : { depth: 0, allowance: 0, raised: false }; };
  const side = hemOf(sideReq);
  const chan = hemOf(chanReq);
  const ridgeline_pct = fin(inputs.ridgeline_pct) ? inputs.ridgeline_pct : RIDGELINE_PCT;
  const side_allowance = side_edge === 'hem' ? side.allowance : 0;
  // A whipping tail's raw end gets the side hem's rolled finish so it cannot fray back to the whipping.
  const end_allowance = end_style === 'channel' ? chan.allowance : whip_tail + side.allowance;
  const cut_length = length + 2 * end_allowance;
  const cut_width = width + 2 * side_allowance;
  return {
    units, end_style, side_edge, length, width, fabric_width,
    side_hem_depth: side.depth, channel_depth: chan.depth, whip_tail, hem_fold, production_mode,
    ridgeline_pct,
    layers: inputs.layers === 2 ? 2 : 1,
    suspension: inputs.suspension === 'tree_straps' ? 'tree_straps' : 'none',
    strap_length: d(inputs.strap_length, STRAP_LENGTH_MM),
    // No joining seam on a one-piece hammock.
    seam_allowance: 0,
    occupant_kg: fin(inputs.occupant_weight) ? toKg(inputs.occupant_weight, units) : NaN,
    rating_kg: fin(inputs.fabric_rating) ? toKg(inputs.fabric_rating, units) : NaN,
    side_allowance, end_allowance,
    hem_raised: (side_edge === 'hem' || end_style === 'whipping' ? side.raised : false) || (end_style === 'channel' ? chan.raised : false),
    cut_length, cut_width,
    fabric_length: (inputs.layers === 2 ? 2 : 1) * cut_length,
    fabric_trim: fabric_width - cut_width,
    ridgeline_length: (ridgeline_pct / 100) * length,
  };
}

const inch = (mm: number) => `${(mm / IN).toFixed(2).replace(/\.?0+$/, '')}"`;

export function validateInputs(inputs: HammockInputs): ValidationResult {
  inputs = stripNulls(inputs ?? {});
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  if (guard.length) return { ok: false, errors: guard };
  const errors: BuildPatternError[] = [];
  const r = resolveInputs(inputs);
  const pos = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be a positive number.` }); };
  pos('length', 'Length');
  pos('width', 'Width');
  pos('fabric_width', 'Fabric width');
  const units = r.units;
  const raw = (v: unknown, fb: number) => (fin(v) ? toMm(v, units) : fb);
  if (raw(inputs.side_hem_depth, SIDE_HEM_DEPTH_MM) < 0) errors.push({ field: 'side_hem_depth', message: 'Side hem depth must be 0 or greater.' });
  if (r.end_style === 'channel' && !(r.channel_depth > 0)) errors.push({ field: 'channel_depth', message: 'Channel depth must be a positive number: the cord has to pass through it.' });
  if (r.end_style === 'whipping' && !(r.whip_tail > 0)) errors.push({ field: 'whip_tail', message: 'Whip tail must be a positive number: the whipping needs fabric beyond the line to grip.' });
  if (!(r.ridgeline_pct > 0 && r.ridgeline_pct < 100)) errors.push({ field: 'ridgeline_pct', message: 'Structural ridgeline must be more than 0 % and less than 100 % of the length.' });
  if (errors.length) return { ok: false, errors };
  if (r.cut_width > r.fabric_width + 1e-6) {
    errors.push({
      field: 'width',
      message: r.side_edge === 'hem'
        ? `The body needs ${inch(r.cut_width)} of fabric across (the width and both side hems) and the fabric is ${inch(r.fabric_width)}. Narrow the hammock, use the selvedge as the side edge or use wider fabric.`
        : `On the selvedge the body is the fabric's width: ${inch(r.width)} is wider than the ${inch(r.fabric_width)} fabric. Narrow the hammock or use wider fabric.`,
    });
  }
  if (inputs.layers !== undefined && inputs.layers !== 1 && inputs.layers !== 2) errors.push({ field: 'layers', message: 'Layers must be 1 or 2.' });
  if (r.suspension === 'tree_straps' && !(r.strap_length > 0)) errors.push({ field: 'strap_length', message: 'Tree strap must be a positive number.' });
  if (r.end_style === 'channel' && r.channel_depth * 2 >= r.length) errors.push({ field: 'channel_depth', message: `Two ${inch(r.channel_depth)} channels take up the whole ${inch(r.length)} length.` });
  return errors.length ? { ok: false, errors } : { ok: true };
}
