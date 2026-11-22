/**
 * 3D check of one gaiter: the flat frustum wrapped back onto its cone about a
 * leg (a vertical capsule), the front closed by a seam — hook strip over loop
 * strip, or the zipper edges together — and the top edge held where the
 * elastic grips. Gravity is light: the check is that the piece closes into
 * the tube it was developed from, round a leg of the top circumference.
 *
 * Returns null when the bottom is narrower than the top: the apex is then
 * below the gaiter and the cone placement (which hangs from its apex) would
 * turn it upside down.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { PiecePlacement } from '../../lib/fold-engine/index.js';
import type { SeamSpec, Solid, Vec3, PinSpec } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs } from './types.js';
import { GAITER_ID, shapeOf } from './buildPattern.js';
import { radiusAt } from '../../lib/pattern-engine/geometry/frustum.js';

export interface GaiterAssembly {
  pieces: Piece[];
  placements: Record<string, PiecePlacement>;
  pins: PinSpec[];
  seams: SeamSpec[];
  solids: Solid[];
  gravity: Vec3;
  /** The leg capsule's radius, mm (the top circumference less a little, for the elastic). */
  legRadius: number;
  report: string[];
}

const IN = 25.4;
const fmtIn = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');
/** Depth of cloth the elastic channel holds, mm (catches mesh vertices at the viewer's spacing). */
const GRIP_MM = 16;

export function gaiterAssembly(pieces: Piece[], r: ResolvedInputs): GaiterAssembly | null {
  const piece = pieces.find((p) => p.id === GAITER_ID);
  if (!piece) return null;
  const g = shapeOf(r);
  if (g.f.direction !== 1) return null;
  const apex: Point = { x: g.offset.x, y: g.offset.y };
  const halfAngle = Math.asin(Math.min(1, g.f.angle / (2 * Math.PI)));
  const angleScale = (2 * Math.PI) / g.f.angle;
  const apex3: Vec3 = [0, 0, 0];
  const placements: Record<string, PiecePlacement> = {
    [GAITER_ID]: { keep: true, cone: { apex, apex3, halfAngle, angleScale, angle0: 0 } },
  };
  // Close the front. Hook-and-loop: the overlap's outer edge lands `overlap` inside the underlap
  // edge once wrapped; zipper: the two edges meet.
  const sTop = r.channel_depth, sBot = (u: number) => g.bottomS(u) - r.hem_depth;
  const d = r.closure === 'velcro' ? r.overlap : 0;
  const n1 = g.edgeNormal(1), n0 = g.edgeNormal(0);
  const along = (u: 0 | 1, s: number, out: number) => { const p = g.at(u, s); const n = u === 1 ? n1 : n0; return { x: p.x + n.x * out, y: p.y + n.y * out }; };
  const seams: SeamSpec[] = [{
    label: r.closure === 'velcro' ? 'hook over loop' : 'zipper',
    a: { pieceId: GAITER_ID, from: along(1, sTop, d), to: along(1, sBot(1), d) },
    b: { pieceId: GAITER_ID, from: along(0, sTop, -d), to: along(0, sBot(0), -d) },
  }];
  const r0 = radiusAt(g.f, 0);
  const pins: PinSpec[] = [{ pieceId: GAITER_ID, ring: { cx: apex.x, cy: apex.y, r0: r0 - r.channel_allowance - 1, r1: r0 + Math.max(GRIP_MM, r.channel_depth) } }];
  // The leg: a capsule a little inside the top circumference, down the cone's axis past the bottom.
  const legRadius = 0.95 * (r.top_circumference / (2 * Math.PI));
  const yTop = -r0 * Math.cos(halfAngle);
  const yBot = -radiusAt(g.f, r.height + r.front_drop + r.hem_allowance) * Math.cos(halfAngle);
  const solids: Solid[] = [{ kind: 'capsule', a: [0, yTop + legRadius, 0], b: [0, yBot - 2 * legRadius, 0], radius: legRadius }];
  const report = [
    `One gaiter wrapped round a ${fmtIn(2 * Math.PI * legRadius)}" leg: the ${fmtIn(r.top_circumference)}" top closes over it and the ${fmtIn(r.bottom_circumference)}" bottom stands off it by ${fmtIn((r.bottom_circumference - r.top_circumference) / (2 * Math.PI))}" all round, room for the boot.`,
    r.closure === 'velcro' ? `The ${fmtIn(r.overlap)}" overlap closes hook over loop down the front.` : 'The zipper edges meet down the front.',
  ];
  return { pieces: [piece], placements, pins, seams, solids, gravity: [0, -0.01, 0], legRadius, report };
}
