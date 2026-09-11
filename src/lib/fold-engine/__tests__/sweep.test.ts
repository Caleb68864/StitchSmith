// @vitest-environment node
/**
 * Fold-engine sweep: every generator's default output must build a fold model
 * for every piece without throwing, tile the outline exactly, keep panel edge
 * lengths under folding, and leave no region orphaned from the hinge tree.
 */
import { describe, it, expect } from 'vitest';
import type { Piece } from '../../pattern-engine/graph/Piece.js';
import { buildFoldModel, defaultFoldAngles, foldModel, area, pathToPolygon } from '../index.js';
import { makeDefaultMagPouchProject } from '../../../state/useMagPouchProject.js';
import { makeDefaultZipPouchProject } from '../../../state/useZipPouchProject.js';
import { makeDefaultRollTopSackProject } from '../../../state/useRollTopSackProject.js';
import { makeDefaultBookCoverProject } from '../../../state/useBookCoverProject.js';
import { makeDefaultCircleSkirtProject } from '../../../state/useCircleSkirtProject.js';
import { makeDefaultTriZipProject } from '../../../state/useTriZipProject.js';
import { buildPattern as buildMag } from '../../../generators/mag-pouch/buildPattern.js';
import { buildPattern as buildZip } from '../../../generators/zip-pouch/buildPattern.js';
import { buildPattern as buildRoll } from '../../../generators/roll-top-sack/index.js';
import { buildPattern as buildBook } from '../../../generators/book-cover/index.js';
import { buildPattern as buildSkirt } from '../../../generators/circle-skirt/index.js';
import { buildPattern as buildTri } from '../../../generators/tri-zip-backpack/buildPattern.js';
import { getPreset } from '../../../generators/tri-zip-backpack/stylePresets.js';
import { buildPaddedStrap } from '../../strap-engine/index.js';

function unwrap(r: unknown): Piece[] {
  const x = r as { ok?: boolean; value?: { pieces?: Piece[] }; pattern?: { pieces: Piece[] }; pieces?: Piece[] };
  if (x.pattern) return x.pattern.pieces;
  if (x.value?.pieces) return x.value.pieces;
  if (x.pieces) return x.pieces;
  throw new Error('unrecognised build result');
}

const sources: { name: string; pieces: () => Piece[] }[] = [
  { name: 'mag-pouch folded-T', pieces: () => unwrap(buildMag(makeDefaultMagPouchProject().inputs)) },
  { name: 'mag-pouch pleated card ×4', pieces: () => unwrap(buildMag({ ...makeDefaultMagPouchProject().inputs, construction: 'pleated_card', cell_count: 4, retention: 'open_top_bungee' })) },
  { name: 'zip-pouch', pieces: () => unwrap(buildZip(makeDefaultZipPouchProject().inputs)) },
  { name: 'zip-pouch cross-bottom', pieces: () => unwrap(buildZip({ ...makeDefaultZipPouchProject().inputs, construction_style: 'cross-bottom' } as never)) },
  { name: 'roll-top sack', pieces: () => unwrap(buildRoll(makeDefaultRollTopSackProject().inputs)) },
  { name: 'book cover', pieces: () => unwrap(buildBook(makeDefaultBookCoverProject().inputs)) },
  { name: 'circle skirt', pieces: () => unwrap(buildSkirt(makeDefaultCircleSkirtProject().inputs)) },
  { name: 'tri-zip', pieces: () => { const p = makeDefaultTriZipProject(); return unwrap(buildTri(p.inputs, getPreset(p.inputs.stylePreset))); } },
  { name: 'strap J-curve turned', pieces: () => buildPaddedStrap({ padLength_mm: 400, padWidth_mm: 60, foamThickness_mm: 8, curve: 'j_curve', architecture: 'webbing_tacked_ends', edgeFinish: 'turned', webbingWidth_mm: 25, tailLength_mm: 450, seamAllowance_mm: 10 }).pieces },
  { name: 'strap crushable sleeve', pieces: () => buildPaddedStrap({ padLength_mm: 400, padWidth_mm: 60, foamThickness_mm: 0, curve: 'straight', architecture: 'crushable_sleeve', edgeFinish: 'turned', webbingWidth_mm: 25, tailLength_mm: 450, seamAllowance_mm: 10 }).pieces },
];

describe.each(sources)('fold-engine sweep: $name', ({ pieces }) => {
  const list = pieces();

  it('has pieces', () => {
    expect(list.length).toBeGreaterThan(0);
  });

  it.each(list.map((p) => [p.id, p] as const))('%s — builds, tiles, folds rigidly', (_id, piece) => {
    const model = buildFoldModel(piece);
    const outline = piece.paths.find((p) => p.closed && p.edges.length > 0);
    if (!outline) { expect(model).toBeNull(); return; }
    expect(model).not.toBeNull();
    const m = model!;
    const outlineArea = area(pathToPolygon(outline));
    const tiled = m.regions.reduce((s, r) => s + r.area, 0);
    expect(tiled).toBeCloseTo(outlineArea, 1);
    expect(m.orphans).toEqual([]);
    expect(m.hinges).toHaveLength(m.regions.length - 1);
    const flat = foldModel(m, defaultFoldAngles(m), 0);
    const folded = foldModel(m, defaultFoldAngles(m), 1);
    expect(folded.panels).toHaveLength(m.regions.length);
    for (let i = 0; i < folded.panels.length; i++) {
      const a = flat.panels[i].vertices;
      const b = folded.panels[i].vertices;
      expect(a.length).toBeGreaterThanOrEqual(3);
      // Triangles cover the region (collinear vertices are pruned, so count is not n − 2).
      const triArea = flat.panels[i].triangles.reduce((s, [p, q, r]) => {
        const ax = a[p][0], ay = a[p][1], bx = a[q][0], by = a[q][1], cx = a[r][0], cy = a[r][1];
        return s + Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / 2;
      }, 0);
      expect(triArea).toBeCloseTo(m.regions[i].area, 1);
      for (let k = 0; k < a.length; k++) {
        const n = (k + 1) % a.length;
        const la = Math.hypot(a[n][0] - a[k][0], a[n][1] - a[k][1], a[n][2] - a[k][2]);
        const lb = Math.hypot(b[n][0] - b[k][0], b[n][1] - b[k][1], b[n][2] - b[k][2]);
        expect(lb).toBeCloseTo(la, 5);
        expect(Number.isFinite(b[k][0] + b[k][1] + b[k][2])).toBe(true);
      }
    }
  });
});
