// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  buildAttachment,
  palsRowCount,
} from '../components/attachment.js';
import type { AttachmentStyle } from '../components/attachment.js';
import type { StraightEdge } from '../../pattern-engine/graph/Edge.js';

// ─── PALS row count math ──────────────────────────────────────────────────────
//
// PALS spec: 1" webbing rows with a 1" gap (2" pitch), 0.5" clear at the top
// and bottom of the back. 5.5" (the SOE 4-pack card) fits 2 rows; 7.5" fits 3.

describe('palsRowCount', () => {
  it('fits 2 rows on a 5.5" card and 3 on 7.5"', () => {
    expect(palsRowCount(5.5 * 25.4)).toBe(2);
    expect(palsRowCount(7.5 * 25.4)).toBe(3);
  });

  it('follows floor((h - 1") + 1") / 2") for other heights', () => {
    expect(palsRowCount(200)).toBe(3);
    expect(palsRowCount(100)).toBe(1);
    expect(palsRowCount(150)).toBe(2);
  });

  it('returns 0 when height is too short for any row', () => {
    expect(palsRowCount(12)).toBe(0);
    expect(palsRowCount(NaN)).toBe(0);
  });
});

// ─── buildAttachment — pals ───────────────────────────────────────────────────

describe('buildAttachment pals', () => {
  it('emits back rows (qty = row count) and vertical mount straps (qty = columns)', () => {
    const result = buildAttachment({ style: 'pals', finishedHeight_mm: 200, finishedWidth_mm: 3 * 25.4 });
    expect(result.pieces).toHaveLength(2);
    const rows = result.pieces.find((p) => p.id === 'pals-back-row');
    const straps = result.pieces.find((p) => p.id === 'pals-mount-strap');
    expect(rows?.quantity).toBe(palsRowCount(200));
    expect(straps?.quantity).toBe(2); // a 3" back spans two 1.5" columns
  });

  it('back rows are cut 1" longer than the back so they can be trimmed flush after sewing', () => {
    const backW = 12 * 25.4;
    const result = buildAttachment({ style: 'pals', finishedHeight_mm: 5.5 * 25.4, finishedWidth_mm: backW });
    const rows = result.pieces.find((p) => p.id === 'pals-back-row')!;
    const topEdge = rows.paths[0].edges.find((e) => e.id.includes('top')) as StraightEdge;
    expect(topEdge.end.x).toBeCloseTo(backW + 25.4, 5);
  });

  it('mount strap length is back height + 50 mm tuck', () => {
    const result = buildAttachment({ style: 'pals', finishedHeight_mm: 200 });
    const straps = result.pieces.find((p) => p.id === 'pals-mount-strap')!;
    const rightEdge = straps.paths[0].edges.find((e) => e.id.includes('right')) as StraightEdge;
    expect(rightEdge.end.y).toBeCloseTo(250, 5);
  });

  it('defaults the back width to one 3" rifle cell (2 straps) and honours mountColumns', () => {
    const dflt = buildAttachment({ style: 'pals', finishedHeight_mm: 200 });
    expect(dflt.pieces.find((p) => p.id === 'pals-mount-strap')?.quantity).toBe(2);
    const eight = buildAttachment({ style: 'pals', finishedHeight_mm: 200, finishedWidth_mm: 12 * 25.4 });
    expect(eight.pieces.find((p) => p.id === 'pals-mount-strap')?.quantity).toBe(8);
    const forced = buildAttachment({ style: 'pals', finishedHeight_mm: 200, mountColumns: 3 });
    expect(forced.pieces.find((p) => p.id === 'pals-mount-strap')?.quantity).toBe(3);
  });

  it('every strip carries an explicit 0 seam allowance on every edge', () => {
    const result = buildAttachment({ style: 'pals', finishedHeight_mm: 200 });
    for (const piece of result.pieces) {
      for (const edge of piece.paths[0].edges) {
        expect(piece.seamAllowances?.[edge.id]).toBe(0);
      }
    }
  });

  it('warns when the back width is off the 1.5" grid', () => {
    const result = buildAttachment({ style: 'pals', finishedHeight_mm: 200, finishedWidth_mm: 3.5 * 25.4 });
    expect(result.warnings.some((w) => w.includes('spec spacing'))).toBe(true);
    const onGrid = buildAttachment({ style: 'pals', finishedHeight_mm: 200, finishedWidth_mm: 4.5 * 25.4 });
    expect(onGrid.warnings).toHaveLength(0);
  });

  it('emits row and strap steps', () => {
    const result = buildAttachment({ style: 'pals', finishedHeight_mm: 200 });
    expect(result.steps.map((s) => s.id)).toEqual(['pals-back-rows', 'pals-mount-straps']);
  });

  it('emits a warning when finishedHeight_mm is too short for any rows', () => {
    const result = buildAttachment({ style: 'pals', finishedHeight_mm: 10 });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.pieces).toHaveLength(0);
  });
});

// ─── buildAttachment — molle (identical to pals) ──────────────────────────────

describe('buildAttachment molle', () => {
  it('molle produces identical output to pals for the same inputs', () => {
    const heights = [100, 150, 200];
    for (const h of heights) {
      const pals = buildAttachment({ style: 'pals', finishedHeight_mm: h });
      const molle = buildAttachment({ style: 'molle', finishedHeight_mm: h });
      // Compare quantity
      expect(molle.pieces.map((p) => p.quantity)).toEqual(
        pals.pieces.map((p) => p.quantity),
      );
      // Compare step count
      expect(molle.steps.length).toBe(pals.steps.length);
      // Compare warnings
      expect(molle.warnings).toEqual(pals.warnings);
    }
  });
});

// ─── buildAttachment — belt_loop ──────────────────────────────────────────────

describe('buildAttachment belt_loop', () => {
  it('produces exactly one piece', () => {
    const result = buildAttachment({ style: 'belt_loop', finishedHeight_mm: 150 });
    expect(result.pieces).toHaveLength(1);
  });

  it('piece height is 1.75 inches (44.45 mm)', () => {
    const result = buildAttachment({ style: 'belt_loop', finishedHeight_mm: 150 });
    const piece = result.pieces[0];
    const expected = 1.75 * 25.4; // 44.45 mm
    const outline = piece.paths[0].edges;
    const rightEdge = outline.find((e) => e.id.includes('right')) as StraightEdge | undefined;
    expect(rightEdge!.end.y).toBeCloseTo(expected, 5);
  });

  it('piece length is (beltWidth_mm + 0.5") * 2 — default 2" belt', () => {
    const result = buildAttachment({ style: 'belt_loop', finishedHeight_mm: 150 });
    const piece = result.pieces[0];
    const beltWidth = 50.8; // default 2"
    const expected = (beltWidth + 0.5 * 25.4) * 2;
    const outline = piece.paths[0].edges;
    const topEdge = outline.find((e) => e.id.includes('top')) as StraightEdge | undefined;
    expect(topEdge!.end.x).toBeCloseTo(expected, 5);
  });

  it('uses custom beltWidth_mm when provided', () => {
    const beltWidth = 38.1; // 1.5"
    const result = buildAttachment({
      style: 'belt_loop',
      finishedHeight_mm: 150,
      beltWidth_mm: beltWidth,
    });
    const expected = (beltWidth + 0.5 * 25.4) * 2;
    const outline = result.pieces[0].paths[0].edges;
    const topEdge = outline.find((e) => e.id.includes('top')) as StraightEdge | undefined;
    expect(topEdge!.end.x).toBeCloseTo(expected, 5);
  });

  it('emits a closure/stitch step', () => {
    const result = buildAttachment({ style: 'belt_loop', finishedHeight_mm: 150 });
    expect(result.steps.length).toBeGreaterThan(0);
    const stepBodies = result.steps.map((s) => s.body.toLowerCase());
    const hasClosureStep = stepBodies.some(
      (b) => b.includes('bartack') || b.includes('snap') || b.includes('stitch'),
    );
    expect(hasClosureStep).toBe(true);
  });
});

// ─── buildAttachment — alice ──────────────────────────────────────────────────

describe('buildAttachment alice', () => {
  it('produces exactly two clip slot pieces', () => {
    const result = buildAttachment({ style: 'alice', finishedHeight_mm: 150 });
    expect(result.pieces).toHaveLength(2);
  });

  it('pieces are named with clip slot labels', () => {
    const result = buildAttachment({ style: 'alice', finishedHeight_mm: 150 });
    const names = result.pieces.map((p) => p.name.toLowerCase());
    expect(names.some((n) => n.includes('alice') || n.includes('slot'))).toBe(true);
  });

  it('emits an attachment step', () => {
    const result = buildAttachment({ style: 'alice', finishedHeight_mm: 150 });
    expect(result.steps.length).toBeGreaterThan(0);
  });
});

// ─── buildAttachment — velcro_panel ──────────────────────────────────────────

describe('buildAttachment velcro_panel', () => {
  it('produces a single panel piece', () => {
    const result = buildAttachment({
      style: 'velcro_panel',
      finishedHeight_mm: 200,
    });
    expect(result.pieces).toHaveLength(1);
  });

  it('panel piece is loop-type (label or name references loop or velcro)', () => {
    const result = buildAttachment({
      style: 'velcro_panel',
      finishedHeight_mm: 200,
    });
    const piece = result.pieces[0];
    const label = (piece.name + (piece.annotations?.[0]?.label ?? '')).toLowerCase();
    expect(label.includes('loop') || label.includes('velcro')).toBe(true);
  });

  it('emits an attachment step', () => {
    const result = buildAttachment({
      style: 'velcro_panel',
      finishedHeight_mm: 200,
    });
    expect(result.steps.length).toBeGreaterThan(0);
  });
});

// ─── All style combinations compile and return the right shape ────────────────

describe('buildAttachment return shape', () => {
  const styles: AttachmentStyle[] = ['pals', 'molle', 'belt_loop', 'alice', 'velcro_panel'];

  for (const style of styles) {
    it(`${style} returns { pieces, steps, warnings }`, () => {
      const result = buildAttachment({ style, finishedHeight_mm: 150 });
      expect(Array.isArray(result.pieces)).toBe(true);
      expect(Array.isArray(result.steps)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  }
});
