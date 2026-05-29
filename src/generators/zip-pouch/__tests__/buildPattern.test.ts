import { describe, it, expect } from 'vitest';
import buildPattern from '../buildPattern.js';
import { patternToSvg } from '../../../lib/pattern-engine/exports/svg.js';
import type { Pattern } from '../../../lib/pattern-engine/graph/Pattern.js';
import type { ZipPouchInputs } from '../types.js';

// ─── Canonical test inputs ───────────────────────────────────────────────────

const CANONICAL: ZipPouchInputs = {
  finished_length: 180,
  finished_width: 100,
  finished_depth: 40,
  seam_allowance: 10,
  units: 'mm',
  zip_gauge: '#3',
  pull_loops: true,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCanonicalResult() {
  const result = buildPattern(CANONICAL);
  if (!result.ok) throw new Error('Expected ok result: ' + JSON.stringify(result));
  return result.value;
}

// ─── Structural tests ────────────────────────────────────────────────────────

describe('buildPattern — structural', () => {
  it('returns ok: true for valid inputs', () => {
    const result = buildPattern(CANONICAL);
    expect(result.ok).toBe(true);
  });

  it('returns ok: false for invalid inputs', () => {
    const result = buildPattern({ finished_length: -1, finished_width: 100, finished_depth: 10, seam_allowance: 10 });
    expect(result.ok).toBe(false);
  });

  it('returns exactly 2 pieces', () => {
    const { pieces } = getCanonicalResult();
    expect(pieces.length).toBe(2);
  });

  it('pieces are named Front Panel and Back Panel', () => {
    const { pieces } = getCanonicalResult();
    const names = pieces.map((p) => p.name);
    expect(names).toContain('Front Panel');
    expect(names).toContain('Back Panel');
  });

  it('piece ids are front and back', () => {
    const { pieces } = getCanonicalResult();
    const ids = pieces.map((p) => p.id);
    expect(ids).toContain('front');
    expect(ids).toContain('back');
  });

  it('returns exactly 5 steps', () => {
    const { steps } = getCanonicalResult();
    expect(steps.length).toBe(5);
  });

  it('returns a non-empty bom', () => {
    const { bom } = getCanonicalResult();
    expect(bom.length).toBeGreaterThan(0);
  });
});

// ─── Panel dimension tests ───────────────────────────────────────────────────

describe('buildPattern — panel dimensions', () => {
  it('cut_width = finished_length + 2×seam_allowance = 200', () => {
    // 180 + 2×10 = 200
    const { pieces } = getCanonicalResult();
    const front = pieces.find((p) => p.id === 'front')!;
    // Find the cut path boundary box
    const cutPath = front.paths.find((p) => p.id === 'front:cut')!;
    const allX = cutPath.edges.flatMap((e) => [e.start.x, e.end.x]);
    const width = Math.max(...allX) - Math.min(...allX);
    expect(width).toBeCloseTo(200, 0);
  });

  it('cut_height = finished_width + depth/2 + seam_allowance = 130', () => {
    // 100 + 40/2 + 10 = 130
    const { pieces } = getCanonicalResult();
    const front = pieces.find((p) => p.id === 'front')!;
    const cutPath = front.paths.find((p) => p.id === 'front:cut')!;
    const allY = cutPath.edges.flatMap((e) => [e.start.y, e.end.y]);
    const height = Math.max(...allY) - Math.min(...allY);
    expect(height).toBeCloseTo(130, 0);
  });

  it('bounding box of front piece is 200×130 (±1 mm)', () => {
    const { pieces } = getCanonicalResult();
    const front = pieces.find((p) => p.id === 'front')!;
    const cutPath = front.paths.find((p) => p.id === 'front:cut')!;
    const allX = cutPath.edges.flatMap((e) => [e.start.x, e.end.x]);
    const allY = cutPath.edges.flatMap((e) => [e.start.y, e.end.y]);
    const w = Math.max(...allX) - Math.min(...allX);
    const h = Math.max(...allY) - Math.min(...allY);
    expect(w).toBeCloseTo(200, 0);
    expect(h).toBeCloseTo(130, 0);
  });

  it('bounding box of back piece matches front piece', () => {
    const { pieces } = getCanonicalResult();
    const front = pieces.find((p) => p.id === 'front')!;
    const back = pieces.find((p) => p.id === 'back')!;
    const dimOf = (piece: (typeof pieces)[0]) => {
      const cutPath = piece.paths.find((p) => p.id.endsWith(':cut'))!;
      const allX = cutPath.edges.flatMap((e) => [e.start.x, e.end.x]);
      const allY = cutPath.edges.flatMap((e) => [e.start.y, e.end.y]);
      return {
        w: Math.max(...allX) - Math.min(...allX),
        h: Math.max(...allY) - Math.min(...allY),
      };
    };
    expect(dimOf(front)).toEqual(dimOf(back));
  });
});

// ─── Edge role / path role tests ─────────────────────────────────────────────

describe('buildPattern — path roles', () => {
  it('each piece has at least one fold-role path', () => {
    const { pieces } = getCanonicalResult();
    for (const piece of pieces) {
      const hasFold = piece.paths.some((p) => p.edges.some((e) => e.role === 'fold'));
      expect(hasFold).toBe(true);
    }
  });

  it('each piece has at least one notch-role path', () => {
    const { pieces } = getCanonicalResult();
    for (const piece of pieces) {
      const hasNotch = piece.paths.some((p) => p.edges.some((e) => e.role === 'notch'));
      expect(hasNotch).toBe(true);
    }
  });

  it('each piece has a cut-role path', () => {
    const { pieces } = getCanonicalResult();
    for (const piece of pieces) {
      const hasCut = piece.paths.some((p) => p.edges.some((e) => e.role === 'cut'));
      expect(hasCut).toBe(true);
    }
  });

  it('each piece has a stitch-role path', () => {
    const { pieces } = getCanonicalResult();
    for (const piece of pieces) {
      const hasStitch = piece.paths.some((p) => p.edges.some((e) => e.role === 'stitch'));
      expect(hasStitch).toBe(true);
    }
  });
});

// ─── Boxing stitch line tests ─────────────────────────────────────────────────

describe('buildPattern — boxing stitch lines', () => {
  it('stitchLineOffsetFromCorner = finished_depth / 2 = 20', () => {
    // bottomWidth=40 → offset = 40/2 = 20
    const { pieces } = getCanonicalResult();
    const front = pieces.find((p) => p.id === 'front')!;
    // The fold-left path starts at x = stitchOffset
    const foldLeft = front.paths.find((p) => p.id === 'front:fold-left')!;
    expect(foldLeft.edges[0].start.x).toBeCloseTo(20, 0);
  });

  it('fold-right path is at cutWidth - stitchOffset = 180', () => {
    // cutWidth=200, offset=20 → right fold at x=180
    const { pieces } = getCanonicalResult();
    const front = pieces.find((p) => p.id === 'front')!;
    const foldRight = front.paths.find((p) => p.id === 'front:fold-right')!;
    expect(foldRight.edges[0].start.x).toBeCloseTo(180, 0);
  });
});

// ─── Step sequence tests ─────────────────────────────────────────────────────

describe('buildPattern — step sequence', () => {
  it('step 1 title matches /cut/i', () => {
    const { steps } = getCanonicalResult();
    expect(steps[0].title).toMatch(/cut/i);
  });

  it('step 2 title matches /zipper/i', () => {
    const { steps } = getCanonicalResult();
    expect(steps[1].title).toMatch(/zipper/i);
  });

  it('step 3 title matches /sew.*seam/i', () => {
    const { steps } = getCanonicalResult();
    expect(steps[2].title).toMatch(/sew.*seam/i);
  });

  it('step 4 title matches /box/i', () => {
    const { steps } = getCanonicalResult();
    expect(steps[3].title).toMatch(/box/i);
  });

  it('step 5 title matches /finish|grosgrain/i', () => {
    const { steps } = getCanonicalResult();
    expect(steps[4].title).toMatch(/finish|grosgrain/i);
  });

  it('each step has an id, title, body, dependsOn, and refsPieces', () => {
    const { steps } = getCanonicalResult();
    for (const step of steps) {
      expect(step.id).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.body).toBeTruthy();
      expect(Array.isArray(step.dependsOn)).toBe(true);
      expect(Array.isArray(step.refsPieces)).toBe(true);
    }
  });
});

// ─── SVG export test ─────────────────────────────────────────────────────────

describe('buildPattern — SVG export', () => {
  it('patternToSvg does not throw and includes <svg', () => {
    const { pieces } = getCanonicalResult();
    const pattern: Pattern = { id: 'zip-pouch', name: 'Zip Pouch', pieces };
    const svg = patternToSvg(pattern);
    expect(svg).toContain('<svg');
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('buildPattern — edge cases', () => {
  it('works with zero seam allowance', () => {
    const result = buildPattern({ ...CANONICAL, seam_allowance: 0 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pieces.length).toBe(2);
    }
  });

  it('works with pull_loops: false (no grosgrain in BOM)', () => {
    const result = buildPattern({ ...CANONICAL, pull_loops: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const hasGrosgrain = result.value.bom.some((r) => r.id === 'grosgrain');
      expect(hasGrosgrain).toBe(false);
    }
  });

  it('works with #5 zip gauge', () => {
    const result = buildPattern({ ...CANONICAL, zip_gauge: '#5' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const zipRow = result.value.bom.find((r) => r.id === 'zipper');
      expect(zipRow?.description).toContain('#5');
    }
  });

  it('returns errors for boxing constraint violation', () => {
    // depth/2 >= width
    const result = buildPattern({ ...CANONICAL, finished_depth: 250, finished_width: 100 });
    expect(result.ok).toBe(false);
  });
});
