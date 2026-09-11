// @vitest-environment node
/**
 * Pleated-card strategy — geometry pinned to the SOE 4-pack single rifle mag
 * card as measured on camera (vault mag-pouches/mag-pouch-4pack-single-dimensions.md):
 *
 *   back  14" × 7.5" cut  → 12" × 5.5" finished (1" hems)
 *   face  20.5" × 11" cut → 19.5" hemmed, folded to 5.5" (0.5" end hems)
 *   4 cells × 3" span, 4.875" face per cell, pucker ≈ 0.94"/side
 */
import { describe, it, expect } from 'vitest';
import { buildPouch } from '../index.js';
import { pleatedCardGeometry, pleatedCard, MIN_PUCKER_PER_SIDE_MM } from '../construction/pleatedCard.js';
import type { PouchSpec, PleatedCardParams } from '../construction/ConstructionStrategy.js';
import { bboxFromPiece } from '../../pattern-engine/geometry/bbox.js';
import { renderHtml } from '../../pattern-engine/instructions/compile.js';

const IN = 25.4;

const fourPack: PleatedCardParams = {
  cellCount: 4,
  cellSpan: 3 * IN,
  facePerCell: 4.875 * IN,
  cardHeight: 5.5 * IN,
  backHem: 1 * IN,
  faceEndHem: 0.5 * IN,
  faceBottomHem: 0,
  flapLength: 0,
  bottomStyle: 'cradle',
};

function spec(card: PleatedCardParams): PouchSpec {
  return {
    object: { width: 2.55 * IN, depth: 1 * IN, height: 7.5 * IN },
    construction: 'pleated_card',
    seamAllowance: 0,
    units: 'mm',
    card,
  };
}

describe('pleatedCardGeometry — SOE 4-pack card', () => {
  const g = pleatedCardGeometry(fourPack);

  it('back cuts 14" × 7.5" for a 12" × 5.5" finished panel', () => {
    expect(g.backCutW).toBeCloseTo(14 * IN, 6);
    expect(g.backCutH).toBeCloseTo(7.5 * IN, 6);
    expect(g.backFinishedW).toBeCloseTo(12 * IN, 6);
  });

  it('face cuts 20.5" × 11" and hems to 19.5" (500 mm)', () => {
    expect(g.faceCutW).toBeCloseTo(20.5 * IN, 6);
    expect(g.faceCutH).toBeCloseTo(11 * IN, 6);
    expect(g.faceHemmedW).toBeCloseTo(495.3, 1); // 19.5" = 495.3 mm (SOE rounds to 500)
  });

  it('pucker per side is (4.875 − 3) / 2 ≈ 0.94"', () => {
    expect(g.puckerPerSide / IN).toBeCloseTo(0.9375, 6);
    expect(g.puckerPerSide).toBeGreaterThan(MIN_PUCKER_PER_SIDE_MM);
  });

  it('AK variant adds 0.75" to the face height only', () => {
    const ak = pleatedCardGeometry({ ...fourPack, faceBottomHem: 0.75 * IN });
    expect(ak.faceCutH).toBeCloseTo(11.75 * IN, 6);
    expect(ak.backCutH).toBeCloseTo(g.backCutH, 6);
  });

  it('a lid extends the back and records the lid fold position', () => {
    const lid = pleatedCardGeometry({ ...fourPack, flapLength: 5 * IN });
    expect(lid.backCutH).toBeCloseTo(12.5 * IN, 6);
    expect(lid.lidFoldY).toBeCloseTo(6 * IN, 6); // hem + lid
    expect(g.lidFoldY).toBeNull();
  });
});

describe('pleated_card strategy — pieces', () => {
  const { pattern, steps, warnings } = buildPouch(spec(fourPack));
  const back = pattern.pieces.find((p) => p.id === 'back')!;
  const face = pattern.pieces.find((p) => p.id === 'face')!;

  it('emits a back and a face piece', () => {
    expect(pattern.pieces.map((p) => p.id)).toEqual(['back', 'face']);
  });

  it('piece bounding boxes match the cut list', () => {
    const b = bboxFromPiece(back);
    const f = bboxFromPiece(face);
    expect(b.width).toBeCloseTo(14 * IN, 5);
    expect(b.height).toBeCloseTo(7.5 * IN, 5);
    expect(f.width).toBeCloseTo(20.5 * IN, 5);
    expect(f.height).toBeCloseTo(11 * IN, 5);
  });

  it('every cut edge carries an explicit 0 seam allowance (baked-in convention)', () => {
    for (const piece of [back, face]) {
      const outline = piece.paths.find((p) => p.closed)!;
      expect(outline.edges).toHaveLength(4);
      for (const e of outline.edges) {
        expect(e.role).toBe('cut');
        expect(piece.seamAllowances?.[e.id]).toBe(0);
      }
      expect(Object.keys(piece.seamAllowances ?? {})).toHaveLength(4);
    }
  });

  it('back has four hem folds and three cell-division stitch lines', () => {
    const folds = back.paths.filter((p) => p.edges[0].role === 'fold');
    const stitches = back.paths.filter((p) => p.edges[0].role === 'stitch');
    expect(folds).toHaveLength(4);
    expect(stitches).toHaveLength(3);
    // Divisions at 3, 6, 9" inside the hem → x = 4, 7, 10" on the cut piece.
    const xs = stitches.map((p) => p.edges[0].start.x / IN).sort((a, b) => a - b);
    expect(xs).toEqual([4, 7, 10]);
  });

  it('face has a mouth fold at half height and divisions every 4.875" from the hemmed end', () => {
    const mouth = face.paths.find((p) => p.id === 'mouth-fold')!;
    expect(mouth.edges[0].start.y).toBeCloseTo(5.5 * IN, 6);
    const xs = face.paths
      .filter((p) => p.edges[0].role === 'stitch')
      .map((p) => p.edges[0].start.x / IN)
      .sort((a, b) => a - b);
    expect(xs.map((x) => Math.round(x * 1000) / 1000)).toEqual([5.375, 10.25, 15.125]);
  });

  it('the AK face hem shifts the mouth fold down by the hem', () => {
    const ak = buildPouch(spec({ ...fourPack, faceBottomHem: 0.75 * IN }));
    const akFace = ak.pattern.pieces.find((p) => p.id === 'face')!;
    expect(akFace.paths.find((p) => p.id === 'mouth-fold')!.edges[0].start.y).toBeCloseTo(6.25 * IN, 6);
    expect(akFace.paths.find((p) => p.id === 'bottom-hem')).toBeDefined();
  });

  it('emits steps in build order with no dangling dependencies and no cycles', () => {
    const ids = new Set(steps.map((s) => s.id));
    for (const s of steps) for (const d of s.dependsOn) expect(ids.has(d)).toBe(true);
    expect(renderHtml(steps).ok).toBe(true);
    const order = steps.map((s) => s.id);
    expect(order.indexOf('pc-interior-ready')).toBeLessThan(order.indexOf('pc-join-bottom'));
    expect(order.indexOf('pc-join-bottom')).toBeLessThan(order.indexOf('pc-join-divisions'));
    expect(order.indexOf('pc-join-divisions')).toBeLessThan(order.indexOf('pc-join-sides'));
  });

  it('states cut dimensions with hems included in the cut step', () => {
    const cut = steps.find((s) => s.id === 'pc-cut')!;
    expect(cut.body).toContain('355.6 mm (14")');
    expect(cut.body).toContain('hem is already included');
  });

  it('a well-proportioned cradle card raises no warnings', () => {
    expect(warnings).toEqual([]);
  });
});

describe('pleated_card strategy — warnings and guards', () => {
  it('warns when pucker per side drops below 0.9"', () => {
    const tight = buildPouch(spec({ ...fourPack, facePerCell: 4.5 * IN }));
    expect(tight.warnings.some((w) => w.includes('pucker'))).toBe(true);
  });

  it('warns about ride height and layer count for pleated bottoms', () => {
    const pleat = buildPouch(spec({ ...fourPack, bottomStyle: 'pleat' }));
    expect(pleat.warnings.some((w) => w.includes('ride height'))).toBe(true);
  });

  it('throws when the face is not wider than the span', () => {
    expect(() => pleatedCard(spec({ ...fourPack, facePerCell: 3 * IN }))).toThrow(/pucker/);
  });

  it('throws without card params', () => {
    expect(() => pleatedCard({ ...spec(fourPack), card: undefined })).toThrow(/spec.card/);
  });

  it('a single-cell card has no division lines', () => {
    const single = buildPouch(spec({ ...fourPack, cellCount: 1 }));
    const back = single.pattern.pieces.find((p) => p.id === 'back')!;
    expect(back.paths.filter((p) => p.edges[0].role === 'stitch')).toHaveLength(0);
    expect(bboxFromPiece(back).width).toBeCloseTo(5 * IN, 5);
  });
});
