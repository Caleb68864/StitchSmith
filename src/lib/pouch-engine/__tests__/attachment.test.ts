// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  buildAttachment,
  palsRowCount,
} from '../components/attachment.js';
import type { AttachmentStyle } from '../components/attachment.js';
import type { StraightEdge } from '../../pattern-engine/graph/Edge.js';

// ─── PALS row count math ──────────────────────────────────────────────────────

describe('palsRowCount', () => {
  it('returns floor((h - 12.7) / 25.4)', () => {
    // Three different heights per [BEHAVIORAL] criterion
    expect(palsRowCount(200)).toBe(Math.floor((200 - 12.7) / 25.4)); // 7
    expect(palsRowCount(100)).toBe(Math.floor((100 - 12.7) / 25.4)); // 3
    expect(palsRowCount(150)).toBe(Math.floor((150 - 12.7) / 25.4)); // 5
  });

  it('returns 0 when height is too short for any row', () => {
    expect(palsRowCount(12)).toBe(0);
  });
});

// ─── buildAttachment — pals ───────────────────────────────────────────────────

describe('buildAttachment pals', () => {
  it('quantity equals palsRowCount for 200 mm', () => {
    const result = buildAttachment({ style: 'pals', finishedHeight_mm: 200 });
    const expectedRows = Math.floor((200 - 12.7) / 25.4);
    expect(result.pieces).toHaveLength(1);
    expect(result.pieces[0].quantity).toBe(expectedRows);
  });

  it('quantity equals palsRowCount for 100 mm', () => {
    const result = buildAttachment({ style: 'pals', finishedHeight_mm: 100 });
    const expectedRows = Math.floor((100 - 12.7) / 25.4);
    expect(result.pieces[0].quantity).toBe(expectedRows);
  });

  it('quantity equals palsRowCount for 150 mm', () => {
    const result = buildAttachment({ style: 'pals', finishedHeight_mm: 150 });
    const expectedRows = Math.floor((150 - 12.7) / 25.4);
    expect(result.pieces[0].quantity).toBe(expectedRows);
  });

  it('strap total height is row_height + 50 mm fold-over', () => {
    const result = buildAttachment({ style: 'pals', finishedHeight_mm: 200 });
    const piece = result.pieces[0];
    // The piece outline edges span from y=0 to y = rowHeight + 50
    // row height = 25.4 mm, fold-over = 50 mm → total = 75.4 mm
    const expectedTotal = 25.4 + 50;
    const outline = piece.paths[0].edges;
    const rightEdge = outline.find((e) => e.id.includes('right')) as StraightEdge | undefined;
    expect(rightEdge).toBeDefined();
    expect(rightEdge!.end.y).toBeCloseTo(expectedTotal, 5);
  });

  it('emits at least one assembly step', () => {
    const result = buildAttachment({ style: 'pals', finishedHeight_mm: 200 });
    expect(result.steps.length).toBeGreaterThan(0);
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
