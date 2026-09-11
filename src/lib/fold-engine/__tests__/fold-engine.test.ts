// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildFoldModel, defaultFoldAngles, foldModel, foldedBounds, regionAt } from '../index.js';
import { splitPolygon, triangulate, area } from '../polygon.js';
import { buildPattern } from '../../../generators/mag-pouch/buildPattern.js';
import { buildPaddedStrap } from '../../strap-engine/index.js';
import type { Piece } from '../../pattern-engine/graph/Piece.js';

const IN = 25.4;

describe('polygon helpers', () => {
  it('splits a square by its vertical midline into two equal halves', () => {
    const sq = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const { pos, neg } = splitPolygon(sq, { p: { x: 5, y: 0 }, d: { x: 0, y: 1 } });
    expect(area(pos)).toBeCloseTo(50, 6);
    expect(area(neg)).toBeCloseTo(50, 6);
  });

  it('a line that misses the polygon leaves one side empty', () => {
    const sq = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const { pos, neg } = splitPolygon(sq, { p: { x: 20, y: 0 }, d: { x: 0, y: 1 } });
    expect(area(pos) + area(neg)).toBeCloseTo(100, 6);
    expect(pos.length === 0 || neg.length === 0).toBe(true);
  });

  it('triangulates a concave polygon without losing area', () => {
    const L = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 10 }, { x: 0, y: 10 }];
    const tris = triangulate(L);
    expect(tris).toHaveLength(4);
    const triArea = tris.reduce((s, [a, b, c]) => s + area([L[a], L[b], L[c]]), 0);
    expect(triArea).toBeCloseTo(area(L), 6);
  });
});

function magPouch(retention: 'flap_velcro' | 'velcro_dot' = 'flap_velcro') {
  return buildPattern({
    magazine: { mode: 'predefined', presetId: 'ar15_30_round', units: 'in' },
    retention, attachment: 'pals', drainage: 'open_corner', seamAllowance: 0.375,
  });
}

describe('buildFoldModel — folded-T body', () => {
  const body = magPouch().pattern.pieces.find((p) => p.id === 'body')!;
  const model = buildFoldModel(body)!;

  it('finds five full-span folds and splits the body into 3 × 4 = 12 regions', () => {
    expect(model.folds.map((f) => f.label)).toEqual(['Wing fold (left)', 'Wing fold (right)', 'Front–bottom fold', 'Bottom–back fold', 'Lid fold']);
    expect(model.regions).toHaveLength(12);
    expect(model.orphans).toEqual([]);
    expect(model.hinges).toHaveLength(11);
  });

  it('roots the hinge tree at the back panel (under the label), not the larger lid', () => {
    const sa = 0.375 * IN;
    const w = (3 + 2 * 1.25 + 0.75) * IN;
    const backCentre = { x: w / 2, y: sa + 5.25 * IN + 1.25 * IN + (5.25 * IN) / 2 };
    expect(model.root).toBe(regionAt(model, backCentre));
  });

  it('regions tile the outline exactly', () => {
    const total = model.regions.reduce((s, r) => s + r.area, 0);
    const bodyW = (3 + 2 * 1.25 + 0.75) * IN;
    const bodyH = (5.25 + 1.25 + 5.25 + 6 + 0.75) * IN;
    expect(total).toBeCloseTo(bodyW * bodyH, 3);
  });

  it('defaults box folds to 90° and the lid to 150°', () => {
    const deg = defaultFoldAngles(model).map((a) => Math.round((a * 180) / Math.PI));
    expect(deg).toEqual([90, 90, 90, 90, 150]);
  });

  it('flat (t = 0) leaves every vertex at z = 0; folding preserves panel shape', () => {
    const flat = foldModel(model, defaultFoldAngles(model), 0);
    for (const p of flat.panels) for (const v of p.vertices) expect(v[2]).toBeCloseTo(0, 9);
    const folded = foldModel(model, defaultFoldAngles(model), 1);
    for (let i = 0; i < folded.panels.length; i++) {
      const a = flat.panels[i].vertices;
      const b = folded.panels[i].vertices;
      for (let k = 0; k < a.length; k++) {
        const n = (k + 1) % a.length;
        const la = Math.hypot(a[n][0] - a[k][0], a[n][1] - a[k][1], a[n][2] - a[k][2]);
        const lb = Math.hypot(b[n][0] - b[k][0], b[n][1] - b[k][1], b[n][2] - b[k][2]);
        expect(lb).toBeCloseTo(la, 6);
      }
    }
  });

  it('every hinged child lifts toward +z for a positive angle', () => {
    const half = foldModel(model, model.folds.map(() => Math.PI / 2), 0.5);
    for (const h of model.hinges) {
      const cz = half.panels[h.child].vertices.reduce((s, v) => s + v[2], 0) / half.panels[h.child].vertices.length;
      expect(cz).toBeGreaterThan(-1e-6);
    }
  });

  it('box folds at 90° (lid open) stand the front one bottom-band away from the back', () => {
    const angles = model.folds.map((f) => (/lid/i.test(f.label ?? '') ? 0 : Math.PI / 2));
    const folded = foldModel(model, angles, 1);
    const { min, max } = foldedBounds(folded);
    // Back wings stand 1.25" + 3/8" SA = 41.3 mm; the front's wings fold back and their 3/8" SA
    // overshoots the back plane (it lies inside the seam once sewn). Depth = 41.3 + 9.5.
    expect(max[2]).toBeCloseTo(1.625 * IN, 0);
    expect(min[2]).toBeCloseTo(-0.375 * IN, 0);
    const sa = 0.375 * IN;
    const w = (3 + 2 * 1.25 + 0.75) * IN;
    const front = regionAt(model, { x: w / 2, y: sa + (5.25 * IN) / 2 });
    const cz = folded.panels[front].vertices.reduce((s, v) => s + v[2], 0) / folded.panels[front].vertices.length;
    expect(cz).toBeCloseTo(1.25 * IN, 0);
  });
});

describe('buildFoldModel — pleated card and straps', () => {
  it('card back has four hem folds and a lid fold; face has mouth + end hems', () => {
    const r = buildPattern({
      magazine: { mode: 'predefined', presetId: 'ar15_30_round', units: 'in' },
      construction: 'pleated_card', cell_count: 2, retention: 'flap_velcro', attachment: 'pals', drainage: 'open_corner', seamAllowance: 0.375,
    });
    const back = buildFoldModel(r.pattern.pieces.find((p) => p.id === 'back')!)!;
    const face = buildFoldModel(r.pattern.pieces.find((p) => p.id === 'face')!)!;
    expect(back.folds).toHaveLength(5);
    expect(back.orphans).toEqual([]);
    expect(defaultFoldAngles(back).map((a) => Math.round((a * 180) / Math.PI))).toEqual([180, 180, 180, 180, 150]);
    expect(face.folds).toHaveLength(3);
    // Mouth fold at 180° folds the face in half: both halves overlap, so the y-extent halves.
    const flat = foldedBounds(foldModel(face, defaultFoldAngles(face), 0));
    const folded = foldedBounds(foldModel(face, defaultFoldAngles(face), 1));
    expect(folded.max[1] - folded.min[1]).toBeCloseTo((flat.max[1] - flat.min[1]) / 2, 0);
  });

  it('a J-curve strap has no folds and one region sampled from its beziers', () => {
    const s = buildPaddedStrap({ padLength_mm: 400, padWidth_mm: 60, foamThickness_mm: 8, curve: 'j_curve', architecture: 'foam_sandwich_mesh', edgeFinish: 'bound', webbingWidth_mm: 25, tailLength_mm: 450, seamAllowance_mm: 10 });
    const m = buildFoldModel(s.pieces[0])!;
    expect(m.folds).toHaveLength(0);
    expect(m.regions).toHaveLength(1);
    expect(m.regions[0].poly.length).toBeGreaterThan(20);
    expect(foldModel(m, [], 1).panels[0].triangles.length).toBeGreaterThan(10);
  });

  it('short fold marks (box-corner ticks) are not treated as hinges', () => {
    const piece: Piece = {
      id: 'p', name: 'p', mirror: false, quantity: 1,
      paths: [
        { id: 'o', closed: true, edges: [
          { kind: 'straight', id: 'e0', role: 'cut', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
          { kind: 'straight', id: 'e1', role: 'cut', start: { x: 100, y: 0 }, end: { x: 100, y: 200 } },
          { kind: 'straight', id: 'e2', role: 'cut', start: { x: 100, y: 200 }, end: { x: 0, y: 200 } },
          { kind: 'straight', id: 'e3', role: 'cut', start: { x: 0, y: 200 }, end: { x: 0, y: 0 } },
        ] },
        { id: 'tick', closed: false, edges: [{ kind: 'straight', id: 'f0', role: 'fold', start: { x: 0, y: 180 }, end: { x: 20, y: 180 } }] },
        { id: 'real', closed: false, edges: [{ kind: 'straight', id: 'f1', role: 'fold', start: { x: 0, y: 100 }, end: { x: 100, y: 100 } }] },
      ],
    };
    const m = buildFoldModel(piece)!;
    expect(m.folds.map((f) => f.pathId)).toEqual(['real']);
    expect(m.regions).toHaveLength(2);
  });

  it('returns null for a piece without a closed outline', () => {
    expect(buildFoldModel({ id: 'x', name: 'x', mirror: false, quantity: 1, paths: [] })).toBeNull();
  });
});

describe('measureCavity — folded-T with the magazine inside', () => {
  const inputs = { magazine: { mode: 'predefined' as const, presetId: 'ar15_30_round', units: 'in' as const }, retention: 'flap_velcro' as const, attachment: 'pals' as const, drainage: 'open_corner' as const, seamAllowance: 0.375 as const };
  const body = buildPattern(inputs).pattern.pieces.find((p) => p.id === 'body')!;
  const model = buildFoldModel(body)!;
  const sa = 0.375 * IN;
  const w = (3 + 2 * 1.25 + 0.75) * IN;
  const baseY = sa + 5.25 * IN + 1.25 * IN;
  const mag = { w: 2.55 * IN, d: 1.0 * IN, h: 7.5 * IN };

  it('reports the cell span across x, the bottom band across z, and an open mouth', async () => {
    const { measureCavity } = await import('../index.js');
    const angles = model.folds.map((f) => (/lid/i.test(f.label ?? '') ? 0 : Math.PI / 2));
    const folded = foldModel(model, angles, 1);
    const centre: [number, number, number] = [w / 2, -(baseY + mag.h / 2), mag.d / 2 + 0.5];
    const c = measureCavity([folded], centre, [mag.w / 2, mag.h / 2, mag.d / 2]);
    expect(c.x.extent).toBeCloseTo(3 * IN, 0);          // wing to wing = cell span
    expect(c.x.clearance).toBeCloseTo(3 * IN - mag.w, 0);
    expect(c.z.extent).toBeCloseTo(1.25 * IN, 0);       // back to front = bottom band
    expect(c.z.clearance).toBeCloseTo(1.25 * IN - mag.d, 0);
    // The magazine grows along −y here (the lid is drawn below the back), so the floor is on the +y side.
    expect(c.y.pos).toBeCloseTo(mag.h / 2, 0);          // floor is the band
    expect(c.y.neg).toBeNull();                          // mouth is open with the lid at 0°
  });

  it('a closed lid at 150° is hit above the magazine', async () => {
    const { measureCavity } = await import('../index.js');
    const folded = foldModel(model, defaultFoldAngles(model), 1);
    const centre: [number, number, number] = [w / 2, -(baseY + mag.h / 2), mag.d / 2 + 0.5];
    const c = measureCavity([folded], centre, [mag.w / 2, mag.h / 2, mag.d / 2]);
    expect(c.y.neg).not.toBeNull();
  });
});

describe('defaultFoldAngles heuristics and lid exclusion', () => {
  it('an unlabelled fold-in-half defaults to 180°, a sliver to 180° (hem), a third to 90°', () => {
    const mk = (foldY: number): Piece => ({
      id: 'p', name: 'p', mirror: false, quantity: 1,
      paths: [
        { id: 'o', closed: true, edges: [
          { kind: 'straight', id: 'e0', role: 'cut', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
          { kind: 'straight', id: 'e1', role: 'cut', start: { x: 100, y: 0 }, end: { x: 100, y: 300 } },
          { kind: 'straight', id: 'e2', role: 'cut', start: { x: 100, y: 300 }, end: { x: 0, y: 300 } },
          { kind: 'straight', id: 'e3', role: 'cut', start: { x: 0, y: 300 }, end: { x: 0, y: 0 } },
        ] },
        { id: 'f', closed: false, edges: [{ kind: 'straight', id: 'f0', role: 'fold', start: { x: 0, y: foldY }, end: { x: 100, y: foldY } }] },
      ],
    });
    const deg = (y: number) => Math.round(defaultFoldAngles(buildFoldModel(mk(y))!)[0] * 180 / Math.PI);
    expect(deg(150)).toBe(180);
    expect(deg(20)).toBe(180);
    expect(deg(100)).toBe(90);
  });

  it('the pleated-card back rooted at the magazine base is flat and hit by the depth ray; the lid is excluded across/depth', async () => {
    const { measureCavity, regionsUnderFolds, withoutRegions } = await import('../index.js');
    const inputs = { magazine: { mode: 'predefined' as const, presetId: 'ar15_30_round', units: 'in' as const }, construction: 'pleated_card' as const, cell_count: 3, retention: 'flap_velcro' as const, attachment: 'pals' as const, drainage: 'open_corner' as const, seamAllowance: 0.375 as const };
    const back = buildPattern(inputs).pattern.pieces.find((p) => p.id === 'back')!;
    const backHem = IN, cardH = 5.25 * IN, flap = 6 * IN, cellCentreX = backHem + 3 * IN * 1.5;
    const baseY = backHem + flap + cardH;
    const model = buildFoldModel(back, { rootPoint: { x: cellCentreX, y: baseY - 1 } })!;
    expect(model.root).toBe(regionAt(model, { x: cellCentreX, y: baseY - cardH / 2 }));
    const folded = foldModel(model, defaultFoldAngles(model), 1);
    const centre: [number, number, number] = [cellCentreX, -baseY + 3.75 * IN, 13.2];
    const full = measureCavity([folded], centre, [1.275 * IN, 3.75 * IN, 0.5 * IN]);
    expect(full.z.neg).toBeCloseTo(13.2, 1);      // the card is flat behind the magazine
    const lidRegions = regionsUnderFolds(model, (f) => /lid/i.test(f.label ?? ''));
    expect(lidRegions.size).toBeGreaterThan(0);
    const noLid = measureCavity([withoutRegions(folded, lidRegions)], centre, [1.275 * IN, 3.75 * IN, 0.5 * IN]);
    expect(noLid.z.pos).toBeNull();               // nothing in front of the card without the (rigid) lid
    expect(noLid.x.pos).toBeNull();               // a card has no side walls
  });
});
