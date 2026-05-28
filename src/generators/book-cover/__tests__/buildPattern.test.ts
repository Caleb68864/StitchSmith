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

// Body cut width = 2*book_width + spine_width + 2*SA = 2*150 + 25 + 2*9.5 = 344
// Body cut height = book_height + 2*top_bottom_hem = 200 + 2*12 = 224
// Inner flap cut width = flap_depth + SA + top_bottom_hem = 70 + 9.5 + 12 = 91.5
// Inner flap cut height = body cut height = 224

describe('buildPattern — body panel cut dimensions', () => {
  it('returns ok: true for valid base inputs', () => {
    expect(buildPattern(BASE).ok).toBe(true);
  });

  it('body outline width = 2*150 + 25 + 2*9.5 = 344 mm (no flap_depth)', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    expect(panel).toBeDefined();
    const outline = panel!.paths.find(p => p.id === 'cover-panel-outline');
    const maxX = Math.max(...outline!.edges.flatMap(e => [e.start.x, e.end.x]));
    const minX = Math.min(...outline!.edges.flatMap(e => [e.start.x, e.end.x]));
    expect(maxX - minX).toBeCloseTo(344, 5);
  });

  it('body outline height = 200 + 2*12 = 224 mm', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    const outline = panel!.paths.find(p => p.id === 'cover-panel-outline');
    const maxY = Math.max(...outline!.edges.flatMap(e => [e.start.y, e.end.y]));
    const minY = Math.min(...outline!.edges.flatMap(e => [e.start.y, e.end.y]));
    expect(maxY - minY).toBeCloseTo(224, 5);
  });

  it('SA=0: body outline width = 2*150 + 25 = 325 mm', () => {
    const result = buildPattern({ ...BASE, seam_allowance: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    const outline = panel!.paths.find(p => p.id === 'cover-panel-outline');
    const maxX = Math.max(...outline!.edges.flatMap(e => [e.start.x, e.end.x]));
    expect(maxX).toBeCloseTo(325, 5);
  });

  it('SA=0: SA-offset seam path is omitted', () => {
    const result = buildPattern({ ...BASE, seam_allowance: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    const saPath = panel!.paths.find(p => p.id === 'cover-panel-sa-seam');
    expect(saPath).toBeUndefined();
  });
});

describe('buildPattern — body panel fold lines', () => {
  it('body has exactly 2 vertical fold-role paths (spine boundaries)', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    const vertFolds = panel!.paths.filter(p => p.id.startsWith('cover-panel-fold-v'));
    expect(vertFolds).toHaveLength(2);
    vertFolds.forEach(p => {
      expect(p.edges[0].role).toBe('fold');
    });
  });

  it('vertical fold x-coords: SA+book_width, SA+book_width+spine_width', () => {
    const SA = 9.5;
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    const foldXs = panel!.paths
      .filter(p => p.id.startsWith('cover-panel-fold-v'))
      .sort((a, b) => a.edges[0].start.x - b.edges[0].start.x)
      .map(p => p.edges[0].start.x);
    expect(foldXs[0]).toBeCloseTo(SA + 150, 5);
    expect(foldXs[1]).toBeCloseTo(SA + 150 + 25, 5);
  });

  it('top hem fold at y = 12', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    const topFold = panel!.paths.find(p => p.id === 'cover-panel-fold-top');
    expect(topFold!.edges[0].start.y).toBeCloseTo(12, 5);
  });

  it('bottom hem fold at y = 212', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel');
    const bottomFold = panel!.paths.find(p => p.id === 'cover-panel-fold-bottom');
    expect(bottomFold!.edges[0].start.y).toBeCloseTo(212, 5);
  });
});

describe('buildPattern — inner flap pieces', () => {
  it('bare cover emits 3 pieces: body + left flap + right flap', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.pieces.map(p => p.id).sort();
    expect(ids).toEqual(['cover-panel', 'inner-flap-left', 'inner-flap-right']);
  });

  it('each flap width = flap_depth + SA + top_bottom_hem = 70 + 9.5 + 12 = 91.5 mm', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const id of ['inner-flap-left', 'inner-flap-right']) {
      const flap = result.value.pieces.find(p => p.id === id);
      expect(flap).toBeDefined();
      const outline = flap!.paths.find(p => p.id === `${id}-outline`);
      const maxX = Math.max(...outline!.edges.flatMap(e => [e.start.x, e.end.x]));
      const minX = Math.min(...outline!.edges.flatMap(e => [e.start.x, e.end.x]));
      expect(maxX - minX).toBeCloseTo(91.5, 5);
    }
  });

  it('each flap height matches body height (224 mm)', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const id of ['inner-flap-left', 'inner-flap-right']) {
      const flap = result.value.pieces.find(p => p.id === id);
      const outline = flap!.paths.find(p => p.id === `${id}-outline`);
      const maxY = Math.max(...outline!.edges.flatMap(e => [e.start.y, e.end.y]));
      const minY = Math.min(...outline!.edges.flatMap(e => [e.start.y, e.end.y]));
      expect(maxY - minY).toBeCloseTo(224, 5);
    }
  });

  it('each flap has a sleeve-mouth hem fold at cutWidth - top_bottom_hem', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const id of ['inner-flap-left', 'inner-flap-right']) {
      const flap = result.value.pieces.find(p => p.id === id);
      const mouth = flap!.paths.find(p => p.id === `${id}-fold-mouth`);
      expect(mouth).toBeDefined();
      expect(mouth!.edges[0].role).toBe('fold');
      // Mouth hem sits at cutWidth - top_bottom_hem = 91.5 - 12 = 79.5
      expect(mouth!.edges[0].start.x).toBeCloseTo(79.5, 5);
    }
  });
});

describe('buildPattern — accessory piece counts (additive to the 3 base pieces)', () => {
  it('bare → 3 pieces', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(3);
  });

  it('outer_pocket only → 4 pieces', () => {
    const result = buildPattern({ ...BASE, outer_pocket: { width: 80, height: 100, position: 'front' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(4);
  });

  it('both pockets → 5 pieces', () => {
    const result = buildPattern({
      ...BASE,
      outer_pocket: { width: 80, height: 100, position: 'front' },
      inner_pocket: { width: 60, height: 80 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(5);
  });

  it('pen_holder only → 4 pieces', () => {
    const result = buildPattern({ ...BASE, pen_holder: { count: 4, slot_width: 22 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(4);
  });

  it('both pockets + pen_holder → 6 pieces', () => {
    const result = buildPattern({
      ...BASE,
      outer_pocket: { width: 80, height: 100 },
      inner_pocket: { width: 60, height: 80 },
      pen_holder: { count: 3, slot_width: 20 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(6);
  });
});

describe('buildPattern — pocket piece dimensions', () => {
  it('outer_pocket piece width = 80 + 2*9.5 = 99 mm', () => {
    const result = buildPattern({ ...BASE, outer_pocket: { width: 80, height: 100, position: 'front' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pocket = result.value.pieces.find(p => p.id === 'outer-pocket');
    const outline = pocket!.paths.find(p => p.id === 'outer-pocket-outline');
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
    const outline = ph!.paths.find(p => p.id === 'pen-holder-outline');
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

  it('pen_holder fold lines spaced at slot_width intervals', () => {
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

describe('buildPattern — closure modes', () => {
  it('closure { kind: "none" } returns same body outline as no closure', () => {
    const withNone = buildPattern({ ...BASE, closure: { kind: 'none' } });
    const withoutClosure = buildPattern(BASE);
    expect(withNone.ok).toBe(true);
    expect(withoutClosure.ok).toBe(true);
    if (!withNone.ok || !withoutClosure.ok) return;
    const panelNone = withNone.value.pieces.find(p => p.id === 'cover-panel')!;
    const panelBase = withoutClosure.value.pieces.find(p => p.id === 'cover-panel')!;
    const outlineNone = panelNone.paths.find(p => p.id === 'cover-panel-outline')!;
    const outlineBase = panelBase.paths.find(p => p.id === 'cover-panel-outline')!;
    expect(outlineNone.edges.length).toBe(outlineBase.edges.length);
    expect(outlineNone.edges.every(e => e.kind === 'straight')).toBe(true);
  });

  it('zipper outline has exactly 4 ArcEdge entries', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'zipper', gauge: '#5', corner_radius: 31.75 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const outline = panel.paths.find(p => p.id === 'cover-panel-outline')!;
    const arcs = outline.edges.filter(e => e.kind === 'arc');
    expect(arcs).toHaveLength(4);
  });

  it('zipper outline has exactly 4 StraightEdge entries', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'zipper', gauge: '#5', corner_radius: 31.75 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const outline = panel.paths.find(p => p.id === 'cover-panel-outline')!;
    const straights = outline.edges.filter(e => e.kind === 'straight');
    expect(straights).toHaveLength(4);
  });

  it('flap-buckle returns 4 pieces (body + 2 flaps + strap)', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'flap-buckle', strap_width: 25.4, buckle_size: 25.4 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(4);
  });

  it('flap-buckle strap width = book_width + spine_width + 2*SA', () => {
    const SA = 9.5;
    const result = buildPattern({ ...BASE, closure: { kind: 'flap-buckle', strap_width: 25.4, buckle_size: 25.4 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const strap = result.value.pieces.find(p => p.id === 'flap-buckle-strap')!;
    const outline = strap.paths.find(p => p.id === 'flap-buckle-strap-outline')!;
    const maxX = Math.max(...outline.edges.flatMap(e => [e.start.x, e.end.x]));
    expect(maxX).toBeCloseTo(BASE.book_width! + BASE.spine_width! + 2 * SA, 5);
  });

  it('flap-buckle strap height = strap_width + 2*SA', () => {
    const SA = 9.5;
    const strapWidth = 25.4;
    const result = buildPattern({ ...BASE, closure: { kind: 'flap-buckle', strap_width: strapWidth, buckle_size: 25.4 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const strap = result.value.pieces.find(p => p.id === 'flap-buckle-strap')!;
    const outline = strap.paths.find(p => p.id === 'flap-buckle-strap-outline')!;
    const maxY = Math.max(...outline.edges.flatMap(e => [e.start.y, e.end.y]));
    expect(maxY).toBeCloseTo(strapWidth + 2 * SA, 5);
  });

  it('snap count=2 returns body with 4 notch annotations', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'snap', count: 2 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const notches = panel.annotations?.filter(a => a.kind === 'notch') ?? [];
    expect(notches).toHaveLength(4);
  });

  it('elastic with attach_offset returns body with 2 notch annotations', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'elastic', strap_width: 12.7, attach_offset: 30 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const notches = panel.annotations?.filter(a => a.kind === 'notch') ?? [];
    expect(notches).toHaveLength(2);
  });

  it('elastic notches placed at y = cutHeight/2 ± attach_offset', () => {
    const attachOffset = 30;
    const cutHeight = BASE.book_height! + 2 * 12; // book_height + 2*top_bottom_hem = 200 + 24 = 224
    const result = buildPattern({ ...BASE, closure: { kind: 'elastic', strap_width: 12.7, attach_offset: attachOffset } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const notches = panel.annotations?.filter(a => a.kind === 'notch') ?? [];
    const ys = notches.map(n => n.point!.y).sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(cutHeight / 2 - attachOffset, 5);
    expect(ys[1]).toBeCloseTo(cutHeight / 2 + attachOffset, 5);
  });
});

describe('buildPattern — construction steps', () => {
  it('bare cover has at least 5 steps', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.steps.length).toBeGreaterThanOrEqual(5);
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
