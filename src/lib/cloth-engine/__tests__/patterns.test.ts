// @vitest-environment node
/**
 * Cloth assembly of the other pouch-like patterns, each with the object it is
 * built to hold as the collider. These are the checks that caught the mag
 * pouch's short lid; here they guard the zip pouch and roll-top geometry.
 */
import { describe, it, expect } from 'vitest';
import type { Piece } from '../../pattern-engine/graph/Piece.js';
import { buildClothMesh, nearestVertex, createWorld, relax, seamResidual, maxStretch, maxPenetration, vertexPosition, foldedInitial, foldedCreaseRest, type SeamSpec } from '../index.js';
import { buildFoldModel, defaultFoldAngles, regionAt, onAnyFold } from '../../fold-engine/index.js';
import { makeDefaultZipPouchProject } from '../../../state/useZipPouchProject.js';
import { makeDefaultRollTopSackProject } from '../../../state/useRollTopSackProject.js';
import { buildPattern as buildZip } from '../../../generators/zip-pouch/buildPattern.js';
import { resolveInputs as resolveZip } from '../../../generators/zip-pouch/inputs.js';
import { buildPattern as buildRoll } from '../../../generators/roll-top-sack/index.js';

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
