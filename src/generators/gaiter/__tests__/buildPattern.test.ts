// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, shapeOf, GAITER_ID, PLACEHOLDERS } from '../index.js';
import type { GaiterInputs } from '../types.js';
import { makeDefaultGaiterProject } from '../../../state/useGaiterProject.js';
import type { Point } from '../../../lib/pattern-engine/graph/Point.js';

const IN = 25.4;
const DEF: GaiterInputs = makeDefaultGaiterProject().inputs;
const ZIP: GaiterInputs = { ...DEF, closure: 'zipper' };
const built = (i: GaiterInputs) => { const b = buildPattern(i); if (!b.ok) throw new Error(JSON.stringify(b.errors)); return b.value; };
const errorFields = (i: GaiterInputs) => { const v = validateInputs(i); return v.ok ? [] : v.errors.map((e) => e.field); };
const len = (pts: Point[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);

describe('gaiter geometry — the flat tube', () => {
  it('finished top measures the calf, the finished bottom at the back the boot; the back is the height', () => {
    const r = resolveInputs(DEF);
    expect(validateInputs(DEF).ok).toBe(true);
    const g = shapeOf(r);
    const arc = (s: number) => len(Array.from({ length: 401 }, (_, i) => g.at(i / 400, s)));
    expect(arc(0)).toBeCloseTo(15 * IN, 0);
    expect(arc(12 * IN)).toBeCloseTo(17 * IN, 0);
    expect(g.bottomS(0.5)).toBeCloseTo(12 * IN, 9);
    expect(g.bottomS(0)).toBeCloseTo(13.5 * IN, 9);
    expect(g.bottomS(1)).toBeCloseTo(13.5 * IN, 9);
    expect(r.front_length).toBeCloseTo(13.5 * IN, 9);
  });
  it('hook-and-loop: the overlap side carries the overlap and a hem; the underlap a hem; rolled hems double the allowance', () => {
    const r = resolveInputs(DEF);
    expect(r.hem_allowance).toBeCloseTo(1 * IN, 9);
    expect(r.channel_allowance).toBeCloseTo(1.5 * IN, 9);
    expect(r.front_allowance[0]).toBeCloseTo(1 * IN, 9);
    expect(r.front_allowance[1]).toBeCloseTo(2 * IN, 9);
    // Cut is the finished tube plus every allowance, so taller than height + drop + channel + hem.
    expect(r.cut_height).toBeGreaterThan((12 + 1.5 + 1.5 + 1) * IN - 1);
    const z = resolveInputs(ZIP);
    expect(z.front_allowance).toEqual([12.7, 12.7]);
    expect(z.overlap).toBe(0);
  });
});

describe('pieces', () => {
  it('one mirrored-pair piece, Convention B, with the channel, hems, strips and marks', () => {
    const v = built(DEF);
    expect(v.pieces).toHaveLength(1);
    const p = v.pieces[0];
    expect(p.id).toBe(GAITER_ID);
    expect(p.mirror).toBe(true);
    expect(Object.values(p.seamAllowances!).every((x) => x === 0)).toBe(true);
    const ids = p.paths.map((x) => x.id);
    for (const id of [`${GAITER_ID}-channel-stitch`, `${GAITER_ID}-loop`, `${GAITER_ID}-hook`, `${GAITER_ID}-instep-0`, `${GAITER_ID}-instep-1`, `${GAITER_ID}-lace-hook`]) expect(ids).toContain(id);
    // Finished creases: top channel, bottom, both front hems.
    expect(p.paths.filter((x) => x.label?.includes('finished crease'))).toHaveLength(4);
    const zp = built(ZIP).pieces[0];
    expect(zp.paths.some((x) => x.id === `${GAITER_ID}-hook`)).toBe(false);
    expect(zp.paths.some((x) => x.id === `${GAITER_ID}-zip-0`)).toBe(true);
    expect(zp.paths.filter((x) => x.label?.includes('finished crease'))).toHaveLength(2);
  });
  it('the cut outline holds the finished shape: every finished corner is inside the cut bbox', () => {
    const r = resolveInputs(DEF);
    const g = shapeOf(r);
    for (const [u, s] of [[0, 0], [1, 0], [0, g.bottomS(0)], [1, g.bottomS(1)], [0.5, g.bottomS(0.5)]]) {
      const q = g.at(u, s);
      expect(q.x).toBeGreaterThan(0);
      expect(q.x).toBeLessThan(g.width);
      expect(q.y).toBeGreaterThan(0);
      expect(q.y).toBeLessThan(g.height);
    }
  });
});

describe('validation, hardware, placeholders', () => {
  it('errors on the field that fixes it', () => {
    expect(errorFields({ ...DEF, height: 0 })).toEqual(['height']);
    expect(errorFields({ ...DEF, front_drop: 7 })).toEqual(['front_drop']);
    expect(errorFields({ ...DEF, bottom_circumference: 200, height: 3, front_drop: 0.5 })).toEqual(['bottom_circumference']);
    expect(errorFields({ ...DEF, fabric_width: 10 })).toEqual(['fabric_width']);
    expect(errorFields({ ...DEF, overlap: 0 })).toEqual(['overlap']);
    expect(errorFields({ ...ZIP, overlap: 0 })).toEqual([]);
  });
  it('hardware per pair: hook and loop (or zippers), elastic at 90 % of the calf, straps, grommets, lace hooks', () => {
    const hw = (i: GaiterInputs, id: string) => built(i).hardware.find((h) => h.id === id);
    expect(hw(DEF, 'hook')!.quantity).toBe(2);
    expect(hw(DEF, 'zipper')).toBeUndefined();
    expect(hw(ZIP, 'zipper')!.notes).toContain(`${Math.round(13.5 * IN)} mm`);
    expect(hw(DEF, 'elastic')!.notes).toContain(`${Math.round(0.9 * 15 * IN)} mm`);
    expect(hw(DEF, 'grommet')!.quantity).toBe(4);
    expect(hw(DEF, 'lace-hook')!.quantity).toBe(2);
    const bom = buildBom(DEF);
    expect(bom.find((x) => x.id === 'piece-gaiter')!.quantity).toBe(2);
  });
  it('every placeholder is empty by default and named in one note (the zipper allowance only when zipped)', () => {
    for (const p of PLACEHOLDERS) expect(DEF[p.field]).toBeUndefined();
    const m = built(DEF).warnings.find((w) => w.id === 'mock-derived')!;
    for (const p of PLACEHOLDERS.filter((x) => x.field !== 'seam_allowance')) expect(m.message).toContain(p.label);
    expect(m.message).not.toContain('Seam allowance');
    const mz = built(ZIP).warnings.find((w) => w.id === 'mock-derived')!;
    expect(mz.message).toContain('Seam allowance');
    expect(mz.message).not.toContain('Hook-and-loop overlap');
  });
  it('steps depend only on earlier steps', () => {
    for (const i of [DEF, ZIP]) {
      const seen = new Set<string>();
      for (const s of built(i).steps) { for (const d of s.dependsOn) expect(seen.has(d)).toBe(true); seen.add(s.id); }
    }
  });
});
