/**
 * 3D assembly of the Tri-Zip body for the fold preview and cloth check: the
 * front (wing | zip strip | centre | zip strip | wing — or wing | centre | wing
 * with direct zips) face to face with the back panel round a block of the
 * finished size, the perimeter gusset (one strip or two halves) turned into
 * its U and seamed to both, and the top panel flat over the block.
 * Coordinates are flat pattern mm per piece.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import { mirrorPieceX, type PiecePlacement } from '../../lib/fold-engine/index.js';
import type { SeamSpec } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs } from './types.js';
import { frontWingWidth } from './modules/frontWing.js';

export interface TriZipAssembly {
  pieces: Piece[];
  object: {
    width: number; depth: number; height: number; label: string; pin: 'footprint';
    base: { pieceId: string; point: Point; direction: Point };
  };
  placements: Record<string, PiecePlacement>;
  seams: SeamSpec[];
}

export const WING_LEFT = 'front-wing-left';
export const WING_RIGHT = 'front-wing';
export const ZIP_LEFT = 'tri-zip-subsystem-left';
export const ZIP_RIGHT = 'tri-zip-subsystem';

const v = (pieceId: string, x: number, y0: number, y1: number) => ({ pieceId, from: { x, y: y0 }, to: { x, y: y1 } });
const h = (pieceId: string, y: number, x0: number, x1: number) => ({ pieceId, from: { x: x0, y }, to: { x: x1, y } });

/** Returns null when the body cannot be assembled (missing pieces). */
export function triZipAssembly(pieces: Piece[], r: ResolvedInputs): TriZipAssembly | null {
  const back = pieces.find((p) => p.id === 'back-panel');
  const centre = pieces.find((p) => p.id === 'front-center-panel');
  const wing = pieces.find((p) => p.id === 'front-wing');
  const zip = pieces.find((p) => p.id === 'tri-zip-subsystem');
  const top = pieces.find((p) => p.id === 'top-panel');
  const gusset = pieces.find((p) => p.id === 'perimeter-gusset');
  const gA = pieces.find((p) => p.id === 'perimeter-gusset-a');
  const gB = pieces.find((p) => p.id === 'perimeter-gusset-b');
  const gusseted = r.zipper_method === 'gusseted';
  if (!back || !centre || !wing || !top || (gusseted && !zip) || (!gusset && !(gA && gB))) return null;

  const { width, height, depth } = r;
  const wingW = frontWingWidth(r);
  const zipW = gusseted ? r.zipper_gusset_width : 0;
  const centreW = width * (r.center_panel_width_percent / 100);
  // As drawn, the wing's interior edge and the strip's centre-panel edge are at x = 0, so the
  // drawings are the RIGHT-hand parts; the left-hand parts are their mirrors.
  const wingLeft = mirrorPieceX(wing, WING_LEFT, 'Front Wing (left)');
  const zipLeft = zip ? mirrorPieceX(zip, ZIP_LEFT, 'Tri-Zip Gusset Strip (left)') : null;
  // Front, left to right: piece id, its finished width, and its flat x range for the join edges.
  const front: { id: string; w: number }[] = gusseted && zip && zipLeft
    ? [{ id: WING_LEFT, w: wingW }, { id: ZIP_LEFT, w: zipW }, { id: 'front-center-panel', w: centreW }, { id: ZIP_RIGHT, w: zipW }, { id: WING_RIGHT, w: wingW }]
    : [{ id: WING_LEFT, w: wingW }, { id: 'front-center-panel', w: centreW }, { id: WING_RIGHT, w: wingW }];
  const gussetPieces: Piece[] = gusset ? [gusset] : [gA!, gB!];
  const body: Piece[] = [back, wingLeft, ...(zipLeft ? [zipLeft] : []), centre, ...(zip && gusseted ? [zip] : []), wing, ...gussetPieces, top];
  const extras = pieces.filter((p) => !body.includes(p) && p.id !== 'front-wing' && p.id !== 'tri-zip-subsystem');

  const dzFront = depth + 2;
  const placements: TriZipAssembly['placements'] = { 'back-panel': { dx: 0, dy: 0, dz: 0, keep: true } };
  const seams: SeamSpec[] = [];
  let x = 0;
  front.forEach((seg, i) => {
    placements[seg.id] = { dx: x, dy: 0, dz: dzFront, keep: true };
    if (i > 0) {
      const prev = front[i - 1];
      seams.push({ label: `${prev.id} ↔ ${seg.id}`, a: v(prev.id, prev.w, 0, height), b: v(seg.id, 0, 0, height) });
    }
    x += seg.w;
  });

  // Gusset: flat strip = left side | bottom | right side (one piece, or split at the bottom centre).
  // Each piece is rooted on its bottom run, turned up with rx −90 (its depth then runs along z),
  // and slid so its bottom lies under the panels. `gAt(t)` maps a distance along the full
  // perimeter (0 at the top of the left side) to a piece and a flat x on it.
  const perimeter = 2 * height + width;
  const halfLen = perimeter / 2;
  /** Which gusset piece carries the run t0..t1 (never straddling the join), and the flat x of t on it. */
  const gAt = (t: number, mid: number): { id: string; x: number } => {
    if (gusset) return { id: gusset.id, x: t };
    return mid < halfLen ? { id: gA!.id, x: t } : { id: gB!.id, x: t - halfLen };
  };
  if (gusset) {
    placements[gusset.id] = { rootPoint: { x: height + width / 2, y: depth / 2 }, rx: -90, dx: -height, dy: height, dz: 0, keep: true };
  } else {
    placements[gA!.id] = { rootPoint: { x: (height + halfLen) / 2, y: depth / 2 }, rx: -90, dx: -height, dy: height, dz: 0, keep: true };
    placements[gB!.id] = { rootPoint: { x: (halfLen - height) / 2, y: depth / 2 }, rx: -90, dx: width - (halfLen - height), dy: height, dz: 0, keep: true };
    seams.push({ label: 'gusset halves', a: v(gA!.id, halfLen, 0, depth), b: v(gB!.id, 0, 0, depth) });
  }
  /** Seam a run of the gusset edge at flat y (0 = back edge, depth = front edge) from t0 to t1 against `other`, splitting at the halves' join. */
  const gRun = (label: string, y: number, t0: number, t1: number, other: (u0: number, u1: number) => SeamSpec['b']) => {
    const cuts = gusset || t1 <= halfLen || t0 >= halfLen ? [[t0, t1]] : [[t0, halfLen], [halfLen, t1]];
    for (const [a, b] of cuts) {
      const mid = (a + b) / 2;
      const ga = gAt(a, mid), gb = gAt(b, mid);
      seams.push({ label, a: { pieceId: ga.id, from: { x: ga.x, y }, to: { x: gb.x, y } }, b: other(a, b) });
    }
  };
  // Front perimeter: left wing outer top→bottom, bottoms left→right, right wing outer bottom→top.
  gRun('gusset ↔ left wing outer', depth, 0, height, (u0, u1) => v(WING_LEFT, 0, u0, u1));
  let t = height;
  for (const seg of front) {
    const t0 = t, t1 = t + seg.w;
    gRun(`gusset ↔ ${seg.id} bottom`, depth, t0, t1, (u0, u1) => h(seg.id, height, u0 - t0, u1 - t0));
    t = t1;
  }
  gRun('gusset ↔ right wing outer', depth, height + width, perimeter, (u0, u1) => v(WING_RIGHT, wingW, height - (u0 - height - width), height - (u1 - height - width)));
  // Back perimeter.
  gRun('gusset ↔ back left', 0, 0, height, (u0, u1) => v('back-panel', 0, u0, u1));
  gRun('gusset ↔ back bottom', 0, height, height + width, (u0, u1) => h('back-panel', height, u0 - height, u1 - height));
  gRun('gusset ↔ back right', 0, height + width, perimeter, (u0, u1) => v('back-panel', width, height - (u0 - height - width), height - (u1 - height - width)));

  // Top panel: laid flat over the block (its depth along z), back edge (flat y = 0) at the back.
  placements['top-panel'] = { rx: -90, dx: 0, dy: 0, dz: 0, keep: true };
  seams.push({ label: 'top ↔ back top', a: h('top-panel', 0, 0, width), b: h('back-panel', 0, 0, width) });
  x = 0;
  for (const seg of front) {
    seams.push({ label: `top ↔ ${seg.id} top`, a: h('top-panel', depth, x, x + seg.w), b: h(seg.id, 0, 0, seg.w) });
    x += seg.w;
  }
  const gL = gAt(0, 0), gR = gAt(perimeter, perimeter);
  seams.push(
    { label: 'top ↔ gusset left end', a: v('top-panel', 0, 0, depth), b: v(gL.id, gL.x, 0, depth) },
    { label: 'top ↔ gusset right end', a: v('top-panel', width, 0, depth), b: v(gR.id, gR.x, 0, depth) },
  );

  return {
    pieces: [...body, ...extras],
    object: {
      // The pack is closed top and bottom, so the block leaves a cloth thickness at each end.
      width, depth, height: height - 4, label: 'contents', pin: 'footprint',
      base: { pieceId: 'back-panel', point: { x: width / 2, y: height }, direction: { x: 0, y: -1 } },
    },
    placements,
    seams,
  };
}
