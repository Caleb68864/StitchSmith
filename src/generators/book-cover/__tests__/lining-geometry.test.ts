import { describe, it, expect } from 'vitest';
import { buildPattern } from '../buildPattern.js';
import type { BookCoverInputs } from '../types.js';

const BASE: BookCoverInputs = {
  book_height: 200,
  book_width: 150,
  spine_width: 25,
  flap_depth: 70,
  units: 'mm',
};

// SA = 9.5, top_bottom_hem = 12
// cutWidth = 2*150 + 25 + 2*9.5 = 344
// cutHeight = 200 + 2*12 = 224

describe('buildPattern — lining piece presence', () => {
  it('lining enabled → 4 pieces (body, flap-l, flap-r, lining)', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(4);
    const ids = result.value.pieces.map(p => p.id);
    expect(ids).toContain('cover-panel');
    expect(ids).toContain('inner-flap-left');
    expect(ids).toContain('inner-flap-right');
    expect(ids).toContain('lining');
  });

  it('lining disabled (no lining config) → 3 pieces', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(3);
    const ids = result.value.pieces.map(p => p.id);
    expect(ids).not.toContain('lining');
  });
});

describe('buildPattern — lining piece dimensions match body', () => {
  it('lining outline cutWidth equals body outline cutWidth (344 mm)', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const body = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const lining = result.value.pieces.find(p => p.id === 'lining')!;

    const bodyOutline = body.paths.find(p => p.id === 'cover-panel-outline')!;
    const liningOutline = lining.paths.find(p => p.id === 'lining-outline')!;

    const bodyWidth = Math.max(...bodyOutline.edges.flatMap(e => [e.start.x, e.end.x])) -
                     Math.min(...bodyOutline.edges.flatMap(e => [e.start.x, e.end.x]));
    const liningWidth = Math.max(...liningOutline.edges.flatMap(e => [e.start.x, e.end.x])) -
                       Math.min(...liningOutline.edges.flatMap(e => [e.start.x, e.end.x]));

    expect(liningWidth).toBeCloseTo(bodyWidth, 5);
    expect(liningWidth).toBeCloseTo(344, 5);
  });

  it('lining outline cutHeight equals body outline cutHeight (224 mm)', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const body = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const lining = result.value.pieces.find(p => p.id === 'lining')!;

    const bodyOutline = body.paths.find(p => p.id === 'cover-panel-outline')!;
    const liningOutline = lining.paths.find(p => p.id === 'lining-outline')!;

    const bodyHeight = Math.max(...bodyOutline.edges.flatMap(e => [e.start.y, e.end.y])) -
                      Math.min(...bodyOutline.edges.flatMap(e => [e.start.y, e.end.y]));
    const liningHeight = Math.max(...liningOutline.edges.flatMap(e => [e.start.y, e.end.y])) -
                        Math.min(...liningOutline.edges.flatMap(e => [e.start.y, e.end.y]));

    expect(liningHeight).toBeCloseTo(bodyHeight, 5);
    expect(liningHeight).toBeCloseTo(224, 5);
  });
});

describe('buildPattern — lining piece fold lines', () => {
  it('lining does NOT carry cover-panel-fold-top path', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lining = result.value.pieces.find(p => p.id === 'lining')!;
    const hasFoldTop = lining.paths.some(p => p.id === 'cover-panel-fold-top');
    expect(hasFoldTop).toBe(false);
  });

  it('lining does NOT carry cover-panel-fold-bottom path', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lining = result.value.pieces.find(p => p.id === 'lining')!;
    const hasFoldBottom = lining.paths.some(p => p.id === 'cover-panel-fold-bottom');
    expect(hasFoldBottom).toBe(false);
  });

  it('lining has exactly 2 vertical spine fold lines', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lining = result.value.pieces.find(p => p.id === 'lining')!;
    const spineFolds = lining.paths.filter(p => p.id.startsWith('lining-fold-v'));
    expect(spineFolds).toHaveLength(2);
    spineFolds.forEach(p => {
      expect(p.edges[0].role).toBe('fold');
    });
  });

  it('lining spine fold x-coords match body spine fold x-coords', () => {
    const SA = 9.5;
    const result = buildPattern({ ...BASE, lining: { enabled: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const lining = result.value.pieces.find(p => p.id === 'lining')!;
    const foldXs = lining.paths
      .filter(p => p.id.startsWith('lining-fold-v'))
      .sort((a, b) => a.edges[0].start.x - b.edges[0].start.x)
      .map(p => p.edges[0].start.x);

    expect(foldXs[0]).toBeCloseTo(SA + 150, 5);
    expect(foldXs[1]).toBeCloseTo(SA + 150 + 25, 5);
  });

  it('lining outline is cut-role', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lining = result.value.pieces.find(p => p.id === 'lining')!;
    const outline = lining.paths.find(p => p.id === 'lining-outline')!;
    expect(outline).toBeDefined();
    expect(outline.edges.every(e => e.role === 'cut')).toBe(true);
  });
});

describe('buildPattern — lining with zipper closure', () => {
  it('lining outline has same shape (arc count) as body outline for zipper closure', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, closure: { kind: 'zipper', gauge: '#5', corner_radius: 31.75 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const body = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const lining = result.value.pieces.find(p => p.id === 'lining')!;

    const bodyOutlineArcs = body.paths.find(p => p.id === 'cover-panel-outline')!.edges.filter(e => e.kind === 'arc').length;
    const liningOutlineArcs = lining.paths.find(p => p.id === 'lining-outline')!.edges.filter(e => e.kind === 'arc').length;

    expect(liningOutlineArcs).toBe(bodyOutlineArcs);
    expect(liningOutlineArcs).toBe(4);
  });
});
