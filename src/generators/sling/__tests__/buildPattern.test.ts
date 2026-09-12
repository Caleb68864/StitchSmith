// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, slingAssembly, PAD_TUBE_ID, FOAM_ID } from '../index.js';
import type { SlingInputs } from '../types.js';
import { renderHtml } from '../../../lib/pattern-engine/instructions/compile.js';
import { patternToSvg } from '../../../lib/pattern-engine/exports/svg.js';

const IN = 25.4;
const S: SlingInputs = { units: 'in', webbing_width: 31.75, pad_finished_length: 16, pad_girth: 4, foam_thickness: 6, foam_width: 1.5, rear_tail_length: 30, adjustment_webbing_length: 24, anchor_strap_length: 4 };

describe('resolve', () => {
  it('foam = pad − 2 × setback; tube cut = girth + ease + 2 × SA; engagement = tuck − setback', () => {
    const r = resolveInputs(S);
    expect(r.foam_length).toBeCloseTo(15 * IN, 6);
    expect(r.tube_cut_width).toBeCloseTo(4.5 * IN + 19, 6);
    expect(r.tube_cut_length).toBeCloseTo(16 * IN + 19, 6);
    expect(r.pad_flat_width).toBeCloseTo(2 * IN, 6);
    expect(r.webbing_engagement).toBeCloseTo(0.5 * IN, 6);
    expect(r.turn_method).toBe('rod');
    expect(resolveInputs({ ...S, pad_girth: 2.5 }).turn_method).toBe('cord_pull');
    expect(r.adjustment_range).toBeCloseTo((24 - 1 - 4) * IN, 6);
  });
  it('rejects a tuck shallower than the setback and a pad narrower than the webbing', () => {
    expect(validateInputs({ ...S, tuck_depth: 0.25 }).ok).toBe(false);
    expect(validateInputs({ ...S, pad_girth: 2 }).ok).toBe(false);
    expect(validateInputs({ ...S, foam_setback: 9 }).ok).toBe(false);
  });
});

describe('buildPattern', () => {
  it('emits the tube (Convention B, explicit 0), foam, three webbing pieces, hardware and steps', () => {
    const b = buildPattern(S);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const ids = b.value.pieces.map((p) => p.id);
    expect(ids).toEqual([PAD_TUBE_ID, FOAM_ID, 'sling-rear-tail', 'sling-adjust-webbing', 'sling-anchor-strap']);
    const tube = b.value.pieces[0];
    expect(Object.values(tube.seamAllowances ?? {}).every((v) => v === 0)).toBe(true);
    expect(tube.paths.some((p) => p.id === `${PAD_TUBE_ID}-long-seam`)).toBe(true);
    expect(b.value.hardware.map((h) => h.id)).toEqual(['tension-adapter', 'tri-glide', 'cord-loop']);
    expect(b.value.hardware.find((h) => h.id === 'tri-glide')!.quantity).toBe(2);
    expect(renderHtml(b.value.steps).ok).toBe(true);
    const stepIds = new Set(b.value.steps.map((s) => s.id));
    for (const s of b.value.steps) for (const dep of s.dependsOn) expect(stepIds.has(dep)).toBe(true);
    expect(b.value.steps.some((s) => s.id === 'sling.turn' && /rod/.test(s.body))).toBe(true);
    expect(patternToSvg({ id: 'x', name: 'x', pieces: b.value.pieces }, { defaultSeamAllowance: 0, showLabels: true })).toContain('<svg');
  });
  it('every length left at default carries a mock-derived warning; entered ones do not', () => {
    const d = buildPattern({ units: 'in' });
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.value.warnings.filter((w) => w.id.startsWith('mock-derived')).length).toBe(8);
    const e = buildPattern(S);
    expect(e.ok && e.value.warnings.some((w) => w.id.startsWith('mock-derived'))).toBe(false);
    // Half an inch of engagement asks for a bartack.
    expect(e.ok && e.value.warnings.some((w) => w.id === 'engagement')).toBe(true);
  });
  it('separate adjustment tail mapping and buckle QD ends', () => {
    const b = buildPattern({ ...S, third_piece: 'separate_adjust', end_interface: 'buckle_qd', route_through_both_slots: true });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.value.pieces.some((p) => p.id === 'sling-adjust-tail')).toBe(true);
    expect(b.value.hardware.some((h) => h.id === 'side-squeeze' && h.quantity === 2)).toBe(true);
    expect(b.value.steps.find((s) => s.id === 'sling.adapter')!.body).toMatch(/both slots/);
  });
  it('BOM totals webbing and lists hardware; the assembly drapes the finished pad over the shoulder', () => {
    const bom = buildBom(S);
    expect(bom.some((r) => r.id === 'webbing-32')).toBe(true);
    expect(bom.some((r) => r.id === 'hw-tension-adapter')).toBe(true);
    const asm = slingAssembly(resolveInputs(S));
    expect(asm.pieces[0].id).toBe('sling-pad');
    expect(asm.pins).toHaveLength(2);
    expect(asm.placements['sling-pad'].drape?.path.length).toBeGreaterThan(5);
  });
});
