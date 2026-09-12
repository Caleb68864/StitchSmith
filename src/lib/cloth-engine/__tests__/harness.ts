/**
 * The viewer's assembly, without the viewer: fold each piece, place it (rotation,
 * offsets, riding on a host region), mesh it, seam it, and stand the object's box
 * (or torso) on the host. Mirrors FoldViewer's simulate mode so a page and its
 * test agree. Shared by every generator's cloth check.
 */
import type { Piece } from '../../pattern-engine/graph/Piece.js';
import type { Point } from '../../pattern-engine/graph/Point.js';
import { buildClothMesh, createWorld, foldedInitial, foldedCreaseRest, torsoForm, materialBendStiffness, materialPlateStiffness, DEFAULT_CLOTH_PARAMS, pinHolds, type SeamSpec, type Solid, type Vec3, type PinSpec } from '../index.js';
import { buildFoldModel, defaultFoldAngles, regionAt, onAnyFold, makePlacer, placementMap, type PlacedEntry, type PiecePlacement } from '../../fold-engine/index.js';

export interface AssemblyObject {
  width: number; depth: number; height: number; pin?: 'root' | 'footprint';
  base?: { pieceId: string; point: Point; direction: Point };
  shape?: 'box' | 'torso';
  torso?: { shoulderWidth: number; neckRadius: number };
  at?: Vec3;
}
export type Pin = PinSpec;

/**
 * The viewer's assembly, without the viewer: fold each piece, place it (rotation,
 * offsets, riding on a host region), mesh it, seam it, and stand the object's box
 * on the host. Mirrors FoldViewer's simulate mode so a page and its test agree.
 */
export function assemble(pieces: Piece[], placements: Record<string, PiecePlacement>, seams: SeamSpec[], object: AssemblyObject | null, spacing: number, pins: Pin[] = [], gravity?: Vec3, extraSolids: Solid[] = [], selfCollision = true) {
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
