// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { patternToSvg, patternToSvgByMaterial, patternMaterials } from '../exports/svg.js';
import { exportCutList, exportCutListCsv, stripSummary, drawerLengthFor } from '../exports/cutList.js';
import type { Piece } from '../graph/Piece.js';
import type { Pattern } from '../graph/Pattern.js';

function rect(id: string, w: number, h: number, materialId: string, quantity = 1): Piece {
  return { id, name: id, mirror: false, quantity, materialId, paths: [{ id: `${id}-o`, closed: true, edges: [
    { kind: 'straight', id: `${id}-0`, role: 'cut', start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
    { kind: 'straight', id: `${id}-1`, role: 'cut', start: { x: w, y: 0 }, end: { x: w, y: h } },
    { kind: 'straight', id: `${id}-2`, role: 'cut', start: { x: w, y: h }, end: { x: 0, y: h } },
    { kind: 'straight', id: `${id}-3`, role: 'cut', start: { x: 0, y: h }, end: { x: 0, y: 0 } },
  ] }], seamAllowances: { [`${id}-0`]: 0, [`${id}-1`]: 0, [`${id}-2`]: 0, [`${id}-3`]: 0 } };
}
const pattern: Pattern = { id: 'p', name: 'P', pieces: [
  rect('body', 200, 150, 'cordura-500'), rect('foam', 180, 130, 'foam-6'),
  rect('row', 6.5 * 25.4, 25.4, 'webbing-25', 3), rect('row-long', 12 * 25.4, 25.4, 'webbing-25', 2), rect('hook', 4.5 * 25.4, 38.1, 'velcro-hook', 2),
] };

describe('per-material cut sheets', () => {
  it('lists materials in first-seen order and renders one sheet each with only that material', () => {
    expect(patternMaterials(pattern)).toEqual(['cordura-500', 'foam-6', 'webbing-25', 'velcro-hook']);
    const sheets = patternToSvgByMaterial(pattern);
    expect(Object.keys(sheets)).toHaveLength(4);
    expect(sheets['foam-6']).toContain('piece-foam');
    expect(sheets['foam-6']).not.toContain('piece-body');
    expect(patternToSvg(pattern, { materialFilter: 'nothing' })).toContain('viewBox="0 0 100 100"');
  });
});

describe('strip stock summary', () => {
  it('groups webbing and Velcro by material × width, counts cuts and maps them to drawer lengths', () => {
    const strips = stripSummary(pattern);
    expect(strips.map((s) => s.materialId)).toEqual(['velcro-hook', 'webbing-25']);
    const web = strips.find((s) => s.materialId === 'webbing-25')!;
    expect(web.widthMm).toBeCloseTo(25.4, 6);
    expect(web.cuts.map((c) => [c.quantity, c.drawerIn])).toEqual([[3, 6.5], [2, null]]);
    expect(web.totalLengthMm).toBeCloseTo((3 * 6.5 + 2 * 12) * 25.4, 6);
    expect(drawerLengthFor(3.2 * 25.4)).toBe(3.5);
    expect(drawerLengthFor(11 * 25.4)).toBeNull();
    const cl = exportCutList(pattern, [], []);
    expect(cl.strips).toHaveLength(2);
    const csv = exportCutListCsv(cl, []);
    expect(csv).toContain('Strip Material,Width (mm),Length (mm),Quantity,Drawer (in),Pieces');
    expect(csv).toContain('cut to length');
  });
});
