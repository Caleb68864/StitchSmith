/**
 * 3D assembly of the Tri-Zip body for the fold preview and cloth check: the
 * front (wing | zip strip | centre | zip strip | wing) face to face with the
 * back panel round a block of the finished size, the perimeter gusset turned
 * into its U and seamed to both. Coordinates are flat pattern mm per piece.
 *
 * Not modelled: the top of the pack. The pattern's gusset covers the bottom and
 * sides only and no piece closes the top, so the check leaves it open.
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
  if (!back || !centre || !wing || !zip || !gusset || r.zipper_method !== 'gusseted') return null;

  const { width, height, depth } = r;
  const wingW = frontWingWidth(r);
  const zipW = r.zipper_gusset_width;
  const centreW = width * (r.center_panel_width_percent / 100);
  // As drawn, the wing's interior edge and the strip's centre-panel edge are at x = 0, so the
  // drawings are the RIGHT-hand parts; the left-hand parts are their mirrors.
  const wingLeft = mirrorPieceX(wing, WING_LEFT, 'Front Wing (left)');
  const zipLeft = mirrorPieceX(zip, ZIP_LEFT, 'Tri-Zip Gusset Strip (left)');
  const body: Piece[] = [back, wingLeft, zipLeft, centre, zip, wing, gusset];
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
  ];

  return {
    pieces: [...body, ...extras],
    object: {
      width, depth, height, label: 'contents', pin: 'footprint',
      base: { pieceId: 'back-panel', point: { x: width / 2, y: height }, direction: { x: 0, y: -1 } },
    },
    placements,
    seams,
  };
}
