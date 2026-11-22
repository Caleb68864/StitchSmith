// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, goreOutline, GORE_ID, CUFF_ID, PLACEHOLDERS } from '../index.js';
import type { BeanieInputs } from '../types.js';
import { makeDefaultBeanieProject } from '../../../state/useBeanieProject.js';
import { bboxFromPiece } from '../../../lib/pattern-engine/geometry/bbox.js';

const IN = 25.4;
const SA = 9.5;
const DEF: BeanieInputs = makeDefaultBeanieProject().inputs;
const built = (i: BeanieInputs) => { const b = buildPattern(i); if (!b.ok) throw new Error(JSON.stringify(b.errors)); return b.value; };
const errorFields = (i: BeanieInputs) => { const v = validateInputs(i); return v.ok ? [] : v.errors.map((e) => e.field); };

describe('beanie — gores round the head', () => {
  it('six gores whose finished bases add up to the head + ease (22" − 1" = 21")', () => {
    const r = resolveInputs(DEF);
    expect(validateInputs(DEF).ok).toBe(true);
    expect(r.circumference).toBeCloseTo(21 * IN, 9);
    expect(r.gores * r.gore_base).toBeCloseTo(21 * IN, 6);
    // A 7" crown over a 3.34" radius: taller than a hemisphere, so the gore is longer than a quarter round.
    expect(r.gore_length).toBeGreaterThan((21 * IN) / 4);
  });
  it('the finished gore is the dome strip; the cut adds the allowance on every edge', () => {
    const r = resolveInputs(DEF);
    const o = goreOutline(r);
    const [bl, br] = o.finished;
    expect(br.x - bl.x).toBeCloseTo(r.gore_base, 6);
    const ys = o.finished.map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(r.gore_length, 6);
    // Cut: wider by about two allowances at the base, taller by the base allowance plus the apex mitre.
    expect(o.width).toBeGreaterThan(r.gore_base + 2 * SA - 1);
    expect(o.height).toBeGreaterThan(r.gore_length + SA);
    const p = built(DEF).pieces.find((x) => x.id === GORE_ID)!;
    expect(p.quantity).toBe(6);
    expect(Object.values(p.seamAllowances!).every((x) => x === 0)).toBe(true);
    expect(bboxFromPiece(p).width).toBeCloseTo(o.width, 6);
  });
  it('cuff: one band the circumference + 2 allowances long, twice the cuff + 2 allowances deep, folded', () => {
    const v = built(DEF);
    const c = v.pieces.find((x) => x.id === CUFF_ID)!;
    const bb = bboxFromPiece(c);
    expect(bb.width).toBeCloseTo(21 * IN + 2 * SA, 6);
    expect(bb.height).toBeCloseTo(5 * IN + 2 * SA, 6);
    expect(c.paths.some((p) => p.id === `${CUFF_ID}-fold`)).toBe(true);
  });
  it('hem finish: no cuff, the base takes the single-fold hem (mark at double)', () => {
    const v = built({ ...DEF, finish: 'hem' });
    expect(v.pieces.map((p) => p.id)).toEqual([GORE_ID]);
    const g = v.pieces[0];
    expect(g.paths.some((p) => p.label?.includes('finished crease'))).toBe(true);
    expect(g.paths.some((p) => p.label?.startsWith('Mark at'))).toBe(true);
    expect(resolveInputs({ ...DEF, finish: 'hem' }).base_allowance).toBeCloseTo(0.5 * IN, 9);
  });
  it('odd gore counts sew one to the next; even counts in two halves', () => {
    expect(built(DEF).steps.find((s) => s.id === 'beanie.crown')!.body).toMatch(/two halves of 3/);
    expect(built({ ...DEF, gores: 5 }).steps.find((s) => s.id === 'beanie.crown')!.body).toMatch(/one to the next/);
  });
  it('validation, placeholders, BOM', () => {
    expect(errorFields({ ...DEF, gores: 2 })).toEqual(['gores']);
    expect(errorFields({ ...DEF, ease: -6 })).toEqual(['ease']);
    expect(errorFields({ ...DEF, crown_height: 0 })).toEqual(['crown_height']);
    for (const p of PLACEHOLDERS) expect(DEF[p.field]).toBeUndefined();
    const m = built(DEF).warnings.find((w) => w.id === 'mock-derived')!.message;
    expect(m).toContain('Head circumference');
    expect(m).not.toContain('Hem depth');
    expect(built(DEF).warnings.some((w) => w.id === 'negative-ease')).toBe(true);
    expect(buildBom(DEF).filter((x) => x.id.startsWith('piece-'))).toHaveLength(2);
  });
});
