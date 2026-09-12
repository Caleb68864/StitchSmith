// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, deriveTailLength, PAD_PIECE_ID, CROSS_STRAP_PIECE_ID, PALS_ROW_PIECE_ID, CHANNEL_BAR_PIECE_ID } from '../index.js';
import type { PaddedStrapInputs } from '../types.js';
import { renderHtml } from '../../../lib/pattern-engine/instructions/compile.js';
import { patternToSvg } from '../../../lib/pattern-engine/exports/svg.js';

const PAIR: PaddedStrapInputs = { units: 'mm', mode: 'pack_pair', pad_length: 400, pad_width: 60, torso_length: 500, gusset_depth: 150 };
const H: PaddedStrapInputs = { units: 'mm', mode: 'h_harness', pad_length: 400, pad_width: 63.5, cross_strap_height: 150, pad_spread: 150, drop_leg_length: 300, foam_thickness: 10 };

describe('pack pair', () => {
  it('derives the tail from torso AND gusset depth, and says so', () => {
    expect(deriveTailLength(500, 400, 150)).toBe(450);
    const r = buildPattern(PAIR);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.derived.resolved.tail_length).toBe(450);
    expect(r.value.derived.resolved.tail_derived).toBe(true);
    expect(r.value.warnings.some((w) => w.id === 'tail-derived')).toBe(true);
    const tail = r.value.pieces.find((p) => p.id === `${PAD_PIECE_ID}-webbing-tail`)!;
    expect(Math.max(...tail.paths[0].edges.map((e) => e.end.y))).toBeCloseTo(450 + 25.4, 5);
  });

  it('an explicit tail overrides the derivation', () => {
    const r = resolveInputs({ ...PAIR, tail_length: 600 });
    expect(r.tail_length).toBe(600);
    expect(r.tail_derived).toBe(false);
  });

  it('inch inputs convert once; allowances stay mm', () => {
    const r = resolveInputs({ units: 'in', mode: 'pack_pair', pad_length: 16, pad_width: 2.5, seam_allowance: 10 });
    expect(r.pad_length).toBeCloseTo(406.4, 5);
    expect(r.pad_width).toBeCloseTo(63.5, 5);
    expect(r.seam_allowance).toBe(10);
  });

  it('emits shell, backer, foam and two webbing pieces; no H pieces; steps compile; SVG renders', () => {
    const r = buildPattern(PAIR);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.value.pieces.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining([PAD_PIECE_ID, `${PAD_PIECE_ID}-inner`, `${PAD_PIECE_ID}-foam`, `${PAD_PIECE_ID}-webbing-tail`, `${PAD_PIECE_ID}-webbing-top`]));
    expect(ids).not.toContain(CROSS_STRAP_PIECE_ID);
    expect(renderHtml(r.value.steps).ok).toBe(true);
    expect(patternToSvg({ id: 'x', name: 'x', pieces: r.value.pieces }, { defaultSeamAllowance: 10, showLabels: true })).toContain('<svg');
  });

  it('rejects a zero pad width and a negative gusset', () => {
    expect(validateInputs({ ...PAIR, pad_width: 0 }).ok).toBe(false);
    expect(validateInputs({ ...PAIR, gusset_depth: -1 }).ok).toBe(false);
  });
});

describe('H-harness', () => {
  it('runs 1.5" webbing full length out both ends to four side-release corners with tri-glides', () => {
    const r = buildPattern(H);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const res = r.value.derived.resolved;
    expect(res.webbing_width).toBeCloseTo(38.1, 5);
    expect(res.architecture).toBe('webbing_through_quilted');
    const run = r.value.pieces.find((p) => p.id === `${PAD_PIECE_ID}-webbing`)!;
    expect(Math.max(...run.paths[0].edges.map((e) => e.end.y))).toBeCloseTo(300 + 400 + 300, 5);
    const sr = r.value.hardware.find((h) => h.id === 'side-release')!;
    const tg = r.value.hardware.find((h) => h.id === 'tri-glide')!;
    expect(sr.quantity).toBe(4);
    expect(tg.quantity).toBe(4);
  });

  it('cross strap = 2 × pad width + spread + 8" adjustment, with slots at 1" across the range', () => {
    const r = buildPattern(H);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const res = r.value.derived.resolved;
    expect(res.cross_strap_length).toBeCloseTo(2 * 63.5 + 150 + 203.2, 5);
    expect(res.slot_count).toBe(9);
    const cross = r.value.pieces.find((p) => p.id === CROSS_STRAP_PIECE_ID)!;
    const slots = cross.paths.filter((p) => p.id.includes('-slot-'));
    expect(slots).toHaveLength(9);
    expect(slots[0].edges[0].start.x).toBeCloseTo(63.5 + 150, 5);
    expect(slots[8].edges[0].start.x).toBeCloseTo(63.5 + 150 + 203.2, 5);
  });

  it('marks the cross-strap landing, unsewn hydration channels and PALS rows on the pad', () => {
    const r = buildPattern({ ...H, hydration_channels: 2, front_pals_rows: 2, routing_side: 'left' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const pad = r.value.pieces.find((p) => p.id === PAD_PIECE_ID)!;
    expect(pad.paths.some((p) => p.id === `${PAD_PIECE_ID}-cross-strap-land`)).toBe(true);
    const channels = pad.paths.filter((p) => p.id.includes('-channel-'));
    expect(channels).toHaveLength(2);
    expect(channels.every((p) => p.edges.every((e) => e.role === 'notch') && /UNSEWN/.test(p.label ?? ''))).toBe(true);
    // Both bars sit above the cross strap (y < 150 − 19) and inside the pad.
    expect(channels.every((p) => p.edges.every((e) => e.start.y >= 0 && e.start.y < 150 - 38.1 / 2))).toBe(true);
    const bars = r.value.pieces.find((p) => p.id === CHANNEL_BAR_PIECE_ID)!;
    expect(bars.quantity).toBe(4);
    expect(r.value.steps.some((s) => s.id === 'h.channels')).toBe(true);
    const pals = pad.paths.filter((p) => p.id.includes('-pals-'));
    expect(pals).toHaveLength(2);
    // Rows sit on the chest end of the pad, clear of the cross strap.
    expect(pals.every((p) => p.edges[0].start.y > 150 + 38.1 / 2 + 10)).toBe(true);
    const rows = r.value.pieces.find((p) => p.id === PALS_ROW_PIECE_ID)!;
    expect(rows.quantity).toBe(2);
    expect(r.value.steps.map((s) => s.id)).toEqual(expect.arrayContaining(['h.cross-strap', 'h.slots', 'h.pals', 'h.corners', 'h.fit']));
    expect(renderHtml(r.value.steps).ok).toBe(true);
  });

  it('routing_side none drops the PALS piece and step', () => {
    const r = buildPattern({ ...H, routing_side: 'none' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.pieces.some((p) => p.id === PALS_ROW_PIECE_ID)).toBe(false);
    expect(r.value.steps.some((s) => s.id === 'h.pals')).toBe(false);
  });

  it('Open vault numbers left at default carry mock-derived warnings; entered ones do not', () => {
    const defaulted = buildPattern({ units: 'mm', mode: 'h_harness' });
    expect(defaulted.ok).toBe(true);
    if (!defaulted.ok) return;
    const ids = defaulted.value.warnings.map((w) => w.id);
    expect(ids).toEqual(expect.arrayContaining(['mock-derived-pad_length', 'mock-derived-pad_width', 'mock-derived-cross_strap_height', 'mock-derived-pad_spread', 'mock-derived-drop_leg_length', 'mock-derived-foam']));
    const entered = buildPattern(H);
    expect(entered.ok).toBe(true);
    if (!entered.ok) return;
    expect(entered.value.warnings.some((w) => w.id.startsWith('mock-derived'))).toBe(false);
  });

  it('cross strap height must sit within the pad', () => {
    expect(validateInputs({ ...H, cross_strap_height: 400 }).ok).toBe(false);
  });
});

describe('BOM', () => {
  it('totals webbing by width and lists hardware', () => {
    const bom = buildBom(H);
    const w38 = bom.find((r) => r.id === 'webbing-38')!;
    // 2 runs × 1000 + cross strap 480.2 + 4 channel bars × (63.5 + 25.4) → rounded up to 10
    expect(w38.quantity).toBe(Math.ceil((2 * 1000 + 2 * 63.5 + 150 + 203.2 + 4 * (63.5 + 25.4)) / 10) * 10);
    expect(bom.some((r) => r.id === 'hw-side-release' && r.quantity === 4)).toBe(true);
    expect(bom.some((r) => r.id === `piece-${PAD_PIECE_ID}`)).toBe(true);
  });
});
