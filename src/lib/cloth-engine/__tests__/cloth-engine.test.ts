// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { Piece } from '../../pattern-engine/graph/Piece.js';
import { buildClothMesh, nearestVertex, createWorld, relax, seamResidual, maxStretch, maxPenetration, vertexPosition, foldedInitial, foldedCreaseRest } from '../index.js';
import { buildFoldModel, defaultFoldAngles, regionAt } from '../../fold-engine/index.js';
import { buildPattern } from '../../../generators/mag-pouch/buildPattern.js';

const IN = 25.4;

function rect(id: string, w: number, h: number, x0 = 0, y0 = 0): Piece {
  return {
    id, name: id, mirror: false, quantity: 1,
    paths: [{ id: `${id}-o`, closed: true, edges: [
      { kind: 'straight', id: `${id}-e0`, role: 'cut', start: { x: x0, y: y0 }, end: { x: x0 + w, y: y0 } },
      { kind: 'straight', id: `${id}-e1`, role: 'cut', start: { x: x0 + w, y: y0 }, end: { x: x0 + w, y: y0 + h } },
      { kind: 'straight', id: `${id}-e2`, role: 'cut', start: { x: x0 + w, y: y0 + h }, end: { x: x0, y: y0 + h } },
      { kind: 'straight', id: `${id}-e3`, role: 'cut', start: { x: x0, y: y0 + h }, end: { x: x0, y: y0 } },
    ] }],
  };
}

describe('buildClothMesh', () => {
  it('meshes a 100 × 200 rectangle at 10 mm into an 11 × 21 grid of 400 triangles', () => {
    const m = buildClothMesh(rect('r', 100, 200), { spacing: 10 })!;
    expect(m.vertexCount).toBe(11 * 21);
    expect(m.triangles.length / 3).toBe(10 * 20 * 2);
    // Edges: 10·21 horizontal + 11·20 vertical + 200 diagonals
    expect(m.edges.length).toBe(10 * 21 + 11 * 20 + 200);
    // Every interior edge yields one bend pair.
    expect(m.bends.length).toBe(m.edges.length - (2 * 10 + 2 * 20));
    expect(nearestVertex(m, { x: 50, y: 100 })).toBeGreaterThanOrEqual(0);
    const v = nearestVertex(m, { x: 52, y: 103 });
    expect(m.flat[2 * v]).toBe(50);
    expect(m.flat[2 * v + 1]).toBe(100);
  });

  it('keeps fold and stitch lines on grid lines and skips cells outside a concave outline', () => {
    const L: Piece = {
      id: 'L', name: 'L', mirror: false, quantity: 1,
      paths: [{ id: 'o', closed: true, edges: [
        { kind: 'straight', id: 'a', role: 'cut', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
        { kind: 'straight', id: 'b', role: 'cut', start: { x: 100, y: 0 }, end: { x: 100, y: 40 } },
        { kind: 'straight', id: 'c', role: 'cut', start: { x: 100, y: 40 }, end: { x: 40, y: 40 } },
        { kind: 'straight', id: 'd', role: 'cut', start: { x: 40, y: 40 }, end: { x: 40, y: 100 } },
        { kind: 'straight', id: 'e', role: 'cut', start: { x: 40, y: 100 }, end: { x: 0, y: 100 } },
        { kind: 'straight', id: 'f', role: 'cut', start: { x: 0, y: 100 }, end: { x: 0, y: 0 } },
      ] }, { id: 'st', closed: false, edges: [{ kind: 'straight', id: 's', role: 'stitch', start: { x: 0, y: 25 }, end: { x: 100, y: 25 } }] }],
    };
    const m = buildClothMesh(L, { spacing: 10 })!;
    expect(m.ys).toContain(25);
    // Area of triangles equals the L's area (100·40 + 40·60 = 6400).
    let area = 0;
    for (let t = 0; t < m.triangles.length; t += 3) {
      const [a, b, c] = [m.triangles[t], m.triangles[t + 1], m.triangles[t + 2]];
      const ax = m.flat[2 * a], ay = m.flat[2 * a + 1], bx = m.flat[2 * b], by = m.flat[2 * b + 1], cx = m.flat[2 * c], cy = m.flat[2 * c + 1];
      area += Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / 2;
    }
    expect(area).toBeCloseTo(6400, 3);
  });
});

describe('createWorld / relax — two flat panels seamed edge to edge', () => {
  it('pulls the seam together without stretching either panel', () => {
    const a = buildClothMesh(rect('a', 60, 100), { spacing: 10 })!;
    const b = buildClothMesh(rect('b', 60, 100), { spacing: 10 })!;
    const world = createWorld({
      meshes: [a, b],
      // Panel b starts 20 mm to the right of a's right edge and 5 mm forward.
      initial: (mi, _v, f) => (mi === 0 ? [f.x, -f.y, 0] : [f.x + 80, -f.y, 5]),
      seams: [{ a: { pieceId: 'a', from: { x: 60, y: 0 }, to: { x: 60, y: 100 } }, b: { pieceId: 'b', from: { x: 0, y: 0 }, to: { x: 0, y: 100 } }, gap: 0 }],
      pinned: (mi) => mi === 0,
      params: { spacing: 10 },
    });
    expect(world.seams.length).toBe(11);
    relax(world, 300);
    expect(seamResidual(world).max).toBeLessThan(0.5);
    expect(maxStretch(world)).toBeLessThan(0.02);
    // Panel b was dragged to a's edge: its left edge now sits at x ≈ 60.
    const vb = nearestVertex(b, { x: 0, y: 50 });
    expect(vertexPosition(world, 1, vb)[0]).toBeCloseTo(60, 0);
  });
});

describe('folded-T mag pouch cloth', () => {
  const inputs = { magazine: { mode: 'predefined' as const, presetId: 'ar15_30_round', units: 'in' as const }, retention: 'flap_velcro' as const, attachment: 'pals' as const, drainage: 'open_corner' as const, seamAllowance: 0.375 as const };
  const body = buildPattern(inputs).pattern.pieces.find((p) => p.id === 'body')!;
  const sa = 0.375 * IN, ph = 5.25 * IN, cd = 1.25 * IN, w = (3 + 2 * 1.25 + 0.75) * IN;
  const mag = { w: 2.55 * IN, d: 1.0 * IN, h: 7.5 * IN };
  const baseY = sa + ph + cd;

  function build(lidWrapped: boolean) {
    const model = buildFoldModel(body, { rootPoint: { x: w / 2, y: baseY + 1 } })!;
    // The lid root stays flat; the two wrap creases are on (default) or off.
    const angles = defaultFoldAngles(model).map((a, i) => (/crease/i.test(model.folds[i].label ?? '') && !lidWrapped ? 0 : a));
    const mesh = buildClothMesh(body, { spacing: 8 })!;
    const init = foldedInitial({ model, angles });
    const crease = foldedCreaseRest({ model, angles });
    const rootRegion = model.root;
    const mouthBack = sa + 2 * ph + cd;
    // Each wing wraps the side and its outer edge lands on the opposite panel one SA inside
    // that panel's wing fold, mouth to mouth (the wings overlap into a double-layer side).
    const xIn = sa + cd + sa;              // one SA inside the wing fold
    const seams = [
      { a: { pieceId: 'body', from: { x: 0, y: sa }, to: { x: 0, y: sa + ph } }, b: { pieceId: 'body', from: { x: xIn, y: mouthBack }, to: { x: xIn, y: mouthBack - ph } } },
      { a: { pieceId: 'body', from: { x: w, y: sa }, to: { x: w, y: sa + ph } }, b: { pieceId: 'body', from: { x: w - xIn, y: mouthBack }, to: { x: w - xIn, y: mouthBack - ph } } },
      { a: { pieceId: 'body', from: { x: 0, y: mouthBack }, to: { x: 0, y: mouthBack - ph } }, b: { pieceId: 'body', from: { x: xIn, y: sa }, to: { x: xIn, y: sa + ph } } },
      { a: { pieceId: 'body', from: { x: w, y: mouthBack }, to: { x: w, y: mouthBack - ph } }, b: { pieceId: 'body', from: { x: w - xIn, y: sa }, to: { x: w - xIn, y: sa + ph } } },
    ];
    const world = createWorld({
      meshes: [mesh],
      initial: (_mi, _v, f) => init(f),
      seams,
      solids: [{ kind: 'box', center: [w / 2, -(baseY + mag.h / 2), mag.d / 2 + 0.6], half: [mag.w / 2, mag.h / 2, mag.d / 2] }],
      // Pin the back panel's interior only: its fold-line vertices must stay free to hinge.
      pinned: (_mi, _v, f) => regionAt(model, f) === rootRegion && f.x > sa + cd + 1 && f.x < w - sa - cd - 1 && f.y > baseY + 1 && f.y < mouthBack - 1,
      bendRest: (_mi, k, l, i, j) => crease(k, l, i, j),
      params: { spacing: 8 },
    });
    return { world, mesh, model };
  }

  it('starts at the rigid fold and relaxes into a seamed pouch around the magazine', () => {
    const { world, mesh } = build(false);
    expect(world.seams.length).toBeGreaterThan(20);
    expect(maxPenetration(world)).toBeLessThan(0.01); // rigid start already clears the box
    relax(world, 250);
    // ~8 % remains at the three-way corner where the band's side strip meets the wings:
    // the seam allowance turning under a seam, which rigid panels cannot represent.
    expect(maxStretch(world)).toBeLessThan(0.10);
    expect(seamResidual(world).mean).toBeLessThan(3);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    // The front panel centre sits just outside the magazine face.
    const vf = nearestVertex(mesh, { x: w / 2, y: sa + ph / 2 });
    const z = vertexPosition(world, 0, vf)[2];
    expect(z).toBeGreaterThan(mag.d + 0.6 - 0.5);
    expect(z).toBeLessThan(mag.d + 15);
  });

  it('a closure seam pulls the crease-wrapped lid onto the face over the magazine top', () => {
    // The lid starts at its wrap creases (over the top, down the front) and the hook-and-loop
    // closure pulls its tip the last stretch onto the face.
    const { world, mesh } = build(true);
    const mouthBack = sa + 2 * ph + cd;
    const h = sa + ph + cd + ph + 8.25 * IN + sa;
    const hook = 3 * IN;
    const closureOnFace = { x: w / 2, y: sa + 2.5 * IN - hook / 2 };  // loop field centre: the lid's 2.5" overlap, less half the hook
    const lidTip = { x: w / 2, y: h - sa - hook / 2 };                 // hook strip centre on the lid
    const vi = nearestVertex(mesh, lidTip), vj = nearestVertex(mesh, closureOnFace);
    world.seams.push({ i: vi, j: vj, rest: world.params.thickness, initial: Math.hypot(...([0, 1, 2].map((k) => world.pos[3 * vj + k] - world.pos[3 * vi + k]) as [number, number, number])) });
    relax(world, 400);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    expect(maxStretch(world)).toBeLessThan(0.12);
    // 1" past the mouth the lid is still behind the magazine; past the top it is in front of it.
    const magTop = -(baseY + mag.h);
    const behind = vertexPosition(world, 0, nearestVertex(mesh, { x: w / 2, y: mouthBack + 1 * IN }));
    expect(behind[2]).toBeLessThan(mag.d / 2);
    // Half an inch past the front crease the lid is on the face side, just below the magazine top.
    const over = vertexPosition(world, 0, nearestVertex(mesh, { x: w / 2, y: mouthBack + 2.25 * IN + cd + 0.5 * IN }));
    expect(over[1]).toBeGreaterThan(magTop - 2);
    expect(over[1]).toBeLessThan(magTop + 25);
    expect(over[2]).toBeGreaterThan(mag.d);
    const tip = vertexPosition(world, 0, nearestVertex(mesh, lidTip));
    expect(tip[2]).toBeGreaterThan(mag.d);
    // The hook has met the loop.
    const loop = vertexPosition(world, 0, nearestVertex(mesh, closureOnFace));
    expect(Math.hypot(tip[0] - loop[0], tip[1] - loop[1], tip[2] - loop[2])).toBeLessThan(6);
  });
});

describe('pleated card cloth — pucker emerges', () => {
  it('the face bows out between divisions after seaming to the narrower back', () => {
    const inputs = { magazine: { mode: 'predefined' as const, presetId: 'ar15_30_round', units: 'in' as const }, construction: 'pleated_card' as const, cell_count: 2, retention: 'velcro_dot' as const, attachment: 'pals' as const, drainage: 'open_corner' as const, seamAllowance: 0.375 as const, face_per_cell: 4.875 };
    const r = buildPattern(inputs);
    const back = r.pattern.pieces.find((p) => p.id === 'back')!;
    const face = r.pattern.pieces.find((p) => p.id === 'face')!;
    const backHem = IN, faceEndHem = 0.5 * IN, span = 3 * IN, fpc = 4.875 * IN, cardH = 5.25 * IN;
    const cells = 2;
    const cardBottomY = backHem + cardH; // no lid
    const faceCutH = 2 * cardH;
    const backModel = buildFoldModel(back, { rootPoint: { x: backHem + span / 2, y: cardBottomY - 1 } })!;
    const faceModel = buildFoldModel(face, { rootPoint: { x: faceEndHem + fpc / 2, y: cardH + cardH / 2 } })!;
    const magD = 1.0 * IN;
    const place = { dx: backHem - faceEndHem, dy: cardBottomY - faceCutH, dz: magD + 1 };
    const backMesh = buildClothMesh(back, { spacing: 8 })!;
    const faceMesh = buildClothMesh(face, { spacing: 8, extraX: Array.from({ length: cells + 1 }, (_, k) => faceEndHem + k * fpc) })!;
    const initBack = foldedInitial({ model: backModel, angles: defaultFoldAngles(backModel) });
    const initFace = foldedInitial({ model: faceModel, angles: defaultFoldAngles(faceModel), offset: place });
    const creaseBack = foldedCreaseRest({ model: backModel, angles: defaultFoldAngles(backModel) });
    const creaseFace = foldedCreaseRest({ model: faceModel, angles: defaultFoldAngles(faceModel) });
    const seams = [] as import('../index.js').SeamSpec[];
    // Bottom: the face's raw bottom edge (root half bottom) to the card bottom.
    // The face bottom is longer than the back's and gathers into "alligator lips" under the
    // magazine; a coarse mesh cannot pleat, so the bottom is held only where the division
    // seams already pin it (see roadmap: gathered seams are Stage 3 follow-up work).
    // Divisions and outer sides, running the card height, through both face layers.
    for (let k = 0; k <= cells; k++) {
      const xf = faceEndHem + k * fpc, xb = backHem + k * span;
      seams.push({ a: { pieceId: 'face', from: { x: xf, y: faceCutH }, to: { x: xf, y: faceCutH - cardH } }, b: { pieceId: 'back', from: { x: xb, y: cardBottomY }, to: { x: xb, y: cardBottomY - cardH } } });
      seams.push({ a: { pieceId: 'face', from: { x: xf, y: 0 }, to: { x: xf, y: cardH } }, b: { pieceId: 'back', from: { x: xb, y: cardBottomY }, to: { x: xb, y: cardBottomY - cardH } }, gap: 2.4 });
    }
    // The magazine sits on the seam, one fabric thickness above the card bottom.
    const magCentre: [number, number, number] = [backHem + span / 2, -(cardBottomY - 2) + 3.75 * IN, magD / 2 + 0.6];
    const world = createWorld({
      meshes: [backMesh, faceMesh],
      initial: (mi, _v, f) => (mi === 0 ? initBack(f) : initFace(f)),
      seams,
      solids: [{ kind: 'box', center: magCentre, half: [1.275 * IN, 3.75 * IN, magD / 2] }],
      pinned: (mi, _v, f) => mi === 0 && regionAt(backModel, f) === backModel.root,
      bendRest: (mi, k, l, i, j) => (mi === 0 ? creaseBack : creaseFace)(k, l, i, j),
      params: { spacing: 8 },
    });
    relax(world, 400);
    expect(maxStretch(world)).toBeLessThan(0.08);
    expect(seamResidual(world).mean).toBeLessThan(4);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    // Pucker: mid-cell face sits proud of the division lines by a clear margin.
    const zAt = (x: number) => vertexPosition(world, 1, nearestVertex(faceMesh, { x, y: faceCutH - cardH / 2 }))[2];
    const mid = zAt(faceEndHem + fpc / 2);
    const div = zAt(faceEndHem + fpc);
    expect(mid - div).toBeGreaterThan(8);
    // And the face clears the magazine in the first cell.
    expect(mid).toBeGreaterThan(magD);
  });
});
