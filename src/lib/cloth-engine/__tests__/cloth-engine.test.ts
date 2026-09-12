// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { Piece } from '../../pattern-engine/graph/Piece.js';
import type { Point } from '../../pattern-engine/graph/Point.js';
import { buildClothMesh, nearestVertex, createWorld, relax, seamResidual, maxStretch, maxPenetration, vertexPosition, foldedInitial, foldedCreaseRest, solidDistance, torsoForm, shoulderPath, TORSO_MEDIUM, clothBounds, materialBendStiffness, materialPlateStiffness } from '../index.js';
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
    world.params.selfCollision = true;
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
    // Self-collision: the lid lies ON the face down its whole overlap, never inside it.
    for (const dy of [0.5 * IN, 1 * IN, 1.5 * IN, 2 * IN]) {
      const onLid = vertexPosition(world, 0, nearestVertex(mesh, { x: w / 2, y: h - sa - dy }));
      const onFace = vertexPosition(world, 0, nearestVertex(mesh, { x: w / 2, y: sa + 2.5 * IN - dy }));
      expect(onLid[2]).toBeGreaterThan(onFace[2] - 0.3);
    }
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
    // Divisions and outer sides, running the card height, through both face layers.
    for (let k = 0; k <= cells; k++) {
      const xf = faceEndHem + k * fpc, xb = backHem + k * span;
      seams.push({ a: { pieceId: 'face', from: { x: xf, y: faceCutH }, to: { x: xf, y: faceCutH - cardH } }, b: { pieceId: 'back', from: { x: xb, y: cardBottomY }, to: { x: xb, y: cardBottomY - cardH } } });
      seams.push({ a: { pieceId: 'face', from: { x: xf, y: 0 }, to: { x: xf, y: cardH } }, b: { pieceId: 'back', from: { x: xb, y: cardBottomY }, to: { x: xb, y: cardBottomY - cardH } }, gap: 2.4 });
    }
    // Bottom, per cell, both layers: 4 7/8" of face onto 3" of card — a gathered seam. The seam
    // samples by the shorter side so the face's extra length buckles into the "alligator lips".
    for (let k = 0; k < cells; k++) {
      const xf0 = faceEndHem + k * fpc, xb0 = backHem + k * span;
      seams.push({ a: { pieceId: 'face', from: { x: xf0, y: faceCutH }, to: { x: xf0 + fpc, y: faceCutH } }, b: { pieceId: 'back', from: { x: xb0, y: cardBottomY }, to: { x: xb0 + span, y: cardBottomY } } });
      seams.push({ a: { pieceId: 'face', from: { x: xf0, y: 0 }, to: { x: xf0 + fpc, y: 0 } }, b: { pieceId: 'back', from: { x: xb0, y: cardBottomY }, to: { x: xb0 + span, y: cardBottomY } }, gap: 2.4 });
    }
    // The magazine rides on the gathered face bottom. The vault's ride-height demo puts a
    // pleated bottom about 1–1.5" higher than a cradle (mag-cell-bottom-flat-vs-cradle.md);
    // the cloth agrees — below ~1" the face has no fabric left to wrap under the magazine.
    const magCentre: [number, number, number] = [backHem + span / 2, -(cardBottomY - 1 * IN) + 3.75 * IN, magD / 2 + 0.6];
    const world = createWorld({
      meshes: [backMesh, faceMesh],
      initial: (mi, _v, f) => (mi === 0 ? initBack(f) : initFace(f)),
      seams,
      // A magazine has rounded edges; a sharp box corner pulls the face tight round it.
      solids: [{ kind: 'rounded_box', center: magCentre, half: [1.275 * IN, 3.75 * IN, magD / 2], radius: 4 }],
      pinned: (mi, _v, f) => mi === 0 && regionAt(backModel, f) === backModel.root,
      bendRest: (mi, k, l, i, j) => (mi === 0 ? creaseBack : creaseFace)(k, l, i, j),
      params: { spacing: 8, selfCollision: true },
    });
    relax(world, 400);
    // Away from the gathered rows: a 4 7/8" edge sewn onto 3" shears the last cell above the
    // seam (the gathers' transition zone), which the 8 mm mesh renders as one elongated row.
    // With the bottom gathered the face is taut, and its crease at each division line falls
    // inside one 8 mm cell (no vertex on the crease), which reads as ~20 % on that edge.
    const awayFromGathers = (id: string, f: Point) => id !== 'face' || (f.y > 12 && f.y < faceCutH - 12);
    expect(maxStretch(world, awayFromGathers)).toBeLessThan(0.25);
    expect(maxStretch(world)).toBeLessThan(0.45);
    expect(seamResidual(world).mean).toBeLessThan(4);
    // The gathered bottom is attached along the whole card bottom of every cell.
    const bottomSeams = world.seams.filter((c) => Math.abs(faceMesh.flat[2 * (c.i - world.base[1]) + 1] - faceCutH) < 0.5 || Math.abs(faceMesh.flat[2 * (c.j - world.base[1]) + 1] - faceCutH) < 0.5);
    expect(bottomSeams.length).toBeGreaterThan(cells * 8);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    // Pucker: mid-cell face sits proud of the division lines by a clear margin.
    const zAt = (x: number) => vertexPosition(world, 1, nearestVertex(faceMesh, { x, y: faceCutH - cardH / 2 }))[2];
    const mid = zAt(faceEndHem + fpc / 2);
    const div = zAt(faceEndHem + fpc);
    expect(mid - div).toBeGreaterThan(8);
    // And the face clears the magazine in the first cell.
    expect(mid).toBeGreaterThan(magD);
    // Vault (mag-pouch-4pack-single-dimensions.md): the 4 7/8" face over a 3" span wraps a mag
    // ~2 1/2" wide with ~15/16" of pucker each side, so the face at mid-cell stands about one
    // magazine thickness off the card — not a loose bag twice that deep.
    expect(mid).toBeLessThan(magD + 15);
    // The back stays the card's finished width (12" ÷ 4 = 3" per cell — here 2 cells = 6").
    const backW = clothBounds(world, 0, (_id, f) => f.x >= backHem && f.x <= backHem + cells * span).size[0];
    expect(Math.abs(backW - cells * span)).toBeLessThan(world.params.spacing);
  });
});

describe('body solids', () => {
  it('capsule and rounded box report signed distance and an outward normal', () => {
    const cap = { kind: 'capsule' as const, a: [0, 0, 0] as [number, number, number], b: [100, 0, 0] as [number, number, number], radius: 10 };
    expect(solidDistance(cap, [50, 25, 0]).dist).toBeCloseTo(15, 6);
    expect(solidDistance(cap, [50, 25, 0]).normal).toEqual([0, 1, 0]);
    expect(solidDistance(cap, [50, 5, 0]).dist).toBeCloseTo(-5, 6);
    expect(solidDistance(cap, [130, 0, 0]).dist).toBeCloseTo(20, 6);
    const rb = { kind: 'rounded_box' as const, center: [0, 0, 0] as [number, number, number], half: [50, 30, 20] as [number, number, number], radius: 8 };
    expect(solidDistance(rb, [0, 45, 0]).dist).toBeCloseTo(15, 6);
    expect(solidDistance(rb, [0, 45, 0]).normal).toEqual([0, 1, 0]);
    expect(solidDistance(rb, [0, 0, 0]).dist).toBeLessThan(0);
    // Corner: rounded, so the distance along the diagonal is more than the face distance.
    const corner = solidDistance(rb, [60, 40, 30]);
    expect(corner.dist).toBeCloseTo(Math.hypot(60 - 42, 40 - 22, 30 - 12) - 8, 6);
  });

  it('a torso form has a chest, a shoulder line and a neck; a strap crests the shoulder at its top', () => {
    const f = torsoForm(TORSO_MEDIUM);
    expect(f.solids.map((s) => s.kind)).toEqual(['rounded_box', 'capsule', 'capsule']);
    expect(f.topY).toBeCloseTo(TORSO_MEDIUM.torsoLength, 6);
    expect(f.shoulderTop.right[0]).toBeGreaterThan(0);
    expect(f.shoulderTop.left[0]).toBeCloseTo(-f.shoulderTop.right[0], 6);
    // The shoulder crest is on the surface of the shoulder capsule.
    const cap = f.solids[1];
    expect(cap.kind).toBe('capsule');
    if (cap.kind === 'capsule') expect(solidDistance(cap, f.shoulderTop.right).dist).toBeCloseTo(0, 6);
    // A shoulder path runs from the back, over the top, to the front.
    const path = shoulderPath(TORSO_MEDIUM, 'right', f.topY - 60);
    expect(path[0][2]).toBeLessThan(0);
    expect(path[path.length - 1][2]).toBeGreaterThan(0);
    expect(Math.max(...path.map((p) => p[1]))).toBeGreaterThan(f.topY);
    expect(path.every((p) => Math.abs(p[0] - f.shoulderTop.right[0]) < 1e-9)).toBe(true);
  });

  it('cloth pushed against a capsule settles outside it', () => {
    const piece = rect('sheet', 100, 100);
    const mesh = buildClothMesh(piece, { spacing: 10 })!;
    const cap = { kind: 'capsule' as const, a: [-200, 0, 0] as [number, number, number], b: [200, 0, 0] as [number, number, number], radius: 30 };
    // Sheet starts flat through the capsule's axis (z = 0, y from 0 to −100 → straddles y = 0).
    const world = createWorld({ meshes: [mesh], initial: (_m, _v, f) => [f.x - 50, -f.y + 50, 0], solids: [cap], params: { spacing: 10 } });
    expect(maxPenetration(world)).toBeGreaterThan(20);
    relax(world, 200);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    expect(maxStretch(world)).toBeLessThan(0.15);
  });
});

describe('self-collision', () => {
  it('two sheets started almost coincident settle one thickness apart; without it they stay merged', () => {
    const a = rect('a', 80, 80);
    const b = rect('b', 80, 80);
    const build = (selfCollision: boolean) => createWorld({
      meshes: [buildClothMesh(a, { spacing: 10 })!, buildClothMesh(b, { spacing: 10 })!],
      initial: (mi, _v, f) => [f.x, -f.y, mi === 0 ? 0 : 0.2],
      // Hold sheet a; sheet b is free.
      pinned: (mi) => mi === 0,
      params: { spacing: 10, selfCollision },
    });
    const off = build(false);
    relax(off, 60);
    expect(clothBounds(off, 1).lo[2]).toBeLessThan(0.5);
    const on = build(true);
    relax(on, 60);
    const zb = clothBounds(on, 1);
    expect(zb.lo[2]).toBeGreaterThan(on.params.thickness * 0.8);
    expect(maxStretch(on)).toBeLessThan(0.02);
  });

  it('reports assembly and per-piece bounds', () => {
    const a = rect('a', 80, 40);
    const world = createWorld({ meshes: [buildClothMesh(a, { spacing: 10 })!], initial: (_m, _v, f) => [f.x + 5, -f.y, 3], params: { spacing: 10 } });
    const b = clothBounds(world);
    expect(b.lo).toEqual([5, -40, 3]);
    expect(b.size).toEqual([80, 40, 0]);
    const hi = clothBounds(world, 0).hi;
    expect(hi[0]).toBeCloseTo(85, 9); expect(hi[1]).toBeCloseTo(0, 9); expect(hi[2]).toBeCloseTo(3, 9);
    // Restricting to an interior region excludes the outer 10 mm.
    expect(clothBounds(world, 0, (_id, f) => f.x >= 10 && f.x <= 70).size[0]).toBe(60);
  });
});

describe('gravity and material stiffness', () => {
  it('a strip pinned at one end hangs under gravity: cloth curls, a foam strip stays straight', () => {
    // Drop of the strip's centre line at five stations along it.
    const profile = (materialId: string | undefined) => {
      const strip = rect('strip', 40, 200);
      const mesh = buildClothMesh(strip, { spacing: 10 })!;
      const world = createWorld({
        meshes: [mesh],
        // Horizontal strip along +x (flat y → x), clamped over its first 25 mm.
        initial: (_m, _v, f) => [f.y, 0, f.x],
        pinned: (_m, _v, f) => f.y < 25,
        bendStiffnessOf: () => materialBendStiffness(materialId, 0.35),
        plateStiffnessOf: () => materialPlateStiffness(materialId),
        params: { spacing: 10, gravity: [0, -0.02, 0] },
      });
      relax(world, 300);
      const drops: number[] = [];
      for (let st = 0; st <= 200; st += 50) drops.push(-vertexPosition(world, 0, nearestVertex(mesh, { x: 20, y: st }))[1]);
      return drops;
    };
    const cloth = profile(undefined);
    const foam = profile('foam-closed-cell');
    expect(cloth[4]).toBeGreaterThan(40);
    // Curvature: how far the mid-station sits from the root–tip chord, as a fraction of the tip drop.
    const bow = (p: number[]) => (p[2] - p[4] / 2) / p[4];
    expect(bow(cloth)).toBeGreaterThan(0.12);
    expect(Math.abs(bow(foam))).toBeLessThan(0.1);
    expect(materialBendStiffness('webbing-38', 0.35)).toBe(0.9);
    expect(materialBendStiffness('spacer-mesh', 0.35)).toBe(0.15);
    expect(materialPlateStiffness('foam-closed-cell')).toBeGreaterThan(materialPlateStiffness('cordura-500'));
  });
});
