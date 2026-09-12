// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, FACE_ID, BACK_ID, GUSSET_ID, LID_STRIP_ID, BOTTOM_ID } from '../index.js';
import type { ClamshellPackInputs } from '../types.js';
import { renderHtml } from '../../../lib/pattern-engine/instructions/compile.js';
import { patternToSvg } from '../../../lib/pattern-engine/exports/svg.js';

const IN = 25.4;
const SOE: ClamshellPackInputs = { units: 'in' };

describe('resolve — the SOE fat medpack numbers', () => {
  it('11 × 16 × 6: 46" hoop, 6" gusset cut, 3" lid strip, 7 × 8 1/2 bottom, 14 1/2" side work area, 17" handle, 12" straps', () => {
    const r = resolveInputs(SOE);
    // 2 × 16 + 11 + 2 × 1.75 = 46.5" finished — the on-camera 46" cut came up 1/2–3/4" short twice.
    expect(r.hoop_length).toBeCloseTo(46.5 * IN, 6);
    expect(r.hoop_cut_length).toBeCloseTo(47 * IN, 6);
    expect(r.base_depth).toBeCloseTo(4.5 * IN, 6);
    expect(r.gusset_cut_width).toBeCloseTo(6 * IN, 6);
    expect(r.lid_cut_width).toBeCloseTo(3 * IN, 6);
    expect(r.bottom_cut_width).toBeCloseTo(7 * IN, 6);
    expect(r.bottom_nominal_length).toBeCloseTo(8.5 * IN, 6);
    expect(r.side_work_area).toBeCloseTo(14.5 * IN, 6);
    expect(r.side_pals_budget).toBeCloseTo(4.5 * IN, 6);
    expect(r.face_pals_cols).toBe(6);
    expect(r.handle_cut_length).toBeCloseTo(17 * IN, 6);
    expect(r.compression_strap_length).toBeCloseTo(12 * IN, 6);
    expect(r.strap_tab_count).toBe(6);
    expect(r.loop_strips_per_wall).toBe(5);
    expect(r.loop_strip_cut_length).toBeCloseTo(12 * IN, 6);
  });
  it('the pocket grid drives the footprint; equal split halves the depth', () => {
    expect(resolveInputs({ ...SOE, pocket_grid: '3x3', width: 5, height: 5 }).width).toBeCloseTo(15 * IN, 6);
    expect(resolveInputs({ ...SOE, pocket_grid: '3x3' }).height).toBeCloseTo(24 * IN, 6);
    const tp = resolveInputs({ ...SOE, width: 13, height: 17, depth: 6, equal_split: true });
    expect(tp.lid_depth).toBeCloseTo(3 * IN, 6);
    expect(tp.base_depth).toBeCloseTo(3 * IN, 6);
  });
  it('rejects a lid deeper than the bag and underwraps that meet', () => {
    expect(validateInputs({ ...SOE, lid_depth: 6 }).ok).toBe(false);
    expect(validateInputs({ ...SOE, zipper_underwrap: 6 }).ok).toBe(false);
    expect(validateInputs(SOE).ok).toBe(true);
  });
});

describe('buildPattern', () => {
  it('emits the five body pieces with Convention A allowances, PALS on sides/face/bottom, and the vault build order', () => {
    const b = buildPattern(SOE);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const ids = b.value.pieces.map((p) => p.id);
    expect(ids.slice(0, 5)).toEqual([FACE_ID, BACK_ID, GUSSET_ID, LID_STRIP_ID, BOTTOM_ID]);
    const face = b.value.pieces[0];
    expect(Object.values(face.seamAllowances ?? {})).toEqual([0.5 * IN, 0.5 * IN, 0.5 * IN, 0.5 * IN]);
    expect(face.paths.filter((p) => p.id.includes('-pals-row-'))).toHaveLength(5);
    expect(face.paths.filter((p) => p.id.includes('-pals-bartack-'))).toHaveLength(5 * 7);
    const gusset = b.value.pieces[2];
    // Allowance on the back seam edge and both ends; the lip edge is folded.
    expect(Object.values(gusset.seamAllowances ?? {})).toEqual([0.5 * IN, 0.5 * IN, 0, 0.5 * IN]);
    expect(gusset.paths.filter((p) => p.id.includes('-pals-left-row-'))).toHaveLength(7);
    expect(gusset.paths.filter((p) => p.id.includes('-pals-right-row-'))).toHaveLength(7);
    // Side rows lie across the strip: each row edge is a short segment in y.
    const row = gusset.paths.find((p) => p.id.endsWith('-pals-left-row-0'))!;
    expect(row.edges[0].kind === 'straight' && Math.abs(row.edges[0].end.y - row.edges[0].start.y)).toBeCloseTo(4.5 * IN, 6);
    expect(gusset.paths.filter((p) => p.edges[0].role === 'fold' && /-90°/.test(p.label ?? ''))).toHaveLength(4);
    const lid = b.value.pieces[3];
    expect(Object.values(lid.seamAllowances ?? {})).toEqual([0, 0.5 * IN, 0.5 * IN, 0.5 * IN]);
    const bottom = b.value.pieces[4];
    expect(bottom.paths.filter((p) => p.id.includes('-pals-row-'))).toHaveLength(3);
    expect(bottom.annotations?.some((a) => /CUT AFTER THE HOOP/.test(a.label ?? ''))).toBe(true);
    // One entry per row length (face, two side runs, bottom), summing to every row.
    expect(b.value.pieces.filter((p) => p.id.startsWith('clamshell-pals-row')).reduce((a2, p) => a2 + p.quantity, 0)).toBe(5 + 7 + 7 + 3);
    expect(b.value.pieces.find((p) => p.id === 'clamshell-strap-tab')!.quantity).toBe(6);
    const steps = b.value.steps.map((s) => s.id);
    expect(steps.indexOf('cs.velcro')).toBeLessThan(steps.indexOf('cs.back'));
    expect(steps.indexOf('cs.hoop')).toBeLessThan(steps.indexOf('cs.back'));
    expect(steps.indexOf('cs.back')).toBeLessThan(steps.indexOf('cs.face'));
    const set = new Set(steps);
    for (const s of b.value.steps) for (const dep of s.dependsOn) expect(set.has(dep)).toBe(true);
    expect(renderHtml(b.value.steps).ok).toBe(true);
    expect(patternToSvg({ id: 'x', name: 'x', pieces: b.value.pieces }, { defaultSeamAllowance: 0, showLabels: true })).toContain('<svg');
    const w = b.value.warnings;
    expect(w.some((x) => x.id === 'depth-wrap')).toBe(true);
    expect(w.filter((x) => x.tag === 'mock-derived').map((x) => x.id)).toEqual(['lid-depth', 'underwrap', 'compression-extra']);
    expect(w.some((x) => x.id === 'side-pals-budget')).toBe(false);
  });
  it('a 1/2" zipper clearance blows the side PALS budget and warns; the 3" standard depth drops the wrap warning', () => {
    const b = buildPattern({ ...SOE, zipper_clearance: 0.5 });
    expect(b.ok && b.value.warnings.some((x) => x.id === 'side-pals-budget')).toBe(true);
    const std = buildPattern({ ...SOE, depth: 3, lid_depth: 1 });
    expect(std.ok && std.value.warnings.some((x) => x.id === 'depth-wrap')).toBe(false);
    const none = buildPattern({ ...SOE, strap_provision: 'none', handle: false, compression_straps_per_side: 0, interior_loop: false });
    expect(none.ok).toBe(true);
    if (!none.ok) return;
    expect(none.value.pieces.map((p) => p.id).filter((id) => !id.startsWith('clamshell-pals-row')))
      .toEqual([FACE_ID, BACK_ID, GUSSET_ID, LID_STRIP_ID, BOTTOM_ID]);
    expect(none.value.pieces.some((p) => p.id.startsWith('clamshell-pals-row'))).toBe(true);
    expect(none.value.warnings.some((x) => x.id === 'strap-trap')).toBe(true);
  });
  it('BOM lists cut sizes with allowance, webbing totals and hardware', () => {
    const bom = buildBom(SOE);
    const face = bom.find((r) => r.id === `piece-${FACE_ID}`)!;
    expect(face.unit).toContain(`${Math.round(12 * IN)} × ${Math.round(17 * IN)}`);
    expect(bom.some((r) => r.id === 'material-webbing-25')).toBe(true);
    expect(bom.some((r) => r.id === 'hw-zipper')).toBe(true);
    expect(bom.find((r) => r.id === `piece-${BOTTOM_ID}`)!.notes).toMatch(/after the hoop/);
  });
});
