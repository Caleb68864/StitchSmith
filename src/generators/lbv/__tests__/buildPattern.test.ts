// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, FRONT_OUTER_ID, FRONT_INNER_ID, BACK_OUTER_ID, PAD_ID, VERTICAL_ID, BELT_LOOP_ID, DRAG_HANDLE_ID } from '../index.js';
import type { LbvInputs } from '../types.js';
import { renderHtml } from '../../../lib/pattern-engine/instructions/compile.js';
import { patternToSvg } from '../../../lib/pattern-engine/exports/svg.js';

const IN = 25.4;
const SOE: LbvInputs = { units: 'in' };

describe('resolve — the modular LBV numbers', () => {
  it('first mark 2", 6.5" strips for 4 columns, 22" usable on 24" verticals with 1" tabs, 36"–72" fit, 3/4" pad tuck', () => {
    const r = resolveInputs(SOE);
    expect(r.first_mark_from_edge).toBeCloseTo(2 * IN, 6);
    expect(r.back_strip_cut).toBeCloseTo(6.5 * IN, 6);
    expect(r.front_strip_cut).toBeCloseTo(6.5 * IN, 6);
    expect(r.usable_adjustment).toBeCloseTo(22 * IN, 6);
    expect(r.fit_min_chest).toBeCloseTo(36 * IN, 6);
    expect(r.fit_max_chest).toBeCloseTo(72 * IN, 6);
    expect(r.pad_tab_tuck).toBeCloseTo(0.75 * IN, 6);
    expect(r.back_outer_width).toBeCloseTo(11.75 * IN, 6);
    expect(r.front_zipper_len).toBeCloseTo(9 * IN, 6);
    expect(r.pouches_per_panel).toBe(2);
    // Six loops at 3" each off a 36" belt.
    expect(r.belt_usable).toBeCloseTo(18 * IN, 6);
  });
  it('locks outboard add 3"; a bigger hardware wrap eats the vertical', () => {
    expect(resolveInputs({ ...SOE, tension_lock_outboard: true }).fit_max_chest).toBeCloseTo(75 * IN, 6);
    expect(resolveInputs({ ...SOE, hardware_wrap: 1 }).usable_adjustment).toBeCloseTo(21 * IN, 6);
  });
  it('validation: row pitch under the row width, a mark off the panel, wrong strap count', () => {
    expect(validateInputs({ ...SOE, row_pitch: 1 }).ok).toBe(false);
    expect(validateInputs({ ...SOE, vertical_mark: 12 }).ok).toBe(false);
    expect(validateInputs({ ...SOE, front_straps: 2 }).ok).toBe(false);
    expect(validateInputs({ ...SOE, front_straps: 2, front_strap_positions: [1, 9] }).ok).toBe(true);
    expect(validateInputs({ ...SOE, vertical_strap_len: 1.5 }).ok).toBe(false);
  });
});

describe('buildPattern', () => {
  it('emits the panel set, foam, rows, verticals, pads, cross pieces, handle, loops and straps; Convention A with the SA on the zipper edge only', () => {
    const b = buildPattern(SOE);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const ids = b.value.pieces.map((p) => p.id);
    for (const id of [FRONT_OUTER_ID, FRONT_INNER_ID, BACK_OUTER_ID, 'lbv-back-inner', 'lbv-foam-front', 'lbv-pals-row-front', 'lbv-pals-row-back', VERTICAL_ID, PAD_ID, 'lbv-cross-piece', DRAG_HANDLE_ID, BELT_LOOP_ID, 'lbv-front-strap']) expect(ids).toContain(id);
    const front = b.value.pieces.find((p) => p.id === FRONT_OUTER_ID)!;
    expect(front.mirror).toBe(true);
    expect(front.quantity).toBe(2);
    const sa = Object.values(front.seamAllowances ?? {});
    expect(sa.filter((v) => v === 0)).toHaveLength(3);
    expect(sa.filter((v) => v === 12.7)).toHaveLength(1);
    expect(front.paths.filter((p) => p.id.includes('-pals-bartack')).length).toBeGreaterThan(0);
    expect(front.paths.filter((p) => p.id.includes('front-tab'))).toHaveLength(6);
    expect(b.value.pieces.find((p) => p.id === VERTICAL_ID)!.quantity).toBe(4);
    expect(b.value.pieces.find((p) => p.id === BELT_LOOP_ID)!.quantity).toBe(6);
    expect(b.value.pieces.find((p) => p.id === 'lbv-pals-row-back')!.quantity).toBe(b.value.pieces.find((p) => p.id === 'lbv-pals-row-front')!.quantity / 2);
    const pad = b.value.pieces.find((p) => p.id === PAD_ID)!;
    expect(pad.paths.some((p) => p.id === `${PAD_ID}-tension-lock`)).toBe(true);
    expect(b.value.hardware.find((h) => h.id === 'tension-lock')!.quantity).toBe(4);
    expect(b.value.hardware.find((h) => h.id === 'side-release')!.quantity).toBe(7);
    expect(b.value.hardware.find((h) => h.id === 'snap')!.quantity).toBe(6);
    expect(b.value.hardware.find((h) => h.id === 'zipper')!.quantity).toBe(3);
  });
  it('steps follow the vault order and every dependency exists', () => {
    const b = buildPattern(SOE);
    if (!b.ok) return;
    const ids = b.value.steps.map((s) => s.id);
    const idx = (id: string) => ids.indexOf(id);
    expect(idx('lbv.rows')).toBeLessThan(idx('lbv.zippers'));
    expect(idx('lbv.zippers')).toBeLessThan(idx('lbv.close'));
    expect(idx('lbv.close')).toBeLessThan(idx('lbv.belt-loops'));
    expect(idx('lbv.locks')).toBeLessThan(idx('lbv.lace'));
    expect(idx('lbv.lace')).toBeLessThan(idx('lbv.straps'));
    const set = new Set(ids);
    for (const s of b.value.steps) for (const dep of s.dependsOn) expect(set.has(dep), `${s.id} → ${dep}`).toBe(true);
    expect(renderHtml(b.value.steps).ok).toBe(true);
    expect(patternToSvg({ id: 'x', name: 'x', pieces: b.value.pieces }, { defaultSeamAllowance: 12.7, showLabels: true })).toContain('<svg');
  });
  it('warnings: every Open number is mock-derived, the front columns stay flagged, the 1.5" rows carry the divergence, three loops warn', () => {
    const b = buildPattern(SOE);
    if (!b.ok) return;
    const w = b.value.warnings;
    // One consolidated note naming every Open number (was one warning per field).
    const mock = w.filter((x) => x.id.startsWith('mock-derived'));
    expect(mock).toHaveLength(1);
    expect(mock[0].severity).toBe('info');
    for (const f of ['Front panel width', 'Shoulder pad length', 'Cross piece angle', 'Front strap positions', 'PALS row pitch']) expect(mock[0].message, f).toContain(f);
    expect(w.some((x) => x.id === 'front-cols-unresolved')).toBe(true);
    expect(w.some((x) => x.id === 'row-width-divergence')).toBe(true);
    expect(w.some((x) => /not the 1" spec/.test(x.message))).toBe(true);
    const explicit = buildPattern({ ...SOE, panel_width: 9 });
    expect(explicit.ok && explicit.value.warnings.find((x) => x.id === 'mock-derived')!.message).not.toContain('Front panel width');
    const three = buildPattern({ ...SOE, loops_per_panel: 3 });
    expect(three.ok && three.value.warnings.some((x) => x.id === 'three-loops')).toBe(true);
    const five = buildPattern({ ...SOE, back_cols: 5 });
    expect(five.ok && five.value.warnings.some((x) => x.id === 'back-cols-off-vault')).toBe(true);
    const narrow = buildPattern({ ...SOE, back_panel_width: 6, back_cols: 5 });
    expect(narrow.ok && narrow.value.warnings.some((x) => /will not mount up/.test(x.message) && x.field === 'back_cols')).toBe(true);
  });
  it('variations: no foam, no drag handle, males left, mm units', () => {
    const b = buildPattern({ units: 'mm', foam_insert: false, drag_handle: false, male_side: 'left', panel_width: 230, panel_height: 280, front_strap_positions: [25, 127, 229] });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.value.pieces.some((p) => p.id === 'lbv-foam-front')).toBe(false);
    expect(b.value.pieces.some((p) => p.id === DRAG_HANDLE_ID)).toBe(false);
    expect(b.value.steps.some((s) => s.id === 'lbv.foam')).toBe(false);
    expect(b.value.steps.find((s) => s.id === 'lbv.straps')!.body).toContain('male from the left');
    expect(b.value.resolved.panel_width).toBe(230);
  });
  it('BOM totals webbing, Velcro and edge tape and lists hardware', () => {
    const bom = buildBom(SOE);
    expect(bom.some((r) => r.id === `piece-${FRONT_OUTER_ID}`)).toBe(true);
    expect(bom.some((r) => r.id === 'material-webbing-38')).toBe(true);
    expect(bom.some((r) => r.id === 'material-velcro-loop')).toBe(true);
    expect(bom.find((r) => r.id === 'material-edge-tape')!.quantity).toBeGreaterThan(3000);
    expect(bom.some((r) => r.id === 'hw-snap')).toBe(true);
  });
});
