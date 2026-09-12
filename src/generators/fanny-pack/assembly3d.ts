/**
 * 3D check for the fanny pack: the hoop (zipper panel + rising gusset) as one
 * band turned round the finished block at four corner folds, the back panel as
 * host and the front panel seamed to the other edge. The zipper is drawn on the
 * band where it runs (across the top and down the sides by the lid extension);
 * the hoop's top-centre join is where the two zipper-panel ends meet.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { PiecePlacement } from '../../lib/fold-engine/index.js';
import type { SeamSpec } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs } from './types.js';
import { BACK_ID, FRONT_ID } from './buildPattern.js';

export const HOOP_3D_ID = 'fanny-hoop-3d';

export interface FannyPackAssembly {
  pieces: Piece[];
  object: { width: number; depth: number; height: number; label: string; pin: 'footprint'; base: { pieceId: string; point: Point; direction: Point } };
  placements: Record<string, PiecePlacement>;
  seams: SeamSpec[];
}

function seg(eid: () => EdgeId, role: Edge['role'], sx: number, sy: number, ex: number, ey: number): Edge {
  return { kind: 'straight', id: eid(), role, start: { x: sx, y: sy }, end: { x: ex, y: ey } };
}
const line = (pieceId: string, from: Point, to: Point) => ({ pieceId, from, to });

export function fannyPackAssembly(pieces: Piece[], r: ResolvedInputs): FannyPackAssembly | null {
  const back = pieces.find((p) => p.id === BACK_ID);
  const front = pieces.find((p) => p.id === FRONT_ID);
  if (!back || !front) return null;
  const sa = r.seam_allowance, W = r.width, H = r.height, D = r.depth;
  const P = 2 * (W + H);
  const L = P + 2 * sa, Hc = D + 2 * sa;
  // Band order along x: top-left half | left side | bottom | right side | top-right half.
  const c = [sa + W / 2, sa + W / 2 + H, sa + W / 2 + H + W, sa + W / 2 + 2 * H + W];
  const eid = makeEdgeIdGen(HOOP_3D_ID);
  const outline: Path = { id: `${HOOP_3D_ID}-outline`, closed: true, edges: [seg(eid, 'cut', 0, 0, L, 0), seg(eid, 'cut', L, 0, L, Hc), seg(eid, 'cut', L, Hc, 0, Hc), seg(eid, 'cut', 0, Hc, 0, 0)] };
  const paths: Path[] = [outline,
    { id: `${HOOP_3D_ID}-sew`, closed: false, edges: [seg(eid, 'stitch', 0, sa, L, sa), seg(eid, 'stitch', 0, Hc - sa, L, Hc - sa)] },
    ...c.map((x, i) => ({ id: `${HOOP_3D_ID}-corner-${i}`, closed: false, label: 'Corner (90°)', edges: [seg(eid, 'fold', x, 0, x, Hc)] })),
    // The zipper: from the top centre across the top and down each side by the extension.
    { id: `${HOOP_3D_ID}-zipper`, closed: false, label: 'Zipper', edges: [seg(eid, 'stitch', sa, Hc / 2, c[0] + r.lid_extension, Hc / 2), seg(eid, 'stitch', c[3] - r.lid_extension, Hc / 2, L - sa, Hc / 2)] },
  ];
  const sam: Record<EdgeId, number> = {}; for (const e of outline.edges) sam[e.id] = 0;
  const hoop: Piece = { id: HOOP_3D_ID, name: 'Hoop (zipper panel + rising gusset, as sewn)', mirror: false, quantity: 1, materialId: 'cordura-500', paths, seamAllowances: sam, annotations: [{ kind: 'label', label: 'hoop', point: { x: (c[1] + c[2]) / 2, y: Hc / 2 } }] };
  // Panel perimeter in the direction the band runs.
  const Wc = W + 2 * sa, Hp = H + 2 * sa;
  const runs: Array<[number, number, Point, Point]> = [
    [sa, c[0], { x: sa + W / 2, y: sa }, { x: sa, y: sa }],
    [c[0], c[1], { x: sa, y: sa }, { x: sa, y: Hp - sa }],
    [c[1], c[2], { x: sa, y: Hp - sa }, { x: Wc - sa, y: Hp - sa }],
    [c[2], c[3], { x: Wc - sa, y: Hp - sa }, { x: Wc - sa, y: sa }],
    [c[3], L - sa, { x: Wc - sa, y: sa }, { x: sa + W / 2, y: sa }],
  ];
  const seams: SeamSpec[] = [];
  for (const [panel, y] of [[BACK_ID, sa], [FRONT_ID, Hc - sa]] as [string, number][]) {
    runs.forEach(([x0, x1, p0, p1], i) => seams.push({ label: `hoop ↔ ${panel === BACK_ID ? 'back' : 'front'} run ${i}`, a: line(HOOP_3D_ID, { x: x0, y }, { x: x1, y }), b: line(panel, p0, p1) }));
  }
  seams.push({ label: 'top centre join (zipper closed)', a: line(HOOP_3D_ID, { x: sa, y: sa }, { x: sa, y: Hc - sa }), b: line(HOOP_3D_ID, { x: L - sa, y: sa }, { x: L - sa, y: Hc - sa }) });
  return {
    pieces: [back, front, hoop, ...pieces.filter((p) => p.id !== BACK_ID && p.id !== FRONT_ID)],
    object: { width: W, depth: D, height: H, label: 'contents', pin: 'footprint', base: { pieceId: BACK_ID, point: { x: sa + W / 2, y: Hp - sa }, direction: { x: 0, y: -1 } } },
    placements: {
      [FRONT_ID]: { dx: 0, dy: 0, dz: D + 2 },
      // Band rooted on its bottom run, sides turned up, top halves turned in; back stitch line on the back panel's plane.
      [HOOP_3D_ID]: { rootPoint: { x: (c[1] + c[2]) / 2, y: Hc / 2 }, rx: -90, dx: sa - c[1], dy: Hp - sa, dz: -sa, keep: true },
    },
    seams,
  };
}
