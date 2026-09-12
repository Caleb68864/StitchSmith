// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, organizerAssembly, BODY_ID, PANEL_ID } from '../index.js';
import type { OrganizerInputs } from '../types.js';
import { renderHtml } from '../../../lib/pattern-engine/instructions/compile.js';
import { patternToSvg } from '../../../lib/pattern-engine/exports/svg.js';

const IN = 25.4;
const SOE: OrganizerInputs = { units: 'in' };

describe('resolve — the SOE organizer numbers', () => {
  it('body 12 × 5, panel 6 1/4 × 5 1/4, hems marked at double, 5/16" bellows, dividers at 1 1/4 and 2 1/2', () => {
    const r = resolveInputs(SOE);
    expect(r.body_cut_length).toBeCloseTo(12 * IN, 6);
    expect(r.body_cut_width).toBeCloseTo(5 * IN, 6);
    expect(r.panel_cut_width).toBeCloseTo(6.25 * IN, 6);
    expect(r.panel_cut_height).toBeCloseTo(5.25 * IN, 6);
    expect(r.body_hem_mark).toBeCloseTo(2 * IN, 6);
    expect(r.panel_hem_mark).toBeCloseTo(0.5 * IN, 6);
    expect(r.panel_flat_center).toBeCloseTo(4.25 * IN, 6);
    expect(r.span_loss).toBeCloseTo(0.375 * IN, 6);
    expect(r.bellows_depth).toBeCloseTo(0.3125 * IN, 6);
    expect(r.interior_width).toBeCloseTo(4.5 * IN, 6);
    expect(r.divider_positions.map((v) => v / IN)).toEqual([1.25, 2.5]);
    expect(r.wide_pocket_width).toBeCloseTo(2 * IN, 6);
    expect(r.clear_height).toBeCloseTo(4 * IN, 6);
    expect(r.clear_width).toBeCloseTo(4.5 * IN, 6);
    expect(r.velcro_strip_length).toBeCloseTo(4.5 * IN, 6);
    expect(r.velcro_block_height).toBeCloseTo(3.5 * IN, 6);
  });
  it('production mode forces 1/2" hems and the panel grows a quarter inch', () => {
    const r = resolveInputs({ ...SOE, production_mode: true });
    expect(r.panel_hem).toBeCloseTo(0.5 * IN, 6);
    expect(r.panel_cut_height).toBeCloseTo(5.5 * IN, 6);
    expect(r.body_hem).toBeCloseTo(1 * IN, 6);
  });
  it('a side fold all spent bridging is rejected; the as-filmed 4 3/4" Velcro warns; three slots warn', () => {
    expect(validateInputs({ ...SOE, side_fold: 0.375 }).ok).toBe(false);
    expect(validateInputs({ ...SOE, velcro_strip_width: 2.5 }).ok).toBe(false); // 2 × 2.5 + 0.5 > 4" clear height
    const b = buildPattern({ ...SOE, velcro_strip_length: 4.75 });
    expect(b.ok && b.value.warnings.some((w) => w.id === 'velcro-width')).toBe(true);
    const three = buildPattern({ ...SOE, slot_widths: [1.25, 1.25, 1.25] });
    expect(three.ok && three.value.warnings.some((w) => w.id === 'three-slots')).toBe(true);
    expect(validateInputs({ ...SOE, slot_widths: [2, 2, 2] }).ok).toBe(false);
  });
});

describe('buildPattern', () => {
  it('emits body, front panel and two hook strips with hem folds, double marks, side creases and dividers; steps chain in the vault order', () => {
    const b = buildPattern(SOE);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.value.pieces.map((p) => p.id)).toEqual([BODY_ID, PANEL_ID, 'organizer-velcro-hook']);
    const body = b.value.pieces[0];
    expect(Object.values(body.seamAllowances ?? {}).every((v) => v === 0)).toBe(true);
    expect(body.paths.filter((p) => p.id.startsWith(`${BODY_ID}-velcro`))).toHaveLength(2);
    expect(body.paths.some((p) => /120°/.test(p.label ?? ''))).toBe(true);
    const panel = b.value.pieces[1];
    expect(panel.paths.filter((p) => p.id.startsWith(`${PANEL_ID}-divider`))).toHaveLength(2);
    expect(panel.paths.filter((p) => p.id.startsWith(`${PANEL_ID}-side-fold`)).every((p) => /0°/.test(p.label ?? ''))).toBe(true);
    expect(b.value.pieces[2].quantity).toBe(2);
    const ids = b.value.steps.map((s) => s.id);
    expect(ids.indexOf('org.velcro')).toBeLessThan(ids.indexOf('org.fold'));
    expect(ids.indexOf('org.panel-bottom')).toBeLessThan(ids.indexOf('org.sides'));
    expect(ids.indexOf('org.dividers')).toBeLessThan(ids.indexOf('org.sides'));
    const set = new Set(ids);
    for (const s of b.value.steps) for (const dep of s.dependsOn) expect(set.has(dep)).toBe(true);
    expect(renderHtml(b.value.steps).ok).toBe(true);
    expect(patternToSvg({ id: 'x', name: 'x', pieces: b.value.pieces }, { defaultSeamAllowance: 0, showLabels: true })).toContain('<svg');
    expect(b.value.warnings.some((w) => w.id === 'flush')).toBe(true);
  });
  it('variations: bifold adds a second pocket, PALS replaces Velcro, grommets add hardware, loop over hook', () => {
    const bi = buildPattern({ ...SOE, bifold: true });
    // Two 5" pockets about a spine, hemmed only at the two raw ends: 4 x 5 + 2 x 1.
    // (Was 24" — that counted a hem at each end of each half, two of which are not raw edges.)
    expect(bi.ok && bi.value.resolved.body_cut_length).toBeCloseTo(22 * IN, 6);
    expect(bi.ok && bi.value.pieces.find((p) => p.id === PANEL_ID)!.quantity).toBe(2);
    const pals = buildPattern({ ...SOE, pals_back: true, grommets: true, loop_over_hook: true });
    expect(pals.ok).toBe(true);
    if (!pals.ok) return;
    expect(pals.value.pieces.some((p) => p.id === 'organizer-pals-row')).toBe(true);
    expect(pals.value.pieces.some((p) => p.id === 'organizer-velcro-hook')).toBe(false);
    expect(pals.value.hardware.find((h) => h.id === 'grommet')!.quantity).toBe(2);
    expect(pals.value.steps.some((s) => s.id === 'org.grommets')).toBe(true);
  });
  it('BOM and 3D assembly', () => {
    const bom = buildBom(SOE);
    expect(bom.some((r) => r.id === `piece-${BODY_ID}`)).toBe(true);
    expect(bom.some((r) => r.id === 'material-velcro-hook')).toBe(true);
    const b = buildPattern(SOE);
    if (!b.ok) return;
    const asm = organizerAssembly(b.value.pieces, b.value.resolved)!;
    expect(asm.object.width).toBeCloseTo(3 * IN, 6);
    expect(asm.object.height).toBeCloseTo(5 * IN, 6);
    expect(asm.placements[PANEL_ID].dz).toBeGreaterThan(0);
    expect(asm.seams.filter((s) => /divider/.test(s.label ?? ''))).toHaveLength(2);
    expect(organizerAssembly(buildPattern({ ...SOE, bifold: true }).ok ? (buildPattern({ ...SOE, bifold: true }) as { ok: true; value: { pieces: import('../../../lib/pattern-engine/graph/Piece.js').Piece[] } }).value.pieces : [], resolveInputs({ ...SOE, bifold: true }))).toBeNull();
  });
});
