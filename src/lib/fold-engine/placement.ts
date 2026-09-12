/**
 * Placing pieces in one 3D scene: each piece folds in its own flat frame, then
 * a placement moves it — an optional rotation about its x axis, a translation,
 * and optionally a ride on the folded region of another piece it is sewn to.
 * Shared by the viewer and the cloth tests so both assemble a pattern the same way.
 */
import type { Point } from '../pattern-engine/graph/Point.js';
import { regionAt, regionTransforms, applyTransform, rotationAboutLine, type FoldModel, type RegionTransform, type Vec3 } from './model.js';

/** Per-piece placement in the 3D scene, in flat pattern mm before folding (dz is applied after). */
export interface PiecePlacement {
  dx?: number;
  dy?: number;
  dz?: number;
  /** Root the piece's hinge tree at this flat point instead of its label. */
  rootPoint?: Point;
  /** Show this piece even when it has no folds (strips are hidden by default). */
  keep?: boolean;
  /** Rotation about the piece's own x axis in degrees, applied after its folds and before dx/dy/dz (a gusset lying flat on the bag bottom). */
  rx?: number;
  /**
   * Ride on another piece: after its own folds and dx/dy/dz (given in that host's flat frame), this
   * piece moves with the host region containing `point` — a flap sewn to a cover follows the cover.
   */
  attach?: { pieceId: string; point: Point };
  /**
   * Drape the piece along a 3D polyline instead of folding it: flat y becomes arc length along
   * `path` (from `path[0]`), flat x runs along `across` from `x0`. A strap laid over a shoulder,
   * webbing run round a bag. Folds are ignored for a draped piece.
   */
  drape?: { path: Vec3[]; across: Vec3; x0?: number; along?: 'x' | 'y' };
  /** Rotation about the piece's z axis (through its flat origin) in degrees, applied after rx and before dx/dy/dz. 180 turns a piece upside down. */
  rz?: number;
  /**
   * Wrap the piece into a cone: flat polar coordinates about `apex` (mm, radians) become a cone
   * of half-angle `halfAngle` hanging from `apex3` with its axis down −y. Flat angle θ maps to
   * cone angle `angle0 + θ · angleScale` (a half-circle sweep needs scale 2 to close). Skirt panels.
   */
  cone?: { apex: Point; apex3: Vec3; halfAngle: number; angleScale: number; angle0: number };
}

/** Flat point → 3D for a cone-wrapped piece. */
export function conePoint(cone: NonNullable<PiecePlacement['cone']>, flat: Point): Vec3 {
  const dx = flat.x - cone.apex.x;
  const dy = flat.y - cone.apex.y;
  const r = Math.hypot(dx, dy);
  const theta = cone.angle0 + Math.atan2(dy, dx) * cone.angleScale;
  const rho = r * Math.sin(cone.halfAngle);
  const h = r * Math.cos(cone.halfAngle);
  return [cone.apex3[0] + rho * Math.cos(theta), cone.apex3[1] - h, cone.apex3[2] + rho * Math.sin(theta)];
}

/** The direct flat→3D map of a draped or cone-wrapped placement, or null when the piece folds normally. */
export function placementMap(pl: PiecePlacement | undefined): ((flat: Point) => Vec3) | null {
  if (pl?.drape) { const dr = pl.drape; return (f) => drapePoint(dr, f); }
  if (pl?.cone) { const c = pl.cone; return (f) => conePoint(c, f); }
  return null;
}

/** Point at arc length `s` along a polyline (clamped to its ends), and the unit tangent there. */
export function pointAlongPath(path: Vec3[], s: number): { p: Vec3; t: Vec3 } {
  let remaining = Math.max(0, s);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const seg: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(seg[0], seg[1], seg[2]);
    if (remaining <= len || i === path.length - 1) {
      const u = len > 0 ? Math.min(1, remaining / len) : 0;
      const t: Vec3 = len > 0 ? [seg[0] / len, seg[1] / len, seg[2] / len] : [0, -1, 0];
      return { p: [a[0] + seg[0] * u, a[1] + seg[1] * u, a[2] + seg[2] * u], t };
    }
    remaining -= len;
  }
  return { p: path[0], t: [0, -1, 0] };
}

/** Flat point → 3D for a draped piece: arc length along the path for y, `across` for x. */
export function drapePoint(drape: NonNullable<PiecePlacement['drape']>, flat: Point): Vec3 {
  const alongX = drape.along === 'x';
  const { p } = pointAlongPath(drape.path, alongX ? flat.x : flat.y);
  const dx = (alongX ? flat.y : flat.x) - (drape.x0 ?? 0);
  const a = drape.across;
  const al = Math.hypot(a[0], a[1], a[2]) || 1;
  return [p[0] + (a[0] / al) * dx, p[1] + (a[1] / al) * dx, p[2] + (a[2] / al) * dx];
}

export interface PlacedEntry {
  model: FoldModel;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  placement?: PiecePlacement;
}

const DEG = Math.PI / 180;

/**
 * Where a folded point of `entry` ends up: its own rotation, its offsets, then (if attached) the
 * folded transform of the host region it is sewn to, in the host's frame. Hosts cannot themselves
 * be attached pieces.
 */
export function makePlacer(entries: PlacedEntry[], anglesOf: (entry: PlacedEntry) => number[], t: number) {
  return (entry: PlacedEntry): ((v: Vec3) => Vec3) => {
    const pl = entry.placement;
    const rx = pl?.rx ? rotationAboutLine([0, 0, 0], [1, 0, 0], pl.rx * DEG) : null;
    const rz = pl?.rz ? rotationAboutLine([0, 0, 0], [0, 0, 1], pl.rz * DEG) : null;
    const host = pl?.attach ? entries.find((e) => e.model.pieceId === pl.attach!.pieceId && !e.placement?.attach) : undefined;
    let hostRegion: RegionTransform | null = null;
    if (host && pl?.attach) {
      const region = regionAt(host.model, pl.attach.point);
      hostRegion = regionTransforms(host.model, anglesOf(host), t)[region < 0 ? host.model.root : region];
    }
    return (v) => {
      let p: Vec3 = rx ? applyTransform(rx, v) : v;
      if (rz) p = applyTransform(rz, p);
      p = [p[0] + entry.offsetX, p[1] - entry.offsetY, p[2] + entry.offsetZ];
      if (host && hostRegion) {
        p = applyTransform(hostRegion, p);
        p = [p[0] + host.offsetX, p[1] - host.offsetY, p[2] + host.offsetZ];
      }
      return p;
    };
  };
}
