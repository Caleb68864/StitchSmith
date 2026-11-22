import type { TarpInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import {
  DEFAULT_UNITS, RIDGE_LENGTH_MM, WIDTH_MM, RIDGE_SAG_MM, EAVE_SAG_MM, FABRIC_WIDTH_MM, SEAM_ALLOWANCE_MM, HEM_DEPTH_MM,
  EAVE_TIEOUTS, PATCH_SIZE_MM, LOOP_LENGTH_MM, LOOP_WIDTH_MM, RIDGE_HEIGHT_MM, MAX_EAVE_TIEOUTS, GUYLINE_LENGTH_MM, END_SAG_MM,
} from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';
import { resolveHem } from '../../lib/pattern-engine/primitives/hem.js';
import { catenary, MAX_SAG_RATIO } from '../../lib/pattern-engine/geometry/catenary.js';

/** Type/range guard run before the generator's own rules (hardening pass H1). */
const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  construction: { kind: 'enum', allowed: ['ridge_seam', 'single_panel'] },
  cut_style: { kind: 'enum', allowed: ['flat', 'cat_cut'] },
  ridge_length: { kind: 'length' },
  width: { kind: 'length' },
  ridge_sag: { kind: 'length' },
  eave_sag: { kind: 'length' },
  fabric_width: { kind: 'length' },
  seam_allowance: { kind: 'number', min: 0, max: 100, label: 'Ridge seam allowance' },
  hem_depth: { kind: 'length' },
  hem_fold: { kind: 'enum', allowed: ['single', 'double'] },
  production_mode: { kind: 'bool' },
  eave_tieouts: { kind: 'count', max: MAX_EAVE_TIEOUTS },
  ridge_tieouts: { kind: 'bool' },
  patch_size: { kind: 'length' },
  loop_length: { kind: 'length' },
  loop_width: { kind: 'length' },
  ridge_height: { kind: 'length' },
  guylines: { kind: 'bool' },
  guyline_length: { kind: 'length' },
  line_locks: { kind: 'bool' },
  cut_ends: { kind: 'bool' },
  pullouts: { kind: 'bool' },
  doors: { kind: 'enum', allowed: ['none', 'one_end', 'both_ends'] },
  end_sag: { kind: 'length' },
};

const IN = 25.4;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function arcLength(span: number, sag: number): number {
  const c = catenary(span, sag);
  return c.ok ? c.value.arcLength : span;
}

/**
 * Normalise to millimetres and derive every cut dimension in one place, so the
 * pattern, the BOM and the page cannot disagree. Never throws: the page calls it
 * on every keystroke, before validation has spoken.
 */
export function resolveInputs(inputs: TarpInputs): ResolvedInputs {
  inputs = stripNulls(inputs ?? {});
  const units = inputs.units === 'mm' || inputs.units === 'in' ? inputs.units : DEFAULT_UNITS;
  const d = (v: unknown, fallbackMm: number) => (fin(v) ? toMm(v, units) : fallbackMm);
  const construction = inputs.construction === 'single_panel' ? 'single_panel' : 'ridge_seam';
  const cut_style = inputs.cut_style === 'flat' ? 'flat' : 'cat_cut';
  const ridge_length = d(inputs.ridge_length, RIDGE_LENGTH_MM);
  const width = d(inputs.width, WIDTH_MM);
  const catCut = cut_style === 'cat_cut';
  // A single panel has no ridge seam to cut a curve into.
  const ridge_sag = catCut && construction === 'ridge_seam' ? d(inputs.ridge_sag, RIDGE_SAG_MM) : 0;
  const eave_sag = catCut ? d(inputs.eave_sag, EAVE_SAG_MM) : 0;
  const fabric_width = d(inputs.fabric_width, FABRIC_WIDTH_MM);
  const seam_allowance = construction === 'ridge_seam' ? (fin(inputs.seam_allowance) ? inputs.seam_allowance : SEAM_ALLOWANCE_MM) : 0;
  // Rolled by default: silnylon frays, and a rolled hem encloses the raw edge (decisions.md 2026-11-16).
  const hem_fold = inputs.hem_fold === 'single' ? 'single' : 'double';
  const production_mode = inputs.production_mode === true;
  const hemReq = d(inputs.hem_depth, HEM_DEPTH_MM);
  const hemR = resolveHem({ depth: Math.max(0, hemReq), fold: hem_fold, productionMode: production_mode });
  const hem = hemR.ok ? hemR.value : { depth: 0, allowance: 0, markFromRaw: 0, raised: false };
  const eave_tieouts = fin(inputs.eave_tieouts) ? inputs.eave_tieouts : EAVE_TIEOUTS;
  const ridge_tieouts = inputs.ridge_tieouts !== false;
  const patch_size = d(inputs.patch_size, PATCH_SIZE_MM);
  const loop_length = d(inputs.loop_length, LOOP_LENGTH_MM);
  const loop_width = d(inputs.loop_width, LOOP_WIDTH_MM);
  const ridge_height = d(inputs.ridge_height, RIDGE_HEIGHT_MM);
  const guylines = inputs.guylines !== false;
  const pullouts = inputs.pullouts === true;
  const doors = inputs.doors === 'one_end' || inputs.doors === 'both_ends' ? inputs.doors : 'none';
  const guyline_length = d(inputs.guyline_length, GUYLINE_LENGTH_MM);
  const line_locks = inputs.line_locks !== false;
  const end_sag = catCut && inputs.cut_ends === true ? d(inputs.end_sag, END_SAG_MM) : 0;

  const panel_count = construction === 'ridge_seam' ? 2 : 1;
  const panel_finished_width = construction === 'ridge_seam' ? width / 2 : width;
  const panel_mid_width = panel_finished_width - ridge_sag - (construction === 'ridge_seam' ? 1 : 2) * eave_sag;
  const allow = hem.allowance;
  const panel_cut_length = ridge_length + 2 * allow;
  const panel_cut_width = construction === 'ridge_seam' ? seam_allowance + panel_finished_width + allow : panel_finished_width + 2 * allow;
  const half = width / 2;
  const reaches = half > ridge_height;
  // A door half is the right triangle the pitched end leaves: the panel end (half the width) as hypotenuse,
  // the ridgeline height down the middle, half the footprint along the ground. Every edge hemmed.
  const door_ends = doors === 'both_ends' ? 2 : doors === 'one_end' ? 1 : 0;
  const door_height = Math.max(0, ridge_height);
  const door_base = reaches ? Math.sqrt(half * half - door_height * door_height) : 0;
  const doorCut = door_ends > 0 && reaches ? doorCutBox(door_base, door_height, allow) : { w: 0, h: 0 };
  // Two halves side by side across the roll when they fit, else one after the other.
  const door_fabric_length = door_ends === 0 ? 0 : (2 * doorCut.w <= fabric_width ? 1 : 2) * door_ends * doorCut.h;
  return {
    units, construction, cut_style, ridge_length, width, ridge_sag, eave_sag, fabric_width, seam_allowance,
    hem_depth: hem.depth, hem_depth_requested: hemReq, hem_raised: hem.raised, hem_fold, production_mode,
    eave_tieouts, ridge_tieouts, patch_size, loop_length, loop_width, ridge_height, guylines, guyline_length, line_locks, end_sag, pullouts,
    // Each panel's end runs ridge to eave; a single panel's end is cut as two halves either side of the ridge line.
    end_span: width / 2,
    hem_allowance: allow,
    hem_mark: hem.markFromRaw,
    panel_count,
    panel_finished_width,
    panel_mid_width,
    panel_cut_length,
    panel_cut_width,
    fabric_length: panel_count * panel_cut_length + door_fabric_length,
    doors, door_ends, door_height, door_base, door_fabric_length,
    ridge_curve_length: arcLength(ridge_length, ridge_sag),
    eave_curve_length: arcLength(ridge_length, eave_sag),
    tieout_count: 4 + 2 * Math.max(0, Math.round(eave_tieouts)) + (ridge_tieouts ? 2 : 0) + (pullouts ? 2 : 0),
    pitch_deg: reaches && half > 0 ? (Math.asin(Math.max(0, ridge_height) / half) * 180) / Math.PI : 90,
    footprint_width: reaches ? 2 * Math.sqrt(half * half - Math.max(0, ridge_height) ** 2) : 0,
    eave_clearance: reaches ? 0 : ridge_height - half,
  };
}

/**
 * A door half's finished right triangle (apex at the ridge, the centre edge
 * down, the ground edge out) offset by the hem allowance on every edge: its
 * cut corners and bounding box. One place, so the fabric total, the check
 * and the drawn piece agree.
 */
export function doorCut(base: number, height: number, allow: number): { finished: { x: number; y: number }[]; cut: { x: number; y: number }[] } {
  const finished = [{ x: 0, y: 0 }, { x: 0, y: height }, { x: base, y: height }];
  const L = Math.hypot(base, height);
  // Offset lines: centre x = -a, ground y = h + a, hypotenuse moved out along its normal (h, -b)/L.
  const a = allow;
  const hx = (y: number) => (base * y) / height + (a * L) / height; // hypotenuse offset: x = b·y/h + a·L/h
  const apex = { x: -a, y: (height * (-a - (a * L) / height)) / base };
  const cut = [apex, { x: -a, y: height + a }, { x: hx(height + a), y: height + a }];
  return { finished, cut };
}
export function doorCutBox(base: number, height: number, allow: number): { w: number; h: number } {
  if (!(base > 0 && height > 0)) return { w: 0, h: 0 };
  const { cut } = doorCut(base, height, allow);
  const xs = cut.map((p) => p.x), ys = cut.map((p) => p.y);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

const inch = (mm: number) => `${(mm / IN).toFixed(2).replace(/\.?0+$/, '')}"`;

export function validateInputs(inputs: TarpInputs): ValidationResult {
  inputs = stripNulls(inputs ?? {});
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  if (guard.length) return { ok: false, errors: guard };
  const errors: BuildPatternError[] = [];
  const r = resolveInputs(inputs);
  const pos = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be a positive number.` }); };
  const nonNeg = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v < 0) errors.push({ field, message: `${label} must be 0 or greater.` }); };
  pos('ridge_length', 'Ridge length');
  pos('width', 'Width');
  pos('fabric_width', 'Fabric width');
  nonNeg('ridge_sag', 'Ridge cat-cut depth');
  nonNeg('eave_sag', 'Eave cat-cut depth');
  nonNeg('end_sag', 'End cat-cut depth');
  nonNeg('seam_allowance', 'Ridge seam allowance');
  nonNeg('patch_size', 'Patch size');
  pos('loop_length', 'Loop length');
  pos('loop_width', 'Grosgrain width');
  pos('ridge_height', 'Ridgeline height');
  if (r.guylines) pos('guyline_length', 'Cord per guyline');
  if (!Number.isFinite(r.hem_depth_requested) || r.hem_depth_requested < 0) errors.push({ field: 'hem_depth', message: 'Hem depth must be 0 or greater.' });
  if (!Number.isInteger(r.eave_tieouts) || r.eave_tieouts < 0 || r.eave_tieouts > MAX_EAVE_TIEOUTS) errors.push({ field: 'eave_tieouts', message: `Tie-outs per eave must be a whole number from 0 to ${MAX_EAVE_TIEOUTS}.` });
  if (errors.length) return { ok: false, errors };

  const cap = MAX_SAG_RATIO * r.ridge_length;
  if (r.ridge_sag > cap) errors.push({ field: 'ridge_sag', message: `A ${inch(r.ridge_sag)} ridge cut on a ${inch(r.ridge_length)} ridge is deeper than a quarter of the span; that is no longer a cat cut.` });
  if (r.eave_sag > cap) errors.push({ field: 'eave_sag', message: `A ${inch(r.eave_sag)} eave cut on a ${inch(r.ridge_length)} eave is deeper than a quarter of the span; that is no longer a cat cut.` });
  if (r.panel_cut_width > r.fabric_width + 1e-6) {
    errors.push({
      field: r.construction === 'single_panel' ? 'construction' : 'width',
      message: r.construction === 'single_panel'
        ? `One panel needs ${inch(r.panel_cut_width)} of fabric across and the fabric is ${inch(r.fabric_width)}. Use the ridge seam construction or narrow the tarp.`
        : `Each panel needs ${inch(r.panel_cut_width)} of fabric across (half the width, the seam allowance and the hem) and the fabric is ${inch(r.fabric_width)}. Narrow the tarp or use wider fabric.`,
    });
  }
  if (r.end_sag > MAX_SAG_RATIO * r.end_span) errors.push({ field: 'end_sag', message: `A ${inch(r.end_sag)} end cut on a ${inch(r.end_span)} end is deeper than a quarter of the span; that is no longer a cat cut.` });
  if (r.door_ends > 0) {
    if (r.footprint_width <= 0) errors.push({ field: 'doors', message: `Doors close a pitched end down to the ground, and a ${inch(r.ridge_height)} ridgeline is too high for the ${inch(r.width / 2)} panels to reach it. Lower the ridgeline or widen the tarp.` });
    else if (r.end_sag > 0) errors.push({ field: 'doors', message: 'Doors are sewn along a straight end. Turn the end cat cut off, or the doors off.' });
    else if (doorCutBox(r.door_base, r.door_height, r.hem_allowance).w > r.fabric_width) errors.push({ field: 'doors', message: `A door half needs ${inch(doorCutBox(r.door_base, r.door_height, r.hem_allowance).w)} of fabric across and the fabric is ${inch(r.fabric_width)}.` });
  }
  const tieGap = r.ridge_length / (r.eave_tieouts + 1);
  if (r.patch_size > 0 && r.patch_size >= tieGap - 1e-6) errors.push({ field: 'patch_size', message: `${inch(r.patch_size)} patches overlap: the eave tie-outs are only ${inch(tieGap)} apart. Use smaller patches or fewer tie-outs.` });
  // A pull-out patch sits mid-panel: on a single panel each half (eave to ridge line) must hold it with room either side.
  if (r.pullouts && r.patch_size > 0 && (r.construction === 'single_panel' ? r.panel_mid_width / 2 : r.panel_mid_width) <= 2 * r.patch_size) errors.push({ field: 'pullouts', message: `There is not room for a ${inch(r.patch_size)} pull-out patch in the middle of the panel at mid-span. Use smaller patches or shallower cat cuts.` });
  // The panel must keep room for a patch below the ridge and above the eave at mid-span.
  if (r.panel_mid_width <= Math.max(r.patch_size, 1)) errors.push({ field: 'eave_sag', message: `The cat cuts leave only ${inch(Math.max(0, r.panel_mid_width))} of panel at mid-span. Reduce the ridge or eave cut.` });
  return errors.length ? { ok: false, errors } : { ok: true };
}
