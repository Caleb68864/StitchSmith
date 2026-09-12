/**
 * 3D assembly of the Tri-Zip body for the fold preview and cloth check: the
 * front (wing | zip strip | centre | zip strip | wing) face to face with the
 * back panel round a block of the finished size, the perimeter gusset turned
 * into its U and seamed to both. Coordinates are flat pattern mm per piece.
 *
 * The top panel lies flat over the block, seamed to the back and front top
 * edges and to both gusset ends, so the block is fully enclosed.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import { mirrorPieceX } from '../../lib/fold-engine/index.js';
import type { SeamSpec } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs } from './types.js';
import { frontWingWidth } from './modules/frontWing.js';

export interface TriZipAssembly {
  pieces: Piece[];
  object: {
    width: number; depth: number; height: number; label: string; pin: 'footprint';
    base: { pieceId: string; point: Point; direction: Point };
  };
  placements: Record<string, { dx?: number; dy?: number; dz?: number; rx?: number; rootPoint?: Point; keep?: boolean }>;
  seams: SeamSpec[];
}

export const WING_LEFT = 'front-wing-left';
export const WING_RIGHT = 'front-wing';
export const ZIP_LEFT = 'tri-zip-subsystem-left';
export const ZIP_RIGHT = 'tri-zip-subsystem';

/** Returns null when the body cannot be assembled (direct zips, split gusset, missing pieces). */
export function triZipAssembly(pieces: Piece[], r: ResolvedInputs): TriZipAssembly | null {
  const back = pieces.find((p) => p.id === 'back-panel');
  const centre = pieces.find((p) => p.id === 'front-center-panel');
  const wing = pieces.find((p) => p.id === 'front-wing');
  const zip = pieces.find((p) => p.id === 'tri-zip-subsystem');
  const gusset = pieces.find((p) => p.id === 'perimeter-gusset');
  const top = pieces.find((p) => p.id === 'top-panel');
  if (!back || !centre || !wing || !zip || !gusset || !top || r.zipper_method !== 'gusseted') return null;

  const { width, height, depth } = r;
  const wingW = frontWingWidth(r);
  const zipW = r.zipper_gusset_width;
  const centreW = width * (r.center_panel_width_percent / 100);
  // As drawn, the wing's interior edge and the strip's centre-panel edge are at x = 0, so the
  // drawings are the RIGHT-hand parts; the left-hand parts are their mirrors.
  const wingLeft = mirrorPieceX(wing, WING_LEFT, 'Front Wing (left)');
  const zipLeft = mirrorPieceX(zip, ZIP_LEFT, 'Tri-Zip Gusset Strip (left)');
  const body: Piece[] = [back, wingLeft, zipLeft, centre, zip, wing, gusset, top];
  const extras = pieces.filter((p) => !body.includes(p) && p.id !== 'front-wing' && p.id !== 'tri-zip-subsystem');

  const front = depth + 2;
  const xWingL = 0;
  const xZipL = wingW;
  const xCentre = wingW + zipW;
  const xZipR = xCentre + centreW;
  const xWingR = xZipR + zipW;
  const placements: TriZipAssembly['placements'] = {
    'back-panel': { dx: 0, dy: 0, dz: 0, keep: true },
    [WING_LEFT]: { dx: xWingL, dy: 0, dz: front, keep: true },
    [ZIP_LEFT]: { dx: xZipL, dy: 0, dz: front, keep: true },
    'front-center-panel': { dx: xCentre, dy: 0, dz: front, keep: true },
    [ZIP_RIGHT]: { dx: xZipR, dy: 0, dz: front, keep: true },
    [WING_RIGHT]: { dx: xWingR, dy: 0, dz: front, keep: true },
    // Gusset: flat strip = left side | bottom | right side. Root on the bottom, turn the sides up
    // (rx −90° lays the strip's depth along z), and slide it so the bottom sits under the panels.
    'perimeter-gusset': { rootPoint: { x: height + width / 2, y: depth / 2 }, rx: -90, dx: -height, dy: height, dz: 0, keep: true },
    // Top panel: laid flat over the block (its depth along z), back edge (flat y = 0) at the back.
    'top-panel': { rx: -90, dx: 0, dy: 0, dz: 0, keep: true },
  };

  const v = (pieceId: string, x: number, y0: number, y1: number) => ({ pieceId, from: { x, y: y0 }, to: { x, y: y1 } });
  const h = (pieceId: string, y: number, x0: number, x1: number) => ({ pieceId, from: { x: x0, y }, to: { x: x1, y } });
  const G = 'perimeter-gusset';
  const gLeft = (t0: number, t1: number, y: number) => h(G, y, t0, t1);
  const seams: SeamSpec[] = [
    // Front: four vertical joins, full height.
    { label: 'left wing ↔ left zip strip', a: v(WING_LEFT, wingW, 0, height), b: v(ZIP_LEFT, 0, 0, height) },
    { label: 'left zip strip ↔ centre', a: v(ZIP_LEFT, zipW, 0, height), b: v('front-center-panel', 0, 0, height) },
    { label: 'centre ↔ right zip strip', a: v('front-center-panel', centreW, 0, height), b: v(ZIP_RIGHT, 0, 0, height) },
    { label: 'right zip strip ↔ right wing', a: v(ZIP_RIGHT, zipW, 0, height), b: v(WING_RIGHT, 0, 0, height) },
    // Gusset front edge (flat y = depth) round the front perimeter: left side top→bottom, bottom left→right, right side bottom→top.
    { label: 'gusset ↔ left wing outer', a: gLeft(0, height, depth), b: v(WING_LEFT, 0, 0, height) },
    { label: 'gusset ↔ left wing bottom', a: gLeft(height, height + wingW, depth), b: h(WING_LEFT, height, 0, wingW) },
    { label: 'gusset ↔ left zip strip bottom', a: gLeft(height + wingW, height + wingW + zipW, depth), b: h(ZIP_LEFT, height, 0, zipW) },
    { label: 'gusset ↔ centre bottom', a: gLeft(height + wingW + zipW, height + wingW + zipW + centreW, depth), b: h('front-center-panel', height, 0, centreW) },
    { label: 'gusset ↔ right zip strip bottom', a: gLeft(height + wingW + zipW + centreW, height + wingW + 2 * zipW + centreW, depth), b: h(ZIP_RIGHT, height, 0, zipW) },
    { label: 'gusset ↔ right wing bottom', a: gLeft(height + wingW + 2 * zipW + centreW, height + width, depth), b: h(WING_RIGHT, height, 0, wingW) },
    { label: 'gusset ↔ right wing outer', a: gLeft(height + width, 2 * height + width, depth), b: v(WING_RIGHT, wingW, height, 0) },
    // Gusset back edge (flat y = 0) round the back panel: sides run from the straight part below the corner shaping.
    { label: 'gusset ↔ back left', a: gLeft(0, height, 0), b: v('back-panel', 0, 0, height) },
    { label: 'gusset ↔ back bottom', a: gLeft(height, height + width, 0), b: h('back-panel', height, 0, width) },
    { label: 'gusset ↔ back right', a: gLeft(height + width, 2 * height + width, 0), b: v('back-panel', width, height, 0) },
    // Top panel: back edge to the back's top, front edge to the five front tops, short sides to the gusset ends.
    { label: 'top ↔ back top', a: h('top-panel', 0, 0, width), b: h('back-panel', 0, 0, width) },
    { label: 'top ↔ left wing top', a: h('top-panel', depth, 0, wingW), b: h(WING_LEFT, 0, 0, wingW) },
    { label: 'top ↔ left zip strip top', a: h('top-panel', depth, wingW, wingW + zipW), b: h(ZIP_LEFT, 0, 0, zipW) },
    { label: 'top ↔ centre top', a: h('top-panel', depth, wingW + zipW, wingW + zipW + centreW), b: h('front-center-panel', 0, 0, centreW) },
    { label: 'top ↔ right zip strip top', a: h('top-panel', depth, wingW + zipW + centreW, wingW + 2 * zipW + centreW), b: h(ZIP_RIGHT, 0, 0, zipW) },
    { label: 'top ↔ right wing top', a: h('top-panel', depth, wingW + 2 * zipW + centreW, width), b: h(WING_RIGHT, 0, 0, wingW) },
    { label: 'top ↔ gusset left end', a: v('top-panel', 0, 0, depth), b: v(G, 0, 0, depth) },
    { label: 'top ↔ gusset right end', a: v('top-panel', width, 0, depth), b: v(G, 2 * height + width, 0, depth) },
  ];

  return {
    pieces: [...body, ...extras],
    object: {
      // The pack is closed top and bottom, so the block leaves a cloth thickness at each end
      // (the viewer lifts an object 1.5 mm off its base; an open mouth would not care).
      width, depth, height: height - 4, label: 'contents', pin: 'footprint',
      base: { pieceId: 'back-panel', point: { x: width / 2, y: height }, direction: { x: 0, y: -1 } },
    },
    placements,
    seams,
  };
}
