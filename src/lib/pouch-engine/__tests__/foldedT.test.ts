// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPouch } from '../index.js';
import type { PouchSpec } from '../construction/ConstructionStrategy.js';

const baseSpec: PouchSpec = {
  object: { width: 64, depth: 25, height: 191 },
  fit: { width_ease: 6, depth_ease: 6, height_ease: 0 },
  construction: 'folded_t',
  seamAllowance: 9.5,
  units: 'mm',
};

describe('folded-T strategy — bounding box', () => {
  it('returns a Pattern with at least one body piece', () => {
    const { pattern } = buildPouch(baseSpec);
    expect(pattern.pieces.length).toBeGreaterThanOrEqual(1);
  });

  it('body piece bounding box matches folded-T formula within 0.5 mm', () => {
    const { pattern } = buildPouch(baseSpec);
    const body = pattern.pieces[0];

    // Formula:
    //   internal_width  = 64 + 6 = 70
    //   internal_depth  = 25 + 6 = 31
    //   internal_height = 191 * 1.0 = 191
    //   cut_width  = (70 + 2*31) + 2*9.5  = 132 + 19 = 151
    //   cut_height = (191 + 31 + 191) + 2*9.5 = 413 + 19 = 432
    const expectedWidth = 151;
    const expectedHeight = 432;

    // Collect all points from all edges
    const xs: number[] = [];
    const ys: number[] = [];
    for (const path of body.paths) {
      for (const edge of path.edges) {
        xs.push(edge.start.x, edge.end.x);
        ys.push(edge.start.y, edge.end.y);
      }
    }
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const actualWidth = maxX - minX;
    const actualHeight = maxY - minY;

    expect(Math.abs(actualWidth - expectedWidth)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(actualHeight - expectedHeight)).toBeLessThanOrEqual(0.5);
  });

  it('body piece has at least four fold edges', () => {
    const { pattern } = buildPouch(baseSpec);
    const body = pattern.pieces[0];
    const foldEdges = body.paths
      .flatMap((p) => p.edges)
      .filter((e) => e.role === 'fold');
    expect(foldEdges.length).toBeGreaterThanOrEqual(4);
  });

  it('body piece has at least one cut edge', () => {
    const { pattern } = buildPouch(baseSpec);
    const body = pattern.pieces[0];
    const cutEdges = body.paths
      .flatMap((p) => p.edges)
      .filter((e) => e.role === 'cut');
    expect(cutEdges.length).toBeGreaterThanOrEqual(1);
  });
});

describe('folded-T strategy — flap', () => {
  it('including flap spec adds a flap region (taller bounding box)', () => {
    const specWithFlap: PouchSpec = {
      ...baseSpec,
      flap: { style: 'square', length_mm: 76 },
    };
    const { pattern: withFlap } = buildPouch(specWithFlap);
    const { pattern: withoutFlap } = buildPouch(baseSpec);

    const heightOf = (p: typeof withFlap) => {
      const body = p.pieces[0];
      const ys: number[] = [];
      for (const path of body.paths) {
        for (const edge of path.edges) {
          ys.push(edge.start.y, edge.end.y);
        }
      }
      return Math.max(...ys) - Math.min(...ys);
    };

    expect(heightOf(withFlap)).toBeGreaterThan(heightOf(withoutFlap));
  });

  it('omitting flap spec produces no extra height', () => {
    const { pattern } = buildPouch(baseSpec);
    const body = pattern.pieces[0];
    const ys: number[] = [];
    for (const path of body.paths) {
      for (const edge of path.edges) {
        ys.push(edge.start.y, edge.end.y);
      }
    }
    const actualHeight = Math.max(...ys) - Math.min(...ys);
    // Without flap: 432 mm
    expect(Math.abs(actualHeight - 432)).toBeLessThanOrEqual(0.5);
  });
});

describe('folded-T strategy — aspect-ratio warnings (M11)', () => {
  it('emits Folded-T center seam warning when depth > width/2', () => {
    const spec: PouchSpec = {
      ...baseSpec,
      object: { width: 50, depth: 30, height: 100 },
      fit: { width_ease: 0, depth_ease: 0, height_ease: 0 },
    };
    const { warnings } = buildPouch(spec);
    // internal_depth = 30, internal_width/2 = 25 → depth > width/2
    expect(warnings.some((w) => w.includes('Folded-T center seam may not lie flat'))).toBe(true);
  });

  it('does NOT emit Folded-T warning when depth <= width/2', () => {
    const spec: PouchSpec = {
      ...baseSpec,
      object: { width: 100, depth: 30, height: 100 },
      fit: { width_ease: 0, depth_ease: 0, height_ease: 0 },
    };
    const { warnings } = buildPouch(spec);
    // internal_depth = 30, internal_width/2 = 50 → depth <= width/2
    expect(warnings.every((w) => !w.includes('Folded-T center seam'))).toBe(true);
  });
});
