// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, quiltGeometry, LINER_ID, SHELL_ID, BAFFLE_PREFIX, MESH_ID, PLACEHOLDERS } from '../index.js';
import type { QuiltInputs } from '../types.js';
import { makeDefaultQuiltProject } from '../../../state/useQuiltProject.js';
import { bboxFromPiece } from '../../../lib/pattern-engine/geometry/bbox.js';
import { G_PER_OZ, MM3_PER_IN3 } from '../../../lib/pattern-engine/primitives/chambers.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';

const IN = 25.4;
const DEF: QuiltInputs = makeDefaultQuiltProject().inputs;
const ST: QuiltInputs = { ...DEF, construction: 'sewn_through' };
const built = (i: QuiltInputs) => { const b = buildPattern(i); if (!b.ok) throw new Error(JSON.stringify(b.errors)); return b.value; };
const piece = (pieces: Piece[], id: string) => pieces.find((p) => p.id === id)!;
const errorFields = (i: QuiltInputs) => { const v = validateInputs(i); return v.ok ? [] : v.errors.map((e) => e.field); };
const ids = (i: QuiltInputs) => built(i).warnings.map((w) => w.id);

describe('resolve — cut sizes from the placeholders', () => {
  it('default: 78" tapered 54" → 40", 1/2" seam allowance, baffled at 6" (13 chambers, 12 baffles)', () => {
    const r = resolveInputs(DEF);
    expect(validateInputs(DEF).ok).toBe(true);
    expect(r.construction).toBe('baffled');
    expect(r.cut_length).toBeCloseTo(79 * IN, 6);
    expect(r.fabric_length).toBeCloseTo(158 * IN, 6);
    expect(r.chambers!.count).toBe(13);
    expect(r.chambers!.wallY).toHaveLength(12);
    // Liner: 54" + 2 × 1/2", plus the mitre of the tapered side at the head corner.
    expect(r.liner_cut_width).toBeGreaterThan(55 * IN);
    expect(r.liner_cut_width).toBeLessThan(55.1 * IN);
    // Shell 3 % wider.
    expect(r.shell_cut_width).toBeGreaterThan(54 * 1.03 * IN + IN);
  });

  it('fill: the liner trapezoid × loft × 1.1 / 850, in grams (≈ 7332 in³ → 9.49 oz)', () => {
    const r = resolveInputs(DEF);
    const volIn3 = ((54 + 40) / 2) * 78 * 2;
    expect(r.chambers!.totalVolumeMm3 / MM3_PER_IN3).toBeCloseTo(volIn3, 6);
    expect(r.total_fill_g).toBeCloseTo((volIn3 * 1.1 / 850) * G_PER_OZ, 6);
    // Head chambers are wider, so they take more fill than the foot ones.
    const c = r.chambers!.chambers;
    expect(c[0].fillG).toBeGreaterThan(c[c.length - 1].fillG);
  });

  it('sewn-through: 2/3 of the baffled fill, no differential, no baffles', () => {
    const b = resolveInputs(DEF), s = resolveInputs({ ...ST, shell_differential: 5 });
    expect(s.total_fill_g / b.total_fill_g).toBeCloseTo(2 / 3, 9);
    expect(s.shell_differential).toBe(0);
    expect(s.shell_cut_width).toBeCloseTo(s.liner_cut_width, 9);
    expect(built(ST).pieces.filter((p) => p.materialId === MESH_ID)).toHaveLength(0);
    expect(ids({ ...ST, shell_differential: 5 })).toContain('differential-ignored');
  });

  it('millimetres; fill power stays in³/oz', () => {
    const r = resolveInputs({ units: 'mm', length: 2000, shoulder_width: 1300, foot_width: 1000, loft: 50, baffle_spacing: 150, fill_power: 800, overstuff: 0, seam_allowance: 10 });
    expect(r.cut_length).toBe(2020);
    expect(r.chambers!.count).toBe(14);
    expect(r.total_fill_g).toBeCloseTo((((1150 * 2000 * 50) / MM3_PER_IN3) / 800) * G_PER_OZ, 6);
  });

  it('zip footbox: zipper = half the foot width + the footbox length, on the BOM', () => {
    const r = resolveInputs({ ...DEF, footbox: 'zip' });
    expect(r.zipper_length).toBeCloseTo(40 * IN, 6);
    expect(buildBom({ ...DEF, footbox: 'zip' }).some((row) => row.id === 'hw-footbox-zip')).toBe(true);
  });
});

describe('validation — the field that fixes it', () => {
  it('a shell wider than the fabric is an error on shoulder_width', () => {
    expect(errorFields({ ...DEF, shoulder_width: 57 })).toEqual(['shoulder_width']);
    expect(errorFields({ ...DEF, shoulder_width: 55, shell_differential: 10 })).toEqual(['shoulder_width']);
    // The same 55" sewn through (no differential) fits.
    expect(errorFields({ ...ST, shoulder_width: 55 })).toEqual([]);
  });
  it('footbox as long as the quilt, spacing longer than it, non-positive numbers', () => {
    expect(errorFields({ ...DEF, footbox_length: 78 })).toEqual(['footbox_length']);
    expect(errorFields({ ...DEF, baffle_spacing: 80 })).toEqual(['baffle_spacing']);
    expect(errorFields({ ...DEF, loft: 0 })).toContain('loft');
    expect(errorFields({ ...DEF, fill_power: 0 })).toContain('fill_power');
    expect(errorFields({ ...DEF, length: Number.NaN })).toContain('length');
  });
});

describe('pattern — Convention B', () => {
  it('shell, liner and one mesh baffle per wall; explicit 0 on every cut edge', () => {
    const { pieces } = built(DEF);
    expect(pieces.map((p) => p.id)).toEqual([SHELL_ID, LINER_ID, ...Array.from({ length: 12 }, (_, i) => `${BAFFLE_PREFIX}${i + 1}`)]);
    for (const p of pieces) {
      const outline = p.paths.find((x) => x.id.endsWith('-outline'))!;
      expect(Object.keys(p.seamAllowances!)).toHaveLength(outline.edges.length);
      expect(Object.values(p.seamAllowances!).every((v) => v === 0)).toBe(true);
    }
  });

  it('panels: cut bbox = the resolved cut size; the sew line sits one allowance inside the head and foot', () => {
    const r = resolveInputs(DEF);
    const { pieces } = built(DEF);
    const liner = piece(pieces, LINER_ID), shell = piece(pieces, SHELL_ID);
    const lb = bboxFromPiece(liner);
    expect(lb.width).toBeCloseTo(r.liner_cut_width, 6);
    expect(lb.height).toBeCloseTo(79 * IN, 6);
    expect(bboxFromPiece(shell).width).toBeCloseTo(r.shell_cut_width, 6);
    const sew = liner.paths.find((x) => x.id === `${LINER_ID}-sew`)!;
    const ys = sew.edges.map((e) => e.start.y);
    expect(Math.min(...ys)).toBeCloseTo(12.7, 6);
    expect(Math.max(...ys)).toBeCloseTo(12.7 + 78 * IN, 6);
    // Head sew line is the 54" shoulder width.
    const head = sew.edges[0];
    expect(head.end.x - head.start.x).toBeCloseTo(54 * IN, 6);
  });

  it('every wall is drawn on both panels at the same y, spanning that panel\'s finished width', () => {
    const r = resolveInputs(DEF);
    const g = quiltGeometry(r);
    const { pieces } = built(DEF);
    for (const [id, o] of [[LINER_ID, g.liner], [SHELL_ID, g.shell]] as const) {
      const walls = piece(pieces, id).paths.filter((x) => x.id.startsWith(`${id}-wall-`));
      expect(walls).toHaveLength(12);
      walls.forEach((w, i) => {
        const e = w.edges[0];
        expect(e.role).toBe('stitch');
        expect(e.start.y).toBeCloseTo(12.7 + (i + 1) * 6 * IN, 6);
        expect(e.end.x - e.start.x).toBeCloseTo(2 * o.halfWidthAt((i + 1) * 6 * IN), 6);
      });
    }
  });

  it('baffles: loft + 2 allowances tall; the shell edge is the shell width, the liner edge the liner width (+ 2 allowances each)', () => {
    const r = resolveInputs(DEF);
    const g = quiltGeometry(r);
    const { pieces } = built(DEF);
    const b1 = piece(pieces, `${BAFFLE_PREFIX}1`);
    const out = b1.paths.find((x) => x.id.endsWith('-outline'))!.edges;
    const top = out[0], bottom = out[2];
    expect(bboxFromPiece(b1).height).toBeCloseTo(2 * IN + 2 * 12.7, 6);
    expect(top.end.x - top.start.x).toBeCloseTo(2 * g.shell.halfWidthAt(6 * IN) + 2 * 12.7, 6);
    expect(bottom.start.x - bottom.end.x).toBeCloseTo(2 * g.liner.halfWidthAt(6 * IN) + 2 * 12.7, 6);
    expect(b1.materialId).toBe(MESH_ID);
  });

  it('fill per chamber is written on the liner and listed in the fill step', () => {
    const v = built(DEF);
    const labels = (piece(v.pieces, LINER_ID).annotations ?? []).filter((a) => a.label?.startsWith('Ch '));
    expect(labels).toHaveLength(13);
    expect(v.steps.find((s) => s.id === 'quilt.fill')!.body).toMatch(/1: \d+ g, 2: /);
  });

  it('steps run in dependency order and cover every piece', () => {
    const v = built(DEF);
    const seen = new Set<string>();
    for (const s of v.steps) { for (const d of s.dependsOn) expect(seen.has(d)).toBe(true); seen.add(s.id); }
    const refs = new Set(v.steps.flatMap((s) => s.refsPieces));
    for (const p of v.pieces) expect(refs.has(p.id)).toBe(true);
  });
});

describe('placeholders — every one flagged until entered', () => {
  it('the default project leaves every placeholder empty and names each in one mock-derived note', () => {
    for (const p of PLACEHOLDERS) expect(DEF[p.field]).toBeUndefined();
    const w = built(DEF).warnings.filter((x) => x.id === 'mock-derived');
    expect(w).toHaveLength(1);
    for (const p of PLACEHOLDERS.filter((x) => !['end_channel', 'neck_channel', 'pad_width'].includes(x.field))) expect(w[0].message).toContain(p.label);
    expect(w[0].message).not.toContain('End channel');
  });
  it('entering every placeholder clears the note; sewn-through does not ask for the differential', () => {
    const all: QuiltInputs = { ...DEF, length: 78, shoulder_width: 54, foot_width: 40, footbox_length: 20, fabric_width: 58, loft: 2, baffle_spacing: 6, shell_differential: 3, fill_power: 850, overstuff: 10, seam_allowance: 12.7 };
    expect(ids(all)).not.toContain('mock-derived');
    const { shell_differential: _d, ...noDiff } = all;
    expect(ids({ ...noDiff, construction: 'sewn_through' })).not.toContain('mock-derived');
  });
  it('warnings: inverted taper, narrow chambers, sewn-through cold spots, the fill estimate always', () => {
    expect(ids({ ...DEF, shoulder_width: 44, foot_width: 46 })).toContain('foot-wider');
    expect(ids({ ...DEF, baffle_spacing: 1.5 })).toContain('chamber-narrow');
    expect(ids(ST)).toContain('sewn-through-cold');
    expect(ids(DEF)).toContain('fill-estimate');
  });
});

describe('BOM', () => {
  it('pieces at cut size, shell + liner lengths, mesh for 12 baffles, fill in grams', () => {
    const rows = buildBom(DEF);
    const r = resolveInputs(DEF);
    expect(rows.filter((x) => x.id.startsWith('piece-'))).toHaveLength(14);
    expect(rows.find((x) => x.id === 'material-quilt-shell-fabric')!.quantity).toBe(Math.ceil(r.cut_length / 10) * 10);
    expect(rows.find((x) => x.id === `material-${MESH_ID}`)!.quantity).toBe(Math.ceil((12 * (2 * IN + 2 * 12.7)) / 10) * 10);
    expect(rows.find((x) => x.id === 'material-fill')!.quantity).toBe(Math.ceil(r.total_fill_g));
    expect(buildBom({ ...DEF, loft: 0 })).toEqual([]);
  });
});

describe('underquilt mode (roadmap 10c follow-up)', () => {
  const UQ: QuiltInputs = { ...DEF, kind: 'underquilt' };
  it('a rectangle the shoulder width across; the liner (toward the hammock) takes the differential', () => {
    const r = resolveInputs(UQ);
    expect(validateInputs(UQ).ok).toBe(true);
    expect(r.foot_width).toBeCloseTo(r.shoulder_width, 9);
    expect(r.wider_layer).toBe('liner');
    expect(r.liner_cut_width).toBeGreaterThan(r.shell_cut_width);
    const g = quiltGeometry(r);
    expect(g.liner.halfWidthAt(0)).toBeCloseTo(g.liner.halfWidthAt(r.length), 9);
    expect(2 * g.shell.halfWidthAt(0)).toBeCloseTo(54 * IN, 6);
  });
  it('rolled end channels: each end takes 2 × 3/4", and the chambers fill the length between the channel lines', () => {
    const r = resolveInputs(UQ);
    expect(r.end_channel).toBeCloseTo(0.75 * IN, 9);
    expect(r.end_allowance).toBeCloseTo(1.5 * IN, 9);
    expect(r.cut_length).toBeCloseTo(78 * IN + 3 * IN, 6);
    const ch = r.chambers!;
    expect(ch.chambers[0].y0).toBeCloseTo(0.75 * IN, 6);
    expect(ch.chambers[ch.count - 1].y1).toBeCloseTo(78 * IN - 0.75 * IN, 6);
    // Volume is the rectangle between the channels × loft.
    expect(ch.totalVolumeMm3).toBeCloseTo(54 * IN * (78 - 1.5) * IN * 2 * IN, -3);
  });
  it('pieces: side sew lines, channel hems and channel stitch lines, no footbox; shock cord and cord locks on the hardware', () => {
    const v = built(UQ);
    const liner = piece(v.pieces, LINER_ID);
    const pids = liner.paths.map((p) => p.id);
    expect(pids).toContain(`${LINER_ID}-channel-head`);
    expect(pids).toContain(`${LINER_ID}-sew-left`);
    expect(pids.some((x) => x.startsWith(`${LINER_ID}-footbox`))).toBe(false);
    expect(pids).not.toContain(`${LINER_ID}-sew`);
    expect(liner.paths.filter((p) => p.label?.includes('finished crease'))).toHaveLength(2);
    expect(v.hardware.find((h) => h.id === 'shock-cord')!.quantity).toBe(2);
    expect(v.hardware.some((h) => h.id === 'footbox-zip')).toBe(false);
    expect(v.steps.some((s) => s.id === 'quilt.channels')).toBe(true);
    expect(v.steps.some((s) => s.id === 'quilt.footbox')).toBe(false);
    const m = v.warnings.find((w) => w.id === 'mock-derived')!.message;
    expect(m).toContain('End channel');
    expect(m).not.toContain('Footbox length');
    expect(ids(UQ)).toContain('fill-estimate');
  });
  it('the top quilt is unchanged by the new mode', () => {
    const r = resolveInputs(DEF);
    expect(r.kind).toBe('top_quilt');
    expect(r.end_allowance).toBeCloseTo(12.7, 9);
    expect(r.cut_length).toBeCloseTo(79 * IN, 6);
    expect(r.chambers!.chambers[0].y0).toBe(0);
  });
});

describe('neck drawcord and pad straps (roadmap 10c follow-ups)', () => {
  it('a neck drawcord rolls the head into a channel: the head takes 2 × 3/4", the chambers start below it, a cord, a lock and a snap', () => {
    const N: QuiltInputs = { ...DEF, neck: 'drawcord' };
    const r = resolveInputs(N);
    expect(r.head_channel).toBeCloseTo(0.75 * IN, 9);
    expect(r.head_allowance).toBeCloseTo(1.5 * IN, 9);
    expect(r.foot_allowance).toBeCloseTo(12.7, 9);
    expect(r.cut_length).toBeCloseTo(78 * IN + 1.5 * IN + 12.7, 6);
    expect(r.chambers!.chambers[0].y0).toBeCloseTo(0.75 * IN, 6);
    const v = built(N);
    const shell = piece(v.pieces, SHELL_ID);
    expect(shell.paths.some((p) => p.id === `${SHELL_ID}-channel-head`)).toBe(true);
    expect(shell.paths.find((p) => p.id === `${SHELL_ID}-sew`)!.closed).toBe(false);
    for (const id of ['neck-cord', 'neck-cord-lock', 'neck-snap']) expect(v.hardware.some((h) => h.id === id)).toBe(true);
    expect(v.steps.some((s) => s.id === 'quilt.neck')).toBe(true);
    expect(v.warnings.find((w) => w.id === 'mock-derived')!.message).toContain('Neck channel');
    // The default is unchanged.
    expect(resolveInputs(DEF).head_allowance).toBeCloseTo(12.7, 9);
  });
  it('pad straps: loop marks a third and two thirds down each side, two straps and four loops', () => {
    const v = built({ ...DEF, pad_straps: true });
    const liner = piece(v.pieces, LINER_ID);
    expect(liner.paths.filter((p) => p.id.startsWith(`${LINER_ID}-pad-loop-`))).toHaveLength(4);
    expect(v.hardware.find((h) => h.id === 'pad-strap')!.quantity).toBe(2);
    expect(v.hardware.find((h) => h.id === 'pad-loop')!.quantity).toBe(4);
    expect(v.warnings.find((w) => w.id === 'mock-derived')!.message).toContain('Pad width');
    expect(errorFields({ ...DEF, pad_straps: true, pad_width: 0 })).toEqual(['pad_width']);
  });
});
