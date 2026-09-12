// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, lidExtensionHeuristic, BACK_ID, FRONT_ID, ZIP_HALF_ID, GUSSET_ID } from '../index.js';
import type { FannyPackInputs } from '../types.js';
import { renderHtml } from '../../../lib/pattern-engine/instructions/compile.js';
import { patternToSvg } from '../../../lib/pattern-engine/exports/svg.js';

const IN = 25.4;
const BASE: FannyPackInputs = { units: 'in' };

describe('resolve — lid drop rule and cut sizes', () => {
  it('fully open extends the zipper panel by the depth per side and takes it off the rising sides', () => {
    const r = resolveInputs(BASE);
    expect(r.lid_extension).toBeCloseTo(3 * IN, 6);
    expect(r.zipper_panel_length).toBeCloseTo(16 * IN, 6);
    expect(r.zipper_panel_cut_length).toBeCloseTo(17 * IN, 6);
    expect(r.rising_side).toBeCloseTo(3 * IN, 6);
    expect(r.rising_gusset_cut_length).toBeCloseTo(17 * IN, 6);
    expect(r.gusset_cut_height).toBeCloseTo(4 * IN, 6);
    // Equal split: 1.5" per half + 1/2" allowance + 1" lip fold.
    expect(r.zipper_half_cut_height).toBeCloseTo(3 * IN, 6);
    expect(r.panel_cut_width).toBeCloseTo(11 * IN, 6);
    expect(r.panel_cut_height).toBeCloseTo(7 * IN, 6);
    expect(r.volume_l).toBeCloseTo(2.95, 1);
  });
  it('closed has no extension; partial scales with the angle; tape drops the lip; override wins', () => {
    expect(lidExtensionHeuristic('closed', 90, 76.2)).toBe(0);
    expect(lidExtensionHeuristic('partial', 90, 76.2)).toBeCloseTo(38.1, 6);
    expect(resolveInputs({ ...BASE, lid_drop_target: 'closed' }).rising_side).toBeCloseTo(6 * IN, 6);
    expect(resolveInputs({ ...BASE, zipper_edge_finish: 'tape' }).zipper_half_cut_height).toBeCloseTo(2 * IN, 6);
    expect(resolveInputs({ ...BASE, zipper_edge_finish: 'tape' }).edge_tape_length).toBeCloseTo(32 * IN, 6);
    const o = resolveInputs({ ...BASE, lid_extension: 4 });
    expect(o.lid_extension).toBeCloseTo(4 * IN, 6);
    expect(o.lid_extension_overridden).toBe(true);
  });
  it('rejects an extension that eats the whole side, a bottom too shallow for grommets and a belt range backwards', () => {
    expect(validateInputs({ ...BASE, lid_extension: 6 }).ok).toBe(false);
    expect(validateInputs({ ...BASE, depth: 1, bottom_grommets: 2 }).ok).toBe(false);
    expect(validateInputs({ ...BASE, belt_min: 40, belt_max: 30 }).ok).toBe(false);
    expect(validateInputs(BASE).ok).toBe(true);
  });
});

describe('buildPattern', () => {
  it('emits two panels, two zipper halves with the lip fold and corner folds, the gusset, belt and tabs; steps chain flat work before the hoop', () => {
    const b = buildPattern(BASE);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const ids = b.value.pieces.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining([BACK_ID, FRONT_ID, ZIP_HALF_ID, GUSSET_ID, 'fanny-belt', 'fanny-belt-tab']));
    for (const p of b.value.pieces) expect(Object.values(p.seamAllowances ?? {}).every((v) => v === 0)).toBe(true);
    const zip = b.value.pieces.find((p) => p.id === ZIP_HALF_ID)!;
    expect(zip.quantity).toBe(2);
    expect(zip.paths.some((p) => /lip/.test(p.label ?? '') && /0°/.test(p.label ?? ''))).toBe(true);
    expect(zip.paths.filter((p) => p.id.includes('corner') && p.edges[0].role === 'fold')).toHaveLength(2);
    const g = b.value.pieces.find((p) => p.id === GUSSET_ID)!;
    expect(g.paths.filter((p) => p.id.includes('corner'))).toHaveLength(2);
    const sids = b.value.steps.map((s) => s.id);
    expect(sids.indexOf('fp.belt-tabs')).toBeLessThan(sids.indexOf('fp.hoop'));
    expect(sids.indexOf('fp.hoop')).toBeLessThan(sids.indexOf('fp.back'));
    expect(sids.indexOf('fp.back')).toBeLessThan(sids.indexOf('fp.front'));
    const set = new Set(sids);
    for (const s of b.value.steps) for (const dep of s.dependsOn) expect(set.has(dep)).toBe(true);
    expect(renderHtml(b.value.steps).ok).toBe(true);
    expect(patternToSvg({ id: 'x', name: 'x', pieces: b.value.pieces }, { defaultSeamAllowance: 0, showLabels: true })).toContain('<svg');
    expect(b.value.warnings.some((w) => w.id === 'mock-derived-body')).toBe(true);
    expect(b.value.warnings.some((w) => w.id === 'mock-derived-extension')).toBe(true);
    expect(b.value.hardware.find((h) => h.id === 'zipper')!.notes).toMatch(/non-locking/i);
  });
  it('warnings: a short override warns the lid will not lie flat; closed says so; tape states the rule', () => {
    const short = buildPattern({ ...BASE, lid_extension: 2 });
    expect(short.ok && short.value.warnings.some((w) => w.id === 'lid-short')).toBe(true);
    const closed = buildPattern({ ...BASE, lid_drop_target: 'closed' });
    expect(closed.ok && closed.value.warnings.some((w) => w.id === 'lid-closed')).toBe(true);
    expect(closed.ok && closed.value.pieces.find((p) => p.id === ZIP_HALF_ID)!.paths.some((p) => p.edges[0].role === 'fold' && p.id.includes('corner'))).toBe(false);
    const tape = buildPattern({ ...BASE, zipper_edge_finish: 'tape', edge_tape_color: 'coyote' });
    expect(tape.ok && tape.value.warnings.find((w) => w.id === 'tape-vs-fold')!.message).toMatch(/will show/);
  });
  it('options: grommets add patches, marks and hardware while the gusset is flat; the drawbridge adds loops and cord', () => {
    const b = buildPattern({ ...BASE, bottom_grommets: 4, drawbridge_limiter: true, lid_drop_target: 'partial', lid_angle_deg: 90 });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const g = b.value.pieces.find((p) => p.id === GUSSET_ID)!;
    expect(g.paths.filter((p) => p.id.includes('grommet-patch'))).toHaveLength(4);
    expect(b.value.resolved.grommet_positions.map((v) => Math.round((v / IN) * 1000) / 1000)).toEqual([2, 4, 6, 8]);
    expect(b.value.pieces.find((p) => p.id === 'fanny-grommet-patch')!.quantity).toBe(4);
    expect(b.value.hardware.find((h) => h.id === 'grommet')!.quantity).toBe(4);
    const sids = b.value.steps.map((s) => s.id);
    expect(sids.indexOf('fp.grommets')).toBeLessThan(sids.indexOf('fp.hoop'));
    // Cord: anchors 1" below the top on a 6" panel → radius 5"; chord at 90° = 5√2; loop = 2 × chord.
    expect(b.value.resolved.drawbridge_cord_length).toBeCloseTo(2 * 5 * Math.SQRT2 * IN, 3);
    expect(b.value.pieces.find((p) => p.id === FRONT_ID)!.paths.filter((p) => p.id.includes('cord-anchor'))).toHaveLength(2);
    expect(b.value.pieces.find((p) => p.id === BACK_ID)!.paths.filter((p) => p.id.includes('cord-anchor'))).toHaveLength(2);
  });
  it('BOM lists panels, webbing totals and hardware', () => {
    const bom = buildBom(BASE);
    expect(bom.some((r) => r.id === `piece-${BACK_ID}`)).toBe(true);
    expect(bom.some((r) => r.id === 'material-webbing-38')).toBe(true);
    expect(bom.some((r) => r.id === 'hw-zipper')).toBe(true);
  });
});
