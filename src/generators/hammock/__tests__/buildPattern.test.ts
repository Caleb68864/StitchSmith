// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, bodyGeometry, BODY_ID, PLACEHOLDERS } from '../index.js';
import type { HammockInputs } from '../types.js';
import { makeDefaultHammockProject } from '../../../state/useHammockProject.js';
import { bboxFromPiece } from '../../../lib/pattern-engine/geometry/bbox.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';

const IN = 25.4;
const DEF: HammockInputs = makeDefaultHammockProject().inputs;
const WHIP: HammockInputs = { ...DEF, end_style: 'whipping' };
const built = (i: HammockInputs) => { const b = buildPattern(i); if (!b.ok) throw new Error(JSON.stringify(b.errors)); return b.value; };
const body = (pieces: Piece[]) => pieces.find((p) => p.id === BODY_ID)!;
const errorFields = (i: HammockInputs) => { const v = validateInputs(i); return v.ok ? [] : v.errors.map((e) => e.field); };
const ids = (i: HammockInputs) => built(i).warnings.map((w) => w.id);

describe('resolve — cut size from the placeholders', () => {
  it('default: 132" + two 2.5" rolled channels = 137" long; 58" + two 1" rolled side hems = 60" wide; fits the 60" fabric', () => {
    const r = resolveInputs(DEF);
    expect(r.end_style).toBe('channel');
    expect(r.hem_fold).toBe('double');
    expect(r.end_allowance).toBeCloseTo(2.5 * IN, 6);
    expect(r.side_allowance).toBeCloseTo(1 * IN, 6);
    expect(r.cut_length).toBeCloseTo(137 * IN, 6);
    expect(r.cut_width).toBeCloseTo(60 * IN, 6);
    expect(r.fabric_length).toBeCloseTo(137 * IN, 6);
    expect(r.fabric_trim).toBeCloseTo(0, 6);
    expect(validateInputs(DEF).ok).toBe(true);
  });

  it('structural ridgeline is derived: 83 % of 132" = 109.56"', () => {
    expect(resolveInputs(DEF).ridgeline_length).toBeCloseTo(0.83 * 132 * IN, 6);
    expect(resolveInputs({ ...DEF, ridgeline_pct: 80, length: 120 }).ridgeline_length).toBeCloseTo(96 * IN, 6);
  });

  it('whipping ends: tail + the rolled tail hem per end (3" + 1"), no channel', () => {
    const r = resolveInputs(WHIP);
    expect(r.end_allowance).toBeCloseTo(4 * IN, 6);
    expect(r.cut_length).toBeCloseTo(140 * IN, 6);
  });

  it('single fold marked at double halves every allowance; selvedge sides add nothing', () => {
    const r = resolveInputs({ ...DEF, hem_fold: 'single' });
    expect(r.end_allowance).toBeCloseTo(1.25 * IN, 6);
    expect(r.cut_width).toBeCloseTo(59 * IN, 6);
    expect(resolveInputs({ ...DEF, side_edge: 'selvedge' }).cut_width).toBeCloseTo(58 * IN, 6);
  });

  it('production mode floors a 1/4" side hem at 1/2" and says so', () => {
    const i = { ...DEF, side_hem_depth: 0.25, production_mode: true };
    expect(resolveInputs(i).side_hem_depth).toBeCloseTo(0.5 * IN, 6);
    expect(ids(i)).toContain('hem-raised');
  });

  it('millimetres and weights: lb with inches, kg with millimetres', () => {
    const r = resolveInputs({ units: 'mm', length: 3300, width: 1450, occupant_weight: 90, fabric_rating: 120 });
    expect(r.cut_length).toBeCloseTo(3300 + 4 * 1.25 * IN, 6);
    expect(r.occupant_kg).toBe(90);
    expect(resolveInputs({ ...DEF, occupant_weight: 200 }).occupant_kg).toBeCloseTo(90.718474, 5);
  });

  it('a seam allowance is accepted but resolves to 0 (one piece, no joining seam) with an info note', () => {
    expect(resolveInputs({ ...DEF, seam_allowance: 12 }).seam_allowance).toBe(0);
    expect(ids({ ...DEF, seam_allowance: 12 })).toContain('seam-allowance-ignored');
  });
});

describe('fabric width — error on the field that fixes it, info or warning when there is fabric left', () => {
  it('hemmed body wider than the fabric is an error on width', () => {
    expect(errorFields({ ...DEF, width: 59 })).toEqual(['width']);
    expect(buildPattern({ ...DEF, width: 59 }).ok).toBe(false);
  });
  it('selvedge body wider than the fabric is an error; narrower warns that one side is a cut edge', () => {
    expect(errorFields({ ...DEF, side_edge: 'selvedge', width: 61 })).toEqual(['width']);
    expect(ids({ ...DEF, side_edge: 'selvedge' })).toContain('selvedge-trim');
    expect(ids({ ...DEF, side_edge: 'selvedge', width: 60 })).not.toContain('selvedge-trim');
  });
  it('leftover fabric on a hemmed body is an info note', () => {
    const w = built({ ...DEF, width: 50 }).warnings.find((x) => x.id === 'fabric-trim')!;
    expect(w.severity).toBe('info');
    expect(w.message).toMatch(/8"/);
  });
});

describe('validation', () => {
  it('rejects non-positive sizes, a zero channel, a zero whip tail and a ridgeline outside 0–100 %', () => {
    expect(errorFields({ ...DEF, length: 0 })).toContain('length');
    expect(errorFields({ ...DEF, channel_depth: 0 })).toContain('channel_depth');
    expect(errorFields({ ...WHIP, channel_depth: 0 })).toEqual([]);
    expect(errorFields({ ...WHIP, whip_tail: 0 })).toContain('whip_tail');
    expect(errorFields({ ...DEF, ridgeline_pct: 100 })).toContain('ridgeline_pct');
    expect(errorFields({ ...DEF, ridgeline_pct: 0 })).toContain('ridgeline_pct');
  });
  it('a ridgeline outside the 78–88 % band warns (mock-derived)', () => {
    expect(ids({ ...DEF, ridgeline_pct: 70 })).toContain('ridgeline-range');
    expect(ids({ ...DEF, ridgeline_pct: 92 })).toContain('ridgeline-range');
    expect(ids(DEF)).not.toContain('ridgeline-range');
  });
});

describe('pattern — Convention B, Hem primitive lines', () => {
  it('one body at cut size, explicit 0 on every cut edge, bbox = cut', () => {
    const v = built(DEF);
    expect(v.pieces).toHaveLength(1);
    const p = body(v.pieces);
    const outline = p.paths[0];
    expect(Object.keys(p.seamAllowances!)).toHaveLength(outline.edges.length);
    expect(Object.values(p.seamAllowances!).every((x) => x === 0)).toBe(true);
    const bb = bboxFromPiece(p);
    expect(bb.width).toBeCloseTo(137 * IN, 3);
    expect(bb.height).toBeCloseTo(60 * IN, 3);
  });

  it('channels: two rolled creases per end at +1.25" and 0 from the finished end, and a stitch line 1.25" inside it', () => {
    const v = built(DEF);
    const p = body(v.pieces);
    const g = bodyGeometry(v.resolved);
    const end0 = p.paths.filter((x) => x.id.startsWith(`${BODY_ID}-end-0-hem-fold`));
    expect(end0.map((x) => x.edges[0].start.x).sort((a, b) => a - b)).toEqual([expect.closeTo(1.25 * IN, 6), expect.closeTo(2.5 * IN, 6)].sort());
    expect(end0.every((x) => x.edges.every((e) => e.role === 'fold') && /hem/i.test(x.label ?? x.edges[0].id))).toBe(true);
    const stitch = p.paths.find((x) => x.id === `${BODY_ID}-channel-stitch-0`)!;
    expect(stitch.edges[0].role).toBe('stitch');
    expect(stitch.edges[0].start.x).toBeCloseTo(g.endX[0] + 1.25 * IN, 6);
    // Side hems run the whole cut length.
    const side = p.paths.filter((x) => x.id.startsWith(`${BODY_ID}-side-0-hem-fold`));
    expect(side).toHaveLength(2);
    expect(side[0].edges[0].end.x - side[0].edges[0].start.x).toBeCloseTo(137 * IN, 6);
  });

  it('whipping: a whip line (notch) at the finished end and a rolled tail hem at the raw end, no channel stitch', () => {
    const p = body(built(WHIP).pieces);
    const whip = p.paths.find((x) => x.id === `${BODY_ID}-whip-0`)!;
    expect(whip.edges[0].role).toBe('notch');
    expect(whip.edges[0].start.x).toBeCloseTo(4 * IN, 6);
    expect(p.paths.some((x) => x.id.startsWith(`${BODY_ID}-tail-0-hem-fold`))).toBe(true);
    expect(p.paths.some((x) => x.id.includes('channel-stitch'))).toBe(false);
  });

  it('selvedge sides: no side hem lines', () => {
    expect(body(built({ ...DEF, side_edge: 'selvedge' }).pieces).paths.some((x) => x.id.includes('-side-'))).toBe(false);
  });

  it('steps state the cut size and say the allowances are included; ridgeline length in the steps', () => {
    const s = built(DEF).steps;
    expect(s[0].body).toMatch(/3480 mm \(137"\) × 1524 mm \(60"\)/);
    expect(s[0].body).toMatch(/included in the cut/);
    expect(s.map((x) => x.id)).toEqual(['hammock.cut', 'hammock.sides', 'hammock.channels', 'hammock.gather', 'hammock.ridgeline', 'hammock.test']);
    expect(s.find((x) => x.id === 'hammock.ridgeline')!.body).toMatch(/83 %/);
    expect(built(WHIP).steps.map((x) => x.id)).toContain('hammock.tails');
  });
});

describe('warnings — mock-derived placeholders and load', () => {
  it('one [mock-derived] note names every applicable placeholder until it is entered', () => {
    const w = built(DEF).warnings.filter((x) => x.id === 'mock-derived');
    expect(w).toHaveLength(1);
    for (const p of PLACEHOLDERS.filter((x) => x.field !== 'whip_tail')) expect(w[0].message).toContain(p.label);
    expect(w[0].message).not.toContain('Whip tail');
    expect(built(WHIP).warnings.find((x) => x.id === 'mock-derived')!.message).not.toContain('Channel depth');
    const all: HammockInputs = { ...DEF, length: 132, width: 58, fabric_width: 60, side_hem_depth: 0.5, channel_depth: 1.25, ridgeline_pct: 83 };
    expect(ids(all)).not.toContain('mock-derived');
  });

  it('every placeholder is a typical gathered-end value', () => {
    const v = Object.fromEntries(PLACEHOLDERS.map((p) => [p.field, p.kind === 'length' ? Math.round((p.mm / IN) * 1000) / 1000 : p.mm]));
    expect(v).toEqual({ length: 132, width: 58, fabric_width: 60, side_hem_depth: 0.5, channel_depth: 1.25, whip_tail: 3, ridgeline_pct: 83 });
  });

  it('the load warning always stands; over the rating it changes to load-over-rating', () => {
    expect(ids(DEF)).toContain('load-safety');
    expect(built({ ...DEF, occupant_weight: 200, fabric_rating: 250 }).warnings.find((x) => x.id === 'load-safety')!.message).toMatch(/80 %/);
    const over = ids({ ...DEF, occupant_weight: 300, fabric_rating: 250 });
    expect(over).toContain('load-over-rating');
    expect(over).not.toContain('load-safety');
  });
});

describe('BOM', () => {
  it('body row at cut size, fabric length off the roll, end cords and the ridgeline', () => {
    const rows = buildBom(DEF);
    expect(rows.find((r) => r.id === `piece-${BODY_ID}`)!.unit).toBe('pc — 3480 × 1524 mm');
    expect(rows.find((r) => r.id.startsWith('material-'))!.quantity).toBe(3480);
    expect(rows.find((r) => r.id === 'hw-end-cord')!.quantity).toBe(2);
    expect(rows.find((r) => r.id === 'hw-ridgeline')!.notes).toMatch(/2783 mm/);
    expect(buildBom(WHIP).some((r) => r.id === 'hw-whipping-cord')).toBe(true);
    expect(buildBom({ ...DEF, length: -1 })).toEqual([]);
  });
});
