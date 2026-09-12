import type { OrganizerInputs, ResolvedInputs, ValidationResult, BuildPatternError } from './types.js';
import {
  DEFAULT_UNITS, POUCH_WIDTH_MM, POCKET_HEIGHT_MM, BODY_HEM_MM, PANEL_HEM_MM, PRODUCTION_HEM_MIN_MM, SIDE_SEAM_MM, SIDE_FOLD_MM,
  PANEL_EXTRA_WIDTH_MM, SLOT_WIDTHS_MM, VELCRO_STRIPS, VELCRO_STRIP_WIDTH_MM, VELCRO_GAP_MM, CONTENTS_HEIGHT_MM,
} from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';

/** Type/range guard run before the generator's own rules (hardening pass H1). */
const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  pouch_width: { kind: 'length' },
  pocket_height: { kind: 'length' },
  body_hem: { kind: 'length' },
  panel_hem: { kind: 'length' },
  production_mode: { kind: 'bool' },
  side_seam_allowance: { kind: 'length' },
  side_fold: { kind: 'length' },
  panel_extra_width: { kind: 'length' },
  slot_widths: { kind: 'numArray', min: 0, max: 5000 },
  velcro_strip_count: { kind: 'count', max: 4 },
  velcro_strip_width: { kind: 'length' },
  velcro_strip_length: { kind: 'length' },
  velcro_gap: { kind: 'length' },
  loop_over_hook: { kind: 'bool' },
  name_tape_loop: { kind: 'bool' },
  grommets: { kind: 'bool' },
  bifold: { kind: 'bool' },
  pals_back: { kind: 'bool' },
  contents_height: { kind: 'length' },
};

const IN = 25.4;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }

export function resolveInputs(inputs: OrganizerInputs): ResolvedInputs {
  inputs = stripNulls(inputs);
  const units = inputs.units ?? DEFAULT_UNITS;
  const d = (v: number | undefined, fallbackMm: number) => (v === undefined || v === null || Number.isNaN(v) ? fallbackMm : toMm(v, units));
  const production_mode = inputs.production_mode ?? false;
  const pouch_width = d(inputs.pouch_width, POUCH_WIDTH_MM);
  const pocket_height = d(inputs.pocket_height, POCKET_HEIGHT_MM);
  let body_hem = d(inputs.body_hem, BODY_HEM_MM);
  let panel_hem = d(inputs.panel_hem, PANEL_HEM_MM);
  if (production_mode) { body_hem = Math.max(body_hem, PRODUCTION_HEM_MIN_MM); panel_hem = Math.max(panel_hem, PRODUCTION_HEM_MIN_MM); }
  const side_seam_allowance = d(inputs.side_seam_allowance, SIDE_SEAM_MM);
  const side_fold = d(inputs.side_fold, SIDE_FOLD_MM);
  const panel_extra_width = d(inputs.panel_extra_width, PANEL_EXTRA_WIDTH_MM);
  // A hand-edited file can put a scalar here; resolve is called for the page's
  // derived numbers before anything is validated, so it must not throw on one.
  const slotSource = Array.isArray(inputs.slot_widths) ? inputs.slot_widths : SLOT_WIDTHS_MM.map((v) => (units === 'in' ? v / IN : v));
  const slot_widths = slotSource.filter((v) => Number.isFinite(v) && v > 0).map((v) => toMm(v, units));
  const velcro_strip_count = inputs.velcro_strip_count ?? VELCRO_STRIPS;
  const velcro_strip_width = d(inputs.velcro_strip_width, VELCRO_STRIP_WIDTH_MM);
  const velcro_gap = d(inputs.velcro_gap, VELCRO_GAP_MM);
  const interior_width = pouch_width - 2 * side_seam_allowance;
  const clear_width = interior_width;
  const velcro_strip_length = d(inputs.velcro_strip_length, clear_width);
  const panel_cut_width = pouch_width + panel_extra_width;
  const panel_flat_center = panel_cut_width - 2 * side_fold;
  const span_loss = (pouch_width - panel_flat_center) / 2;
  const used = slot_widths.reduce((a, b) => a + b, 0);
  let acc = 0;
  const divider_positions = slot_widths.map((w) => { acc += w; return acc; });
  return {
    units,
    pouch_width,
    pocket_height,
    body_hem,
    panel_hem,
    production_mode,
    side_seam_allowance,
    side_fold,
    panel_extra_width,
    slot_widths,
    velcro_strip_count,
    velcro_strip_width,
    velcro_strip_length,
    velcro_gap,
    loop_over_hook: inputs.loop_over_hook ?? false,
    name_tape_loop: inputs.name_tape_loop ?? false,
    grommets: inputs.grommets ?? false,
    bifold: inputs.bifold ?? false,
    pals_back: inputs.pals_back ?? false,
    contents_height: d(inputs.contents_height, CONTENTS_HEIGHT_MM),
    // Single: hem + pocket + pocket + hem. Bifold: two pockets nose to nose about a
    // centre spine, hemmed only at the two raw ends (the vault's "twice as long" is a
    // loose remark, not the layout — see buildPattern's spine fold).
    body_cut_length: inputs.bifold ? 4 * pocket_height + 2 * body_hem : 2 * (pocket_height + body_hem),
    body_cut_width: pouch_width,
    panel_cut_width,
    panel_cut_height: pocket_height + panel_hem,
    panel_finished_height: pocket_height,
    panel_flat_center,
    span_loss,
    bellows_depth: (side_fold - span_loss) / 2,
    interior_width,
    wide_pocket_width: interior_width - used,
    divider_positions,
    clear_width,
    clear_height: pocket_height - body_hem,
    velcro_block_height: velcro_strip_count * velcro_strip_width + Math.max(0, velcro_strip_count - 1) * velcro_gap,
    velcro_horizontal: true,
    body_hem_mark: 2 * body_hem,
    panel_hem_mark: 2 * panel_hem,
  };
}

export function validateInputs(inputs: OrganizerInputs): ValidationResult {
  inputs = stripNulls(inputs);
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  if (guard.length) return { ok: false, errors: guard };
  const errors: BuildPatternError[] = [];
  const r = resolveInputs(inputs);
  const pos = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be a positive number` }); };
  const nonNeg = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v < 0) errors.push({ field, message: `${label} must be 0 or greater` }); };
  pos('pouch_width', 'Pouch width');
  pos('pocket_height', 'Pocket height');
  nonNeg('body_hem', 'Body hem');
  nonNeg('panel_hem', 'Panel hem');
  nonNeg('side_seam_allowance', 'Side seam allowance');
  nonNeg('side_fold', 'Side fold');
  nonNeg('panel_extra_width', 'Panel extra width');
  if (r.body_hem >= r.pocket_height) errors.push({ field: 'body_hem', message: 'Body hem leaves no clear back face' });
  if (r.span_loss < -1e-6) errors.push({ field: 'side_fold', message: `Side fold ${(r.side_fold / IN).toFixed(3)}" is less than half the ${(r.panel_extra_width / IN).toFixed(2)}" excess: the ${(r.panel_flat_center / IN).toFixed(2)}" flat centre is wider than the ${(r.pouch_width / IN).toFixed(2)}" body and will bag. Fold at least ${(r.panel_extra_width / 2 / IN).toFixed(3)}" in.` });
  if (r.bellows_depth <= 0) errors.push({ field: 'panel_extra_width', message: 'The panel must be cut wider than the body or there is no bellows depth' });
  if (r.wide_pocket_width < 0) errors.push({ field: 'slot_widths', message: `Slots use more than the ${(r.interior_width / IN).toFixed(2)}" interior width` });
  if (!Number.isInteger(r.velcro_strip_count) || r.velcro_strip_count < 0 || r.velcro_strip_count > 4) errors.push({ field: 'velcro_strip_count', message: 'Velcro strips must be a whole number from 0 to 4' });
  if (r.velcro_strip_count > 0) { pos('velcro_strip_width', 'Velcro strip width'); pos('velcro_strip_length', 'Velcro strip length'); nonNeg('velcro_gap', 'Velcro gap'); }
  if (r.velcro_strip_count > 0 && r.velcro_block_height > r.clear_height) errors.push({ field: 'velcro_strip_count', message: `Velcro block ${(r.velcro_block_height / IN).toFixed(2)}" tall does not fit the ${(r.clear_height / IN).toFixed(2)}" clear back face below the hem` });
  return errors.length ? { ok: false, errors } : { ok: true };
}
