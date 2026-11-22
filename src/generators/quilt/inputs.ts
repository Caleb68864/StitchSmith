import type { QuiltInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import {
  DEFAULT_UNITS, LENGTH_MM, SHOULDER_WIDTH_MM, FOOT_WIDTH_MM, FOOTBOX_LENGTH_MM, FABRIC_WIDTH_MM, LOFT_MM,
  BAFFLE_SPACING_MM, SHELL_DIFFERENTIAL_PCT, FILL_POWER, OVERSTUFF_PCT, SEAM_ALLOWANCE_MM,
} from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';
import { layoutChambers } from '../../lib/pattern-engine/primitives/chambers.js';
import { panelOutline } from './geometry.js';

/** Type/range guard run before the generator's own rules (hardening pass H1). */
const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  construction: { kind: 'enum', allowed: ['baffled', 'sewn_through'] },
  footbox: { kind: 'enum', allowed: ['sewn', 'zip'] },
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
  const foot_width = d(inputs.foot_width, FOOT_WIDTH_MM);
  const footbox_length = d(inputs.footbox_length, FOOTBOX_LENGTH_MM);
  const fabric_width = d(inputs.fabric_width, FABRIC_WIDTH_MM);
  const loft = d(inputs.loft, LOFT_MM);
  const baffle_spacing = d(inputs.baffle_spacing, BAFFLE_SPACING_MM);
  // A sewn-through quilt joins shell to liner at every line: they must be the same size.
  const shell_differential = construction === 'baffled' ? (fin(inputs.shell_differential) ? inputs.shell_differential : SHELL_DIFFERENTIAL_PCT) : 0;
  const fill_power = fin(inputs.fill_power) ? inputs.fill_power : FILL_POWER;
  const overstuff = fin(inputs.overstuff) ? inputs.overstuff : OVERSTUFF_PCT;
  const seam_allowance = fin(inputs.seam_allowance) ? inputs.seam_allowance : SEAM_ALLOWANCE_MM;
  const sane = length > 0 && shoulder_width > 0 && foot_width > 0 && seam_allowance >= 0;
  const chambersR = sane
    ? layoutChambers({
      length, spacing: baffle_spacing, loft, style: construction,
      // Fill the liner's width: the shell's differential bows over it, it does not add floor area.
      widthAt: (y) => shoulder_width + ((foot_width - shoulder_width) * y) / length,
      fillPower: fill_power, overstuffPct: overstuff,
    })
    : null;
  const chambers = chambersR && chambersR.ok ? chambersR.value : null;
  const f = 1 + shell_differential / 100;
  const liner = sane ? panelOutline(length, shoulder_width, foot_width, seam_allowance) : null;
  const shell = sane ? panelOutline(length, shoulder_width * f, foot_width * f, seam_allowance) : null;
  const cut_length = length + 2 * seam_allowance;
  return {
    units, construction, footbox, length, shoulder_width, foot_width, footbox_length, fabric_width,
    loft, baffle_spacing, shell_differential, fill_power, overstuff, seam_allowance,
    chambers,
    total_fill_g: chambers ? chambers.totalFillG : NaN,
    zipper_length: footbox === 'zip' ? footbox_length + foot_width / 2 : 0,
    liner_cut_width: liner ? liner.cutWidth : NaN,
    shell_cut_width: shell ? shell.cutWidth : NaN,
    cut_length,
    fabric_length: 2 * cut_length,
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
  if (r.footbox_length >= r.length) errors.push({ field: 'footbox_length', message: `A ${inch(r.footbox_length)} footbox is as long as the ${inch(r.length)} quilt.` });
  if (r.baffle_spacing > r.length) errors.push({ field: 'baffle_spacing', message: `Chamber spacing ${inch(r.baffle_spacing)} is longer than the ${inch(r.length)} quilt.` });
  const widest = Math.max(r.shell_cut_width, r.liner_cut_width);
  if (widest > r.fabric_width + 1e-6) {
    const which = r.shell_cut_width >= r.liner_cut_width && r.shell_differential > 0 ? `the shell needs ${inch(r.shell_cut_width)} across (the ${r.shell_differential} % differential and the seam allowance included)` : `each panel needs ${inch(widest)} across (the seam allowance included)`;
    errors.push({ field: 'shoulder_width', message: `At the shoulders ${which} and the fabric is ${inch(r.fabric_width)}. Narrow the quilt, lower the differential or use wider fabric.` });
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
