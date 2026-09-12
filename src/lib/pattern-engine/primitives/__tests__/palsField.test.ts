// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPalsField } from '../palsField.js';
import { makeEdgeIdGen } from '../../graph/Edge.js';

const IN = 25.4;
describe('buildPalsField', () => {
  it('fits 3 columns and 7 rows on the medpack side (4.5" × 14.5" work area), rows cut 1" long', () => {
    const f = buildPalsField({ origin: { x: 0, y: 0 }, width: 5 * IN, height: 14.5 * IN, idPrefix: 'p', eid: makeEdgeIdGen('p') });
    expect(f.cols).toBe(3);
    expect(f.rows).toBe(7);
    expect(f.fieldWidth).toBeCloseTo(4.5 * IN, 6);
    expect(f.webbing.quantity).toBe(7);
    expect(f.webbing.lengthMm).toBeCloseTo(5.5 * IN, 6);
    expect(f.paths.filter((p) => p.id.startsWith('p-bartack'))).toHaveLength(7 * 4);
    expect(f.warnings).toEqual([]);
  });
  it('clamps an over-ask with the off-grid warning and flags a non-spec row width', () => {
    const f = buildPalsField({ origin: { x: 0, y: 0 }, width: 5 * IN, height: 4 * IN, cols: 4, rowWidth: 1.5 * IN, rowPitch: 1.5 * IN, idPrefix: 'p', eid: makeEdgeIdGen('p') });
    expect(f.cols).toBe(3);
    expect(f.warnings.some((w) => /will not mount up/.test(w))).toBe(true);
    expect(f.warnings.some((w) => /not the 1" spec/.test(w))).toBe(true);
  });
  it('laser style emits cut slots and no webbing', () => {
    const f = buildPalsField({ origin: { x: 10, y: 10 }, width: 6 * IN, height: 6 * IN, style: 'laser', idPrefix: 'l', eid: makeEdgeIdGen('l') });
    expect(f.paths.every((p) => p.id.startsWith('l-slot') && p.closed)).toBe(true);
    expect(f.paths).toHaveLength(f.rows * f.cols);
    expect(f.webbing.quantity).toBe(0);
  });
});
