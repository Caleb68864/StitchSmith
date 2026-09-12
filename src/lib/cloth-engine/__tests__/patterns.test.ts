// @vitest-environment node
/**
 * Cloth assembly of the other pouch-like patterns, each with the object it is
 * built to hold as the collider. These are the checks that caught the mag
 * pouch's short lid; here they guard the zip pouch and roll-top geometry.
 */
import { describe, it, expect } from 'vitest';
import type { Piece } from '../../pattern-engine/graph/Piece.js';
import { buildClothMesh, nearestVertex, createWorld, relax, seamResidual, maxStretch, maxPenetration, vertexPosition, foldedInitial, foldedCreaseRest, type SeamSpec } from '../index.js';
import { buildFoldModel, defaultFoldAngles, regionAt, onAnyFold, makePlacer, mirrorPieceX, type PlacedEntry, type PiecePlacement } from '../../fold-engine/index.js';
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
  base: { pieceId: string; point: Point; direction: Point };
}

/**
 * The viewer's assembly, without the viewer: fold each piece, place it (rotation,
 * offsets, riding on a host region), mesh it, seam it, and stand the object's box
 * on the host. Mirrors FoldViewer's simulate mode so a page and its test agree.
 */
function assemble(pieces: Piece[], placements: Record<string, PiecePlacement>, seams: SeamSpec[], object: AssemblyObject, spacing: number) {
  const entries: (PlacedEntry & { piece: Piece })[] = pieces.map((piece) => {
    const pl = placements[piece.id];
    let rootPoint = pl?.rootPoint;
    if (!rootPoint && object.base.pieceId === piece.id) rootPoint = { x: object.base.point.x + object.base.direction.x, y: object.base.point.y + object.base.direction.y };
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
  const inits = entries.map((e) => foldedInitial({ model: e.model, angles: anglesOf(e), transform: placer(e) }));
  const creases = entries.map((e) => foldedCreaseRest({ model: e.model, angles: anglesOf(e) }));
  const host = entries.find((e) => e.piece.id === object.base.pieceId)!;
  const b = object.base;
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
  const world = createWorld({
    meshes,
    initial: (mi, _v, f) => inits[mi](f),
    bendRest: (mi, k, l, i, j) => creases[mi](k, l, i, j),
    seams,
    solids: [{ kind: 'box', center: centre, half: [object.width / 2, object.height / 2, object.depth / 2] }],
    pinned: (mi, _v, f) => entries[mi].piece.id === object.base.pieceId && regionAt(entries[mi].model, f) === entries[mi].model.root
      && !onAnyFold(entries[mi].model, f, 1.5) && (object.pin !== 'footprint' || under(f)),
    params: { spacing },
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
    params: { spacing: 8 },
  });
  return { world, fMesh, bMesh, dz };
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
    const { world, fMesh, dz } = twoPanelBag({
      front, back, depth, side,
      box: { cx: (side.left + side.right) / 2, halfW: res.finished_length / 2, halfH: res.finished_width / 2, baseY: side.bottom - depth / 2 },
    });
    relax(world, 400);
    expect(seamResidual(world).mean).toBeLessThan(3);
    expect(maxStretch(world)).toBeLessThan(0.12);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    // The front face lies just outside the contents; the bottom seam has moved to mid-depth (boxed corner).
    const faceMid = vertexPosition(world, 0, nearestVertex(fMesh, { x: (side.left + side.right) / 2, y: side.bottom - depth / 2 - res.finished_width / 2 }));
    expect(faceMid[2]).toBeGreaterThan(-1);
    expect(faceMid[2]).toBeLessThan(12);
    const bottomMid = vertexPosition(world, 0, nearestVertex(fMesh, { x: (side.left + side.right) / 2, y: side.bottom }));
    expect(bottomMid[2]).toBeLessThan(dz / 2 + 12);
    expect(bottomMid[2]).toBeGreaterThan(dz - 5);
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
    const { world, fMesh, dz } = twoPanelBag({
      front: body, back, depth, side,
      box: { cx: (side.left + side.right) / 2, halfW: inputs.bottom_length! / 2, halfH: inputs.height_when_rolled! / 2, baseY: side.bottom - depth / 2 },
    });
    relax(world, 400);
    expect(seamResidual(world).mean).toBeLessThan(3);
    expect(maxStretch(world)).toBeLessThan(0.12);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    const bottomMid = vertexPosition(world, 0, nearestVertex(fMesh, { x: (side.left + side.right) / 2, y: side.bottom }));
    expect(bottomMid[2]).toBeLessThan(dz / 2 + 12);
    // The collar above the fold is unseamed and stays roughly where the front panel is.
    const collarMid = vertexPosition(world, 0, nearestVertex(fMesh, { x: (side.left + side.right) / 2, y: side.top / 2 }));
    expect(collarMid[2]).toBeGreaterThan(dz);
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
    const bodyIds = ['back-panel', WING_LEFT, ZIP_LEFT, 'front-center-panel', 'tri-zip-subsystem', 'front-wing', 'perimeter-gusset'];
    const body = asm.pieces.filter((p) => bodyIds.includes(p.id));
    expect(body).toHaveLength(7);
    const { world, bounds } = assemble(body, asm.placements, asm.seams, asm.object, 12);
    // Rigid start: the gusset stands as a U under and beside the block, sides up to the top.
    const g0 = bounds('perimeter-gusset');
    expect(g0.lo[0]).toBeCloseTo(0, 0); expect(g0.hi[0]).toBeCloseTo(r.width, 0);
    expect(g0.lo[1]).toBeCloseTo(-r.height, 0); expect(g0.hi[1]).toBeCloseTo(0, 0);
    expect(g0.lo[2]).toBeCloseTo(0, 0); expect(g0.hi[2]).toBeCloseTo(r.depth, 0);
    // The assembled front is exactly the back panel's width (the wings gave up the zip strips' width).
    const wl = bounds(WING_LEFT), wr = bounds('front-wing');
    expect(wl.lo[0]).toBeCloseTo(0, 0); expect(wr.hi[0]).toBeCloseTo(r.width, 0);
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
