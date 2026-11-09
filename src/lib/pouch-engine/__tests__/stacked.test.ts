import { describe, it, expect } from 'vitest';
import { stackedCellGeometry, validateStackedCells } from '../fit/stacked.js';

const IN = 25.4;
// vault rigs/stacked-mag-cell-geometry.md — the .308 test case (PMAG 20: depth 2.9, thick 1.1, length 5.75).
const MAG308 = { depth: 2.9 * IN, thickness: 1.1 * IN, length: 5.75 * IN };

describe('stackedCellGeometry (.308 test case from the vault)', () => {
  it('reproduces the adaptation table with the defaults', () => {
    const g = stackedCellGeometry(MAG308);
    expect(g.cellsDeep).toBe(2);
    expect(g.rearCellWidth).toBeCloseTo(3.4 * IN, 6);              // 2.9 + 0.5 ease
    expect(g.frontCellMark).toBeCloseTo(3.9 * IN, 6);              // + 0.5 wrap
    expect(g.stackDepth).toBeCloseTo((2 * 1.1 + 0.125) * IN, 6);   // ≈ 2 3/8"
    expect(g.pouchHeight).toBeCloseTo(0.65 * 5.75 * IN, 6);        // ≈ 3 3/4"
    expect(g.exposedHeight).toBeCloseTo(0.35 * 5.75 * IN, 6);
    expect(g.cradleLength).toBeCloseTo((2 * 1.1 + 0.125 + 2) * IN, 6);
    expect(validateStackedCells(g, MAG308)).toEqual([]);
  });

  it('one deep drops the divider layers; cradle drop comes off the exposed height and onto the cradle', () => {
    const g = stackedCellGeometry({ ...MAG308, cellsDeep: 1, cradleDrop: 0.5 * IN });
    expect(g.stackDepth).toBeCloseTo(1.1 * IN, 6);
    expect(g.exposedHeight).toBeCloseTo((0.35 * 5.75 - 0.5) * IN, 6);
    expect(g.cradleLength).toBeCloseTo((1.1 + 2 + 0.5) * IN, 6);
  });

  it('enforces the vault bounds', () => {
    const fields = (i: Parameters<typeof stackedCellGeometry>[0]) => validateStackedCells(stackedCellGeometry(i), i).map((e) => e.field);
    expect(fields({ ...MAG308, cellsDeep: 3 })).toContain('cells_deep');
    expect(fields({ ...MAG308, cellsDeep: 1.5 })).toContain('cells_deep');
    expect(fields({ ...MAG308, stackEase: 0.1 * IN })).toContain('stack_ease');
    expect(fields({ ...MAG308, wrapAllowance: 0.1 * IN })).toContain('wrap_allowance');
    expect(fields({ ...MAG308, wrapAllowance: 1.5 * IN })).toContain('wrap_allowance');
    expect(fields({ ...MAG308, coverage: 0.2 })).toContain('coverage');
    expect(fields({ ...MAG308, coverage: Number.NaN })).toContain('coverage');
    expect(fields({ ...MAG308, cradleDrop: -1 })).toContain('cradle_drop');
    expect(fields({ ...MAG308, depth: 0 })).toContain('magazine');
  });

  it('rejects a cradle drop that sinks the magazine below the mouth (hardening)', () => {
    const errs = validateStackedCells(stackedCellGeometry({ ...MAG308, cradleDrop: 2.1 * IN }), MAG308);
    expect(errs.map((e) => e.field)).toEqual(['cradle_drop']);
    expect(validateStackedCells(stackedCellGeometry({ ...MAG308, cradleDrop: 2.0 * IN }), MAG308)).toEqual([]);
  });
});
