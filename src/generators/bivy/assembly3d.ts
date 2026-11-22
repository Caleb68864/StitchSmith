/**
 * 3D check of the bivy (roadmap 10d): the floor stood up as its tub round a
 * sleeper block, the top seamed to the tub's long rims, the head and foot
 * gussets standing in the end planes, their bases seamed to the end rims and
 * their arches to the top's short edges.
 *
 * The floor's corners are folded ears in the pattern; a corner square cannot
 * hinge two ways in the rigid preview, so the 3D copy cuts the squares out
 * and seams each corner's two edges together, which gives the same tub. The
 * floor is held flat on the ground; everything else is free.
 *
 * A J-zip top is two pieces (the head section and the body below the J),
 * joined across the top by the zipper, shown closed.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import { makeEdgeIdGen, type Edge } from '../../lib/pattern-engine/graph/Edge.js';
import type { PiecePlacement } from '../../lib/fold-engine/index.js';
import type { SeamSpec, PinSpec, Solid, Vec3 } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs } from './types.js';
import { FLOOR_ID, TOP_ID, TOP_HEAD_ID, HEAD_GUSSET_ID, FOOT_GUSSET_ID, FLOOR_FABRIC_ID } from './buildPattern.js';

export const FLOOR_3D_ID = 'bivy-floor-3d';

export interface BivyAssembly {
  pieces: Piece[];
  placements: Record<string, PiecePlacement>;
  seams: SeamSpec[];
  pins: PinSpec[];
  solids: Solid[];
  gravity: Vec3;
  report: string[];
}

const IN = 25.4;
const fmtIn = (mm: number) => (mm / IN).toFixed(1);
const SEGS = 24;

const seg = (eid: () => string, role: Edge['role'], a: Point, b: Point): Edge => ({ kind: 'straight', id: eid() as never, role, start: a, end: b });

/** The floor as a cross: corner squares out, the tub folds trimmed to the walls they hinge. */
function floorCross(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(FLOOR_3D_ID) as unknown as () => string;
  const s = r.seam_allowance, k = s + r.tub_height;
  const L = r.floor_cut_length, W = r.floor_cut_width;
  const ring: Point[] = [
    { x: k, y: 0 }, { x: L - k, y: 0 }, { x: L - k, y: k }, { x: L, y: k }, { x: L, y: W - k }, { x: L - k, y: W - k },
    { x: L - k, y: W }, { x: k, y: W }, { x: k, y: W - k }, { x: 0, y: W - k }, { x: 0, y: k }, { x: k, y: k },
  ];
  const outline: Path = { id: `${FLOOR_3D_ID}-outline`, closed: true, edges: ring.map((p, i) => seg(eid, 'cut', p, ring[(i + 1) % ring.length])) };
  const fold = (id: string, a: Point, b: Point): Path => ({ id, closed: false, label: 'Tub wall fold (90°)', edges: [seg(eid, 'fold', a, b)] });
  const sa: Record<string, number> = {};
  for (const e of outline.edges) sa[e.id] = 0;
  return {
    id: FLOOR_3D_ID, name: 'Bathtub floor', mirror: false, quantity: 1, materialId: FLOOR_FABRIC_ID, seamAllowances: sa as never,
    paths: [
      outline,
      fold(`${FLOOR_3D_ID}-fold-y0`, { x: k, y: k }, { x: L - k, y: k }),
      fold(`${FLOOR_3D_ID}-fold-y1`, { x: k, y: W - k }, { x: L - k, y: W - k }),
      fold(`${FLOOR_3D_ID}-fold-x0`, { x: k, y: k }, { x: k, y: W - k }),
      fold(`${FLOOR_3D_ID}-fold-x1`, { x: L - k, y: k }, { x: L - k, y: W - k }),
    ],
    annotations: [{ kind: 'label', label: 'Floor', point: { x: L / 2, y: W / 2 } }],
  };
}

/** n equal steps along a straight line. */
function steps(a: Point, b: Point, n: number): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));
}

export function bivyAssembly(pieces: Piece[], r: ResolvedInputs): BivyAssembly | null {
  if (!r.arch) return null;
  const jz = r.zip_style === 'j';
  const topHead = jz ? pieces.find((p) => p.id === TOP_HEAD_ID) : undefined;
  if (jz && !topHead) return null;
  const floor = pieces.find((p) => p.id === FLOOR_ID), top = pieces.find((p) => p.id === TOP_ID);
  const head = pieces.find((p) => p.id === HEAD_GUSSET_ID), foot = pieces.find((p) => p.id === FOOT_GUSSET_ID);
  if (!floor || !top || !head || !foot) return null;
  const s = r.seam_allowance, t = r.tub_height, k = s + t;
  const L = r.floor_cut_length, W = r.floor_cut_width, Lt = r.top_cut_length, Wt = r.top_cut_width;
  const cross = floorCross(r);
  const placements: Record<string, PiecePlacement> = {
    // Flat y runs across the bivy (+z), the floor on the ground (y = 0).
    [FLOOR_3D_ID]: { keep: true, rx: -90, rootPoint: { x: L / 2, y: W / 2 } },
    // The top above the rim, centred: its sew rectangle over the tub's.
    // With a J the body top starts at the J line, the head section before it.
    [TOP_ID]: { keep: true, rx: -90, dx: k + r.j_from_head - s, dy: -(t + r.arch.rise * 0.6), dz: W / 2 - Wt / 2 },
    ...(topHead ? { [TOP_HEAD_ID]: { keep: true, rx: -90, dx: k - s, dy: -(t + r.arch.rise * 0.6), dz: W / 2 - Wt / 2 } } : {}),
  };
  const Lh = r.top_head_cut_length;
  // Gussets in the end planes: flat x along the end rim (+z), flat y up.
  const a = r.arch;
  const chordOf = (g: Piece) => {
    const p = g.paths.find((x) => x.id.endsWith('-chord'))!.edges[0];
    return { from: p.start, to: p.end };
  };
  const arcOf = (g: Piece) => g.paths.find((x) => x.id.endsWith('-arch'))!.edges.flatMap((e, i) => (i === 0 ? [e.start, e.end] : [e.end]));
  for (const [g, x] of [[head, k], [foot, L - k]] as [Piece, number][]) {
    const c = chordOf(g);
    placements[g.id] = { keep: true, drape: { path: [[x, t, k - c.from.x], [x, t, k - c.from.x + 4 * W]], across: [0, -1, 0], x0: c.from.y, along: 'x' } };
  }
  const seams: SeamSpec[] = [];
  const pairLines = (label: string, aId: string, A: Point[], bId: string, B: Point[]) => {
    for (let i = 1; i < Math.min(A.length, B.length); i++) seams.push({ label: `${label} ${i}`, a: { pieceId: aId, from: A[i - 1], to: A[i] }, b: { pieceId: bId, from: B[i - 1], to: B[i] } });
  };
  // Corner ears: each corner's two cut edges, from the inner corner out.
  const corners: [Point, Point, Point][] = [
    [{ x: k, y: k }, { x: k, y: 0 }, { x: 0, y: k }],
    [{ x: L - k, y: k }, { x: L - k, y: 0 }, { x: L, y: k }],
    [{ x: L - k, y: W - k }, { x: L - k, y: W }, { x: L, y: W - k }],
    [{ x: k, y: W - k }, { x: k, y: W }, { x: 0, y: W - k }],
  ];
  corners.forEach(([c, p, q], i) => pairLines(`ear ${i + 1}`, FLOOR_3D_ID, steps(c, p, 4), FLOOR_3D_ID, steps(c, q, 4)));
  // Top long edges to the side rims.
  const jx = k + r.j_from_head; // the J line on the floor's rims (k when there is no J)
  const nBody = jz ? Math.max(4, Math.round((SEGS * (L - 2 * k - r.j_from_head)) / (L - 2 * k))) : SEGS;
  for (const [side, yt, yf] of [['left', s, s], ['right', Wt - s, W - s]] as const) {
    pairLines(`top ↔ side rim (${side})`, TOP_ID, steps({ x: s, y: yt }, { x: Lt - s, y: yt }, nBody), FLOOR_3D_ID, steps({ x: jx, y: yf }, { x: L - k, y: yf }, nBody));
    if (topHead) pairLines(`top head ↔ side rim (${side})`, TOP_HEAD_ID, steps({ x: s, y: yt }, { x: Lh - s, y: yt }, SEGS - nBody), FLOOR_3D_ID, steps({ x: k, y: yf }, { x: jx, y: yf }, SEGS - nBody));
  }
  // The J zipper across the top, shown closed.
  if (topHead) pairLines('J zipper', TOP_HEAD_ID, steps({ x: Lh - s, y: s }, { x: Lh - s, y: Wt - s }, 12), TOP_ID, steps({ x: s, y: s }, { x: s, y: Wt - s }, 12));
  // Gusset bases to the end rims; arches to the top's short edges.
  for (const [g, rimX, topX, topId] of [[head, s, s, topHead ? TOP_HEAD_ID : TOP_ID], [foot, L - s, Lt - s, TOP_ID]] as [Piece, number, number, string][]) {
    const c = chordOf(g);
    pairLines(`${g.id} base`, g.id, steps(c.from, c.to, 12), FLOOR_3D_ID, steps({ x: rimX, y: k }, { x: rimX, y: W - k }, 12));
    const ap = arcOf(g);
    pairLines(`${g.id} arch`, g.id, ap, topId, steps({ x: topX, y: s }, { x: topX, y: Wt - s }, ap.length - 1));
  }
  // Hold the floor's middle on the ground; the sleeper block holds the top up.
  const pins: PinSpec[] = [{ pieceId: FLOOR_3D_ID, rect: { x0: k + 60, y0: k + 60, x1: L - k - 60, y1: W - k - 60 } }];
  const sleeperH = t + a.rise * 0.75;
  const solids: Solid[] = [{ kind: 'box', center: [L / 2, sleeperH / 2, W / 2], half: [r.length / 2 - 80, sleeperH / 2, r.floor_width / 2 - 60] }];
  const report = [
    `The tub stands ${fmtIn(t)}" round a ${fmtIn(r.length)}" × ${fmtIn(r.floor_width)}" floor; the ${fmtIn(r.top_width)}" top arches about ${fmtIn(a.rise)}" over it, about ${fmtIn(r.head_height)}" inside at the head.`,
    `Shown round a sleeper block; the corner ears are drawn as seamed corners (same tub). The ${jz ? 'J zipper' : 'zipper'} is shown closed.`,
  ];
  return { pieces: topHead ? [cross, topHead, top, head, foot] : [cross, top, head, foot], placements, seams, pins, solids, gravity: [0, -0.01, 0], report };
}
