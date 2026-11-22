/**
 * Gaiter geometry in one place (Convention B): the finished tube development
 * from `geometry/frustum.ts`, the shaped bottom, and the cut outline with the
 * channel, hem and front allowances. The resolver (fabric check), the piece
 * and the tests all read it.
 *
 * u runs round the leg (0 = the underlap front edge, 1 = the overlap front
 * edge, 0.5 = the back); s runs down the leg from the finished top.
 */
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import { frustum, frustumPoint, radiusAt, edgeDirection, type Frustum } from '../../lib/pattern-engine/geometry/frustum.js';

export const SAMPLES = 32;

export interface GaiterShape {
  f: Frustum;
  /** Finished bottom at u: the height at the back, dropping by `drop` at both front edges. */
  bottomS: (u: number) => number;
  /** Finished point. */
  at: (u: number, s: number) => Point;
  /** u of a line parallel to a front edge, `d` outside it, at slant s (side 0 or 1). */
  uOutside: (side: 0 | 1, s: number, d: number) => number;
  /** Outward unit normal of a front edge (side 0 or 1). */
  edgeNormal: (side: 0 | 1) => Point;
  /** Cut outline (closed), and its bounding box. */
  cut: Point[];
  width: number;
  height: number;
  /** Translation applied to put the cut bbox at the origin. */
  offset: Point;
}

export interface ShapeSpec {
  top: number; bottom: number; height: number; drop: number;
  channelAllowance: number; hemAllowance: number; front: [number, number];
}

export function gaiterShape(p: ShapeSpec): GaiterShape | null {
  const fr = frustum(p.top, p.bottom, p.height);
  if (!fr.ok) return null;
  const f = fr.value;
  const bottomS = (u: number) => p.height + p.drop * (2 * u - 1) ** 2;
  const raw = (u: number, s: number) => frustumPoint(f, u, s);
  // A parallel offset d outside a radial edge meets radius ρ at an angle asin(d / ρ) further round.
  const uOutside = (side: 0 | 1, s: number, d: number) => {
    const rho = Math.abs(radiusAt(f, s));
    const du = Math.asin(Math.min(1, d / rho)) / f.angle;
    return side === 0 ? -du : 1 + du;
  };
  const normalRaw = (side: 0 | 1) => {
    const d = edgeDirection(f, side);
    const c = raw(0.5, p.height / 2), e = raw(side, p.height / 2);
    const n1 = { x: d.y, y: -d.x };
    return (n1.x * (e.x - c.x) + n1.y * (e.y - c.y)) > 0 ? n1 : { x: -n1.x, y: -n1.y };
  };
  const sTop = -p.channelAllowance;
  const top: Point[] = [];
  const u0t = uOutside(0, sTop, p.front[0]), u1t = uOutside(1, sTop, p.front[1]);
  for (let i = 0; i <= SAMPLES; i++) { const u = u0t + ((u1t - u0t) * i) / SAMPLES; top.push(raw(u, sTop)); }
  const bot: Point[] = [];
  const sB = (u: number) => bottomS(Math.min(1, Math.max(0, u))) + p.hemAllowance;
  const u0b = uOutside(0, sB(0), p.front[0]), u1b = uOutside(1, sB(1), p.front[1]);
  for (let i = 0; i <= SAMPLES; i++) { const u = u0b + ((u1b - u0b) * i) / SAMPLES; bot.push(raw(u, sB(u))); }
  const ring = [...top, ...bot.reverse()];
  const minX = Math.min(...ring.map((q) => q.x)), minY = Math.min(...ring.map((q) => q.y));
  const maxX = Math.max(...ring.map((q) => q.x)), maxY = Math.max(...ring.map((q) => q.y));
  const offset = { x: -minX, y: -minY };
  const mv = (q: Point) => ({ x: q.x + offset.x, y: q.y + offset.y });
  return {
    f, bottomS,
    at: (u, s) => mv(raw(u, s)),
    uOutside,
    edgeNormal: normalRaw,
    cut: ring.map(mv),
    width: maxX - minX,
    height: maxY - minY,
    offset,
  };
}
