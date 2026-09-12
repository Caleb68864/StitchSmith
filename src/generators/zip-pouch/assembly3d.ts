/**
 * 3D assembly of every Zip Pouch construction style for the fold preview and
 * cloth check: the panels round a block of the finished size, seamed on their
 * stitch lines. Coordinates are flat pattern mm per piece.
 *
 *   boxed        — front and back face to face, sides and bottom seamed; the
 *                  block stands half a depth above the bottom seam (boxed corner).
 *   gusset-strip — front, back and a U gusset turned at its corner folds.
 *   multi-panel  — front, back, bottom laid flat, two end panels stood on edge.
 *   cross-bottom — two half-cross panels, their bands and arms folded toward
 *                  each other, joined at the centre-of-bottom seam and the arms.
 * The front-zipper gusset variant is not assembled (returns null).
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { PiecePlacement } from '../../lib/fold-engine/index.js';
import type { SeamSpec, Vec3 } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs } from './types.js';
import { computeCutDimensions } from './bom.js';
import { crossBottomDims, gussetStripDims, multiPanelDims } from './dimensions.js';

export interface ZipPouchAssembly {
  pieces: Piece[];
  object: {
    width: number; depth: number; height: number; label: string; pin?: 'root' | 'footprint';
    base?: { pieceId: string; point: Point; direction: Point }; at?: Vec3;
  };
  placements: Record<string, PiecePlacement>;
  seams: SeamSpec[];
  /** Cloth vertices held still (cross-bottom: a disc of the back face; the bands and arms must stay free to fold). */
  pins?: { pieceId: string; point: Point; radius: number }[];
  /** false where allowance flaps must pass through each other to close a seam (arms meeting edge to edge). */
  selfCollision?: boolean;
}

const line = (pieceId: string, from: Point, to: Point) => ({ pieceId, from, to });

export function zipPouchAssembly(pieces: Piece[], r: ResolvedInputs): ZipPouchAssembly | null {
  const has = (id: string) => pieces.some((p) => p.id === id);
  const sa = r.seam_allowance;
  const L = r.finished_length, Wd = r.finished_width, D = r.finished_depth;
  const style = r.construction_style;

  if (style === 'boxed' || style === undefined) {
    if (!has('front') || !has('back')) return null;
    const { cutWidth, cutHeight } = computeCutDimensions(r);
    const side = { left: sa, right: cutWidth - sa, bottom: cutHeight - sa, top: 0 };
    return {
      pieces,
      object: { width: L, depth: D, height: Wd, label: 'contents', pin: 'footprint', base: { pieceId: 'back', point: { x: cutWidth / 2, y: side.bottom - D / 2 }, direction: { x: 0, y: -1 } } },
      placements: { back: { dx: 0, dy: 0, dz: 0 }, front: { dx: 0, dy: 0, dz: D + 2 } },
      seams: [
        { label: 'left side', a: line('front', { x: side.left, y: side.top }, { x: side.left, y: side.bottom }), b: line('back', { x: side.left, y: side.top }, { x: side.left, y: side.bottom }) },
        { label: 'right side', a: line('front', { x: side.right, y: side.top }, { x: side.right, y: side.bottom }), b: line('back', { x: side.right, y: side.top }, { x: side.right, y: side.bottom }) },
        { label: 'bottom', a: line('front', { x: side.left, y: side.bottom }, { x: side.right, y: side.bottom }), b: line('back', { x: side.left, y: side.bottom }, { x: side.right, y: side.bottom }) },
      ],
    };
  }

  if (style === 'gusset-strip') {
    if (r.zipper_position === 'front' || !has('front-panel') || !has('back-panel') || !has('gusset-strip')) return null;
    const g = gussetStripDims(r);
    const H = g.panelCutHeight;
    const gh = g.gussetCutHeight;
    const c1 = g.notchX1, c2 = g.notchX2; // corners along the band: side | bottom | side
    const front = 'front-panel', back = 'back-panel', G = 'gusset-strip';
    const seams: SeamSpec[] = [];
    for (const [panel, y] of [[back, sa], [front, gh - sa]] as [string, number][]) {
      seams.push(
        { label: `gusset ↔ ${panel} left`, a: line(G, { x: sa, y }, { x: c1, y }), b: line(panel, { x: sa, y: sa }, { x: sa, y: H - sa }) },
        { label: `gusset ↔ ${panel} bottom`, a: line(G, { x: c1, y }, { x: c2, y }), b: line(panel, { x: sa, y: H - sa }, { x: sa + L, y: H - sa }) },
        { label: `gusset ↔ ${panel} right`, a: line(G, { x: c2, y }, { x: c2 + Wd, y }), b: line(panel, { x: sa + L, y: H - sa }, { x: sa + L, y: sa }) },
      );
    }
    return {
      pieces,
      object: { width: L, depth: D, height: Wd, label: 'contents', pin: 'footprint', base: { pieceId: back, point: { x: sa + L / 2, y: H - sa }, direction: { x: 0, y: -1 } } },
      placements: {
        [front]: { dx: 0, dy: 0, dz: D + 2 },
        // Band rooted on its bottom run, sides turned up, back stitch line on the back panel's plane.
        [G]: { rootPoint: { x: (c1 + c2) / 2, y: gh / 2 }, rx: -90, dx: sa - c1, dy: H - sa, dz: -sa, keep: true },
      },
      seams,
    };
  }

  if (style === 'multi-panel') {
    if (!has('front-panel') || !has('back-panel') || !has('bottom-panel') || !has('end-panel')) return null;
    const m = multiPanelDims(r);
    const H = m.frontBackHeight;
    const front = 'front-panel', back = 'back-panel', bottom = 'bottom-panel';
    const end = pieces.find((p) => p.id === 'end-panel')!;
    const endL: Piece = { ...end, id: 'end-panel-left', name: 'End Panel (left)', quantity: 1 };
    const endR: Piece = { ...end, id: 'end-panel-right', name: 'End Panel (right)', quantity: 1 };
    const yBot = H - sa;
    const endPath = (x: number): Vec3[] => [[x, -sa, -sa], [x, -sa, D + sa]];
    const seams: SeamSpec[] = [
      { label: 'front ↔ bottom', a: line(front, { x: sa, y: yBot }, { x: sa + L, y: yBot }), b: line(bottom, { x: sa, y: sa + D }, { x: sa + L, y: sa + D }) },
      { label: 'back ↔ bottom', a: line(back, { x: sa, y: yBot }, { x: sa + L, y: yBot }), b: line(bottom, { x: sa, y: sa }, { x: sa + L, y: sa }) },
    ];
    for (const [id, x] of [[endL.id, sa], [endR.id, sa + L]] as [string, number][]) {
      seams.push(
        { label: `${id} ↔ front`, a: line(id, { x: sa, y: sa + D }, { x: sa + Wd, y: sa + D }), b: line(front, { x, y: sa }, { x, y: yBot }) },
        { label: `${id} ↔ back`, a: line(id, { x: sa, y: sa }, { x: sa + Wd, y: sa }), b: line(back, { x, y: sa }, { x, y: yBot }) },
        { label: `${id} ↔ bottom`, a: line(id, { x: sa + Wd, y: sa }, { x: sa + Wd, y: sa + D }), b: line(bottom, { x, y: sa }, { x, y: sa + D }) },
      );
    }
    return {
      pieces: [...pieces.filter((p) => p.id !== 'end-panel'), endL, endR],
      object: { width: L, depth: D, height: Wd, label: 'contents', pin: 'footprint', base: { pieceId: back, point: { x: sa + L / 2, y: yBot }, direction: { x: 0, y: -1 } } },
      placements: {
        [front]: { dx: 0, dy: 0, dz: D + 2 },
        // Bottom laid flat under the block: its stitch rectangle spans x sa..sa+L and z 0..D.
        [bottom]: { rx: -90, dx: 0, dy: yBot, dz: -sa, keep: true },
        // Ends stood on edge: flat x runs down the side, flat y runs front to back.
        [endL.id]: { keep: true, drape: { path: endPath(sa), across: [0, -1, 0], x0: 0 } },
        [endR.id]: { keep: true, drape: { path: endPath(sa + L), across: [0, -1, 0], x0: 0 } },
      },
      seams,
    };
  }

  if (style === 'cross-bottom') {
    if (!has('cross-panel') || !has('cross-panel-back')) return null;
    const { cornerCutout: C, panelCutWidth: W, halfCrossHeight: Hh } = crossBottomDims(r);
    const front = 'cross-panel', back = 'cross-panel-back';
    const seams: SeamSpec[] = [
      // Centre-of-bottom seam: the two half-bottom bands meet.
      { label: 'centre of bottom', a: line(front, { x: C, y: sa }, { x: W - C, y: sa }), b: line(back, { x: C, y: sa }, { x: W - C, y: sa }) },
      // Arms: each panel's arm folds back and meets the other's at mid-depth.
      { label: 'left arms', a: line(front, { x: sa, y: C }, { x: sa, y: Hh - sa }), b: line(back, { x: sa, y: C }, { x: sa, y: Hh - sa }) },
      { label: 'right arms', a: line(front, { x: W - sa, y: C }, { x: W - sa, y: Hh - sa }), b: line(back, { x: W - sa, y: C }, { x: W - sa, y: Hh - sa }) },
    ];
    // The corner cutouts (band edge sewn to arm edge on each panel) are a 45° mitre the
    // rectilinear grid cannot fold, so they are left open here; the bands and arms still
    // close the bag round the block.
    return {
      // Back first: it is the host the cloth holds still.
      pieces: [pieces.find((p) => p.id === back)!, pieces.find((p) => p.id === front)!],
      // Both panels turned upside down (rz 180) so the zipper edge is at the top; the back's
      // band fold sits at y = 0 and the block stands on it.
      object: { width: L, depth: D, height: Wd, label: 'contents', at: [W / 2, 0, D / 2 + 1] },
      placements: {
        [back]: { rz: 180, dx: W, dy: C, dz: 0, keep: true, rootPoint: { x: W / 2, y: (C + Hh) / 2 } },
        [front]: { rz: 180, dx: W, dy: C, dz: D + 2, keep: true, rootPoint: { x: W / 2, y: (C + Hh) / 2 } },
      },
      seams,
      // Hold a disc of the back face only; the seams fold its band and arms round the block.
      pins: [{ pieceId: back, point: { x: W / 2, y: (C + Hh - sa) / 2 }, radius: Math.max(6, Math.min((W - 2 * C) / 2, (Hh - sa - C) / 2) - 8) }],
      // The arms meet edge to edge in one plane: their allowance flaps cross, which cloth-to-cloth
      // collision would hold apart by a flap width. In construction both flaps turn to one side.
      selfCollision: false,
    };
  }
  return null;
}
