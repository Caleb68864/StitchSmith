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

describe('buildPattern — card slot stack piece', () => {
  it('lining + card_slots count=3 adds a card-slot-stack piece (total 5 pieces)', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, card_slots: { count: 3 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(5);
    const ids = result.value.pieces.map(p => p.id);
    expect(ids).toContain('card-slot-stack');
  });

  it('card-slot-stack for count=3 has exactly 3 cut-role rectangular paths', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, card_slots: { count: 3 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stack = result.value.pieces.find(p => p.id === 'card-slot-stack')!;
    const cutRects = stack.paths.filter(p => p.closed && p.edges.every(e => e.role === 'cut'));
    expect(cutRects).toHaveLength(3);
  });

  it('card-slot-stack for count=3 has exactly 2 fold-role topstitch paths', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, card_slots: { count: 3 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stack = result.value.pieces.find(p => p.id === 'card-slot-stack')!;
    const topstitchLines = stack.paths.filter(p => !p.closed && p.edges.some(e => e.role === 'fold'));
    expect(topstitchLines).toHaveLength(2);
  });

  it('card-slot-stack for count=1 has 1 cut-role rect and 0 fold topstitch lines', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, card_slots: { count: 1 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stack = result.value.pieces.find(p => p.id === 'card-slot-stack')!;
    const cutRects = stack.paths.filter(p => p.closed && p.edges.every(e => e.role === 'cut'));
    const topstitchLines = stack.paths.filter(p => !p.closed && p.edges.some(e => e.role === 'fold'));
    expect(cutRects).toHaveLength(1);
    expect(topstitchLines).toHaveLength(0);
  });

  it('card-slot-stack for count=5 has 5 cut-role rects and 4 fold topstitch lines', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, card_slots: { count: 5 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stack = result.value.pieces.find(p => p.id === 'card-slot-stack')!;
    const cutRects = stack.paths.filter(p => p.closed && p.edges.every(e => e.role === 'cut'));
    const topstitchLines = stack.paths.filter(p => !p.closed && p.edges.some(e => e.role === 'fold'));
    expect(cutRects).toHaveLength(5);
    expect(topstitchLines).toHaveLength(4);
  });

  it('card-slot-stack slot height defaults to 57 mm per slot', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, card_slots: { count: 2 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stack = result.value.pieces.find(p => p.id === 'card-slot-stack')!;
    // First slot rect should span y=0 to y=57
    const slot0 = stack.paths.find(p => p.id === 'card-slot-stack-slot-0')!;
    const ys = slot0.edges.flatMap(e => [e.start.y, e.end.y]);
    expect(Math.min(...ys)).toBeCloseTo(0, 5);
    expect(Math.max(...ys)).toBeCloseTo(57, 5);
  });
});

describe('buildPattern — tactical pieces', () => {
  it('tactical enabled → includes velcro-panel piece', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, tactical: { enabled: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.pieces.map(p => p.id);
    expect(ids).toContain('velcro-panel');
  });

  it('tactical with retention_strap=true → includes retention-strap piece', () => {
    const result = buildPattern({
      ...BASE,
      lining: { enabled: true },
      tactical: { enabled: true, retention_strap: true },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.pieces.map(p => p.id);
    expect(ids).toContain('retention-strap');
  });

  it('tactical with spare_mag_pocket=true → includes spare-mag-pocket piece', () => {
    const result = buildPattern({
      ...BASE,
      lining: { enabled: true },
      tactical: { enabled: true, spare_mag_pocket: true },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.pieces.map(p => p.id);
    expect(ids).toContain('spare-mag-pocket');
  });

  it('tactical with retention_strap and spare_mag_pocket → all 3 tactical pieces present', () => {
    const result = buildPattern({
      ...BASE,
      lining: { enabled: true },
      tactical: { enabled: true, retention_strap: true, spare_mag_pocket: true },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.pieces.map(p => p.id);
    expect(ids).toContain('velcro-panel');
    expect(ids).toContain('retention-strap');
    expect(ids).toContain('spare-mag-pocket');
  });

  it('tactical enabled → body + flap×2 + lining + velcro-panel + retention-strap + spare-mag-pocket = 7 pieces', () => {
    const result = buildPattern({
      ...BASE,
      lining: { enabled: true },
      tactical: { enabled: true, retention_strap: true, spare_mag_pocket: true },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(7);
  });

  it('tactical enabled without optional features → only velcro-panel added (no retention-strap or spare-mag-pocket)', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, tactical: { enabled: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.pieces.map(p => p.id);
    expect(ids).toContain('velcro-panel');
    expect(ids).not.toContain('retention-strap');
    expect(ids).not.toContain('spare-mag-pocket');
  });

  it('velcro-panel dimensions match resolved tactical defaults (101.6 + 2*SA × 152.4 + 2*SA)', () => {
    const SA = 9.5;
    const result = buildPattern({ ...BASE, lining: { enabled: true }, tactical: { enabled: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'velcro-panel')!;
    const outline = panel.paths.find(p => p.id === 'velcro-panel-outline')!;
    const maxX = Math.max(...outline.edges.flatMap(e => [e.start.x, e.end.x]));
    const maxY = Math.max(...outline.edges.flatMap(e => [e.start.y, e.end.y]));
    expect(maxX).toBeCloseTo(101.6 + 2 * SA, 5);
    expect(maxY).toBeCloseTo(152.4 + 2 * SA, 5);
  });
});

describe('buildPattern — other lining features', () => {
  it('bookmark_ribbon with lining → bookmark-ribbon piece added', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, bookmark_ribbon: { count: 2 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.pieces.map(p => p.id);
    expect(ids).toContain('bookmark-ribbon');
  });

  it('bookmark_ribbon quantity matches count', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, bookmark_ribbon: { count: 3 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ribbon = result.value.pieces.find(p => p.id === 'bookmark-ribbon')!;
    expect(ribbon.quantity).toBe(3);
  });

  it('internal_zip_pocket with lining → internal-zip-pocket piece added', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, internal_zip_pocket: { width: 100, height: 80 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.pieces.map(p => p.id);
    expect(ids).toContain('internal-zip-pocket');
  });

  it('internal-zip-pocket has a notch annotation for zipper install', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, internal_zip_pocket: { width: 100, height: 80 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const piece = result.value.pieces.find(p => p.id === 'internal-zip-pocket')!;
    const notches = (piece.annotations ?? []).filter(a => a.kind === 'notch');
    expect(notches.length).toBeGreaterThanOrEqual(1);
  });

  it('mesh_pocket with lining → mesh-pocket piece added', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, mesh_pocket: { width: 100, height: 80 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.pieces.map(p => p.id);
    expect(ids).toContain('mesh-pocket');
  });

  it('mesh_pocket with elastic_top → has fold-role elastic-top path', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, mesh_pocket: { width: 100, height: 80, elastic_top: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const piece = result.value.pieces.find(p => p.id === 'mesh-pocket')!;
    const elasticFold = piece.paths.find(p => p.id === 'mesh-pocket-fold-elastic-top');
    expect(elasticFold).toBeDefined();
    expect(elasticFold!.edges[0].role).toBe('fold');
  });

  it('mesh_pocket without elastic_top → no elastic-top fold path', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, mesh_pocket: { width: 100, height: 80 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const piece = result.value.pieces.find(p => p.id === 'mesh-pocket')!;
    const elasticFold = piece.paths.find(p => p.id === 'mesh-pocket-fold-elastic-top');
    expect(elasticFold).toBeUndefined();
  });
});

describe('buildPattern — fully loaded configuration', () => {
  const FULLY_LOADED: BookCoverInputs = {
    ...BASE,
    lining: { enabled: true },
    card_slots: { count: 3 },
    bookmark_ribbon: { count: 2 },
    internal_zip_pocket: { width: 100, height: 80 },
    mesh_pocket: { width: 120, height: 90 },
    tactical: { enabled: true, retention_strap: true, spare_mag_pocket: true },
  };
  // Piece count:
  //   body(1) + flap-l(1) + flap-r(1) = 3
  //   lining(1) = 4
  //   card-slot-stack(1) = 5
  //   bookmark-ribbon(1) = 6
  //   internal-zip-pocket(1) = 7
  //   mesh-pocket(1) = 8
  //   velcro-panel(1) + retention-strap(1) + spare-mag-pocket(1) = 11

  it('fully-loaded configuration emits ≤ 13 pieces', () => {
    const result = buildPattern(FULLY_LOADED);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces.length).toBeLessThanOrEqual(13);
  });

  it('fully-loaded configuration emits 11 pieces', () => {
    const result = buildPattern(FULLY_LOADED);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces).toHaveLength(11);
  });

  it('fully-loaded configuration: patternToSvg does not throw', () => {
    const result = buildPattern(FULLY_LOADED);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pattern = { id: 'book-cover-full', name: 'Book Cover (Fully Loaded)', pieces: result.value.pieces };
    expect(() => patternToSvg(pattern)).not.toThrow();
    expect(patternToSvg(pattern)).toContain('<svg');
  });
});

// ─── Baked-in SA convention (CLAUDE.md Convention B) ─────────────────────────
// Book Cover bakes the seam allowance into its cut dimensions (cutWidth =
// X + 2*SA) and labels pieces with those cut dims. Such pieces MUST declare an
// explicit 0 for every cut edge. `seamAllowances: {}` is NOT equivalent:
// computeSeamAllowancePolygon reads `piece.seamAllowances ?? {}`, so an empty
// object is still "present", svg.ts's `piece.seamAllowances || defaultSa > 0`
// guard passes, and flattenPath falls back to defaultSeamAllowance for every
// edge — drawing a second SA line outside a cut line that already includes it.
// PatternPreview and both export paths pass defaultSeamAllowance unconditionally.

describe('buildPattern — baked-in SA pieces are not re-offset', () => {
  const FULL: BookCoverInputs = {
    ...BASE,
    lining: { enabled: true },
    tactical: { enabled: true, retention_strap: true, spare_mag_pocket: true },
  };

  // Every one of these computes its cut size as `finished + 2 * SA`.
  const BAKED_IN = ['velcro-panel', 'retention-strap', 'spare-mag-pocket'];

  it.each(BAKED_IN)('%s declares explicit zero SA on every cut edge', (pieceId) => {
    const result = buildPattern(FULL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const piece = result.value.pieces.find(p => p.id === pieceId);
    expect(piece).toBeDefined();
    if (!piece) return;

    const cutEdgeIds = piece.paths
      .filter(path => path.closed)
      .flatMap(path => path.edges.filter(e => e.role === 'cut').map(e => e.id));
    expect(cutEdgeIds.length).toBeGreaterThan(0);
    for (const id of cutEdgeIds) {
      expect(piece.seamAllowances?.[id]).toBe(0);
    }
  });

  it('a bookmark ribbon is cut from ribbon stock and takes no seam allowance', () => {
    const result = buildPattern({ ...BASE, lining: { enabled: true }, bookmark_ribbon: { count: 1 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const piece = result.value.pieces.find(p => p.id === 'bookmark-ribbon');
    expect(piece).toBeDefined();
    if (!piece) return;
    const cutEdgeIds = piece.paths
      .filter(path => path.closed)
      .flatMap(path => path.edges.filter(e => e.role === 'cut').map(e => e.id));
    for (const id of cutEdgeIds) {
      expect(piece.seamAllowances?.[id]).toBe(0);
    }
  });
});
