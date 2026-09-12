// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, snapUpToGrid, PANEL_FRONT_ID, PANEL_BACK_ID, FACE_ID, microRigAssembly } from '../index.js';
import type { MicroRigInputs } from '../types.js';
import { renderHtml } from '../../../lib/pattern-engine/instructions/compile.js';
import { patternToSvg } from '../../../lib/pattern-engine/exports/svg.js';

const IN = 25.4;
const STD: MicroRigInputs = { units: 'in', panel_width_preset: 'standard_13', magazine_preset_id: 'ar15_30_round', cell_count: 3 };

describe('resolve', () => {
  it('13" panel, 7" tall, 3" cells snapped to the PALS grid, 12" interior loop, 8" buckle spacing... on a 16" panel', () => {
    const r = resolveInputs(STD);
    expect(r.panel_width).toBeCloseTo(13 * IN, 6);
    expect(r.panel_height).toBeCloseTo(7 * IN, 6);
    expect(r.cell_span).toBeCloseTo(3 * IN, 6);
    expect(r.cell_span_derived).toBe(true);
    expect(r.face_per_cell).toBeCloseTo((2.55 + 2 * 1.0 + 5 / 16) * IN, 6);
    expect(r.internal_velcro_length).toBeCloseTo(12 * IN, 6);
    expect(r.mag_span).toBeCloseTo(9 * IN, 6);
    expect(r.width_needed).toBeCloseTo((9 + 6 + 1) * IN, 6);
    const r16 = resolveInputs({ ...STD, panel_width_preset: 'pals_16' });
    expect(r16.buckle_spacing).toBeCloseTo(8 * IN, 6);
    expect(r16.buckle_edge_offset).toBeCloseTo(4 * IN, 6);
  });
  it('snaps a .308 mag to a 4.5" cell', () => {
    expect(snapUpToGrid(3.6 * IN)).toBeCloseTo(4.5 * IN, 6);
    const r = resolveInputs({ ...STD, magazine_preset_id: 'ar15_30_round', cell_span: 4.5 });
    expect(r.cell_span_derived).toBe(false);
    expect(r.cell_span).toBeCloseTo(4.5 * IN, 6);
  });
  it('split front doubles the panel and adds the gap', () => {
    const r = resolveInputs({ ...STD, split_front: true });
    expect(r.total_front_width).toBeCloseTo((2 * 13 + 2.25) * IN, 6);
    expect(r.buckle_setback).toBeCloseTo(3 * IN, 6);
  });
});

describe('buildPattern', () => {
  it('emits both panel layers, the pleated face from the pouch engine (no card back), the utility pocket and the strips', () => {
    const b = buildPattern(STD);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const ids = b.value.pieces.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining([PANEL_FRONT_ID, PANEL_BACK_ID, FACE_ID, 'utility-front', 'utility-gusset', 'utility-lid', 'closure-hook', 'closure-loop', 'interior-loop-field', 'pull-tab', 'shoulder-buckle-anchor', 'placard-loop', 'side-pals-row', 'bottom-elastic-loop', 'dangler-hook', 'shoulder-strap', 'waist-strap']));
    expect(ids).not.toContain('back');
    const front = b.value.pieces.find((p) => p.id === PANEL_FRONT_ID)!;
    const outline = front.paths.find((p) => p.closed)!;
    expect(Math.max(...outline.edges.map((e) => e.end.x))).toBeCloseTo(13 * IN, 6);
    // Convention A: SA on every cut edge of the panel.
    expect(Object.values(front.seamAllowances ?? {}).every((v) => v === 9.5)).toBe(true);
    // Face: hems baked in (Convention B), explicit 0.
    const face = b.value.pieces.find((p) => p.id === FACE_ID)!;
    expect(Object.values(face.seamAllowances ?? {}).every((v) => v === 0)).toBe(true);
    const faceW = Math.max(...face.paths.find((p) => p.closed)!.edges.map((e) => e.end.x));
    expect(faceW).toBeCloseTo(3 * (2.55 + 2 + 5 / 16) * IN + 2 * 0.5 * IN, 6);
    expect(renderHtml(b.value.steps).ok).toBe(true);
    const ids2 = new Set(b.value.steps.map((s) => s.id));
    for (const s of b.value.steps) for (const dep of s.dependsOn) expect(ids2.has(dep)).toBe(true);
    expect(patternToSvg({ id: 'x', name: 'x', pieces: b.value.pieces }, { defaultSeamAllowance: 9.5, showLabels: true })).toContain('<svg');
  });
  it('width budget: 4 cells + utility pocket do not fit a 13" panel and say so; fit on a 16" panel', () => {
    const b = buildPattern({ ...STD, cell_count: 4 });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const budget = b.value.warnings.find((w) => w.id === 'width-budget');
    expect(budget?.severity).toBe('error');
    expect(budget?.message).toMatch(/19"/);
    // 3 cells + utility + margins = 16" exactly on the 16" panel; 4 cells + utility needs 19".
    const b16 = buildPattern({ ...STD, cell_count: 3, panel_width_preset: 'pals_16' });
    expect(b16.ok && !b16.value.warnings.some((w) => w.id === 'width-budget')).toBe(true);
    const b19 = buildPattern({ ...STD, cell_count: 4, panel_width_preset: 'pals_19' });
    expect(b19.ok && !b19.value.warnings.some((w) => w.id === 'width-budget')).toBe(true);
    const noUtil = buildPattern({ ...STD, cell_count: 4, utility_pocket: false });
    expect(noUtil.ok && !noUtil.value.warnings.some((w) => w.id === 'width-budget')).toBe(true);
  });
  it('split front doubles the panel pieces and adds join straps, anti-flop cell and the floating PALS bridge', () => {
    const b = buildPattern({ ...STD, split_front: true });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.value.pieces.find((p) => p.id === PANEL_FRONT_ID)!.quantity).toBe(2);
    expect(b.value.pieces.find((p) => p.id === 'join-strap')!.quantity).toBe(4);
    expect(b.value.pieces.some((p) => p.id === 'antiflop-cell')).toBe(true);
    expect(b.value.pieces.some((p) => p.id === 'gap-bridge-pals')).toBe(true);
    expect(b.value.steps.some((s) => s.id === 'rig.join')).toBe(true);
    expect(b.value.hardware.find((h) => h.id === 'join-buckle')!.quantity).toBe(4);
  });
  it('blank PALS panel has no face or utility pocket; H-harness suspension points at the strap page', () => {
    const b = buildPattern({ ...STD, pocket_set: 'blank_pals', suspension: 'h_harness' });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.value.pieces.some((p) => p.id === FACE_ID)).toBe(false);
    expect(b.value.pieces.some((p) => p.id === 'utility-front')).toBe(false);
    expect(b.value.pieces.some((p) => p.id === 'shoulder-strap')).toBe(false);
    expect(b.value.hardware.some((h) => h.id === 'h-harness')).toBe(true);
    expect(b.value.steps.find((s) => s.id === 'rig.suspension')!.body).toMatch(/Padded Strap page/);
  });
  it('rejects a cell height taller than the panel and a face narrower than the span', () => {
    expect(validateInputs({ ...STD, cell_height: 8 }).ok).toBe(false);
    expect(validateInputs({ ...STD, face_per_cell: 2 }).ok).toBe(false);
    expect(validateInputs({ ...STD, magazine_preset_id: 'nope' }).ok).toBe(false);
  });
  it('mock-derived notes carry the vault\'s open numbers', () => {
    const b = buildPattern(STD);
    if (!b.ok) return;
    expect(b.value.warnings.some((w) => w.id === 'mock-derived-height')).toBe(true);
    expect(b.value.warnings.some((w) => w.id === 'pals-top-drop')).toBe(true);
  });
});

describe('BOM and assembly', () => {
  it('BOM lists panel pieces, totals webbing and velcro, and hardware', () => {
    const bom = buildBom(STD);
    expect(bom.some((r) => r.id === `piece-${PANEL_FRONT_ID}`)).toBe(true);
    expect(bom.some((r) => r.id === 'material-webbing-38')).toBe(true);
    expect(bom.some((r) => r.id === 'material-velcro-loop')).toBe(true);
    expect(bom.some((r) => r.id === 'hw-grommet')).toBe(true);
  });
  it('3D assembly seams the face to the front layer per cell, layers at the edges, and stands a magazine in cell 1', () => {
    const b = buildPattern(STD);
    if (!b.ok) return;
    const asm = microRigAssembly(b.value.pieces, b.value.resolved)!;
    expect(asm).not.toBeNull();
    expect(asm.seams.filter((s) => /division|outer side/.test(s.label ?? '')).length).toBe(2 * 4);
    expect(asm.seams.filter((s) => /bottom gather/.test(s.label ?? '')).length).toBe(2 * 3);
    expect(asm.seams.filter((s) => /layers/.test(s.label ?? '')).length).toBe(3);
    expect(asm.object.base.point.y).toBeCloseTo(7 * IN, 6);
    expect(asm.object.lift).toBeCloseTo(1 * IN, 6);
    expect(microRigAssembly(buildPattern({ ...STD, pocket_set: 'blank_pals' }).ok ? (buildPattern({ ...STD, pocket_set: 'blank_pals' }) as { ok: true; value: { pieces: import('../../../lib/pattern-engine/graph/Piece.js').Piece[] } }).value.pieces : [], resolveInputs({ ...STD, pocket_set: 'blank_pals' }))).toBeNull();
  });
});
