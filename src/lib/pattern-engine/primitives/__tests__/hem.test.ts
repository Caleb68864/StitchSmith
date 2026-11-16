// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { resolveHem, hemmedCut, hemLines, HEM_PRODUCTION_MIN_MM, type Hem } from '../hem.js';
import { makeEdgeIdGen } from '../../graph/Edge.js';
import { catenaryPoints } from '../../geometry/catenary.js';
import { buildFoldModel, defaultFoldAngles } from '../../../fold-engine/index.js';
import type { Piece } from '../../graph/Piece.js';

const IN = 25.4;
const hem = (depth: number, fold: 'single' | 'double' = 'single', productionMode = false): Hem => {
  const r = resolveHem({ depth, fold, productionMode });
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe('resolveHem', () => {
  it('single fold: the allowance is the depth and the mark is at double (vault mark-at-double rule)', () => {
    const h = hem(1 * IN);
    expect(h.allowance).toBeCloseTo(1 * IN, 9);
    expect(h.markFromRaw).toBeCloseTo(2 * IN, 9);
    expect(h.folds).toEqual([0]);
  });

  it('double fold (rolled): twice the depth beyond the finished edge, two creases', () => {
    const h = hem(0.5 * IN, 'double');
    expect(h.allowance).toBeCloseTo(1 * IN, 9);
    expect(h.folds).toEqual([0.5 * IN, 0]);
    expect(h.markFromRaw).toBeCloseTo(1 * IN, 9);
  });

  it('production mode floors the depth at 1/2" and says so; a deeper hem is left alone', () => {
    const low = hem(0.25 * IN, 'single', true);
    expect(low.depth).toBeCloseTo(HEM_PRODUCTION_MIN_MM, 9);
    expect(low.requestedDepth).toBeCloseTo(0.25 * IN, 9);
    expect(low.raised).toBe(true);
    const deep = hem(1 * IN, 'single', true);
    expect(deep.depth).toBeCloseTo(1 * IN, 9);
    expect(deep.raised).toBe(false);
    expect(hem(0.25 * IN).raised).toBe(false);
  });

  it('rejects a negative or non-finite depth and an unknown fold', () => {
    expect(resolveHem({ depth: -1 }).ok).toBe(false);
    expect(resolveHem({ depth: NaN }).ok).toBe(false);
    expect(resolveHem({ depth: 10, fold: 'triple' as never }).ok).toBe(false);
  });

  it('a zero hem takes no fabric and draws nothing', () => {
    const h = hem(0);
    expect(h.allowance).toBe(0);
    expect(h.folds).toEqual([]);
  });
});

describe('hemmedCut', () => {
  it('cut = finished + each hem (the organizer body: 5" pockets, 1" hems both ends)', () => {
    const h = hem(1 * IN);
    expect(hemmedCut(10 * IN, h, h)).toBeCloseTo(12 * IN, 9);
    expect(hemmedCut(10 * IN, hem(0.5 * IN, 'double'), null)).toBeCloseTo(11 * IN, 9);
  });
});

describe('hemLines', () => {
  it('straight edge, single fold: raw edge out by the depth, crease on the finished edge, mark inside at depth', () => {
    const h = hem(1 * IN);
    const out = hemLines({ hem: h, finished: [{ x: 0, y: 100 }, { x: 200, y: 100 }], outward: { x: 0, y: 1 }, idPrefix: 'p', eid: makeEdgeIdGen('p') });
    expect(out.raw).toEqual([{ x: 0, y: 100 + IN }, { x: 200, y: 100 + IN }]);
    const folds = out.paths.filter((p) => p.edges[0].role === 'fold');
    const marks = out.paths.filter((p) => p.edges[0].role === 'notch');
    expect(folds).toHaveLength(1);
    expect(folds[0].edges).toHaveLength(1);
    expect(folds[0].edges[0].start.y).toBeCloseTo(100, 9);
    expect(marks).toHaveLength(1);
    expect(marks[0].edges[0].start.y).toBeCloseTo(100 - IN, 9);
    // Raw edge to mark = 2 × depth.
    expect(out.raw[0].y - marks[0].edges[0].start.y).toBeCloseTo(2 * IN, 9);
    for (const p of folds) expect(`${p.label} ${p.id}`.toLowerCase()).toMatch(/hem/);
  });

  it('straight edge, double fold: two creases and no separate mark (the mark is the finished crease)', () => {
    const h = hem(0.5 * IN, 'double');
    const out = hemLines({ hem: h, finished: [{ x: 0, y: 0 }, { x: 0, y: 300 }], outward: { x: -2, y: 0 }, idPrefix: 'p', eid: makeEdgeIdGen('p') });
    expect(out.raw[0].x).toBeCloseTo(-1 * IN, 9);
    const xs = out.paths.map((p) => p.edges[0].start.x);
    expect(out.paths.every((p) => p.edges[0].role === 'fold')).toBe(true);
    expect(xs[0]).toBeCloseTo(-0.5 * IN, 9);
    expect(xs[1]).toBeCloseTo(0, 9);
  });

  it("a curved edge is translated point for point; on a 3\" sag over 10 ft the perpendicular error is under 0.15 mm", () => {
    const h = hem(1 * IN);
    const finished = catenaryPoints({ x: 0, y: 1000 }, { x: 3048, y: 1000 }, 76.2, { x: 1524, y: 0 }, 24);
    const out = hemLines({ hem: h, finished, outward: { x: 0, y: 1 }, idPrefix: 'p', eid: makeEdgeIdGen('p') });
    expect(out.raw).toHaveLength(finished.length);
    out.raw.forEach((p, i) => { expect(p.x).toBeCloseTo(finished[i].x, 9); expect(p.y).toBeCloseTo(finished[i].y + IN, 9); });
    // Steepest point (the ends): slope ≈ 4·sag/span = 0.1; error = depth·(1 − cos θ).
    const theta = Math.atan((finished[1].y - finished[0].y) / (finished[1].x - finished[0].x));
    expect(IN * (1 - Math.cos(theta))).toBeLessThan(0.15);
    const fold = out.paths.find((p) => p.edges[0].role === 'fold')!;
    expect(fold.edges).toHaveLength(24);
  });

  it('zero depth: the raw edge is the finished edge and nothing is drawn', () => {
    const out = hemLines({ hem: hem(0), finished: [{ x: 0, y: 0 }, { x: 10, y: 0 }], outward: { x: 0, y: 1 }, idPrefix: 'p', eid: makeEdgeIdGen('p') });
    expect(out.paths).toEqual([]);
    expect(out.raw).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
  });

  it('the straight crease is a hinge the 3D preview folds 180°', () => {
    const h = hem(1 * IN);
    const eid = makeEdgeIdGen('panel');
    const lines = hemLines({ hem: h, finished: [{ x: 0, y: 200 }, { x: 300, y: 200 }], outward: { x: 0, y: 1 }, idPrefix: 'panel', eid });
    const W = 300, H = 200 + h.allowance;
    const outline = { id: 'o', closed: true, edges: [
      { kind: 'straight' as const, id: eid(), role: 'cut' as const, start: { x: 0, y: 0 }, end: { x: W, y: 0 } },
      { kind: 'straight' as const, id: eid(), role: 'cut' as const, start: { x: W, y: 0 }, end: { x: W, y: H } },
      { kind: 'straight' as const, id: eid(), role: 'cut' as const, start: { x: W, y: H }, end: { x: 0, y: H } },
      { kind: 'straight' as const, id: eid(), role: 'cut' as const, start: { x: 0, y: H }, end: { x: 0, y: 0 } },
    ] };
    const piece: Piece = { id: 'panel', name: 'p', mirror: false, quantity: 1, paths: [outline, ...lines.paths], annotations: [{ kind: 'label', label: 'x', point: { x: 150, y: 100 } }] };
    const model = buildFoldModel(piece)!;
    expect(model.folds).toHaveLength(1);
    expect(defaultFoldAngles(model)[0]).toBeCloseTo(Math.PI, 9);
  });

  it('rejects a one-point edge and a zero direction', () => {
    expect(() => hemLines({ hem: hem(10), finished: [{ x: 0, y: 0 }], outward: { x: 0, y: 1 }, idPrefix: 'p', eid: makeEdgeIdGen('p') })).toThrow();
    expect(() => hemLines({ hem: hem(10), finished: [{ x: 0, y: 0 }, { x: 1, y: 0 }], outward: { x: 0, y: 0 }, idPrefix: 'p', eid: makeEdgeIdGen('p') })).toThrow();
  });
});
