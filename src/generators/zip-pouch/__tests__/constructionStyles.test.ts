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

// ─── (c) gusset-strip pieces.length === 3 ────────────────────────────────────

describe("constructionStyles — 'gusset-strip'", () => {
  it('produces 3 pieces', () => {
    const result = buildPattern({ ...EDC, construction_style: 'gusset-strip' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pieces.length).toBe(3);
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
});

// ─── (d) multi-panel pieces.length === 4 (interim; → 5 in SS-05 after end tabs) ─

describe("constructionStyles — 'multi-panel'", () => {
  it('produces 4 pieces', () => {
    const result = buildPattern({ ...EDC, construction_style: 'multi-panel' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pieces.length).toBe(4);
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
