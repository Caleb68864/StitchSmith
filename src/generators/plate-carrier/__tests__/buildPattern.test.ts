// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, plateOutline, FRONT_SHELL_ID, BACK_SHELL_ID, FRONT_POCKET_ID, SHOULDER_PAD_ID, SHOULDER_WEBBING_ID, CUMMERBUND_ID, CUMMERBUND_LAMINATE_ID, SIDE_PLATE_POCKET_ID, LOOP_FIELD_ID } from '../index.js';
import type { PlateCarrierInputs } from '../types.js';
import { renderHtml } from '../../../lib/pattern-engine/instructions/compile.js';
import { patternToSvg } from '../../../lib/pattern-engine/exports/svg.js';

const IN = 25.4;
const DEF: PlateCarrierInputs = { units: 'in' };

describe('resolve — plate sizes drive the pocket and shell', () => {
  it('10 × 12 SAPI default: pocket 10.75 × 12.75, shell 11.75 × 13.75, cummerbund from a 40" torso', () => {
    const r = resolveInputs(DEF);
    expect(r.plate_width).toBeCloseTo(10 * IN, 6);
    expect(r.plate_height).toBeCloseTo(12 * IN, 6);
    expect(r.pocket_width).toBeCloseTo(10.75 * IN, 6);
    expect(r.pocket_height).toBeCloseTo(12.75 * IN, 6);
    expect(r.panel_width).toBeCloseTo(11.75 * IN, 6);
    expect(r.panel_height).toBeCloseTo(13.75 * IN, 6);
    expect(r.cummerbund_free_girth).toBeCloseTo((40 - 2 * 11.75) * IN, 6);
    expect(r.cummerbund_length).toBeCloseTo(((40 - 23.5) / 2 + 4) * IN, 6);
    expect(r.mock_derived).toEqual(['pad_length', 'shoulder_strap_length', 'torso_circumference', 'torso_length']);
  });
  it('presets: 8 × 10 and 11 × 14; custom uses the typed plate', () => {
    expect(resolveInputs({ ...DEF, plate_preset: '8x10' }).pocket_height).toBeCloseTo(10.75 * IN, 6);
    expect(resolveInputs({ ...DEF, plate_preset: '11x14' }).panel_width).toBeCloseTo(12.75 * IN, 6);
    expect(resolveInputs({ ...DEF, plate_preset: 'custom', plate_width: 9.5, plate_height: 12.5 }).plate_width).toBeCloseTo(9.5 * IN, 6);
  });
  it('cut geometry: SAPI clips 2" at 45°, shooter clips harder, swimmer tapers the side', () => {
    const sapi = plateOutline(10 * IN, 12 * IN, 'sapi', 2 * IN, 45);
    expect(sapi[0].x).toBeCloseTo(2 * IN * Math.SQRT1_2, 6);
    expect(sapi[2].y).toBeCloseTo(2 * IN * Math.SQRT1_2, 6);
    const shooter = resolveInputs({ ...DEF, plate_cut: 'shooter' }).plate_outline;
    expect(shooter[0].x).toBeGreaterThan(sapi[0].x);
    const swim = resolveInputs({ ...DEF, plate_cut: 'swimmer' }).plate_outline;
    expect(swim[2].y).toBeCloseTo(3 * IN, 6);
    expect(swim[0].x).toBeCloseTo(3 * IN * Math.tan((25 * Math.PI) / 180), 6);
    expect(sapi[3]).toEqual({ x: 10 * IN, y: 12 * IN }); // square bottom corners
  });
  it('validation: ease under 1/4", clips that meet, loop field too wide, side plates without a cummerbund, torso too small', () => {
    expect(validateInputs({ ...DEF, pocket_ease: 0.125 }).ok).toBe(false);
    expect(validateInputs({ ...DEF, top_clip_length: 8 }).ok).toBe(false);
    expect(validateInputs({ ...DEF, loop_field_width: 12 }).ok).toBe(false);
    expect(validateInputs({ ...DEF, side_plate: '6x6', cummerbund_style: 'none' }).ok).toBe(false);
    expect(validateInputs({ ...DEF, torso_circumference: 20 }).ok).toBe(false);
    expect(validateInputs(DEF).ok).toBe(true);
  });
});

describe('buildPattern', () => {
  it('default: shells with a loop field and back PALS, pocket walls, flaps, mesh, padded straps from the strap engine, elastic cummerbund; steps chain', () => {
    const b = buildPattern(DEF);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const ids = b.value.pieces.map((p) => p.id);
    for (const id of [FRONT_SHELL_ID, BACK_SHELL_ID, FRONT_POCKET_ID, LOOP_FIELD_ID, SHOULDER_PAD_ID, CUMMERBUND_ID]) expect(ids).toContain(id);
    const front = b.value.pieces.find((p) => p.id === FRONT_SHELL_ID)!;
    expect(front.paths.some((p) => p.id.endsWith('-loop-field'))).toBe(true);
    expect(Object.values(front.seamAllowances ?? {}).every((v) => v === 0)).toBe(true); // bound: no allowance
    const back = b.value.pieces.find((p) => p.id === BACK_SHELL_ID)!;
    const rows = back.paths.filter((p) => /-pals-row-/.test(p.id));
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(back.paths.filter((p) => /-pals-bartack-/.test(p.id)).length).toBe(rows.length * 7); // 6 columns across the 9.75" face inside the binding
    expect(front.paths.filter((p) => /-strap-x-/.test(p.id))).toHaveLength(2);
    const cb = b.value.pieces.find((p) => p.id === CUMMERBUND_ID)!;
    expect(cb.quantity).toBe(2);
    const stepIds = b.value.steps.map((s) => s.id);
    expect(stepIds.indexOf('pc.fields')).toBeLessThan(stepIds.indexOf('pc.stack'));
    expect(stepIds.indexOf('pc.bind')).toBeLessThan(stepIds.indexOf('pc.straps'));
    const set = new Set(stepIds);
    for (const s of b.value.steps) for (const dep of s.dependsOn) expect(set.has(dep)).toBe(true);
    expect(renderHtml(b.value.steps).ok).toBe(true);
    expect(patternToSvg({ id: 'x', name: 'x', pieces: b.value.pieces }, { defaultSeamAllowance: 0, showLabels: true })).toContain('<svg');
    expect(b.value.warnings.some((w) => w.id === 'reference-grade')).toBe(true);
    // One consolidated note naming every unmeasured field (was one warning each,
    // which filled the panel with identical yellow rows on an untouched project).
    const mock = b.value.warnings.filter((w) => w.id.startsWith('mock-derived'));
    expect(mock).toHaveLength(1);
    expect(mock[0].severity).toBe('info');
    for (const f of ['pad length', 'shoulder strap length', 'torso circumference', 'torso length']) expect(mock[0].message).toContain(f);
    expect(b.value.hardware.some((h) => h.id === 'binding')).toBe(true);
  });
  it('turned edges carry the allowance; webbing straps, skeletal cummerbund with 6 × 8 side plates, laser front on 500D warns', () => {
    const b = buildPattern({ ...DEF, edge_finish: 'turned', shoulder_style: 'webbing', cummerbund_style: 'skeletal', side_plate: '6x8', front_field: 'pals_laser', qr_buckle: 'roc' });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const front = b.value.pieces.find((p) => p.id === FRONT_SHELL_ID)!;
    expect(Object.values(front.seamAllowances ?? {}).every((v) => Math.abs(v - 0.375 * IN) < 1e-6)).toBe(true);
    expect(front.paths.some((p) => /-pals-slot-/.test(p.id))).toBe(true);
    const ids = b.value.pieces.map((p) => p.id);
    expect(ids).toContain(SHOULDER_WEBBING_ID);
    expect(ids).toContain(CUMMERBUND_LAMINATE_ID);
    expect(ids).toContain(SIDE_PLATE_POCKET_ID);
    expect(ids).not.toContain(SHOULDER_PAD_ID);
    expect(b.value.warnings.some((w) => w.id === 'laser-needs-laminate')).toBe(true);
    expect(b.value.warnings.some((w) => w.id === 'side-plate-taller')).toBe(true);
    expect(b.value.hardware.some((h) => h.id === 'qr-buckle')).toBe(true);
  });
  it('a plate taller than the torso allows warns; a 2" loop field is the engagement floor', () => {
    const b = buildPattern({ ...DEF, plate_preset: '11x14', torso_length: 15 });
    expect(b.ok && b.value.warnings.some((w) => w.id === 'plate-too-tall')).toBe(true);
    const c = buildPattern({ ...DEF, loop_field_height: 1.5 });
    expect(c.ok && c.value.warnings.some((w) => w.id === 'loop-engagement')).toBe(true);
  });
  it('BOM lists the shells, totals the elastic and binding', () => {
    const bom = buildBom(DEF);
    expect(bom.some((r) => r.id === `piece-${FRONT_SHELL_ID}`)).toBe(true);
    expect(bom.some((r) => r.id === 'material-elastic-4in')).toBe(true);
    expect(bom.some((r) => r.id === 'hw-binding')).toBe(true);
  });
});
