// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, panelGeometry, catCutStations, PANEL_ID, PATCH_ID, LOOP_ID, PLACEHOLDERS } from '../index.js';
import type { TarpInputs } from '../types.js';
import { makeDefaultTarpProject } from '../../../state/useTarpProject.js';
import { GENERATORS } from '../../__tests__/generators.table.js';
import { bboxFromPiece } from '../../../lib/pattern-engine/geometry/bbox.js';
import { catenary } from '../../../lib/pattern-engine/geometry/catenary.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';

const IN = 25.4;
const DEF: TarpInputs = makeDefaultTarpProject().inputs;
/** The vault's single-fold hem, for the hand-checked panel geometry below (the default is rolled). */
const SINGLE: TarpInputs = { ...DEF, hem_fold: 'single' };
const built = (i: TarpInputs) => { const b = buildPattern(i); if (!b.ok) throw new Error(JSON.stringify(b.errors)); return b.value; };
const panelOf = (pieces: Piece[]) => pieces.find((p) => p.id === PANEL_ID)!;
const errorFields = (i: TarpInputs) => { const v = validateInputs(i); return v.ok ? [] : v.errors.map((e) => e.field); };

describe('resolve — cut sizes from the placeholders', () => {
  it('default: two 122" × 49.5" panels (10\' ridge + two 1" rolled-hem allowances; 1/2" seam + 48" + 1"), 244" of fabric, 8 tie-outs', () => {
    const r = resolveInputs(DEF);
    expect(r.panel_count).toBe(2);
    expect(r.hem_allowance).toBeCloseTo(1 * IN, 6);
    expect(r.panel_cut_length).toBeCloseTo(122 * IN, 6);
    expect(r.panel_cut_width).toBeCloseTo(49.5 * IN, 6);
    expect(r.fabric_length).toBeCloseTo(244 * IN, 6);
    expect(r.panel_finished_width).toBeCloseTo(48 * IN, 6);
    // 48" less the 2" ridge cut and the 3" eave cut.
    expect(r.panel_mid_width).toBeCloseTo(43 * IN, 6);
    expect(r.hem_mark).toBeCloseTo(1 * IN, 6);
    expect(r.tieout_count).toBe(8);
  });

  it('the default hem is rolled (silnylon frays): raw edge enclosed, twice the depth in the cut; the vault single fold stays selectable', () => {
    expect(DEF.hem_fold).toBe('double');
    // An old or hand-written project with no hem choice resolves the same way.
    const { hem_fold: _h, ...noChoice } = DEF;
    expect(resolveInputs(noChoice).hem_fold).toBe('double');
    const v = built(DEF);
    expect(v.resolved.hem_fold).toBe('double');
    expect(v.steps.map((s) => s.body).join(' ')).toMatch(/roll it: turn the raw edge under/);
    const single = resolveInputs({ ...DEF, hem_fold: 'single' });
    expect(single.hem_fold).toBe('single');
    expect(single.hem_allowance).toBeCloseTo(0.5 * IN, 6);
    expect(single.panel_cut_length).toBeCloseTo(121 * IN, 6);
  });

  it('pitch check: a 42" ridgeline under 48" panels sits at asin(42/48) with a 2·√(48² − 42²) footprint', () => {
    const r = resolveInputs(DEF);
    expect(r.pitch_deg).toBeCloseTo((Math.asin(42 / 48) * 180) / Math.PI, 6);
    expect(r.footprint_width).toBeCloseTo(2 * Math.sqrt(48 * 48 - 42 * 42) * IN, 6);
    expect(r.eave_clearance).toBe(0);
    const high = resolveInputs({ ...DEF, ridge_height: 50 });
    expect(high.footprint_width).toBe(0);
    expect(high.eave_clearance).toBeCloseTo(2 * IN, 6);
  });

  it('a rolled hem takes twice the depth; production mode floors a 1/4" hem at 1/2"', () => {
    expect(resolveInputs(SINGLE).panel_cut_length).toBeCloseTo(121 * IN, 6);
    expect(resolveInputs({ ...DEF, hem_fold: 'double' }).panel_cut_length).toBeCloseTo(122 * IN, 6);
    const p = resolveInputs({ ...SINGLE, hem_depth: 0.25, production_mode: true });
    expect(p.hem_depth).toBeCloseTo(0.5 * IN, 6);
    expect(p.hem_raised).toBe(true);
    expect(p.panel_cut_length).toBeCloseTo(121 * IN, 6);
  });

  it('single panel: one piece, both edges hemmed, no seam allowance, no ridge cut', () => {
    const r = resolveInputs({ ...DEF, construction: 'single_panel', width: 56 });
    expect(r.panel_count).toBe(1);
    // 56" + a 1" rolled-hem allowance on each eave: exactly the 58" fabric.
    expect(r.panel_cut_width).toBeCloseTo(58 * IN, 6);
    expect(resolveInputs({ ...SINGLE, construction: 'single_panel', width: 56 }).panel_cut_width).toBeCloseTo(57 * IN, 6);
    expect(r.ridge_sag).toBe(0);
    expect(r.seam_allowance).toBe(0);
    expect(r.panel_mid_width).toBeCloseTo((56 - 6) * IN, 6);
  });

  it('straight edges: no sag, curve lengths equal the ridge', () => {
    const r = resolveInputs({ ...DEF, cut_style: 'flat' });
    expect(r.ridge_sag).toBe(0);
    expect(r.eave_sag).toBe(0);
    expect(r.ridge_curve_length).toBeCloseTo(r.ridge_length, 9);
    expect(r.eave_curve_length).toBeCloseTo(r.ridge_length, 9);
  });

  it('the curve lengths are the catenary arc lengths', () => {
    const r = resolveInputs(DEF);
    const c = catenary(120 * IN, 3 * IN);
    expect(c.ok && r.eave_curve_length).toBeCloseTo(c.ok ? c.value.arcLength : 0, 6);
    expect(r.eave_curve_length).toBeGreaterThan(r.ridge_curve_length);
  });
});

describe('validation', () => {
  it('accepts the default project', () => expect(validateInputs(DEF).ok).toBe(true));
  it('a panel wider than the fabric is an error on the field that fixes it', () => {
    expect(errorFields({ ...DEF, width: 120 })).toContain('width');
    expect(errorFields({ ...DEF, construction: 'single_panel' })).toContain('construction');
  });
  it('a cut deeper than a quarter of the span is not a cat cut', () => {
    expect(errorFields({ ...DEF, ridge_length: 20, eave_sag: 6 })).toContain('eave_sag');
  });
  it('patches that overlap, a cat cut that eats the panel, and bad counts are rejected', () => {
    expect(errorFields({ ...DEF, ridge_length: 20, eave_tieouts: 6, ridge_sag: 0, eave_sag: 0 })).toContain('patch_size');
    expect(errorFields({ ...DEF, width: 20, ridge_sag: 4, eave_sag: 5 })).toContain('eave_sag');
    expect(errorFields({ ...DEF, eave_tieouts: 7 })).toContain('eave_tieouts');
    expect(errorFields({ ...DEF, eave_tieouts: 1.5 })).toContain('eave_tieouts');
    expect(errorFields({ ...DEF, hem_depth: -1 })).toContain('hem_depth');
  });
});

describe('pattern — Convention B panel (single-fold hem, hand-checked numbers)', () => {
  const v = built(SINGLE);
  const r = v.resolved;
  const panel = panelOf(v.pieces);
  const g = panelGeometry(r);
  const outline = panel.paths.find((p) => p.closed)!;

  it('every cut edge on every piece carries an explicit 0 seam allowance', () => {
    for (const p of v.pieces) {
      const o = p.paths.find((x) => x.closed && x.edges.every((e) => e.role === 'cut'))!;
      for (const e of o.edges) expect(p.seamAllowances?.[e.id], `${p.id}/${e.id}`).toBe(0);
    }
  });

  it('the outline is the cut size: 121" along the ridge, 49" across at the ends', () => {
    const bb = bboxFromPiece(panel);
    expect(bb.width).toBeCloseTo(121 * IN, 6);
    expect(bb.height).toBeCloseTo(49 * IN, 6);
    expect(panel.quantity).toBe(2);
  });

  it('cat cuts: the ridge edge comes in 2" and the eave 3" at mid-span; the stitch line is the seam allowance inside the ridge', () => {
    const mid = r.hem_allowance + r.ridge_length / 2;
    expect(g.topCut(mid)).toBeCloseTo(2 * IN, 6);
    expect(g.top(mid)).toBeCloseTo(2 * IN + r.seam_allowance, 6);
    expect(g.bottomCut(mid)).toBeCloseTo((0.5 + 48 - 3 + 0.5) * IN, 6);
    const stitch = panel.paths.find((p) => p.id === `${PANEL_ID}-ridge-stitch`)!;
    expect(stitch.edges.every((e) => e.role === 'stitch')).toBe(true);
    expect(stitch.edges[0].start.y).toBeCloseTo(r.seam_allowance + g.topCut(0), 6);
    const outlineYs = outline.edges.map((e) => e.start.y);
    expect(Math.max(...outlineYs.filter((y) => y < 10 * IN))).toBeCloseTo(2 * IN, 3);
  });

  it('inside the end hem the curve is mirrored about the end crease, so the hem folds flat', () => {
    const e = r.hem_allowance;
    for (const t of [0.25 * e, 0.5 * e, e]) {
      expect(g.topCut(e - t)).toBeCloseTo(g.topCut(e + t), 9);
      expect(g.bottomCut(e - t)).toBeCloseTo(g.bottomCut(e + t), 9);
    }
  });

  it('hems come from the Hem primitive: straight end creases across the full width, the eave crease on the finished edge, marks at double', () => {
    const folds = panel.paths.filter((p) => !p.closed && p.edges.every((e) => e.role === 'fold'));
    const endFolds = folds.filter((p) => p.id.includes('-end-'));
    expect(endFolds).toHaveLength(2);
    for (const f of endFolds) {
      expect(f.edges).toHaveLength(1);
      expect(f.edges[0].start.y).toBeCloseTo(0, 9);
      expect(f.edges[0].end.y).toBeCloseTo(49 * IN, 6);
      expect(`${f.label} ${f.id}`.toLowerCase()).toMatch(/hem/);
    }
    expect(endFolds.map((f) => f.edges[0].start.x).sort((a, b) => a - b)).toEqual([0.5 * IN, 120.5 * IN].map((x) => expect.closeTo(x, 6)));
    const eaveFold = folds.find((p) => p.id.startsWith(`${PANEL_ID}-eave-hem-fold`))!;
    eaveFold.edges.forEach((e) => expect(e.start.y).toBeCloseTo(g.bottom(e.start.x), 6));
    const eaveMark = panel.paths.find((p) => p.id === `${PANEL_ID}-eave-hem-mark`)!;
    eaveMark.edges.forEach((e) => expect(g.bottomCut(e.start.x) - e.start.y).toBeCloseTo(r.hem_mark, 6));
  });

  it('the default rolled hem: two creases per end (first turn at 1/2", finished edge at 1"), outline 122" × 49.5"', () => {
    const rp = panelOf(built(DEF).pieces);
    const bb = bboxFromPiece(rp);
    expect(bb.width).toBeCloseTo(122 * IN, 6);
    expect(bb.height).toBeCloseTo(49.5 * IN, 6);
    const ends = rp.paths.filter((p) => !p.closed && p.edges.every((e) => e.role === 'fold') && p.id.includes('-end-'));
    expect(ends.map((f) => f.edges[0].start.x).sort((a, b) => a - b)).toEqual([0.5, 1, 121, 121.5].map((x) => expect.closeTo(x * IN, 6)));
  });

  it('tie-outs: four corners, one mid-eave and both ridge ends per panel, each patch inside the finished panel', () => {
    expect(v.tieouts.map((t) => t.kind).sort()).toEqual(['corner', 'corner', 'eave', 'ridge', 'ridge']);
    for (const t of v.tieouts) {
      expect(t.patch.x0).toBeGreaterThanOrEqual(g.endX[0] - 1e-6);
      expect(t.patch.x1).toBeLessThanOrEqual(g.endX[1] + 1e-6);
      expect(t.patch.y1 - t.patch.y0).toBeGreaterThan(0);
    }
    const mid = v.tieouts.find((t) => t.kind === 'eave')!;
    expect(mid.at.x).toBeCloseTo(r.hem_allowance + r.ridge_length / 2, 6);
    expect(mid.patch.y1).toBeCloseTo(g.bottom(mid.at.x), 6);
    expect(v.pieces.find((p) => p.id === PATCH_ID)!.quantity).toBe(8);
    const loop = v.pieces.find((p) => p.id === LOOP_ID)!;
    expect(loop.quantity).toBe(8);
    expect(loop.materialId).toBe('webbing-16');
  });

  it('straight edges draw a straight ridge and eave', () => {
    const flat = built({ ...SINGLE, cut_style: 'flat' });
    const fg = panelGeometry(flat.resolved);
    for (const x of fg.xs) { expect(fg.topCut(x)).toBe(0); expect(fg.bottomCut(x)).toBeCloseTo(49 * IN, 6); }
  });

  it('single panel: no ridge stitch, a 0° ridge reference line, hems on both eaves', () => {
    const s = built({ ...DEF, construction: 'single_panel', width: 56 });
    const p = panelOf(s.pieces);
    expect(p.quantity).toBe(1);
    expect(p.paths.some((x) => x.id.endsWith('-ridge-stitch'))).toBe(false);
    expect(p.paths.find((x) => x.id.endsWith('-ridge-line'))!.label).toMatch(/\(0°\)/);
    expect(p.paths.some((x) => x.id.startsWith(`${PANEL_ID}-eave2-hem-fold`))).toBe(true);
    expect(s.tieouts.filter((t) => t.kind === 'corner')).toHaveLength(4);
  });
});

describe('mock-derived placeholders', () => {
  it('every number the tarp takes is a listed placeholder', () => {
    const keys = GENERATORS.find((x) => x.name === 'tarp')!.keys;
    const choices = ['units', 'construction', 'cut_style', 'hem_fold', 'production_mode', 'ridge_tieouts', 'guylines', 'line_locks', 'cut_ends'];
    expect(PLACEHOLDERS.map((p) => p.field).sort()).toEqual(keys.filter((k) => !choices.includes(k)).sort());
  });

  it('the default project raises ONE info note that names every placeholder, and nothing the user must act on', () => {
    const v = built(DEF);
    const mock = v.warnings.filter((w) => w.id === 'mock-derived');
    expect(mock).toHaveLength(1);
    expect(mock[0].severity).toBe('info');
    expect(mock[0].message).toMatch(/^\[mock-derived\] 13 placeholders/);
    // The end cut is off by default, so its depth is not in use (asserted in the cat-cut ends block).
    for (const p of PLACEHOLDERS.filter((x) => x.field !== 'end_sag')) expect(mock[0].message).toContain(p.label);
    // Shown as the field shows it: 5/8" is 0.625", not a rounded 0.63".
    expect(mock[0].message).toContain('Grosgrain width 0.625"');
    expect(mock[0].message).toContain('Ridge length 120"');
    expect(v.warnings.filter((w) => w.severity === 'warning')).toEqual([]);
  });

  it('a value the user enters leaves the list; entering them all clears the note', () => {
    const one = built({ ...DEF, ridge_length: 120 });
    expect(one.warnings.find((w) => w.id === 'mock-derived')!.message).not.toContain('Ridge length');
    const all: TarpInputs = { ...DEF };
    for (const p of PLACEHOLDERS) (all as Record<string, unknown>)[p.field] = p.kind === 'length' ? p.mm / IN : p.mm;
    expect(built(all).warnings.filter((w) => w.id === 'mock-derived')).toEqual([]);
  });

  it('placeholders that do not apply are not listed (single panel: no ridge cut, no seam allowance)', () => {
    const msg = built({ ...DEF, construction: 'single_panel', width: 56 }).warnings.find((w) => w.id === 'mock-derived')!.message;
    expect(msg).not.toContain('Ridge cat-cut depth');
    expect(msg).not.toContain('Ridge seam allowance');
  });

  it('eaves that cannot reach the ground are a warning on the ridgeline height', () => {
    const w = built({ ...DEF, ridge_height: 50 }).warnings.find((x) => x.id === 'eaves-off-ground')!;
    expect(w.severity).toBe('warning');
    expect(w.field).toBe('ridge_height');
  });
});

describe('steps and BOM', () => {
  it('steps state the cut size with the allowances included, mark the cat cut by stations, and depend only on earlier steps', () => {
    const v = built(DEF);
    const cut = v.steps.find((s) => s.id === 'tarp.cut')!;
    expect(cut.body).toMatch(/3099 mm \(122"\) × 1257 mm \(49.5"\)/);
    expect(cut.body).toMatch(/included/);
    expect(cut.body).toMatch(/Sewn fabric only/);
    expect(v.steps.find((s) => s.id === 'tarp.cat-cut')!.body).toMatch(/ridge 2"/);
    const seen = new Set<string>();
    for (const s of v.steps) { for (const d of s.dependsOn) expect(seen.has(d), `${s.id} → ${d}`).toBe(true); seen.add(s.id); }
    expect(v.steps.map((s) => s.id)).toEqual(['tarp.cut', 'tarp.cat-cut', 'tarp.ridge', 'tarp.ends', 'tarp.eaves', 'tarp.tieouts', 'tarp.guylines', 'tarp.seal', 'tarp.pitch']);
    expect(built({ ...DEF, cut_style: 'flat' }).steps.some((s) => s.id === 'tarp.cat-cut')).toBe(false);
    expect(built({ ...DEF, construction: 'single_panel', width: 56 }).steps.some((s) => s.id === 'tarp.ridge')).toBe(false);
  });

  it('cat-cut stations reach the full sag at mid-span', () => {
    const st = catCutStations(resolveInputs(DEF));
    expect(st).toHaveLength(9);
    expect(st[4].ridge).toBeCloseTo(2 * IN, 6);
    expect(st[4].eave).toBeCloseTo(3 * IN, 6);
    expect(st[0].eave).toBeCloseTo(0, 9);
  });

  it('BOM: panels at cut size, fabric to buy, grosgrain total, sealer', () => {
    const rows = buildBom(DEF);
    expect(rows.find((r) => r.id === `piece-${PANEL_ID}`)!.unit).toBe('pc — 3099 × 1257 mm');
    expect(rows.find((r) => r.id === 'material-silnylon')!.quantity).toBe(Math.ceil((244 * IN) / 10) * 10);
    expect(buildBom(SINGLE).find((r) => r.id === `piece-${PANEL_ID}`)!.unit).toBe('pc — 3073 × 1245 mm');
    expect(rows.find((r) => r.id === 'material-webbing-16')!.quantity).toBe(Math.ceil((8 * 5 * IN) / 10) * 10);
    expect(rows.some((r) => r.id === 'hw-seam-sealer')).toBe(true);
    expect(buildBom({ ...DEF, width: 120 })).toEqual([]);
  });
});

describe('guylines and line-locks (roadmap 10a follow-up)', () => {
  it('default: one guyline, line-lock and stake per tie-out on the BOM; 8 × 96" of cord', () => {
    const v = built(DEF);
    const hw = (id: string) => v.hardware.find((h) => h.id === id);
    expect(v.resolved.tieout_count).toBe(8);
    expect(hw('guyline')!.quantity).toBe(8);
    expect(hw('line-lock')!.quantity).toBe(8);
    expect(hw('stake')!.quantity).toBe(8);
    expect(hw('guyline')!.notes).toContain(`${Math.round(8 * 96 * IN)} mm`);
    expect(buildBom(DEF).some((r) => r.id === 'hw-line-lock' && r.quantity === 8)).toBe(true);
    expect(v.steps.find((s) => s.id === 'tarp.guylines')!.body).toMatch(/line-lock/);
  });
  it('the guyline length is a flagged placeholder until entered, and follows the tie-out count', () => {
    expect(built(DEF).warnings.find((w) => w.id === 'mock-derived')!.message).toContain('Cord per guyline');
    const v = built({ ...DEF, guyline_length: 120, eave_tieouts: 2 });
    expect(v.hardware.find((h) => h.id === 'guyline')!.quantity).toBe(10);
    expect(v.warnings.find((w) => w.id === 'mock-derived')!.message).not.toContain('Cord per guyline');
  });
  it('line-locks off leaves the guylines with a taut-line hitch; guylines off removes all three', () => {
    const noLocks = built({ ...DEF, line_locks: false });
    expect(noLocks.hardware.some((h) => h.id === 'line-lock')).toBe(false);
    expect(noLocks.steps.find((s) => s.id === 'tarp.guylines')!.body).toMatch(/taut-line/);
    const none = built({ ...DEF, guylines: false });
    expect(none.hardware.map((h) => h.id)).toEqual(['seam-sealer']);
    expect(none.steps.some((s) => s.id === 'tarp.guylines')).toBe(false);
    expect(none.warnings.find((w) => w.id === 'mock-derived')!.message).not.toContain('Cord per guyline');
  });
  it('a non-positive guyline length is an error on its field', () => {
    expect(errorFields({ ...DEF, guyline_length: 0 })).toEqual(['guyline_length']);
    expect(errorFields({ ...DEF, guylines: false, guyline_length: 0 })).toEqual([]);
  });
});

describe('cat-cut ends (roadmap 10a follow-up)', () => {
  const ENDS: TarpInputs = { ...DEF, cut_ends: true };
  const outlineOf = (i: TarpInputs) => panelOf(built(i).pieces).paths.find((p) => p.id === `${PANEL_ID}-outline`)!;
  const xsAt = (i: TarpInputs, y: number, tol = 1) => outlineOf(i).edges.map((e) => e.start).filter((p) => Math.abs(p.y - y) < tol).map((p) => p.x);

  it('off by default: the ends stay straight and nothing new is flagged', () => {
    const r = resolveInputs(DEF);
    expect(r.end_sag).toBe(0);
    expect(built(DEF).warnings.find((w) => w.id === 'mock-derived')!.message).not.toContain('End cat-cut');
  });

  it('on: each panel end goes the 1" placeholder in at the middle of its 48" ridge-to-eave span, and comes back to the corners', () => {
    const r = resolveInputs(ENDS);
    expect(r.end_sag).toBeCloseTo(1 * IN, 6);
    expect(r.end_span).toBeCloseTo(48 * IN, 6);
    const g = panelGeometry(r);
    const mid = r.seam_allowance + 24 * IN;
    expect(g.endIn(mid)).toBeCloseTo(1 * IN, 6);
    expect(g.endIn(r.seam_allowance)).toBeCloseTo(0, 6);
    expect(g.endIn(r.seam_allowance + 48 * IN)).toBeCloseTo(0, 6);
    // Mirrored inside the eave hem and the ridge allowance.
    expect(g.endIn(r.seam_allowance - 5)).toBeCloseTo(g.endIn(r.seam_allowance + 5), 9);
    // The raw end is 1" inside the straight end at mid-span, at both ends of the panel.
    const xs = xsAt(ENDS, mid);
    expect(Math.min(...xs)).toBeCloseTo(1 * IN, 3);
    expect(Math.max(...xs)).toBeCloseTo(g.cutLength - 1 * IN, 3);
    // The end crease follows it.
    const crease = panelOf(built(ENDS).pieces).paths.find((p) => p.id.startsWith(`${PANEL_ID}-end-0-hem-fold`) && p.label?.includes('finished crease'))!;
    const nearMid = crease.edges.map((e) => e.start).reduce((a, b) => (Math.abs(b.y - mid) < Math.abs(a.y - mid) ? b : a));
    expect(nearMid.x - g.endX[0]).toBeCloseTo(g.endIn(nearMid.y), 6);
  });

  it('single panel: two curves per end, meeting at the ridge line', () => {
    const i: TarpInputs = { ...ENDS, construction: 'single_panel', width: 56 };
    const r = resolveInputs(i);
    const g = panelGeometry(r);
    expect(g.endIn(g.ridgeY!)).toBeCloseTo(0, 6);
    expect(g.endIn(g.ridgeY! - 14 * IN)).toBeCloseTo(1 * IN, 6);
    expect(g.endIn(g.ridgeY! + 14 * IN)).toBeCloseTo(1 * IN, 6);
    expect(built(i).steps.find((s) => s.id === 'tarp.cat-cut')!.body).toMatch(/two curves per end/);
  });

  it('the end depth is a flagged placeholder; straight edges ignore it; too deep is an error', () => {
    expect(built(ENDS).warnings.find((w) => w.id === 'mock-derived')!.message).toContain('End cat-cut depth');
    expect(built(ENDS).steps.find((s) => s.id === 'tarp.cat-cut')!.body).toMatch(/Each end is cut too/);
    expect(resolveInputs({ ...ENDS, cut_style: 'flat' }).end_sag).toBe(0);
    expect(errorFields({ ...ENDS, end_sag: 13 })).toEqual(['end_sag']);
    expect(errorFields({ ...ENDS, end_sag: 2 })).toEqual([]);
  });
});
