import { describe, it, expect } from 'vitest';
import { buildPattern } from '../buildPattern.js';
import { validateInputs } from '../inputs.js';
import type { ZipPouchInputs } from '../types.js';

// EDC preset: finished_length=180, finished_width=100, finished_depth=40, SA=10
const EDC: ZipPouchInputs = {
  preset: 'edc',
  seam_allowance: 10,
  units: 'mm',
};

type AnyPiece = {
  id: string;
  paths: Array<{
    id: string;
    edges: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>;
    label?: string;
  }>;
};

function getBBox(piece: AnyPiece): { w: number; h: number } {
  const cutPath = piece.paths.find((p) => p.id.endsWith(':cut'))!;
  const allX = cutPath.edges.flatMap((e) => [e.start.x, e.end.x]);
  const allY = cutPath.edges.flatMap((e) => [e.start.y, e.end.y]);
  return {
    w: Math.max(...allX) - Math.min(...allX),
    h: Math.max(...allY) - Math.min(...allY),
  };
}

// ─── (a) Backwards-compat: 'boxed' style matches no-style call ────────────────

describe("constructionStyles — 'boxed' backwards compat", () => {
  it("'boxed' style with EDC produces same piece count as no construction_style", () => {
    const withBoxed = buildPattern({ ...EDC, construction_style: 'boxed' });
    const withoutStyle = buildPattern({ ...EDC });
    expect(withBoxed.ok).toBe(true);
    expect(withoutStyle.ok).toBe(true);
    if (withBoxed.ok && withoutStyle.ok) {
      expect(withBoxed.value.pieces.length).toBe(withoutStyle.value.pieces.length);
      expect(withBoxed.value.pieces.map((p: { id: string }) => p.id)).toEqual(
        withoutStyle.value.pieces.map((p: { id: string }) => p.id),
      );
    }
  });
});

// ─── (b) cross-bottom pieces.length === 2 ────────────────────────────────────

describe("constructionStyles — 'cross-bottom'", () => {
  it('produces 2 pieces', () => {
    const result = buildPattern({ ...EDC, construction_style: 'cross-bottom' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pieces.length).toBe(2);
    }
  });

  // (g) cross-bottom panel cut width = finished_length + finished_depth + 2×SA = 240 for EDC
  // EDC: 180 + 40 + 2×10 = 240
  it('cross panel cut bounding box width = finished_length + finished_depth + 2×SA = 240', () => {
    const result = buildPattern({ ...EDC, construction_style: 'cross-bottom' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const crossPanel = result.value.pieces.find((p: { id: string }) => p.id.includes('cross-panel'))!;
      expect(crossPanel).toBeDefined();
      const { w } = getBBox(crossPanel as AnyPiece);
      expect(w).toBeCloseTo(240, 0);
    }
  });

  // (g2) half-cross height = finished_width + finished_depth/2 + 2×SA = 140 for EDC.
  // The panel is one face plus HALF the bag bottom, with SA at the zipper edge
  // and at the centre-of-bottom seam joining it to the other panel. Halving a
  // full-cross height here would emit a panel with only half a face.
  it('cross panel bounding box height = finished_width + finished_depth/2 + 2×SA = 140', () => {
    const result = buildPattern({ ...EDC, construction_style: 'cross-bottom' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const crossPanel = result.value.pieces.find((p: { id: string }) => p.id.includes('cross-panel'))!;
      expect(crossPanel).toBeDefined();
      const { h } = getBBox(crossPanel as AnyPiece);
      expect(h).toBeCloseTo(140, 0); // 100 + 20 + 20 = 140
    }
  });

  // (g2b) Measure the assembled bag against the FOLD positions actually drawn,
  // not against the formulas. The three regions (half-bottom, face, arms) are
  // separated by folds at y=C and x=C / x=W-C; seam allowance is only consumed
  // at the outer edges. Every finished dimension must fall out exactly.
  //
  // This is the check that catches cornerCutout drifting away from the width
  // and height formulas — asserting `h === 140` alone cannot.
  it('all four finished dimensions fall out of the drawn fold positions', () => {
    const result = buildPattern({ ...EDC, construction_style: 'cross-bottom' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const crossPanel = result.value.pieces.find((p: { id: string }) => p.id.includes('cross-panel'))!;
    const p = crossPanel as AnyPiece;
    const cut = p.paths.find((pa) => pa.id.endsWith(':cut'))!;
    const xs = cut.edges.flatMap((e) => [e.start.x, e.end.x]);
    const ys = cut.edges.flatMap((e) => [e.start.y, e.end.y]);
    const W = Math.max(...xs);
    const H = Math.max(...ys);
    // The cutout size is the smallest non-zero x on the outline (the fold at x=C).
    const C = Math.min(...xs.filter((x) => x > 0));
    const sa = 10;

    // face: fold-to-fold horizontally, fold-to-(zipper seam) vertically
    expect(W - 2 * C).toBeCloseTo(180, 6);        // finished_length
    expect(H - C - sa).toBeCloseTo(100, 6);       // finished_width
    // one end = two arms, each fold-to-(side seam)
    expect(2 * (C - sa)).toBeCloseTo(40, 6);      // finished_depth
    // half the bag bottom, per panel
    expect(C - sa).toBeCloseTo(40 / 2, 6);        // finished_depth / 2
  });

  // (g3) cross panel has corner dimension annotations
  it('cross panel has labeled corner annotation paths', () => {
    const result = buildPattern({ ...EDC, construction_style: 'cross-bottom' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const crossPanel = result.value.pieces.find((p: { id: string }) => p.id.includes('cross-panel'))!;
      expect(crossPanel).toBeDefined();
      const p = crossPanel as AnyPiece;
      const labeledPaths = p.paths.filter((path) => path.label?.includes('Corner:'));
      expect(labeledPaths.length).toBeGreaterThanOrEqual(2);
    }
  });

  // (g4) Corner annotations must be ON the piece and must not retrace cut edges.
  // Retracing the cutout's inner edges draws an annotation on top of the cut
  // line; tracing the phantom corner instead puts marks in cut-away space.
  it('corner annotations lie inside the piece and duplicate no cut edge', () => {
    const result = buildPattern({ ...EDC, construction_style: 'cross-bottom' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const crossPanel = result.value.pieces.find((p: { id: string }) => p.id.includes('cross-panel'))!;
    const p = crossPanel as AnyPiece;
    const key = (e: { start: { x: number; y: number }; end: { x: number; y: number } }) => {
      const a = `${e.start.x},${e.start.y}`;
      const b = `${e.end.x},${e.end.y}`;
      return a < b ? `${a}|${b}` : `${b}|${a}`; // direction-independent
    };
    const cut = p.paths.find((pa) => pa.id.endsWith(':cut'))!;
    const cutKeys = new Set(cut.edges.map(key));
    const xs = cut.edges.flatMap((e) => [e.start.x, e.end.x]);
    const W = Math.max(...xs);
    const C = Math.min(...xs.filter((x) => x > 0));

    const cornerEdges = p.paths.filter((pa) => pa.id.includes(':corner-')).flatMap((pa) => pa.edges);
    expect(cornerEdges.length).toBeGreaterThan(0);
    for (const e of cornerEdges) {
      expect(cutKeys.has(key(e))).toBe(false);
      // Not inside either cut-away square: x<C && y<C (left) or x>W-C && y<C (right).
      for (const pt of [e.start, e.end]) {
        expect(pt.x < C && pt.y < C).toBe(false);
        expect(pt.x > W - C && pt.y < C).toBe(false);
      }
    }
  });

  // Boxing constraint: corner_cutout = depth/2 = 60 >= width = 50 → error
  it('validateInputs returns ok:false with field:finished_depth when corner_cutout >= width', () => {
    const result = validateInputs({
      construction_style: 'cross-bottom',
      preset: 'custom',
      finished_length: 100,
      finished_width: 50,
      finished_depth: 120,
      units: 'mm',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const depthError = result.errors.find((e) => e.field === 'finished_depth');
      expect(depthError).toBeDefined();
    }
  });
});

// ─── (c) gusset-strip ────────────────────────────────────────────────────────

describe("constructionStyles — 'gusset-strip'", () => {
  it('top zipper produces 4 pieces (front, back, gusset, end-tab×2)', () => {
    const result = buildPattern({ ...EDC, construction_style: 'gusset-strip' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pieces.length).toBe(4);
    }
  });

  it('front zipper produces 4 pieces (back, front-top, front-bottom, full gusset)', () => {
    const result = buildPattern({ ...EDC, construction_style: 'gusset-strip', zipper_position: 'front' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pieces.length).toBe(4);
      const ids = result.value.pieces.map((p: { id: string }) => p.id);
      expect(ids).toContain('back-panel');
      expect(ids).toContain('front-top-strip');
      expect(ids).toContain('front-bottom-strip');
      expect(ids).toContain('full-perimeter-gusset');
    }
  });

  // (f) gusset-strip gusset piece bounding box width = 2×finished_width + finished_length + 2×SA = 400 for EDC
  // EDC: 2×100 + 180 + 2×10 = 400
  it('gusset strip bounding box width = 2×finished_width + finished_length + 2×SA = 400', () => {
    const result = buildPattern({ ...EDC, construction_style: 'gusset-strip' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const gusset = result.value.pieces.find((p: { id: string }) => p.id === 'gusset-strip')!;
      expect(gusset).toBeDefined();
      const { w } = getBBox(gusset as AnyPiece);
      expect(w).toBeCloseTo(400, 0);
    }
  });

  // The U-strip runs [SA][width][length][width][SA], so its corners — where the
  // band turns from bag side onto bag bottom — sit at SA+width and SA+width+length.
  it('gusset strip notches sit at the two bottom corners (110 and 290)', () => {
    const result = buildPattern({ ...EDC, construction_style: 'gusset-strip' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const gusset = result.value.pieces.find((p: { id: string }) => p.id === 'gusset-strip')!;
      const p = gusset as AnyPiece;
      const notchPath = p.paths.find((pa) => pa.id.endsWith(':notch'))!;
      expect(notchPath).toBeDefined();
      const xs = [...new Set(notchPath.edges.map((e) => e.start.x))].sort((a, b) => a - b);
      expect(xs).toEqual([110, 290]); // 10+100 and 10+100+180
    }
  });

  // Splitting the front adds a zipper seam, so each strip needs SA on both of
  // its own long edges. The pair must finish at the same height as the back panel.
  it('front-zipper strips finish at the same height as the back panel', () => {
    const result = buildPattern({ ...EDC, construction_style: 'gusset-strip', zipper_position: 'front' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const find = (id: string) => result.value.pieces.find((p: { id: string }) => p.id === id)!;
      const sa = 10;
      const back = getBBox(find('back-panel') as AnyPiece);
      const top = getBBox(find('front-top-strip') as AnyPiece);
      const bottom = getBBox(find('front-bottom-strip') as AnyPiece);

      // Back: SA consumed at top and bottom edges.
      const backFinished = back.h - 2 * sa;
      // Front: each strip loses SA at its gusset edge and at the zipper edge.
      const frontFinished = (top.h - 2 * sa) + (bottom.h - 2 * sa);
      expect(frontFinished).toBeCloseTo(backFinished, 6);
      expect(frontFinished).toBeCloseTo(100, 6); // finished_width
    }
  });

  it('full-perimeter gusset carries stitch lines and corner notches', () => {
    const result = buildPattern({ ...EDC, construction_style: 'gusset-strip', zipper_position: 'front' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const gusset = result.value.pieces.find((p: { id: string }) => p.id === 'full-perimeter-gusset')!;
      const p = gusset as AnyPiece;
      expect(p.paths.find((pa) => pa.id.endsWith(':stitch'))!.edges.length).toBeGreaterThan(0);
      expect(p.paths.find((pa) => pa.id.endsWith(':notch'))!.edges.length).toBeGreaterThan(0);
    }
  });
});

// ─── (d) multi-panel ─────────────────────────────────────────────────────────

describe("constructionStyles — 'multi-panel'", () => {
  it('produces 5 pieces (front, back, bottom, end-panel×2, end-tab×2)', () => {
    const result = buildPattern({ ...EDC, construction_style: 'multi-panel' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pieces.length).toBe(5);
    }
  });

  // (e) multi-panel end panel bounding box height = finished_depth + 2×SA = 60 for EDC
  // EDC: 40 + 2×10 = 60
  it('end panel bounding box height = finished_depth + 2×SA = 60', () => {
    const result = buildPattern({ ...EDC, construction_style: 'multi-panel' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const endPanel = result.value.pieces.find((p: { id: string }) => p.id.includes('end-panel'))!;
      expect(endPanel).toBeDefined();
      const { h } = getBBox(endPanel as AnyPiece);
      expect(h).toBeCloseTo(60, 0);
    }
  });
});

// ─── Steps must describe the pieces actually drawn ───────────────────────────
// CLAUDE.md: step instructions must reflect what is actually drawn. Before this
// was enforced, every style emitted the boxed 2-panel steps ("Cut 2 panels at
// 200 × 130 mm") regardless of the five-piece pattern beside them.

describe('constructionStyles — steps match the drawn pieces', () => {
  const STYLES = ['boxed', 'cross-bottom', 'gusset-strip', 'multi-panel'] as const;

  it.each(STYLES)('%s: every refsPieces id exists in the pattern', (construction_style) => {
    const result = buildPattern({ ...EDC, construction_style });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pieceIds = new Set(result.value.pieces.map((p: { id: string }) => p.id));
    for (const step of result.value.steps) {
      for (const ref of step.refsPieces) {
        expect(pieceIds.has(ref)).toBe(true);
      }
    }
  });

  it.each(STYLES)('%s: the cut step names each distinct piece kind', (construction_style) => {
    const result = buildPattern({ ...EDC, construction_style });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cutStep = result.value.steps[0];
    expect(cutStep.title).toMatch(/cut/i);
    // Piece count named in the cut step should cover every piece in the pattern.
    expect(cutStep.refsPieces.length).toBe(result.value.pieces.length);
  });

  // The BOM row and the instruction text must quote the same zipper length.
  // They drifted apart once when each computed its own.
  it.each(STYLES)('%s: BOM zipper length matches the length named in the steps', (construction_style) => {
    const result = buildPattern({ ...EDC, construction_style });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const bomRow = result.value.bom.find((b) => b.id === 'zipper')!;
    expect(bomRow).toBeDefined();
    const allBodies = result.value.steps.map((s) => s.body).join(' ');
    const quoted = [...allBodies.matchAll(/zipper \((\d+) mm\)/g)].map((m) => Number(m[1]));
    expect(quoted.length).toBeGreaterThan(0);
    for (const q of quoted) expect(q).toBe(bomRow.quantity);
  });

  it('front-zipper gusset steps reference the split front strips', () => {
    const result = buildPattern({ ...EDC, construction_style: 'gusset-strip', zipper_position: 'front' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const allRefs = result.value.steps.flatMap((s) => s.refsPieces);
      expect(allRefs).toContain('front-top-strip');
      expect(allRefs).toContain('front-bottom-strip');
      expect(allRefs).not.toContain('front-panel');
    }
  });
});
