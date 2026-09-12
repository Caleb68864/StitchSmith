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
    const host = pl?.attach ? entries.find((e) => e.model.pieceId === pl.attach!.pieceId && !e.placement?.attach) : undefined;
    let hostRegion: RegionTransform | null = null;
    if (host && pl?.attach) {
      const region = regionAt(host.model, pl.attach.point);
      hostRegion = regionTransforms(host.model, anglesOf(host), t)[region < 0 ? host.model.root : region];
    }
    return (v) => {
      let p: Vec3 = rx ? applyTransform(rx, v) : v;
      p = [p[0] + entry.offsetX, p[1] - entry.offsetY, p[2] + entry.offsetZ];
      if (host && hostRegion) {
        p = applyTransform(hostRegion, p);
        p = [p[0] + host.offsetX, p[1] - host.offsetY, p[2] + host.offsetZ];
      }
      return p;
    };
  };
}
