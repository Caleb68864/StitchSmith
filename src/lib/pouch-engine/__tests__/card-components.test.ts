// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildCradles } from '../components/cradle.js';
import { buildFacePals } from '../components/facePals.js';
import { buildRetention } from '../components/retention.js';

const IN = 25.4;

describe('buildCradles', () => {
  it('emits one 3" × 1" strip per cell with zero SA', () => {
    const r = buildCradles({ cellCount: 4, objectDepth_mm: 1 * IN });
    expect(r.pieces).toHaveLength(1);
    expect(r.pieces[0].quantity).toBe(4);
    const e = r.pieces[0].paths[0].edges;
    expect(e.find((x) => x.id.includes('top'))!.end.x).toBeCloseTo(3 * IN, 6);
    expect(e.find((x) => x.id.includes('right'))!.end.y).toBeCloseTo(1 * IN, 6);
    expect(r.warnings).toEqual([]);
  });

  it('warns when the magazine is thicker than the 1" bottom segment', () => {
    const r = buildCradles({ cellCount: 1, objectDepth_mm: 1.4 * IN });
    expect(r.warnings.some((w) => w.includes('bow'))).toBe(true);
  });

  it('step depends on the supplied interior-ready step', () => {
    const r = buildCradles({ cellCount: 1, objectDepth_mm: IN, dependsOn: ['pc-interior-ready'] });
    expect(r.steps[0].dependsOn).toEqual(['pc-interior-ready']);
  });
});

describe('buildFacePals', () => {
  it('emits three bars per cell, each one cell span long', () => {
    const r = buildFacePals({ cellCount: 4, cellSpan_mm: 3 * IN, cellHeight_mm: 5.5 * IN });
    expect(r.pieces[0].quantity).toBe(12);
    expect(r.pieces[0].paths[0].edges.find((e) => e.id.includes('top'))!.end.x).toBeCloseTo(3 * IN, 6);
    expect(r.warnings).toEqual([]);
  });

  it('warns when the cell is too short for three bars', () => {
    const r = buildFacePals({ cellCount: 1, cellSpan_mm: 3 * IN, cellHeight_mm: 3 * IN });
    expect(r.warnings.length).toBe(1);
  });
});

describe('buildRetention — card styles', () => {
  it('velcro_dot lines both walls of every cell and adds one hook dot per mag', () => {
    const r = buildRetention({ style: 'velcro_dot', cellCount: 4, cellHeight_mm: 5.5 * IN });
    const loop = r.pieces.find((p) => p.id === 'interior-loop')!;
    const dot = r.pieces.find((p) => p.id === 'hook-dot')!;
    expect(loop.quantity).toBe(8);
    expect(loop.paths[0].edges.find((e) => e.id.includes('right'))!.end.y).toBeCloseTo(5.5 * IN, 6);
    expect(dot.quantity).toBe(4);
    expect(r.steps.map((s) => s.id)).toEqual(['interior-loop-sew', 'retention-velcro-dot']);
  });

  it('kydex_wedge lines both walls and emits only the wedge step', () => {
    const r = buildRetention({ style: 'kydex_wedge', cellCount: 2, cellHeight_mm: 100 });
    expect(r.pieces.map((p) => p.id)).toEqual(['interior-loop']);
    expect(r.steps.map((s) => s.id)).toEqual(['interior-loop-sew', 'retention-kydex']);
  });

  it('interiorLoop forces loop strips on a flap pouch too', () => {
    const r = buildRetention({ style: 'flap_velcro', hookLength_mm: 76.2, loopLength_mm: 101.6, cellCount: 1, cellHeight_mm: 100, interiorLoop: true });
    expect(r.pieces.map((p) => p.id)).toEqual(['interior-loop', 'velcro-hook', 'velcro-loop']);
  });

  it('none emits nothing', () => {
    const r = buildRetention({ style: 'none' });
    expect(r.pieces).toEqual([]);
    expect(r.steps).toEqual([]);
  });

  it('warns when interior loop is wanted but no cell height is given', () => {
    const r = buildRetention({ style: 'velcro_dot', cellCount: 1 });
    expect(r.warnings.length).toBe(1);
  });
});
