/**
 * 3D assembly of the clamshell pack: the back panel flat at the origin, the
 * base gusset rooted on its top run and turned down both sides (corners and
 * underwraps at −90°), the lid strip stacked outboard of it along the zipper,
 * the bottom strip laid under the block, and the face panel seamed to the lid
 * strip round a block of the finished size. Flat pattern mm per piece.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { PiecePlacement } from '../../lib/fold-engine/index.js';
import type { SeamSpec } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs } from './types.js';
import { FACE_ID, BACK_ID, GUSSET_ID, LID_STRIP_ID, BOTTOM_ID } from './buildPattern.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';

/**
 * The cloth stands in for the finished strip: the zipper lip (a 180° hem that is notched round every
 * corner in the real build) and the bottom's fold-ins are left off, as is the overcut tail, so the
 * mesh carries only the finished band and its corner turns. Stitch marks are not needed by the sim.
 */
function finishedStrip(src: Piece, length: number, width: number, folds: { x: number; label: string }[]): Piece {
  const eid = makeEdgeIdGen(`${src.id}-sim`);
  const cut = (sx: number, sy: number, ex: number, ey: number) => ({ kind: 'straight' as const, id: eid(), role: 'cut' as const, start: { x: sx, y: sy }, end: { x: ex, y: ey } });
  const outline: Path = { id: `${src.id}-sim-outline`, closed: true, edges: [cut(0, 0, length, 0), cut(length, 0, length, width), cut(length, width, 0, width), cut(0, width, 0, 0)] };
  const foldPaths: Path[] = folds.map((f, i) => ({ id: `${src.id}-sim-fold-${i}`, closed: false, label: f.label, edges: [{ kind: 'straight' as const, id: eid(), role: 'fold' as const, start: { x: f.x, y: 0 }, end: { x: f.x, y: width } }] }));
  const sa: Record<string, number> = {};
  for (const e of outline.edges) sa[e.id] = 0;
  return { ...src, paths: [outline, ...foldPaths], seamAllowances: sa, annotations: [{ kind: 'label', label: src.name, point: { x: length / 2, y: width / 2 } }] };
}

export interface ClamshellAssembly {
  pieces: Piece[];
  object: { width: number; depth: number; height: number; label: string; pin: 'footprint'; base: { pieceId: string; point: Point; direction: Point } };
  placements: Record<string, PiecePlacement>;
  seams: SeamSpec[];
}

type Side = { pieceId: string; from: Point; to: Point };

export function clamshellAssembly(pieces: Piece[], r: ResolvedInputs): ClamshellAssembly | null {
  const ids = [FACE_ID, BACK_ID, GUSSET_ID, LID_STRIP_ID, BOTTOM_ID];
  const found = ids.map((id) => pieces.find((p) => p.id === id));
  if (found.some((p) => !p)) return null;
  const [face, back, gussetSrc, lidSrc, bottomSrc] = found as Piece[];
  const W = r.width, H = r.height, u = r.zipper_underwrap, base = r.base_depth, lid = r.lid_depth, depth = r.depth;
  const L = r.hoop_length;
  const Lb = r.bottom_finished_length;
  const corners = [
    { x: u, label: 'Under the bottom corner (-90°)' },
    { x: u + H, label: 'Top-left corner (-90°)' },
    { x: u + H + W, label: 'Top-right corner (-90°)' },
    { x: u + 2 * H + W, label: 'Under the bottom corner (-90°)' },
  ];
  const gusset = finishedStrip(gussetSrc, L, base, corners);
  const lidStrip = finishedStrip(lidSrc, L, lid, corners);
  const bottom = finishedStrip(bottomSrc, Lb, depth, []);
  // Where hoop parameter t (flat x on either strip) lands on a panel's outline.
  const onPanel = (t: number): Point => {
    if (t <= u) return { x: u - t, y: H };
    if (t <= u + H) return { x: 0, y: H - (t - u) };
    if (t <= u + H + W) return { x: t - u - H, y: 0 };
    if (t <= u + 2 * H + W) return { x: W, y: t - (u + H + W) };
    return { x: W - (t - (u + 2 * H + W)), y: H };
  };
  const breaks = [0, u, u + H, u + H + W, u + 2 * H + W, L];
  const seams: SeamSpec[] = [];
  const stripToPanel = (label: string, stripId: string, edgeY: number, panelId: string) => {
    for (let i = 0; i + 1 < breaks.length; i++) {
      const t0 = breaks[i], t1 = breaks[i + 1];
      const a: Side = { pieceId: stripId, from: { x: t0, y: edgeY }, to: { x: t1, y: edgeY } };
      const b: Side = { pieceId: panelId, from: onPanel(t0), to: onPanel(t1) };
      seams.push({ label: `${label} ${i}`, a, b });
    }
  };
  stripToPanel('gusset ↔ back', GUSSET_ID, 0, BACK_ID);
  stripToPanel('lid strip ↔ face', LID_STRIP_ID, lid, FACE_ID);
  // The zipper: gusset zipper edge to the lid strip's zipper edge, one straight seam.
  seams.push({ label: 'zipper', a: { pieceId: GUSSET_ID, from: { x: 0, y: base }, to: { x: L, y: base } }, b: { pieceId: LID_STRIP_ID, from: { x: 0, y: 0 }, to: { x: L, y: 0 } } });
  // Bottom strip: finished Lb long, depth wide.
  seams.push(
    { label: 'bottom ↔ back', a: { pieceId: BOTTOM_ID, from: { x: 0, y: 0 }, to: { x: Lb, y: 0 } }, b: { pieceId: BACK_ID, from: { x: u, y: H }, to: { x: W - u, y: H } } },
    { label: 'bottom ↔ face', a: { pieceId: BOTTOM_ID, from: { x: 0, y: depth }, to: { x: Lb, y: depth } }, b: { pieceId: FACE_ID, from: { x: u, y: H }, to: { x: W - u, y: H } } },
    { label: 'bottom ↔ gusset start', a: { pieceId: BOTTOM_ID, from: { x: 0, y: 0 }, to: { x: 0, y: base } }, b: { pieceId: GUSSET_ID, from: { x: 0, y: 0 }, to: { x: 0, y: base } } },
    { label: 'bottom ↔ lid start', a: { pieceId: BOTTOM_ID, from: { x: 0, y: base }, to: { x: 0, y: depth } }, b: { pieceId: LID_STRIP_ID, from: { x: 0, y: 0 }, to: { x: 0, y: lid } } },
    { label: 'bottom ↔ gusset end', a: { pieceId: BOTTOM_ID, from: { x: Lb, y: 0 }, to: { x: Lb, y: base } }, b: { pieceId: GUSSET_ID, from: { x: L, y: 0 }, to: { x: L, y: base } } },
    { label: 'bottom ↔ lid end', a: { pieceId: BOTTOM_ID, from: { x: Lb, y: base }, to: { x: Lb, y: depth } }, b: { pieceId: LID_STRIP_ID, from: { x: L, y: 0 }, to: { x: L, y: lid } } },
  );
  const topRoot = { x: u + H + W / 2, y: 0 };
  const placements: Record<string, PiecePlacement> = {
    [BACK_ID]: { dx: 0, dy: 0, dz: 0, keep: true },
    [FACE_ID]: { dx: 0, dy: 0, dz: depth + 2, keep: true },
    // Strips rooted on their top run, turned so flat y runs along z; the lid strip's finished band starts at z = base.
    [GUSSET_ID]: { rootPoint: { x: topRoot.x, y: base / 2 }, rx: -90, dx: -(u + H), dy: 0, dz: 0, keep: true },
    [LID_STRIP_ID]: { rootPoint: { x: topRoot.x, y: lid / 2 }, rx: -90, dx: -(u + H), dy: 0, dz: base, keep: true },
    // Bottom under the block: finished x from u, depth along z from 0.
    [BOTTOM_ID]: { rootPoint: { x: Lb / 2, y: depth / 2 }, rx: -90, dx: u, dy: H, dz: 0, keep: true },
  };
  return {
    pieces: [face, back, gusset, lidStrip, bottom, ...pieces.filter((p) => !ids.includes(p.id))],
    object: {
      width: W, depth, height: H - 4, label: 'contents', pin: 'footprint',
      base: { pieceId: BACK_ID, point: { x: W / 2, y: H }, direction: { x: 0, y: -1 } },
    },
    placements,
    seams,
  };
}
