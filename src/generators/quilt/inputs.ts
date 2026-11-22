import type { QuiltInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import {
  DEFAULT_UNITS, LENGTH_MM, SHOULDER_WIDTH_MM, FOOT_WIDTH_MM, FOOTBOX_LENGTH_MM, FABRIC_WIDTH_MM, LOFT_MM,
  BAFFLE_SPACING_MM, SHELL_DIFFERENTIAL_PCT, FILL_POWER, OVERSTUFF_PCT, SEAM_ALLOWANCE_MM, END_CHANNEL_MM, NECK_CHANNEL_MM, PAD_WIDTH_MM,
} from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';
import { layoutChambers } from '../../lib/pattern-engine/primitives/chambers.js';
import { resolveHem } from '../../lib/pattern-engine/primitives/hem.js';
import { panelOutline } from './geometry.js';

/** Type/range guard run before the generator's own rules (hardening pass H1). */
const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  construction: { kind: 'enum', allowed: ['baffled', 'sewn_through'] },
  footbox: { kind: 'enum', allowed: ['sewn', 'zip'] },
  kind: { kind: 'enum', allowed: ['top_quilt', 'underquilt'] },
  end_channel: { kind: 'length' },
  neck: { kind: 'enum', allowed: ['none', 'drawcord'] },
  neck_channel: { kind: 'length' },
  pad_straps: { kind: 'bool' },
  side_baffles: { kind: 'bool' },
  join_widths: { kind: 'bool' },
  pad_width: { kind: 'length' },
  length: { kind: 'length' },
  shoulder_width: { kind: 'length' },
  foot_width: { kind: 'length' },
  footbox_length: { kind: 'length' },
  fabric_width: { kind: 'length' },
  loft: { kind: 'length' },
  baffle_spacing: { kind: 'length' },
  shell_differential: { kind: 'number', min: 0, max: 50, label: 'Shell differential' },
  fill_power: { kind: 'number', min: 0, max: 2000, label: 'Fill power' },
  overstuff: { kind: 'number', min: 0, max: 100, label: 'Overstuff' },
  seam_allowance: { kind: 'number', min: 0, max: 100, label: 'Seam allowance' },
};

const IN = 25.4;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Normalise to millimetres and derive every cut dimension and the fill in one
 * place, so the pattern, the BOM and the page cannot disagree. Never throws.
 */
export function resolveInputs(inputs: QuiltInputs): ResolvedInputs {
  inputs = stripNulls(inputs ?? {});
  const units = inputs.units === 'mm' || inputs.units === 'in' ? inputs.units : DEFAULT_UNITS;
  const d = (v: unknown, fallbackMm: number) => (fin(v) ? toMm(v, units) : fallbackMm);
  const construction = inputs.construction === 'sewn_through' ? 'sewn_through' : 'baffled';
  const footbox = inputs.footbox === 'zip' ? 'zip' : 'sewn';
  const length = d(inputs.length, LENGTH_MM);
  const shoulder_width = d(inputs.shoulder_width, SHOULDER_WIDTH_MM);
  const kind = inputs.kind === 'underquilt' ? 'underquilt' : 'top_quilt';
  const uq = kind === 'underquilt';
  // An underquilt is a rectangle: the foot width follows the shoulder width.
  const foot_width = uq ? shoulder_width : d(inputs.foot_width, FOOT_WIDTH_MM);
  // Underquilt ends: a rolled channel for the shock cord (Hem primitive at the channel depth), both layers together.
  const chanR = uq ? resolveHem({ depth: Math.max(0, d(inputs.end_channel, END_CHANNEL_MM)), fold: 'double' }) : null;
  const end_channel = chanR && chanR.ok ? chanR.value.depth : 0;
  const end_allowance = chanR && chanR.ok ? chanR.value.allowance : NaN;
  const footbox_length = d(inputs.footbox_length, FOOTBOX_LENGTH_MM);
  const fabric_width = d(inputs.fabric_width, FABRIC_WIDTH_MM);
  const loft = d(inputs.loft, LOFT_MM);
  const baffle_spacing = d(inputs.baffle_spacing, BAFFLE_SPACING_MM);
  // A sewn-through quilt joins shell to liner at every line: they must be the same size.
  const shell_differential = construction === 'baffled' ? (fin(inputs.shell_differential) ? inputs.shell_differential : SHELL_DIFFERENTIAL_PCT) : 0;
  const fill_power = fin(inputs.fill_power) ? inputs.fill_power : FILL_POWER;
  const overstuff = fin(inputs.overstuff) ? inputs.overstuff : OVERSTUFF_PCT;
  const seam_allowance = fin(inputs.seam_allowance) ? inputs.seam_allowance : SEAM_ALLOWANCE_MM;
  const endA = uq ? end_allowance : seam_allowance;
  // A top quilt's neck drawcord: a rolled channel across the head, both layers together.
  const neck = !uq && inputs.neck === 'drawcord' ? 'drawcord' : 'none';
  const neckR = neck === 'drawcord' ? resolveHem({ depth: Math.max(0, d(inputs.neck_channel, NECK_CHANNEL_MM)), fold: 'double' }) : null;
  const head_channel = uq ? end_channel : neckR && neckR.ok ? neckR.value.depth : 0;
  const foot_channel = uq ? end_channel : 0;
  const head_allowance = uq ? end_allowance : neckR && neckR.ok ? neckR.value.allowance : seam_allowance;
  const foot_allowance = uq ? end_allowance : seam_allowance;
  const sane = length > 0 && shoulder_width > 0 && foot_width > 0 && seam_allowance >= 0 && Number.isFinite(endA) && Number.isFinite(head_allowance) && head_channel + foot_channel < length;
  // End channels close the first and last chambers: the chambers fill the length between them.
  const c = head_channel;
  const chambersR = sane
    ? layoutChambers({
      length: length - head_channel - foot_channel, spacing: baffle_spacing, loft, style: construction,
      // Fill the narrower layer's width: the differential bows the other over it, it does not add floor area.
      widthAt: (y) => shoulder_width + ((foot_width - shoulder_width) * (y + c)) / length,
      fillPower: fill_power, overstuffPct: overstuff,
    })
    : null;
  const raw = chambersR && chambersR.ok ? chambersR.value : null;
  const chambers = raw && c > 0
    ? { ...raw, wallY: raw.wallY.map((y) => y + c), chambers: raw.chambers.map((ch) => ({ ...ch, y0: ch.y0 + c, y1: ch.y1 + c })) }
    : raw;
  const f = 1 + shell_differential / 100;
  const wider_layer = uq ? 'liner' : 'shell';
  const fs = wider_layer === 'shell' ? f : 1, fl = wider_layer === 'liner' ? f : 1;
  const liner = sane ? panelOutline(length, shoulder_width * fl, foot_width * fl, seam_allowance, head_allowance, foot_allowance) : null;
  const shell = sane ? panelOutline(length, shoulder_width * fs, foot_width * fs, seam_allowance, head_allowance, foot_allowance) : null;
  const cut_length = length + head_allowance + foot_allowance;
  return {
    units, kind, construction, footbox, end_channel, end_allowance: endA, wider_layer,
    neck, pad_straps: inputs.pad_straps === true, side_baffles: construction === 'baffled' && inputs.side_baffles === true, pad_width: d(inputs.pad_width, PAD_WIDTH_MM),
    head_channel, foot_channel, head_allowance, foot_allowance, length, shoulder_width, foot_width, footbox_length, fabric_width,
    loft, baffle_spacing, shell_differential, fill_power, overstuff, seam_allowance,
    chambers,
    total_fill_g: chambers ? chambers.totalFillG : NaN,
    zipper_length: !uq && footbox === 'zip' ? footbox_length + foot_width / 2 : 0,
    liner_cut_width: liner ? liner.cutWidth : NaN,
    shell_cut_width: shell ? shell.cutWidth : NaN,
    cut_length,
    join_widths: inputs.join_widths === true,
    piece_cut_width: inputs.join_widths === true ? Math.max(liner?.cutWidth ?? NaN, shell?.cutWidth ?? NaN) / 2 + seam_allowance : Math.max(liner?.cutWidth ?? NaN, shell?.cutWidth ?? NaN),
    // Each layer: one length off the roll, or two halves side by side when they fit (end to end when not).
    fabric_length: 2 * cut_length * (inputs.join_widths === true && 2 * (Math.max(liner?.cutWidth ?? 0, shell?.cutWidth ?? 0) / 2 + seam_allowance) > fabric_width ? 2 : 1),
  };
}

const inch = (mm: number) => `${(mm / IN).toFixed(2).replace(/\.?0+$/, '')}"`;

export function validateInputs(inputs: QuiltInputs): ValidationResult {
  inputs = stripNulls(inputs ?? {});
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  if (guard.length) return { ok: false, errors: guard };
  const errors: BuildPatternError[] = [];
  const r = resolveInputs(inputs);
  const pos = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be a positive number.` }); };
  pos('length', 'Length');
  pos('shoulder_width', 'Shoulder width');
  pos('foot_width', 'Foot width');
  pos('footbox_length', 'Footbox length');
  pos('fabric_width', 'Fabric width');
  pos('loft', 'Loft');
  pos('baffle_spacing', 'Chamber spacing');
  pos('fill_power', 'Fill power');
  if (errors.length) return { ok: false, errors };
  if (!r.chambers) return { ok: false, errors: [{ field: 'baffle_spacing', message: `Chamber spacing ${inch(r.baffle_spacing)} gives too many chambers along the ${inch(r.length)} quilt.` }] };
  if (r.kind === 'underquilt' && !(r.end_channel > 0)) return { ok: false, errors: [{ field: 'end_channel', message: 'End channel must be a positive number: the suspension cord runs through it.' }] };
  if (r.kind === 'underquilt' && 2 * r.end_channel >= r.length) return { ok: false, errors: [{ field: 'end_channel', message: 'The two end channels take up the whole length.' }] };
  if (r.neck === 'drawcord' && !(r.head_channel > 0)) return { ok: false, errors: [{ field: 'neck_channel', message: 'Neck channel must be a positive number: the drawcord runs through it.' }] };
  if (r.pad_straps && !(r.pad_width > 0)) return { ok: false, errors: [{ field: 'pad_width', message: 'Pad width must be a positive number.' }] };
  if (r.kind === 'top_quilt' && r.footbox_length >= r.length) errors.push({ field: 'footbox_length', message: `A ${inch(r.footbox_length)} footbox is as long as the ${inch(r.length)} quilt.` });
  if (r.baffle_spacing > r.length) errors.push({ field: 'baffle_spacing', message: `Chamber spacing ${inch(r.baffle_spacing)} is longer than the ${inch(r.length)} quilt.` });
  const widest = r.piece_cut_width;
  if (widest > r.fabric_width + 1e-6 && r.join_widths) {
    errors.push({ field: 'shoulder_width', message: `Even joined down the centre, each half needs ${inch(widest)} across and the fabric is ${inch(r.fabric_width)}.` });
  } else if (widest > r.fabric_width + 1e-6) {
    const which = r.shell_differential > 0 ? `the ${r.wider_layer} needs ${inch(widest)} across (the ${r.shell_differential} % differential and the seam allowance included)` : `each panel needs ${inch(widest)} across (the seam allowance included)`;
    errors.push({ field: 'shoulder_width', message: `At the shoulders ${which} and the fabric is ${inch(r.fabric_width)}. Narrow the quilt, lower the differential, use wider fabric or join two widths down the centre.` });
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
