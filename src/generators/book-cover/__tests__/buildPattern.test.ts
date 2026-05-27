import { describe, it, expect } from 'vitest';
import { buildPattern } from '../buildPattern.js';
import { patternToSvg } from '../../../lib/pattern-engine/exports/svg.js';
import type { BookCoverInputs } from '../types.js';

const BASE: BookCoverInputs = {
  book_height: 200,
  book_width: 150,
  spine_width: 25,
  flap_depth: 70,
  units: 'mm',
};

describe('buildPattern — cut dimensions', () => {
  it('returns ok: true for valid base inputs', () => {
    expect(buildPattern(BASE).ok).toBe(true);
  });

  it('outline cut path width = 2*150 + 25 + 2*70 + 2*9.5 = 484 mm', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    expect(panel).toBeDefined();
    const outline = panel!.paths.find(p => p.id === 'cover-panel-outline');
    expect(outline).toBeDefined();
    const maxX = Math.max(...outline!.edges.flatMap(e => [e.start.x, e.end.x]));
    const minX = Math.min(...outline!.edges.flatMap(e => [e.start.x, e.end.x]));
    expect(maxX - minX).toBeCloseTo(484, 5);
  });

  it('outline cut path height = 200 + 2*12 = 224 mm', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    const outline = panel!.paths.find(p => p.id === 'cover-panel-outline');
    const maxY = Math.max(...outline!.edges.flatMap(e => [e.start.y, e.end.y]));
    const minY = Math.min(...outline!.edges.flatMap(e => [e.start.y, e.end.y]));
    expect(maxY - minY).toBeCloseTo(224, 5);
  });

  it('SA=0: returns ok and outline is same size (no SA added)', () => {
    const result = buildPattern({ ...BASE, seam_allowance: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    const outline = panel!.paths.find(p => p.id === 'cover-panel-outline');
    const maxX = Math.max(...outline!.edges.flatMap(e => [e.start.x, e.end.x]));
    // No SA: width = 2*70 + 2*150 + 25 = 465
    expect(maxX).toBeCloseTo(465, 5);
  });

  it('SA=0: SA-offset seam path is omitted or absent', () => {
    const result = buildPattern({ ...BASE, seam_allowance: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    const saPath = panel!.paths.find(p => p.id === 'cover-panel-sa-seam');
    expect(saPath).toBeUndefined();
  });
});

describe('buildPattern — fold lines', () => {
  it('has 4 vertical fold-role paths', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    const vertFolds = panel!.paths.filter(p => p.id.startsWith('cover-panel-fold-v'));
    expect(vertFolds).toHaveLength(4);
    vertFolds.forEach(p => {
      expect(p.edges[0].role).toBe('fold');
    });
  });

  it('vertical fold x-coords match spec: SA+flap, SA+flap+bw, SA+flap+bw+sw, SA+flap+2bw+sw', () => {
    const SA = 9.5;
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    const foldXs = panel!.paths
      .filter(p => p.id.startsWith('cover-panel-fold-v'))
      .sort((a, b) => a.edges[0].start.x - b.edges[0].start.x)
      .map(p => p.edges[0].start.x);

    expect(foldXs[0]).toBeCloseTo(SA + 70, 5);
    expect(foldXs[1]).toBeCloseTo(SA + 70 + 150, 5);
    expect(foldXs[2]).toBeCloseTo(SA + 70 + 150 + 25, 5);
    expect(foldXs[3]).toBeCloseTo(SA + 70 + 150 + 25 + 150, 5);
  });

  it('top hem fold at y = 12', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    const topFold = panel!.paths.find(p => p.id === 'cover-panel-fold-top');
    expect(topFold).toBeDefined();
    expect(topFold!.edges[0].start.y).toBeCloseTo(12, 5);
  });

  it('bottom hem fold at y = cutHeight - 12 = 212', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    const bottomFold = panel!.paths.find(p => p.id === 'cover-panel-fold-bottom');
    expect(bottomFold).toBeDefined();
    expect(bottomFold!.edges[0].start.y).toBeCloseTo(212, 5);
  });
});

describe('buildPattern — accessory piece counts', () => {
  it('bare inputs produce exactly 1 piece', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(1);
  });

  it('outer_pocket only → 2 pieces', () => {
    const result = buildPattern({ ...BASE, outer_pocket: { width: 80, height: 100, position: 'front' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(2);
  });

  it('both outer_pocket and inner_pocket → 3 pieces', () => {
    const result = buildPattern({
      ...BASE,
      outer_pocket: { width: 80, height: 100, position: 'front' },
      inner_pocket: { width: 60, height: 80 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(3);
  });

  it('pen_holder only → 2 pieces', () => {
    const result = buildPattern({ ...BASE, pen_holder: { count: 4, slot_width: 22 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(2);
  });

  it('both pockets + pen_holder → 4 pieces', () => {
    const result = buildPattern({
      ...BASE,
      outer_pocket: { width: 80, height: 100 },
      inner_pocket: { width: 60, height: 80 },
      pen_holder: { count: 3, slot_width: 20 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(4);
  });
});

describe('buildPattern — pocket piece dimensions', () => {
  it('outer_pocket piece width = 80 + 2*9.5 = 99 mm', () => {
    const result = buildPattern({ ...BASE, outer_pocket: { width: 80, height: 100, position: 'front' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pocket = result.value.pieces.find(p => p.id === 'outer-pocket');
    expect(pocket).toBeDefined();
    const outline = pocket!.paths.find(p => p.id === 'outer-pocket-outline');
    expect(outline).toBeDefined();
    const maxX = Math.max(...outline!.edges.flatMap(e => [e.start.x, e.end.x]));
    expect(maxX).toBeCloseTo(99, 5);
  });

  it('outer_pocket piece height = 100 + 2*9.5 + 12 = 131 mm', () => {
    const result = buildPattern({ ...BASE, outer_pocket: { width: 80, height: 100, position: 'front' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pocket = result.value.pieces.find(p => p.id === 'outer-pocket');
    const outline = pocket!.paths.find(p => p.id === 'outer-pocket-outline');
    const maxY = Math.max(...outline!.edges.flatMap(e => [e.start.y, e.end.y]));
    expect(maxY).toBeCloseTo(131, 5);
  });
});

describe('buildPattern — pen holder piece', () => {
  it('pen_holder piece width = 4*22 + 2*9.5 = 107 mm', () => {
    const result = buildPattern({ ...BASE, pen_holder: { count: 4, slot_width: 22 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ph = result.value.pieces.find(p => p.id === 'pen-holder');
    expect(ph).toBeDefined();
    const outline = ph!.paths.find(p => p.id === 'pen-holder-outline');
    expect(outline).toBeDefined();
    const maxX = Math.max(...outline!.edges.flatMap(e => [e.start.x, e.end.x]));
    expect(maxX).toBeCloseTo(107, 5);
  });

  it('pen_holder piece has exactly count-1 = 3 vertical fold paths', () => {
    const result = buildPattern({ ...BASE, pen_holder: { count: 4, slot_width: 22 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ph = result.value.pieces.find(p => p.id === 'pen-holder');
    const folds = ph!.paths.filter(p => p.id.startsWith('pen-holder-fold-v'));
    expect(folds).toHaveLength(3);
  });

  it('pen_holder fold lines are spaced at slot_width intervals', () => {
    const SA = 9.5;
    const slotW = 22;
    const result = buildPattern({ ...BASE, pen_holder: { count: 4, slot_width: slotW } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ph = result.value.pieces.find(p => p.id === 'pen-holder');
    const folds = ph!.paths
      .filter(p => p.id.startsWith('pen-holder-fold-v'))
      .sort((a, b) => a.edges[0].start.x - b.edges[0].start.x);
    expect(folds[0].edges[0].start.x).toBeCloseTo(SA + slotW, 5);
    expect(folds[1].edges[0].start.x).toBeCloseTo(SA + 2 * slotW, 5);
    expect(folds[2].edges[0].start.x).toBeCloseTo(SA + 3 * slotW, 5);
  });
});

describe('buildPattern — SVG smoke tests', () => {
  it('bare cover: patternToSvg does not throw', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pattern = { id: 'book-cover', name: 'Book Cover', pieces: result.value.pieces };
    expect(() => patternToSvg(pattern)).not.toThrow();
    expect(patternToSvg(pattern)).toContain('<svg');
  });

  it('fully-loaded cover: patternToSvg does not throw', () => {
    const result = buildPattern({
      ...BASE,
      outer_pocket: { width: 80, height: 100, position: 'front' },
      inner_pocket: { width: 60, height: 80 },
      pen_holder: { count: 4, slot_width: 22 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pattern = { id: 'book-cover-full', name: 'Book Cover (Full)', pieces: result.value.pieces };
    expect(() => patternToSvg(pattern)).not.toThrow();
    expect(patternToSvg(pattern)).toContain('<svg');
  });
});

describe('buildPattern — construction steps', () => {
  it('bare cover has at least 4 steps', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.steps.length).toBeGreaterThanOrEqual(4);
  });

  it('each configured accessory adds at least one more step', () => {
    const bare = buildPattern(BASE);
    const withPocket = buildPattern({ ...BASE, outer_pocket: { width: 80, height: 100 } });
    expect(bare.ok).toBe(true);
    expect(withPocket.ok).toBe(true);
    if (!bare.ok || !withPocket.ok) return;
    expect(withPocket.value.steps.length).toBeGreaterThan(bare.value.steps.length);
  });
});
