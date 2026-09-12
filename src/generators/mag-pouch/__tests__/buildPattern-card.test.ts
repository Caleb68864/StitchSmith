/**
 * buildPattern-card.test.ts — the pleated-card path end to end, pinned to the
 * SOE 4-pack card, plus the grid-aware folded-T body.
 */
import { describe, it, expect } from 'vitest';
import { buildPattern } from '../buildPattern.js';
import { validateInputs } from '../inputs.js';
import type { MagPouchInputs } from '../types.js';
import { bboxFromPiece } from '../../../lib/pattern-engine/geometry/bbox.js';
import { renderHtml } from '../../../lib/pattern-engine/instructions/compile.js';
import { patternToSvg } from '../../../lib/pattern-engine/exports/svg.js';

const IN = 25.4;

function fourPack(overrides: Partial<MagPouchInputs> = {}): MagPouchInputs {
  return {
    magazine: { mode: 'predefined', presetId: 'ar15_30_round', units: 'in' },
    construction: 'pleated_card',
    cell_count: 4,
    face_per_cell: 4.875,
    exposed_percentage: 5.5 / 7.5,
    retention: 'velcro_dot',
    attachment: 'pals',
    drainage: 'open_corner',
    seamAllowance: 0.375,
    ...overrides,
  };
}

describe('pleated card — SOE 4-pack single rifle mag card', () => {
  const result = buildPattern(fourPack());
  const byId = (id: string) => result.pattern.pieces.find((p) => p.id === id);

  it('validates', () => {
    expect(validateInputs(fourPack())).toEqual({ ok: true });
  });

  it('back cuts 14" × 7.5", face cuts 20.5" × 11"', () => {
    const back = bboxFromPiece(byId('back')!);
    const face = bboxFromPiece(byId('face')!);
    expect(back.width).toBeCloseTo(14 * IN, 4);
    expect(back.height).toBeCloseTo(7.5 * IN, 4);
    expect(face.width).toBeCloseTo(20.5 * IN, 4);
    expect(face.height).toBeCloseTo(11 * IN, 4);
  });

  it('emits the SOE cut list: 8 loop strips, 4 cradles, 12 face bars, 2 back rows, 8 mount straps, 4 hook dots', () => {
    expect(byId('interior-loop')?.quantity).toBe(8);
    expect(byId('cradle-strip')?.quantity).toBe(4);
    expect(byId('face-pals-bar')?.quantity).toBe(12);
    expect(byId('pals-back-row')?.quantity).toBe(2);
    expect(byId('pals-mount-strap')?.quantity).toBe(8);
    expect(byId('hook-dot')?.quantity).toBe(4);
  });

  it('back rows are cut 13" (12" back + 1" over-cut) and loop strips run the 5.5" card height', () => {
    const row = byId('pals-back-row')!;
    expect(bboxFromPiece(row).width).toBeCloseTo(13 * IN, 4);
    expect(bboxFromPiece(byId('interior-loop')!).height).toBeCloseTo(5.5 * IN, 4);
  });

  it('cut list has one row per piece and the BOM tags rows trim-after-sew', () => {
    expect(result.cutPieces.map((c) => c.id)).toEqual(result.pattern.pieces.map((p) => p.id));
    const rows = result.bom.materials.find((m) => m.id === 'pals-row-webbing')!;
    expect(rows.cutTag).toBe('trim-after-sew');
    expect(rows.cutLengthMm).toBeCloseTo(13 * IN, 4);
    expect(rows.quantity).toBe(2);
    expect(result.bom.materials.find((m) => m.id === 'cradle-webbing')?.quantity).toBe(4);
    expect(result.bom.materials.find((m) => m.id === 'hook-dot')?.quantity).toBe(4);
  });

  it('derived numbers match the card', () => {
    const d = result.derived;
    expect(d.construction).toBe('pleated_card');
    expect(d.cellCount).toBe(4);
    expect(d.cellSpanIn).toBe(3);
    expect(d.palsColumns).toBe(8);
    expect(d.facePerCellIn).toBe(4.875);
    expect(d.puckerPerSideIn).toBeCloseTo(0.9375, 6);
    expect(d.pouchHeightIn).toBeCloseTo(5.5, 9);
    expect(d.palsRows).toBe(2);
    expect(d.flapLengthIn).toBe(0);
    expect(d.caliberLocked).toBe(false);
  });

  it('steps put every interior piece on the face before the bottom join, in emitted order', () => {
    const order = result.steps.map((s) => s.id);
    const joinBottom = order.indexOf('pc-join-bottom');
    for (const id of ['interior-loop-sew', 'cradle-tack', 'face-pals-sew', 'pals-back-rows']) {
      expect(order.indexOf(id)).toBeGreaterThan(-1);
      expect(order.indexOf(id)).toBeLessThan(joinBottom);
    }
    expect(order.indexOf('retention-velcro-dot')).toBeGreaterThan(order.indexOf('pc-bottom'));
    expect(order.indexOf('pals-mount-straps')).toBeGreaterThan(order.indexOf('pc-join-sides'));
    expect(order[order.length - 1]).toBe('batch-note');
  });

  it('step dependencies all resolve and compile without cycles', () => {
    const ids = new Set(result.steps.map((s) => s.id));
    for (const s of result.steps) for (const d of s.dependsOn) expect(ids.has(d)).toBe(true);
    expect(new Set(result.steps.map((s) => s.id)).size).toBe(result.steps.length);
    expect(renderHtml(result.steps).ok).toBe(true);
  });

  it('a well-proportioned card raises no warnings and renders to SVG', () => {
    expect(result.warnings).toEqual([]);
    expect(patternToSvg(result.pattern, { defaultSeamAllowance: 0 })).toContain('<svg');
  });
});

describe('pleated card — variants', () => {
  it('a lidded card extends the back and adds hook/loop strips and a lid step', () => {
    const r = buildPattern(fourPack({ retention: 'flap_velcro', flap_length: 5 }));
    expect(bboxFromPiece(r.pattern.pieces.find((p) => p.id === 'back')!).height).toBeCloseTo(12.5 * IN, 4);
    expect(r.pattern.pieces.find((p) => p.id === 'velcro-hook')).toBeDefined();
    expect(r.steps.map((s) => s.id)).toContain('lid-closure');
    expect(r.derived.flapLengthIn).toBe(5);
  });

  it('an AK card hems the face (+0.75") and warns if the hem is switched off', () => {
    const ak = { mode: 'predefined' as const, presetId: 'ak47_762x39_30round' as const, units: 'in' as const };
    const on = buildPattern(fourPack({ magazine: ak, face_per_cell: undefined }));
    expect(bboxFromPiece(on.pattern.pieces.find((p) => p.id === 'face')!).height).toBeCloseTo((2 * 9.5 * (5.5 / 7.5) + 0.75) * IN, 4);
    expect(on.warnings.some((w) => w.includes('AK-pattern'))).toBe(false);
    const off = buildPattern(fourPack({ magazine: ak, face_per_cell: undefined, ak_face_hem: false }));
    expect(off.warnings.some((w) => w.includes('locking lug'))).toBe(true);
  });

  it('.308 on PALS rounds the cell to 4.5" and says why', () => {
    const r = buildPattern(fourPack({ magazine: { mode: 'predefined', presetId: 'pmag_308_20', units: 'in' }, face_per_cell: undefined, cell_count: 2 }));
    expect(r.derived.cellSpanIn).toBe(4.5);
    expect(r.warnings.some((w) => w.includes('grid tax'))).toBe(true);
    expect(bboxFromPiece(r.pattern.pieces.find((p) => p.id === 'back')!).width).toBeCloseTo(11 * IN, 4);
  });

  it('an off-grid span override on a PALS mount warns "will not mount up in spec spacing"', () => {
    const r = buildPattern(fourPack({ cell_span: 3.5 }));
    expect(r.warnings.some((w) => w.includes('spec spacing'))).toBe(true);
  });

  it('bungee retention forces face bars, locks the caliber and cuts 16" of cord per cell', () => {
    const r = buildPattern(fourPack({ retention: 'open_top_bungee', face_pals: false }));
    expect(r.pattern.pieces.find((p) => p.id === 'face-pals-bar')?.quantity).toBe(12);
    expect(r.derived.caliberLocked).toBe(true);
    expect(r.warnings.some((w) => w.includes('commits this pouch'))).toBe(true);
    const cord = r.bom.materials.find((m) => m.id === 'bungee-cord')!;
    expect(cord.quantity).toBe(4);
    expect(cord.cutLengthMm).toBeCloseTo(16 * IN, 4);
    expect(cord.cutTag).toBe('mock-derived');
  });

  it('pleated and open bottoms drop the cradle and warn', () => {
    const pleat = buildPattern(fourPack({ bottom_style: 'pleat' }));
    expect(pleat.pattern.pieces.find((p) => p.id === 'cradle-strip')).toBeUndefined();
    expect(pleat.derived.maxLayers).toBe(14);
    expect(pleat.warnings.some((w) => w.includes('ride height'))).toBe(true);
    const open = buildPattern(fourPack({ bottom_style: 'open', retention: 'kydex_wedge' }));
    expect(open.bom.hardware.find((h) => h.type === 'wedge')?.quantity).toBe(4);
  });

  it('a single-cell card with Velcro mount runs the cell at mag width + ease', () => {
    const r = buildPattern(fourPack({ cell_count: 1, attachment: 'velcro_panel', face_per_cell: undefined }));
    expect(r.derived.cellSpanIn).toBeCloseTo(2.8, 9);
    expect(r.pattern.pieces.find((p) => p.id === 'velcro-hook-panel')).toBeDefined();
    expect(bboxFromPiece(r.pattern.pieces.find((p) => p.id === 'back')!).width).toBeCloseTo(4.8 * IN, 4);
  });
});

describe('folded-T — grid-aware single pouch', () => {
  const base: MagPouchInputs = {
    magazine: { mode: 'predefined', presetId: 'ar15_30_round', units: 'in' },
    retention: 'flap_velcro',
    attachment: 'pals',
    drainage: 'open_corner',
    seamAllowance: 0.375,
  };

  it('a PALS-mounted body is 3" wide inside, with 1.25" wings and 3/8" SA each side', () => {
    const r = buildPattern(base);
    const body = r.pattern.pieces.find((p) => p.id === 'body')!;
    expect(bboxFromPiece(body).width).toBeCloseTo((3 + 2 * 1.25 + 2 * 0.375) * IN, 4);
    expect(r.derived.cellSpanIn).toBe(3);
    // 0.2" of grid tax is the normal rifle case — surfaced in the summary, not as a warning.
    expect(r.warnings.some((w) => w.includes('grid tax'))).toBe(false);
  });

  it('a Velcro-mounted body stays at mag width + ease', () => {
    const r = buildPattern({ ...base, attachment: 'velcro_panel' });
    const body = r.pattern.pieces.find((p) => p.id === 'body')!;
    expect(bboxFromPiece(body).width).toBeCloseTo((2.8 + 2 * 1.25 + 2 * 0.375) * IN, 4);
  });

  it('the lid is derived from coverage, depth, reach and the pull channel: 9.75" on a 30-round AR mag', () => {
    const r = buildPattern(base);
    const body = r.pattern.pieces.find((p) => p.id === 'body')!;
    // front 5.25 + bottom 1.25 + back 5.25 + lid (2 × 2.25 + 1.25 + 2.5 = 8.25, + 1.5 pull channel) + 2 × 0.375 SA
    expect(bboxFromPiece(body).height).toBeCloseTo((5.25 + 1.25 + 5.25 + 9.75 + 0.75) * IN, 4);
    expect(r.derived.flapLengthIn).toBeCloseTo(9.75, 9);
  });

  it('keeps the four mandatory step ids, in order, around the component steps', () => {
    const r = buildPattern({ ...base, retention: 'velcro_dot' });
    const order = r.steps.map((s) => s.id);
    expect(order.indexOf('cut-fabric')).toBeLessThan(order.indexOf('interior-loop-sew'));
    expect(order.indexOf('interior-loop-sew')).toBeLessThan(order.indexOf('assemble-body'));
    expect(order.indexOf('assemble-body')).toBeLessThan(order.indexOf('pals-back-rows'));
    expect(order.indexOf('attach-retention')).toBeLessThan(order.indexOf('finish-edges'));
    expect(renderHtml(r.steps).ok).toBe(true);
    expect(r.pattern.pieces.find((p) => p.id === 'interior-loop')?.quantity).toBe(2);
  });

  it('rejects a multi-cell folded-T', () => {
    const v = validateInputs({ ...base, cell_count: 3 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors['cell_count']).toMatch(/pleated_card/);
  });

  it('rejects a face narrower than the span and a silly cell count', () => {
    expect(validateInputs({ ...base, construction: 'pleated_card', cell_span: 3, face_per_cell: 3 }).ok).toBe(false);
    expect(validateInputs({ ...base, construction: 'pleated_card', cell_count: 9 }).ok).toBe(false);
    expect(validateInputs({ ...base, construction: 'pleated_card', cell_count: 2.5 }).ok).toBe(false);
  });
});
