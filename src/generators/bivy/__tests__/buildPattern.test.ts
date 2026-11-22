// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, FLOOR_ID, TOP_ID, HEAD_GUSSET_ID, FOOT_GUSSET_ID, MESH_ID, TOP_FABRIC_ID, PLACEHOLDERS } from '../index.js';
import type { BivyInputs } from '../types.js';
import { makeDefaultBivyProject } from '../../../state/useBivyProject.js';
import { bboxFromPiece } from '../../../lib/pattern-engine/geometry/bbox.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';

const IN = 25.4;
const SA = 12.7;
const DEF: BivyInputs = makeDefaultBivyProject().inputs;
const built = (i: BivyInputs) => { const b = buildPattern(i); if (!b.ok) throw new Error(JSON.stringify(b.errors)); return b.value; };
const piece = (ps: Piece[], id: string) => ps.find((p) => p.id === id)!;
const errorFields = (i: BivyInputs) => { const v = validateInputs(i); return v.ok ? [] : v.errors.map((e) => e.field); };
const pathLen = (ps: Piece, id: string) => ps.paths.find((p) => p.id === id)!.edges.reduce((s, e) => s + Math.hypot(e.end.x - e.start.x, e.end.y - e.start.y), 0);

describe('resolve — cut sizes', () => {
  it('floor = length or width + two 5" tub sides + the allowance; top = its width + the allowance', () => {
    const r = resolveInputs(DEF);
    expect(validateInputs(DEF).ok).toBe(true);
    expect(r.floor_cut_length).toBeCloseTo(94 * IN + 2 * SA, 6);
    expect(r.floor_cut_width).toBeCloseTo(36 * IN + 2 * SA, 6);
    expect(r.top_cut_length).toBeCloseTo(84 * IN + 2 * SA, 6);
    expect(r.top_cut_width).toBeCloseTo(40 * IN + 2 * SA, 6);
  });
  it('the end arch: a 40" arc on the 26" floor rises about 12.6"; head height = tub + rise', () => {
    const r = resolveInputs(DEF);
    expect(r.arch!.radius * r.arch!.theta).toBeCloseTo(40 * IN, 6);
    expect(2 * r.arch!.radius * Math.sin(r.arch!.theta / 2)).toBeCloseTo(26 * IN, 6);
    expect(r.arch!.rise / IN).toBeGreaterThan(12);
    expect(r.arch!.rise / IN).toBeLessThan(13);
    expect(r.head_height).toBeCloseTo(5 * IN + r.arch!.rise, 6);
  });
});

describe('pieces — Convention B and matched seams', () => {
  it('four pieces, explicit 0 on every cut edge; the head gusset is mesh by default', () => {
    const v = built(DEF);
    expect(v.pieces.map((p) => p.id)).toEqual([FLOOR_ID, TOP_ID, HEAD_GUSSET_ID, FOOT_GUSSET_ID]);
    for (const p of v.pieces) {
      const o = p.paths.find((x) => x.id.endsWith('-outline'))!;
      expect(Object.keys(p.seamAllowances!)).toHaveLength(o.edges.length);
      expect(Object.values(p.seamAllowances!).every((x) => x === 0)).toBe(true);
    }
    expect(piece(v.pieces, HEAD_GUSSET_ID).materialId).toBe(MESH_ID);
    expect(piece(built({ ...DEF, head_gusset: 'fabric' }).pieces, HEAD_GUSSET_ID).materialId).toBe(TOP_FABRIC_ID);
  });
  it('every seam matches: tub top edge = top long edges + gusset bases; gusset arch = the top width', () => {
    const v = built(DEF);
    const floor = piece(v.pieces, FLOOR_ID), top = piece(v.pieces, TOP_ID), head = piece(v.pieces, HEAD_GUSSET_ID);
    // Tub top sew line: the cut rectangle inset by the allowance, i.e. (L + 2t) × (W + 2t) — after the corners fold, L and W.
    expect(pathLen(floor, `${FLOOR_ID}-top-seam`)).toBeCloseTo(2 * (94 + 36) * IN, 4);
    expect(pathLen(top, `${TOP_ID}-sew`)).toBeCloseTo(2 * (84 + 40) * IN, 4);
    expect(pathLen(head, `${HEAD_GUSSET_ID}-arch`)).toBeCloseTo(40 * IN, 0);
    expect(pathLen(head, `${HEAD_GUSSET_ID}-chord`)).toBeCloseTo(26 * IN, 6);
    // The floor's tub folds sit a tub height inside the sew line.
    const fold = floor.paths.find((p) => p.id === `${FLOOR_ID}-fold-y0`)!.edges[0];
    expect(fold.start.y).toBeCloseTo(SA + 5 * IN, 6);
    // Four corner ears.
    expect(floor.paths.filter((p) => p.id.startsWith(`${FLOOR_ID}-ear-`))).toHaveLength(4);
  });
  it('gusset cut = the arch offset by the allowance: rise + 2 allowances tall, wider than the floor', () => {
    const v = built(DEF);
    const r = v.resolved;
    const bb = bboxFromPiece(piece(v.pieces, HEAD_GUSSET_ID));
    expect(bb.height).toBeCloseTo(r.arch!.rise + 2 * SA, 1);
    expect(bb.width).toBeCloseTo(r.gusset_cut_width, 3);
    expect(bb.width).toBeGreaterThan(26 * IN);
  });
  it('the zipper mark sits zip length from the head on the chosen side', () => {
    const left = piece(built(DEF).pieces, TOP_ID).paths.find((p) => p.id === `${TOP_ID}-zip-end`)!.edges[0];
    expect(left.start.x).toBeCloseTo(SA + 48 * IN, 6);
    expect(left.start.y).toBe(0);
    const right = piece(built({ ...DEF, zip_side: 'right' }).pieces, TOP_ID).paths.find((p) => p.id === `${TOP_ID}-zip-end`)!.edges[0];
    expect(right.start.y).toBeCloseTo(resolveInputs(DEF).top_cut_width, 6);
  });
});

describe('validation, placeholders, BOM', () => {
  it('errors on the field that fixes it', () => {
    expect(errorFields({ ...DEF, top_width: 26 })).toEqual(['top_width']);
    expect(errorFields({ ...DEF, top_width: 45 })).toEqual(['top_width']); // > π/2 × 26" = 40.8"
    expect(errorFields({ ...DEF, zip_length: 90 })).toEqual(['zip_length']);
    expect(errorFields({ ...DEF, floor_width: 48 })).toContain('floor_width');
    expect(errorFields({ ...DEF, tub_height: 0 })).toEqual(['tub_height']);
  });
  it('every placeholder is empty in the default project and named in one note', () => {
    for (const p of PLACEHOLDERS) expect(DEF[p.field]).toBeUndefined();
    const w = built(DEF).warnings.filter((x) => x.id === 'mock-derived');
    expect(w).toHaveLength(1);
    for (const p of PLACEHOLDERS) expect(w[0].message).toContain(p.label);
    const all = { ...DEF, length: 84, floor_width: 26, tub_height: 5, top_width: 40, zip_length: 48, fabric_width: 58, seam_allowance: 12.7 };
    expect(built(all).warnings.some((x) => x.id === 'mock-derived')).toBe(false);
  });
  it('BOM: four pieces, floor / top / mesh lengths, zipper and sealer', () => {
    const rows = buildBom(DEF);
    expect(rows.filter((x) => x.id.startsWith('piece-'))).toHaveLength(4);
    expect(rows.find((x) => x.id === 'material-bivy-floor-fabric')!.quantity).toBe(Math.ceil((94 * IN + 2 * SA) / 10) * 10);
    expect(rows.some((x) => x.id === `material-${MESH_ID}`)).toBe(true);
    expect(rows.find((x) => x.id === 'hw-zipper')!.notes).toContain(`${Math.round(48 * IN)} mm`);
    expect(buildBom({ ...DEF, top_width: 10 })).toEqual([]);
  });
  it('steps depend only on earlier steps and cover every piece', () => {
    const v = built(DEF);
    const seen = new Set<string>();
    for (const s of v.steps) { for (const d of s.dependsOn) expect(seen.has(d)).toBe(true); seen.add(s.id); }
    const refs = new Set(v.steps.flatMap((s) => s.refsPieces));
    for (const p of v.pieces) expect(refs.has(p.id)).toBe(true);
  });
});
