// @vitest-environment node
/**
 * Cloth assembly of the other pouch-like patterns, each with the object it is
 * built to hold as the collider. These are the checks that caught the mag
 * pouch's short lid; here they guard the zip pouch and roll-top geometry.
 */
import { describe, it, expect } from 'vitest';
import type { Piece } from '../../pattern-engine/graph/Piece.js';
import { buildClothMesh, nearestVertex, createWorld, relax, seamResidual, maxStretch, maxPenetration, vertexPosition, foldedInitial, foldedCreaseRest, torsoForm, clothBounds, materialBendStiffness, materialPlateStiffness, DEFAULT_CLOTH_PARAMS, pinHolds, type SeamSpec, type Solid, type Vec3, type PinSpec } from '../index.js';
import { buildFoldModel, defaultFoldAngles, regionAt, onAnyFold, makePlacer, mirrorPieceX, placementMap, type PlacedEntry, type PiecePlacement } from '../../fold-engine/index.js';
import { buildPattern as buildStrap, resolveInputs as resolveStrap } from '../../../generators/padded-strap/index.js';
import { paddedStrapAssembly, PAD_LEFT_ID } from '../../../generators/padded-strap/assembly3d.js';
import { zipPouchAssembly } from '../../../generators/zip-pouch/assembly3d.js';
import { buildPattern as buildCircleSkirt, resolveInputs as resolveCircleSkirt } from '../../../generators/circle-skirt/index.js';
import { circleSkirtAssembly } from '../../../generators/circle-skirt/assembly3d.js';
import { makeDefaultCircleSkirtProject } from '../../../state/useCircleSkirtProject.js';
import { buildPattern as buildMicroRig, microRigAssembly, REAR_POUCH_ID, FRONT_POUCH_ID } from '../../../generators/micro-rig/index.js';
import { PAD_PIECE_ID, CROSS_STRAP_PIECE_ID } from '../../../generators/padded-strap/buildPattern.js';
import type { Point } from '../../pattern-engine/graph/Point.js';
import { buildPattern as buildTriZip } from '../../../generators/tri-zip-backpack/index.js';
import { resolveInputs as resolveTriZip } from '../../../generators/tri-zip-backpack/inputs.js';
import { getPreset } from '../../../generators/tri-zip-backpack/stylePresets.js';
import { triZipAssembly, WING_LEFT, ZIP_LEFT } from '../../../generators/tri-zip-backpack/assembly3d.js';
import { makeDefaultTriZipProject } from '../../../state/useTriZipProject.js';
import { buildPattern as buildBookCover, coverPanelDims } from '../../../generators/book-cover/buildPattern.js';
import { resolveInputs as resolveBookCover } from '../../../generators/book-cover/inputs.js';
import { makeDefaultBookCoverProject } from '../../../state/useBookCoverProject.js';
import { makeDefaultZipPouchProject } from '../../../state/useZipPouchProject.js';
import { makeDefaultRollTopSackProject } from '../../../state/useRollTopSackProject.js';
import { buildPattern as buildZip } from '../../../generators/zip-pouch/buildPattern.js';
import { resolveInputs as resolveZip } from '../../../generators/zip-pouch/inputs.js';
import { buildPattern as buildRoll } from '../../../generators/roll-top-sack/index.js';

interface AssemblyObject {
  width: number; depth: number; height: number; pin?: 'root' | 'footprint';
  base?: { pieceId: string; point: Point; direction: Point };
  shape?: 'box' | 'torso';
  torso?: { shoulderWidth: number; neckRadius: number };
  at?: Vec3;
}
type Pin = PinSpec;

/**
 * The viewer's assembly, without the viewer: fold each piece, place it (rotation,
 * offsets, riding on a host region), mesh it, seam it, and stand the object's box
 * on the host. Mirrors FoldViewer's simulate mode so a page and its test agree.
 */
function assemble(pieces: Piece[], placements: Record<string, PiecePlacement>, seams: SeamSpec[], object: AssemblyObject | null, spacing: number, pins: Pin[] = [], gravity?: Vec3, extraSolids: Solid[] = [], selfCollision = true) {
  const entries: (PlacedEntry & { piece: Piece })[] = pieces.map((piece) => {
    const pl = placements[piece.id];
    let rootPoint = pl?.rootPoint;
    if (!rootPoint && object?.base && object.base.pieceId === piece.id) rootPoint = { x: object.base.point.x + object.base.direction.x, y: object.base.point.y + object.base.direction.y };
    const model = buildFoldModel(piece, { rootPoint })!;
    return { piece, model, offsetX: pl?.dx ?? 0, offsetY: pl?.dy ?? 0, offsetZ: pl?.dz ?? 0, placement: pl };
  });
  const anglesOf = (e: PlacedEntry) => defaultFoldAngles(e.model);
  const placer = makePlacer(entries, anglesOf, 1);
  const meshes = entries.map((e) => buildClothMesh(e.piece, {
    spacing,
    extraX: seams.flatMap((sm) => [sm.a, sm.b].filter((x) => x.pieceId === e.piece.id).flatMap((x) => [x.from.x, x.to.x])),
    extraY: seams.flatMap((sm) => [sm.a, sm.b].filter((x) => x.pieceId === e.piece.id).flatMap((x) => [x.from.y, x.to.y])),
  })!);
  const inits = entries.map((e) => foldedInitial({ model: e.model, angles: anglesOf(e), transform: placer(e), drape: placementMap(e.placement) ?? undefined }));
  const creases = entries.map((e) => (placementMap(e.placement) ? null : foldedCreaseRest({ model: e.model, angles: anglesOf(e) })));
  let solids: Solid[] = [...extraSolids];
  let pinnedHost: (mi: number, f: Point) => boolean = () => false;
  if (!object) {
    // nothing to stand on: pins alone hold the assembly
  } else if (object.shape === 'torso') {
    solids = [...solids, ...torsoForm({ chestWidth: object.width, chestDepth: object.depth, torsoLength: object.height, shoulderWidth: object.torso?.shoulderWidth ?? object.width * 1.2, neckRadius: object.torso?.neckRadius ?? 65 }, object.at ?? [0, 0, 0]).solids];
  } else if (object.at) {
    const c = object.at;
    solids.push({ kind: 'box', center: [c[0], c[1] + object.height / 2, c[2]], half: [object.width / 2, object.height / 2, object.depth / 2] });
    // Host = first piece, whole root region, as the viewer does without a base.
    pinnedHost = (mi, f) => pins.length === 0 && mi === 0 && !placementMap(entries[0].placement) && regionAt(entries[0].model, f) === entries[0].model.root && !onAnyFold(entries[0].model, f, 1.5);
  } else {
    const b = object.base!;
    const host = entries.find((e) => e.piece.id === b.pieceId)!;
    const dir = [b.direction.x, -b.direction.y] as const;
    const centre: [number, number, number] = [
      b.point.x + host.offsetX + dir[0] * (object.height / 2 + 1.5),
      -b.point.y - host.offsetY + dir[1] * (object.height / 2 + 1.5),
      host.offsetZ + object.depth / 2 + 0.6,
    ];
    const under = (f: Point) => {
      const rx = f.x - b.point.x, ry = f.y - b.point.y;
      const along = rx * b.direction.x + ry * b.direction.y;
      const across = Math.abs(-rx * b.direction.y + ry * b.direction.x);
      return along > spacing - 2 && along < object.height - spacing + 2 && across < object.width / 2 - spacing + 2;
    };
    solids.push({ kind: 'box', center: centre, half: [object.width / 2, object.height / 2, object.depth / 2] });
    pinnedHost = (mi, f) => pins.length === 0 && entries[mi].piece.id === b.pieceId && regionAt(entries[mi].model, f) === entries[mi].model.root
      && !onAnyFold(entries[mi].model, f, 1.5) && (object.pin !== 'footprint' || under(f));
  }
  const world = createWorld({
    meshes,
    initial: (mi, _v, f) => inits[mi](f),
    bendRest: (mi, k, l, i, j) => { const c = creases[mi]; return c ? c(k, l, i, j) : Math.hypot(l.x - k.x, l.y - k.y); },
    seams,
    solids,
    pinned: (mi, _v, f) => pinHolds(pins, entries[mi].piece.id, f) || pinnedHost(mi, f),
    bendStiffnessOf: (mi) => materialBendStiffness(entries[mi].piece.materialId, DEFAULT_CLOTH_PARAMS.bendStiffness),
    plateStiffnessOf: (mi) => materialPlateStiffness(entries[mi].piece.materialId),
    params: { spacing, selfCollision, gravity: gravity ?? [0, 0, 0] },
  });
  const ids = entries.map((e) => e.piece.id);
  const bounds = (id: string) => {
    const mi = ids.indexOf(id);
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let v = 0; v < meshes[mi].vertexCount; v++) for (let k = 0; k < 3; k++) {
      const c = world.pos[3 * (world.base[mi] + v) + k];
      lo[k] = Math.min(lo[k], c); hi[k] = Math.max(hi[k], c);
    }
    return { lo, hi };
  };
  return { world, meshes, ids, bounds };
}

/** Two flat panels face to face around a box, seamed on both sides and the bottom. */
function twoPanelBag(opts: {
  front: Piece; back: Piece; depth: number;
  side: { left: number; right: number; bottom: number; top: number };
  box: { cx: number; halfW: number; halfH: number; baseY: number };
  pinBack?: boolean;
}) {
  const { front, back, depth, side } = opts;
  const fm = buildFoldModel(front, { rootPoint: { x: (side.left + side.right) / 2, y: (side.top + side.bottom) / 2 } })!;
  const bm = buildFoldModel(back, { rootPoint: { x: (side.left + side.right) / 2, y: (side.top + side.bottom) / 2 } })!;
  const dz = -(depth + 2);
  const fMesh = buildClothMesh(front, { spacing: 8, extraX: [side.left, side.right], extraY: [side.bottom, side.top] })!;
  const bMesh = buildClothMesh(back, { spacing: 8, extraX: [side.left, side.right], extraY: [side.bottom, side.top] })!;
  const seams: SeamSpec[] = [
    { label: 'left', a: { pieceId: front.id, from: { x: side.left, y: side.top }, to: { x: side.left, y: side.bottom } }, b: { pieceId: back.id, from: { x: side.left, y: side.top }, to: { x: side.left, y: side.bottom } } },
    { label: 'right', a: { pieceId: front.id, from: { x: side.right, y: side.top }, to: { x: side.right, y: side.bottom } }, b: { pieceId: back.id, from: { x: side.right, y: side.top }, to: { x: side.right, y: side.bottom } } },
    { label: 'bottom', a: { pieceId: front.id, from: { x: side.left, y: side.bottom }, to: { x: side.right, y: side.bottom } }, b: { pieceId: back.id, from: { x: side.left, y: side.bottom }, to: { x: side.right, y: side.bottom } } },
  ];
  const initF = foldedInitial({ model: fm, angles: defaultFoldAngles(fm) });
  const initB = foldedInitial({ model: bm, angles: defaultFoldAngles(bm), offset: { dz } });
  const cF = foldedCreaseRest({ model: fm, angles: defaultFoldAngles(fm) });
  const cB = foldedCreaseRest({ model: bm, angles: defaultFoldAngles(bm) });
  const { cx, halfW, halfH, baseY } = opts.box;
  // Contents cannot fill the seam-to-seam interior exactly: fabric has thickness, and a
  // seam vertex sitting inside the collider's margin could never move. Inset by 2 mm.
  const inset = 2;
  const world = createWorld({
    meshes: [fMesh, bMesh],
    initial: (mi, _v, f) => (mi === 0 ? initF(f) : initB(f)),
    bendRest: (mi, k, l, i, j) => (mi === 0 ? cF : cB)(k, l, i, j),
    seams,
    solids: [{ kind: 'box', center: [cx, -baseY + halfH + inset, dz / 2], half: [halfW - inset, halfH - inset, depth / 2 - inset] }],
    // Pin only the part of the back panel that lies flat against the contents' back face.
    // Half the depth on each side and at the bottom wraps round to the seams (the boxed
    // corner), so pinning the whole seam-to-seam interior flat would leave the front panel
    // too little fabric to reach the seams — exactly the fault the first run showed.
    pinned: (mi, _v, f) => mi === 1 && (opts.pinBack ?? true) && regionAt(bm, f) === bm.root && !onAnyFold(bm, f, 1.5)
      && f.x > side.left + depth / 2 + 6 && f.x < side.right - depth / 2 - 6 && f.y > side.top + 1 && f.y < side.bottom - depth / 2 - 6,
    params: { spacing: 8, selfCollision: true },
  });
  const inside = (_id: string, f: Point) => f.x >= side.left && f.x <= side.right && f.y >= side.top && f.y <= side.bottom;
  return { world, fMesh, bMesh, dz, inside };
}

describe('zip pouch (boxed) cloth', () => {
  it('front and back seam round the pencil-case interior and the bottom boxes to the depth', () => {
    const inputs = makeDefaultZipPouchProject().inputs;
    const r = buildZip(inputs);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const res = resolveZip(inputs);
    const front = r.value.pieces.find((p) => p.id === 'front')!;
    const back = r.value.pieces.find((p) => p.id === 'back')!;
    const sa = res.seam_allowance;
    const outline = front.paths.find((p) => p.closed)!;
    const W = Math.max(...outline.edges.map((e) => e.end.x));
    const H = Math.max(...outline.edges.map((e) => e.end.y));
    // Stitch lines sit one seam allowance inside the left, right and bottom edges.
    const side = { left: sa, right: W - sa, bottom: H - sa, top: 0 };
    const stitch = front.paths.find((p) => p.id === 'front:stitch')!;
    expect(stitch.edges.some((e) => e.start.x === sa && e.end.x === sa)).toBe(true);
    expect(stitch.edges.some((e) => e.start.y === H - sa && e.end.y === H - sa)).toBe(true);
    const depth = res.finished_depth;
    const { world, fMesh, dz, inside } = twoPanelBag({
      front, back, depth, side,
      box: { cx: (side.left + side.right) / 2, halfW: res.finished_length / 2, halfH: res.finished_width / 2, baseY: side.bottom - depth / 2 },
    });
    relax(world, 400);
    expect(seamResidual(world).mean).toBeLessThan(3);
    // Inside the stitch lines; the allowance flaps outside them crumple at the corners (they are clipped in construction).
    expect(maxStretch(world, inside)).toBeLessThan(0.12);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    // The front face lies just outside the contents; the bottom seam has moved to mid-depth (boxed corner).
    const faceMid = vertexPosition(world, 0, nearestVertex(fMesh, { x: (side.left + side.right) / 2, y: side.bottom - depth / 2 - res.finished_width / 2 }));
    expect(faceMid[2]).toBeGreaterThan(-1);
    expect(faceMid[2]).toBeLessThan(12);
    const bottomMid = vertexPosition(world, 0, nearestVertex(fMesh, { x: (side.left + side.right) / 2, y: side.bottom }));
    expect(bottomMid[2]).toBeLessThan(dz / 2 + 12);
    expect(bottomMid[2]).toBeGreaterThan(dz - 5);
    // Finished envelope of the relaxed pouch, measured inside the stitch lines. Unfilled cloth
    // pillows, so the width lies between the finished length and the seam-to-seam width
    // (finished length + depth); the depth is the block's; the height is the finished width
    // plus up to half a depth where the base has not fully squared.
    const size = clothBounds(world, undefined, inside).size;
    expect(size[0]).toBeGreaterThan(res.finished_length - 4);
    expect(size[0]).toBeLessThan(res.finished_length + res.finished_depth + 4);
    // Depth pillows by about a third of a depth on an unfilled pouch.
    expect(size[2]).toBeGreaterThan(res.finished_depth - 2);
    expect(size[2]).toBeLessThan(res.finished_depth + 14);
    expect(size[1]).toBeGreaterThan(res.finished_width - 4);
    expect(size[1]).toBeLessThan(res.finished_width + res.finished_depth / 2 + 4);
  });
});

describe('roll-top sack cloth', () => {
  it('two panels french-seamed round the sack interior, collar left open', () => {
    const inputs = makeDefaultRollTopSackProject().inputs;
    const r = buildRoll(inputs);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const body = r.value.pieces.find((p) => p.id === 'body-panel')!;
    const back: Piece = { ...body, id: 'body-panel-back', name: 'Body Panel (back)' };
    const left = body.paths.find((p) => p.id === 'body-panel-left-stitch')!.edges[0];
    const right = body.paths.find((p) => p.id === 'body-panel-right-stitch')!.edges[0];
    const bottom = body.paths.find((p) => p.id === 'body-panel-bottom-stitch')!.edges[0];
    const collar = body.paths.find((p) => p.id === 'body-panel-collar-fold')!.edges[0];
    const side = { left: left.start.x, right: right.start.x, bottom: bottom.start.y, top: collar.start.y };
    const depth = inputs.bottom_width!;
    const { world, fMesh, dz, inside } = twoPanelBag({
      front: body, back, depth, side,
      box: { cx: (side.left + side.right) / 2, halfW: inputs.bottom_length! / 2, halfH: inputs.height_when_rolled! / 2, baseY: side.bottom - depth / 2 },
    });
    relax(world, 400);
    expect(seamResidual(world).mean).toBeLessThan(3);
    expect(maxStretch(world, inside)).toBeLessThan(0.12);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    const bottomMid = vertexPosition(world, 0, nearestVertex(fMesh, { x: (side.left + side.right) / 2, y: side.bottom }));
    expect(bottomMid[2]).toBeLessThan(dz / 2 + 12);
    // The collar above the fold is unseamed and stays roughly where the front panel is.
    const collarMid = vertexPosition(world, 0, nearestVertex(fMesh, { x: (side.left + side.right) / 2, y: side.top / 2 }));
    expect(collarMid[2]).toBeGreaterThan(dz);
    // Finished: 200 wide × 100 deep inside the stitch lines, below the collar fold.
    const size = clothBounds(world, undefined, inside).size;
    expect(size[0]).toBeGreaterThan(inputs.bottom_length! - 4);
    expect(size[0]).toBeLessThan(inputs.bottom_length! + depth + 4);
    expect(size[2]).toBeGreaterThan(depth - 2);
    expect(size[2]).toBeLessThan(depth + 16);
    expect(size[1]).toBeGreaterThan(inputs.height_when_rolled! - 6);
    expect(size[1]).toBeLessThan(inputs.height_when_rolled! + depth / 2 + 6);
  });
});

describe('tri-zip backpack cloth', () => {
  it('front (wing | zip strip | centre | zip strip | wing), gusset in its U, and back close round the finished block', () => {
    const proj = makeDefaultTriZipProject();
    const preset = getPreset(proj.inputs.stylePreset);
    const r = resolveTriZip(proj.inputs, preset);
    const built = buildTriZip(proj.inputs, preset);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const asm = triZipAssembly(built.value.pieces, r);
    expect(asm).not.toBeNull();
    if (!asm) return;
    const bodyIds = ['back-panel', WING_LEFT, ZIP_LEFT, 'front-center-panel', 'tri-zip-subsystem', 'front-wing', 'perimeter-gusset', 'top-panel'];
    const body = asm.pieces.filter((p) => bodyIds.includes(p.id));
    expect(body).toHaveLength(8);
    const { world, bounds } = assemble(body, asm.placements, asm.seams, asm.object, 12);
    // Rigid start: the gusset stands as a U under and beside the block, sides up to the top.
    const g0 = bounds('perimeter-gusset');
    expect(g0.lo[0]).toBeCloseTo(0, 0); expect(g0.hi[0]).toBeCloseTo(r.width, 0);
    expect(g0.lo[1]).toBeCloseTo(-r.height, 0); expect(g0.hi[1]).toBeCloseTo(0, 0);
    expect(g0.lo[2]).toBeCloseTo(0, 0); expect(g0.hi[2]).toBeCloseTo(r.depth, 0);
    // The assembled front is exactly the back panel's width (the wings gave up the zip strips' width).
    const wl = bounds(WING_LEFT), wr = bounds('front-wing');
    expect(wl.lo[0]).toBeCloseTo(0, 0); expect(wr.hi[0]).toBeCloseTo(r.width, 0);
    // Top panel lies flat over the block at the top, spanning the depth.
    const t0 = bounds('top-panel');
    expect(t0.hi[1] - t0.lo[1]).toBeLessThan(1); expect(t0.hi[1]).toBeCloseTo(0, 0);
    expect(t0.lo[2]).toBeCloseTo(0, 0); expect(t0.hi[2]).toBeCloseTo(r.depth, 0);
    relax(world, 500);
    expect(seamResidual(world).mean).toBeLessThan(1);
    expect(seamResidual(world).max).toBeLessThan(4);
    expect(maxStretch(world)).toBeLessThan(0.3);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    // Front stays in front of the block; gusset still spans the depth.
    const c = bounds('front-center-panel');
    expect(c.lo[2]).toBeGreaterThan(r.depth - 8);
    const g = bounds('perimeter-gusset');
    expect(g.hi[2] - g.lo[2]).toBeGreaterThan(r.depth - 6);
    // The top stays closed over the block.
    const t = bounds('top-panel');
    expect(t.lo[1]).toBeGreaterThan(-12);
    expect(t.hi[2] - t.lo[2]).toBeGreaterThan(r.depth - 8);
    // Finished: the inputs' 300 × 450 × 150, within a cloth thickness or two (front and back sit one gap off the block).
    const size = clothBounds(world).size;
    expect(Math.abs(size[0] - r.width)).toBeLessThan(25);
    expect(Math.abs(size[1] - r.height)).toBeLessThan(25);
    // The front bows out a little between its seams (a stuffed pack pillows the same way).
    expect(Math.abs(size[2] - (r.depth + 2))).toBeLessThan(25);
  });
});

describe('book cover cloth', () => {
  it('inner flaps ride inside the folded covers with the ease, seamed at the outer edges and hems', () => {
    const proj = makeDefaultBookCoverProject();
    const r = resolveBookCover(proj.inputs);
    const built = buildBookCover(proj.inputs);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const { coverW, spineW, cutWidth, cutHeight } = coverPanelDims(r);
    const SA = r.seam_allowance, hem = r.top_bottom_hem, flapW = r.flap_depth + SA + hem;
    const cover = 'cover-panel';
    const pieces = built.value.pieces.map((p) => (p.id === 'inner-flap-right' ? mirrorPieceX(p, p.id, p.name) : p));
    const line = (pieceId: string, from: Point, to: Point) => ({ pieceId, from, to });
    const placements: Record<string, PiecePlacement> = {
      'inner-flap-left': { dx: 0, dy: 0, dz: 1.2, attach: { pieceId: cover, point: { x: SA + coverW / 2, y: cutHeight / 2 } } },
      'inner-flap-right': { dx: cutWidth - flapW, dy: 0, dz: 1.2, attach: { pieceId: cover, point: { x: cutWidth - SA - coverW / 2, y: cutHeight / 2 } } },
    };
    const seams: SeamSpec[] = [
      { label: 'left outer', a: line('inner-flap-left', { x: SA, y: hem }, { x: SA, y: cutHeight - hem }), b: line(cover, { x: SA, y: hem }, { x: SA, y: cutHeight - hem }) },
      { label: 'left top', a: line('inner-flap-left', { x: SA, y: hem }, { x: flapW - hem, y: hem }), b: line(cover, { x: SA, y: hem }, { x: flapW - hem, y: hem }) },
      { label: 'left bottom', a: line('inner-flap-left', { x: SA, y: cutHeight - hem }, { x: flapW - hem, y: cutHeight - hem }), b: line(cover, { x: SA, y: cutHeight - hem }, { x: flapW - hem, y: cutHeight - hem }) },
      { label: 'right outer', a: line('inner-flap-right', { x: flapW - SA, y: hem }, { x: flapW - SA, y: cutHeight - hem }), b: line(cover, { x: cutWidth - SA, y: hem }, { x: cutWidth - SA, y: cutHeight - hem }) },
      { label: 'right top', a: line('inner-flap-right', { x: hem, y: hem }, { x: flapW - SA, y: hem }), b: line(cover, { x: cutWidth - flapW + hem, y: hem }, { x: cutWidth - SA, y: hem }) },
      { label: 'right bottom', a: line('inner-flap-right', { x: hem, y: cutHeight - hem }, { x: flapW - SA, y: cutHeight - hem }), b: line(cover, { x: cutWidth - flapW + hem, y: cutHeight - hem }, { x: cutWidth - SA, y: cutHeight - hem }) },
    ];
    const object: AssemblyObject = {
      width: r.spine_width, depth: r.book_width, height: r.book_height,
      base: { pieceId: cover, point: { x: SA + coverW + spineW / 2, y: cutHeight - hem }, direction: { x: 0, y: -1 } },
    };
    const { world, bounds } = assemble(pieces, placements, seams, object, 8);
    // Attached flaps start folded with their covers: each lies in a plane between its cover and the book.
    const bookL = SA + coverW + spineW / 2 - r.spine_width / 2;
    const bookR = bookL + r.spine_width;
    const fl = bounds('inner-flap-left'), fr = bounds('inner-flap-right');
    expect(fl.hi[0] - fl.lo[0]).toBeLessThan(2.5);
    expect(fl.lo[0]).toBeGreaterThan(SA + coverW); expect(fl.hi[0]).toBeLessThan(bookL);
    expect(fr.hi[0] - fr.lo[0]).toBeLessThan(2.5);
    expect(fr.hi[0]).toBeLessThan(SA + coverW + spineW); expect(fr.lo[0]).toBeGreaterThan(bookR);
    // Seams already meet at the pressed start; relaxing changes nothing that matters.
    expect(seamResidual(world).max).toBeLessThan(0.5);
    relax(world, 200);
    expect(seamResidual(world).max).toBeLessThan(1);
    expect(maxStretch(world)).toBeLessThan(0.05);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
  });
});

describe('padded strap on a torso', () => {
  it('a J-curve pack pad drapes over the shoulder with its ends held, clear of the body and under 12 % stretch', () => {
    const inputs = { units: 'mm' as const, mode: 'pack_pair' as const, pad_length: 400, pad_width: 60, torso_length: 500, gusset_depth: 150 };
    const built = buildStrap(inputs);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const asm = paddedStrapAssembly(built.value.pieces, resolveStrap(inputs));
    expect(asm).not.toBeNull();
    if (!asm) return;
    const pads = asm.pieces.filter((p) => p.id === PAD_PIECE_ID || p.id === PAD_LEFT_ID);
    const { world, bounds } = assemble(pads, asm.placements, asm.seams, asm.object, 8, asm.pins);
    // Draped start: the right pad crests above the torso top, on the right shoulder.
    const r0 = bounds(PAD_PIECE_ID);
    expect(r0.hi[1]).toBeGreaterThan(asm.object.height);
    expect(r0.lo[0]).toBeGreaterThan(0);
    expect(maxPenetration(world)).toBeLessThan(1);
    relax(world, 300);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    expect(maxStretch(world)).toBeLessThan(0.12);
    // Still on the shoulder, both ends where they were pinned.
    const r1 = bounds(PAD_PIECE_ID);
    expect(r1.hi[1]).toBeGreaterThan(asm.object.height - 5);
  });

  it('H-harness: the cross strap reaches both pads only when the spread matches the torso', () => {
    const base = { units: 'mm' as const, mode: 'h_harness' as const, pad_length: 400, pad_width: 63.5, cross_strap_height: 150, drop_leg_length: 300, foam_thickness: 10 };
    const run = (pad_spread: number) => {
      const inputs = { ...base, pad_spread };
      const built = buildStrap(inputs);
      expect(built.ok).toBe(true);
      if (!built.ok) throw new Error('build');
      const asm = paddedStrapAssembly(built.value.pieces, resolveStrap(inputs))!;
      const body = asm.pieces.filter((p) => [PAD_PIECE_ID, PAD_LEFT_ID, CROSS_STRAP_PIECE_ID].includes(p.id));
      expect(body).toHaveLength(3);
      const { world } = assemble(body, asm.placements, asm.seams, asm.object, 10, asm.pins);
      relax(world, 300);
      return { seam: seamResidual(world), pen: maxPenetration(world), stretch: maxStretch(world) };
    };
    // Medium torso: the pads' inner edges are about 180 mm apart at the crossing.
    const fits = run(150);
    expect(fits.seam.mean).toBeLessThan(3);
    expect(fits.pen).toBeLessThan(1.2);
    expect(fits.stretch).toBeLessThan(0.15);
    // The fit report compares the torso's pad gap with the range the slots cover.
    const asmOk = paddedStrapAssembly(buildStrap({ ...base, pad_spread: 150 }).ok ? (buildStrap({ ...base, pad_spread: 150 }) as { ok: true; value: { pieces: Piece[] } }).value.pieces : [], resolveStrap({ ...base, pad_spread: 150 }))!;
    expect(asmOk.fit?.ok).toBe(true);
    expect(asmOk.fit!.padGap).toBeGreaterThan(150);
    expect(asmOk.fit!.padGap).toBeLessThan(150 + 203.2);
    const asmWide = paddedStrapAssembly(asmOk.pieces, resolveStrap({ ...base, pad_spread: 300 }))!;
    expect(asmWide.fit?.ok).toBe(false);
    expect(asmWide.report[0]).toMatch(/reduce the spread/);
  });
});

describe('tri-zip variants', () => {
  const run = (overrides: Record<string, unknown>) => {
    const proj = makeDefaultTriZipProject();
    const inputs = { ...proj.inputs, ...overrides };
    const preset = getPreset(inputs.stylePreset);
    const r = resolveTriZip(inputs, preset);
    const built = buildTriZip(inputs, preset);
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error('build');
    const asm = triZipAssembly(built.value.pieces, r);
    expect(asm).not.toBeNull();
    const body = asm!.pieces.filter((p) => p.id in asm!.placements);
    const { world, bounds } = assemble(body, asm!.placements, asm!.seams, asm!.object, 12);
    relax(world, 500);
    return { r, world, bounds, body };
  };
  it('split gusset: the two halves meet at the bottom centre and close round the block', () => {
    const { r, world, bounds, body } = run({ split_gusset: true });
    expect(body.some((p) => p.id === 'perimeter-gusset-a') && body.some((p) => p.id === 'perimeter-gusset-b')).toBe(true);
    expect(seamResidual(world).mean).toBeLessThan(1.5);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    const a = bounds('perimeter-gusset-a'), b = bounds('perimeter-gusset-b');
    // Each half spans from its side to the bottom centre (allowance flaps flare a little).
    expect(Math.abs(a.lo[0])).toBeLessThan(15);
    expect(Math.abs(b.hi[0] - r.width)).toBeLessThan(15);
    expect(a.hi[0]).toBeGreaterThan(r.width / 2 - 5);
    expect(b.lo[0]).toBeLessThan(r.width / 2 + 5);
  });
  it('direct zips: wings meet the centre panel and the front still equals the back width', () => {
    const { r, world, bounds, body } = run({ zipper_method: 'direct' });
    expect(body.some((p) => p.id === 'tri-zip-subsystem')).toBe(false);
    expect(seamResidual(world).mean).toBeLessThan(1.5);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    const wl = bounds('front-wing-left'), wr = bounds('front-wing');
    expect(Math.abs(wl.lo[0])).toBeLessThan(3);
    expect(Math.abs(wr.hi[0] - r.width)).toBeLessThan(3);
  });
});

describe('zip pouch styles', () => {
  const run = (overrides: Record<string, unknown>) => {
    const inputs = { ...makeDefaultZipPouchProject().inputs, ...overrides };
    const built = buildZip(inputs);
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error('build');
    const r = resolveZip(inputs);
    const asm = zipPouchAssembly(built.value.pieces, r);
    expect(asm).not.toBeNull();
    const body = asm!.pieces.filter((p) => p.id in asm!.placements || p.id === asm!.object.base?.pieceId);
    const { world, bounds } = assemble(body, asm!.placements, asm!.seams, asm!.object, 8, asm!.pins ?? [], undefined, [], asm!.selfCollision ?? true);
    relax(world, 400);
    return { r, world, bounds, asm: asm! };
  };
  it('gusset strip: the U band seams to both panels round the block', () => {
    const { r, world, bounds } = run({ construction_style: 'gusset-strip' });
    expect(seamResidual(world).mean).toBeLessThan(1.5);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    const g = bounds('gusset-strip');
    expect(g.hi[2] - g.lo[2]).toBeGreaterThan(r.finished_depth - 4);
    expect(g.hi[0] - g.lo[0]).toBeGreaterThan(r.finished_length - 4);
  });
  it('multi-panel: bottom under, ends on edge, all six seams close', () => {
    const { r, world, bounds } = run({ construction_style: 'multi-panel' });
    expect(seamResidual(world).mean).toBeLessThan(1.5);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    const bottom = bounds('bottom-panel');
    // Flat under the block; its seam allowance flaps turn up at the edges.
    expect(bottom.hi[1] - bottom.lo[1]).toBeLessThan(2 * r.seam_allowance + 8);
    const endL = bounds('end-panel-left');
    expect(endL.hi[0] - endL.lo[0]).toBeLessThan(12);
    expect(endL.hi[2] - endL.lo[2]).toBeGreaterThan(r.finished_depth - 4);
  });
  it('cross-bottom: bands and arms fold toward each other round the block (corner cutouts left open)', () => {
    const { r, world, bounds } = run({ construction_style: 'cross-bottom' });
    expect(seamResidual(world).mean).toBeLessThan(2);
    expect(maxStretch(world, (_id, f) => f.x > r.seam_allowance && f.x < 2 * r.finished_length && f.y > r.seam_allowance)).toBeLessThan(0.3);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    const back = bounds('cross-panel-back'), front = bounds('cross-panel');
    // Zipper edges at the top, block between the two faces.
    expect(back.hi[1]).toBeGreaterThan(r.finished_width - 5);
    expect(front.hi[2] - back.lo[2]).toBeGreaterThan(r.finished_depth);
  });
});

describe('circle skirt cloth', () => {
  it('panels wrap into a cone from the waist, seam to their neighbours and hang over the hips', () => {
    const inputs = makeDefaultCircleSkirtProject().inputs;
    const built = buildCircleSkirt(inputs);
    const r = resolveCircleSkirt(inputs);
    const asm = circleSkirtAssembly(built.pieces, r);
    expect(asm).not.toBeNull();
    if (!asm) return;
    const { world, bounds } = assemble(asm.pieces, asm.placements, asm.seams, null, 16, asm.pins, asm.gravity, asm.solids);
    // Waist ring starts at the apex height; hem below it.
    const all0 = clothBounds(world);
    expect(all0.hi[1]).toBeLessThan(1);
    expect(maxPenetration(world)).toBeLessThan(1);
    relax(world, 400);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    expect(seamResidual(world).mean).toBeLessThan(2.5);
    expect(maxStretch(world)).toBeLessThan(0.15);
    const all = clothBounds(world);
    // Hangs well down (a flared skirt's hem sits above a plumb drop) and wider than the hips.
    expect(-all.lo[1]).toBeGreaterThan(0.65 * r.skirt_length);
    const hipR = (r.hip_circumference / (2 * Math.PI)) * 1.05;
    expect(all.hi[0] - all.lo[0]).toBeGreaterThan(2 * hipR);
    void bounds;
  });
});

describe('micro rig, stacked .308 cells', () => {
  it('rear pouch seams to the panel round a flat-side-out magazine and the front pouch stands a stack layer out', () => {
    const built = buildMicroRig({ units: 'in', panel_width_preset: 'r308_14', pocket_set: 'stacked_cells', magazine_preset_id: 'pmag_308_20', cell_count: 2, cells_deep: 2 });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const asm = microRigAssembly(built.value.pieces, built.value.resolved)!;
    const body = asm.pieces.filter((p) => p.id in asm.placements || p.id === asm.object.base.pieceId);
    const { world, bounds } = assemble(body, asm.placements, asm.seams, asm.object, 8, asm.pins ?? []);
    relax(world, 400);
    expect(seamResidual(world).mean).toBeLessThan(3);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    const r = built.value.resolved;
    const rear = bounds(REAR_POUCH_ID), front = bounds(FRONT_POUCH_ID);
    // The rear pouch wraps the magazine's thickness; the front pouch (empty — the viewer holds one
    // object) collapses onto it but stays outside it, its wrap allowance slack.
    expect(rear.hi[2]).toBeGreaterThan(r.mag.thickness);
    expect(front.hi[2]).toBeGreaterThan(rear.hi[2] - 6);
    expect(front.hi[2]).toBeLessThan(r.stack_depth + 40);
    // A flat 3.4" cell round a 2.9 × 1.1" magazine only closes because the panel bows behind it.
    const panelBow = bounds('panel-front').hi[2];
    expect(panelBow).toBeGreaterThan(5);
    expect(panelBow).toBeLessThan(r.mag.thickness);
  });
});
