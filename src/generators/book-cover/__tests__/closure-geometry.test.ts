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

const SA = 9.5;
const TOP_BOTTOM_HEM = 12;
const CUT_WIDTH = 2 * 150 + 25 + 2 * SA; // 344
const CUT_HEIGHT = 200 + 2 * TOP_BOTTOM_HEM; // 224

describe('closure: none — identical to no closure', () => {
  it('{ kind: "none" } body outline edge count matches bare cover', () => {
    const withNone = buildPattern({ ...BASE, closure: { kind: 'none' } });
    const withoutClosure = buildPattern(BASE);
    expect(withNone.ok).toBe(true);
    expect(withoutClosure.ok).toBe(true);
    if (!withNone.ok || !withoutClosure.ok) return;
    const outlineNone = withNone.value.pieces
      .find(p => p.id === 'cover-panel')!.paths
      .find(p => p.id === 'cover-panel-outline')!;
    const outlineBase = withoutClosure.value.pieces
      .find(p => p.id === 'cover-panel')!.paths
      .find(p => p.id === 'cover-panel-outline')!;
    expect(outlineNone.edges.length).toBe(outlineBase.edges.length);
  });

  it('{ kind: "none" } body outline uses only StraightEdge', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'none' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const outline = result.value.pieces
      .find(p => p.id === 'cover-panel')!.paths
      .find(p => p.id === 'cover-panel-outline')!;
    expect(outline.edges.every(e => e.kind === 'straight')).toBe(true);
  });

  it('{ kind: "none" } yields exactly 3 pieces (no strap)', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'none' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(3);
  });
});

describe('closure: zipper — rounded corner geometry', () => {
  const CORNER_R = 31.75;

  it('zipper outline has 4 ArcEdge (one per corner)', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'zipper', gauge: '#5', corner_radius: CORNER_R } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const outline = result.value.pieces
      .find(p => p.id === 'cover-panel')!.paths
      .find(p => p.id === 'cover-panel-outline')!;
    expect(outline.edges.filter(e => e.kind === 'arc')).toHaveLength(4);
  });

  it('zipper outline has 4 StraightEdge (one per side)', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'zipper', gauge: '#5', corner_radius: CORNER_R } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const outline = result.value.pieces
      .find(p => p.id === 'cover-panel')!.paths
      .find(p => p.id === 'cover-panel-outline')!;
    expect(outline.edges.filter(e => e.kind === 'straight')).toHaveLength(4);
  });

  it('zipper arc edges all have radius matching corner_radius', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'zipper', gauge: '#5', corner_radius: CORNER_R } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const outline = result.value.pieces
      .find(p => p.id === 'cover-panel')!.paths
      .find(p => p.id === 'cover-panel-outline')!;
    const arcs = outline.edges.filter(e => e.kind === 'arc') as Array<{ radius: number }>;
    arcs.forEach(a => expect(a.radius).toBeCloseTo(CORNER_R, 5));
  });

  it('zipper SA path (seam) exists and has 4 arc + 4 straight edges', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'zipper', gauge: '#5', corner_radius: CORNER_R } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const saPath = panel.paths.find(p => p.id === 'cover-panel-sa-seam');
    expect(saPath).toBeDefined();
    expect(saPath!.edges.filter(e => e.kind === 'arc')).toHaveLength(4);
    expect(saPath!.edges.filter(e => e.kind === 'straight')).toHaveLength(4);
  });

  it('zipper SA path inner arc radius = corner_radius - SA', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'zipper', gauge: '#5', corner_radius: CORNER_R } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const saPath = panel.paths.find(p => p.id === 'cover-panel-sa-seam')!;
    const arcs = saPath.edges.filter(e => e.kind === 'arc') as Array<{ radius: number }>;
    arcs.forEach(a => expect(a.radius).toBeCloseTo(CORNER_R - SA, 5));
  });

  it('zipper default corner_radius for #3 is 19.05 mm', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'zipper', gauge: '#3' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const outline = result.value.pieces
      .find(p => p.id === 'cover-panel')!.paths
      .find(p => p.id === 'cover-panel-outline')!;
    const arcs = outline.edges.filter(e => e.kind === 'arc') as Array<{ radius: number }>;
    arcs.forEach(a => expect(a.radius).toBeCloseTo(19.05, 5));
  });

  it('non-zipper closure keeps StraightEdge-only outline', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'snap', count: 1 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const outline = result.value.pieces
      .find(p => p.id === 'cover-panel')!.paths
      .find(p => p.id === 'cover-panel-outline')!;
    expect(outline.edges.every(e => e.kind === 'straight')).toBe(true);
  });
});

describe('closure: flap-buckle — strap piece', () => {
  it('flap-buckle yields 4 pieces (body + 2 flaps + strap)', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'flap-buckle', strap_width: 25.4, buckle_size: 25.4 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(4);
  });

  it('strap piece id is "flap-buckle-strap"', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'flap-buckle', strap_width: 25.4 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces.some(p => p.id === 'flap-buckle-strap')).toBe(true);
  });

  it('strap outline width = book_width + spine_width + 2*SA', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'flap-buckle', strap_width: 25.4 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const strap = result.value.pieces.find(p => p.id === 'flap-buckle-strap')!;
    const outline = strap.paths.find(p => p.id === 'flap-buckle-strap-outline')!;
    const maxX = Math.max(...outline.edges.flatMap(e => [e.start.x, e.end.x]));
    expect(maxX).toBeCloseTo(150 + 25 + 2 * SA, 5);
  });

  it('strap outline height = strap_width + 2*SA', () => {
    const strapWidth = 25.4;
    const result = buildPattern({ ...BASE, closure: { kind: 'flap-buckle', strap_width: strapWidth } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const strap = result.value.pieces.find(p => p.id === 'flap-buckle-strap')!;
    const outline = strap.paths.find(p => p.id === 'flap-buckle-strap-outline')!;
    const maxY = Math.max(...outline.edges.flatMap(e => [e.start.y, e.end.y]));
    expect(maxY).toBeCloseTo(strapWidth + 2 * SA, 5);
  });
});

describe('closure: snap — notch annotations', () => {
  it('snap count=2 adds 4 notch annotations to body', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'snap', count: 2 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const notches = panel.annotations?.filter(a => a.kind === 'notch') ?? [];
    expect(notches).toHaveLength(4);
  });

  it('snap count=1 adds 2 notch annotations to body', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'snap', count: 1 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const notches = panel.annotations?.filter(a => a.kind === 'notch') ?? [];
    expect(notches).toHaveLength(2);
  });

  it('snap notches appear on both short edges (x=0 and x=cutWidth)', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'snap', count: 2 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const notches = panel.annotations?.filter(a => a.kind === 'notch') ?? [];
    const leftNotches = notches.filter(n => n.point!.x === 0);
    const rightNotches = notches.filter(n => n.point!.x === CUT_WIDTH);
    expect(leftNotches).toHaveLength(2);
    expect(rightNotches).toHaveLength(2);
  });
});

describe('closure: elastic — notch annotations', () => {
  it('elastic with attach_offset=30 adds 2 notch annotations to body', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'elastic', strap_width: 12.7, attach_offset: 30 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const notches = panel.annotations?.filter(a => a.kind === 'notch') ?? [];
    expect(notches).toHaveLength(2);
  });

  it('elastic notches placed at y = cutHeight/2 ± attach_offset', () => {
    const attachOffset = 30;
    const result = buildPattern({ ...BASE, closure: { kind: 'elastic', attach_offset: attachOffset } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const notches = panel.annotations?.filter(a => a.kind === 'notch') ?? [];
    const ys = notches.map(n => n.point!.y).sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(CUT_HEIGHT / 2 - attachOffset, 5);
    expect(ys[1]).toBeCloseTo(CUT_HEIGHT / 2 + attachOffset, 5);
  });

  it('elastic without attach_offset still adds 2 notch annotations', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'elastic' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'cover-panel')!;
    const notches = panel.annotations?.filter(a => a.kind === 'notch') ?? [];
    expect(notches).toHaveLength(2);
  });

  it('elastic yields 3 pieces (no extra strap piece)', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'elastic', strap_width: 12.7, attach_offset: 30 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(3);
  });
});
