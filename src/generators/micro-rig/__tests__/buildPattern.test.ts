// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, snapUpToGrid, PANEL_FRONT_ID, PANEL_BACK_ID, FACE_ID, REAR_POUCH_ID, FRONT_POUCH_ID, microRigAssembly } from '../index.js';
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

describe('stacked cells (.308 test case from the vault)', () => {
  const R308: MicroRigInputs = { units: 'in', panel_width_preset: 'r308_14', pocket_set: 'stacked_cells', magazine_preset_id: 'pmag_308_20', cell_count: 2, cells_deep: 2 };
  it('mag_depth 2.9, thick 1.1, length 5.75 reproduces the adaptation table', () => {
    const r = resolveInputs(R308);
    expect(r.rear_cell_width).toBeCloseTo(3.4 * IN, 6);       // 2.9 + 0.5 ease
    expect(r.front_cell_mark).toBeCloseTo(3.9 * IN, 6);       // + 0.5 wrap
    expect(r.stack_depth).toBeCloseTo((2 * 1.1 + 0.125) * IN, 6); // ≈ 2 3/8"
    expect(r.pouch_height).toBeCloseTo(0.65 * 5.75 * IN, 6);  // ≈ 3 3/4"
    expect(r.mag_exposed_height).toBeCloseTo(0.35 * 5.75 * IN, 6);
    expect(r.split_pull).toBe(false);
    expect(r.pals_aligned).toBe(false);
    expect(r.loaded_weight_lb).toBeCloseTo(4 * 2.4, 6);
    expect(r.grommet_count).toBe(4);
    expect(r.cord_count).toBe(4);
    expect(r.pull_tab_count).toBe(4);
    expect(r.cradle_length).toBeCloseTo((2 * 1.1 + 0.125 + 2) * IN, 6);
    // 5.56: 3" rear cell on the grid, split pulls only for AK.
    const r556 = resolveInputs({ ...R308, magazine_preset_id: 'ar15_30_round' });
    expect(r556.rear_cell_width).toBeCloseTo(3.05 * IN, 6);
    expect(r556.stack_depth).toBeCloseTo((2 + 0.125) * IN, 6);
    expect(resolveInputs({ ...R308, magazine_preset_id: 'ak47_762x39_30round' }).split_pull).toBe(true);
  });
  it('emits rear and front pouches, divider, bridge, cradles, cords, pulls and cell Velcro; steps chain', () => {
    const b = buildPattern(R308);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const ids = b.value.pieces.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining([REAR_POUCH_ID, FRONT_POUCH_ID, 'stack-divider', 'stack-bridge', 'stack-cradle', 'stack-pull-tab', 'stack-bungee', 'stack-cell-velcro']));
    expect(ids).not.toContain(FACE_ID);
    expect(ids).not.toContain('utility-front');
    const rear = b.value.pieces.find((p) => p.id === REAR_POUCH_ID)!;
    const rw = Math.max(...rear.paths.find((p) => p.closed)!.edges.map((e) => e.end.x));
    expect(rw).toBeCloseTo((2 * 3.4 + 1) * IN, 6);
    const frontP = b.value.pieces.find((p) => p.id === FRONT_POUCH_ID)!;
    expect(frontP.quantity).toBe(2);
    const fw = Math.max(...frontP.paths.find((p) => p.closed)!.edges.map((e) => e.end.x));
    expect(fw).toBeCloseTo((3.9 + 1) * IN, 6);
    expect(b.value.pieces.find((p) => p.id === 'stack-cradle')!.quantity).toBe(2);
    expect(b.value.pieces.find((p) => p.id === 'stack-pull-tab')!.quantity).toBe(4);
    expect(b.value.hardware.find((h) => h.id === 'cradle-grommet')!.quantity).toBe(4);
    const stepIds = new Set(b.value.steps.map((s) => s.id));
    expect([...stepIds]).toEqual(expect.arrayContaining(['rig.stack-prep', 'rig.cells', 'rig.stack-front', 'rig.cradles', 'rig.close']));
    for (const s of b.value.steps) for (const dep of s.dependsOn) expect(stepIds.has(dep)).toBe(true);
    expect(renderHtml(b.value.steps).ok).toBe(true);
    // Width: 2 × 3.4 + 3" med zone + 1" margins = 10.8" on a 14" panel.
    expect(b.value.warnings.some((w) => w.id === 'width-budget')).toBe(false);
    expect(b.value.warnings.some((w) => w.id === 'pals-misaligned')).toBe(true);
    expect(b.value.warnings.some((w) => w.id === 'mock-derived-wrap')).toBe(true);
    expect(b.value.warnings.some((w) => w.id === 'r308-height')).toBe(true);
  });
  it('eight .308 mags trips the weight warning; wrap outside its bounds is rejected', () => {
    const b = buildPattern({ ...R308, cell_count: 4, panel_width_preset: 'pals_19' });
    expect(b.ok && b.value.warnings.some((w) => w.id === 'weight' && /19 lb/.test(w.message))).toBe(true);
    expect(validateInputs({ ...R308, wrap_allowance: 0.1 }).ok).toBe(false);
    expect(validateInputs({ ...R308, wrap_allowance: 1.5 }).ok).toBe(false);
    expect(validateInputs({ ...R308, cells_deep: 3 }).ok).toBe(false);
    // A cradle drop deeper than the uncovered length sinks the magazine below the mouth (0.35 × 5.75 ≈ 2.01").
    expect(validateInputs({ ...R308, cradle_drop: 2.5 }).ok).toBe(false);
    expect(validateInputs({ ...R308, cradle_drop: 1 }).ok).toBe(true);
    expect(validateInputs({ ...R308, stack_ease: 0.1 }).ok).toBe(false);
  });
  it('one deep drops the front pouch, divider and bridge', () => {
    const b = buildPattern({ ...R308, cells_deep: 1 });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const ids = b.value.pieces.map((p) => p.id);
    expect(ids).not.toContain(FRONT_POUCH_ID);
    expect(ids).not.toContain('stack-divider');
    expect(b.value.resolved.stack_depth).toBeCloseTo(1.1 * IN, 6);
    expect(b.value.steps.some((s) => s.id === 'rig.stack-front')).toBe(false);
  });
  it('3D assembly stands the magazine flat side out in column 1 with the front pouch one stack layer out', () => {
    const b = buildPattern(R308);
    if (!b.ok) return;
    const asm = microRigAssembly(b.value.pieces, b.value.resolved)!;
    expect(asm.pieces.slice(0, 4).map((p) => p.id)).toEqual([PANEL_FRONT_ID, REAR_POUCH_ID, FRONT_POUCH_ID, PANEL_BACK_ID]);
    expect(asm.object.width).toBeCloseTo(2.9 * IN, 6);
    expect(asm.object.depth).toBeCloseTo(1.1 * IN, 6);
    expect(asm.placements[FRONT_POUCH_ID].dz).toBeGreaterThan(asm.placements[REAR_POUCH_ID].dz!);
    expect(asm.seams.filter((s) => /front pouch/.test(s.label ?? '')).length).toBe(3);
  });
});
