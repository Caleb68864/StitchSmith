/**
 * Body forms for fit checks. A torso is a rounded chest block with a shoulder
 * capsule across the top and a neck; straps, harnesses and rigs are checked
 * against it instead of a box. Dimensions are the wearer's, in mm; the form
 * stands with +y up, chest facing +z, centred on `origin` at the base of the
 * torso (waist).
 */
import type { Solid, Vec3 } from './sim.js';

export interface TorsoSpec {
  /** Chest width across the front, mm (shoulder-to-shoulder at the armpit). */
  chestWidth: number;
  /** Chest depth front to back, mm. */
  chestDepth: number;
  /** Waist to shoulder top, mm. */
  torsoLength: number;
  /** Outer shoulder to outer shoulder, mm. */
  shoulderWidth: number;
  /** Neck radius, mm. */
  neckRadius: number;
}

/** A medium adult torso (mm). */
export const TORSO_MEDIUM: TorsoSpec = { chestWidth: 360, chestDepth: 230, torsoLength: 480, shoulderWidth: 440, neckRadius: 65 };

export interface TorsoForm {
  solids: Solid[];
  /** Top of the shoulder at each side, mm — where a strap crests. */
  shoulderTop: { left: Vec3; right: Vec3 };
  /** Chest front plane z and back plane z. */
  frontZ: number;
  backZ: number;
  topY: number;
  /** Where the chest block ends and the shoulder capsule begins (its axis height), and that capsule's radius. */
  chestTop: number;
  shoulderRadius: number;
}

export function torsoForm(spec: TorsoSpec, origin: Vec3 = [0, 0, 0]): TorsoForm {
  const [ox, oy, oz] = origin;
  const r = Math.min(spec.chestDepth, spec.chestWidth) * 0.3;
  const shoulderRadius = spec.chestDepth * 0.42;
  const chestTop = oy + spec.torsoLength - shoulderRadius;
  const chest: Solid = {
    kind: 'rounded_box',
    center: [ox, (oy + chestTop) / 2, oz],
    half: [spec.chestWidth / 2, (chestTop - oy) / 2, spec.chestDepth / 2],
    radius: r,
  };
  const halfShoulder = spec.shoulderWidth / 2 - shoulderRadius;
  const shoulder: Solid = {
    kind: 'capsule',
    a: [ox - halfShoulder, chestTop, oz],
    b: [ox + halfShoulder, chestTop, oz],
    radius: shoulderRadius,
  };
  const neck: Solid = {
    kind: 'capsule',
    a: [ox, chestTop, oz],
    b: [ox, oy + spec.torsoLength + 80, oz],
    radius: spec.neckRadius,
  };
  const topY = chestTop + shoulderRadius;
  // A strap crests the shoulder where the shoulder line's straight part ends.
  const crestX = spec.shoulderWidth / 2 - shoulderRadius;
  return {
    solids: [chest, shoulder, neck],
    shoulderTop: { left: [ox - crestX, topY, oz], right: [ox + crestX, topY, oz] },
    frontZ: oz + spec.chestDepth / 2,
    backZ: oz - spec.chestDepth / 2,
    topY,
    chestTop,
    shoulderRadius,
  };
}

/**
 * Polyline a strap follows over one shoulder: up the back from `backStartY`,
 * over the shoulder capsule (a few mm proud of it), then down the chest front
 * to the waist. Arc length from the start is what a draped pad's flat y maps to.
 */
export function shoulderPath(spec: TorsoSpec, side: 'left' | 'right', backStartY: number, origin: Vec3 = [0, 0, 0], clearance = 2): Vec3[] {
  const form = torsoForm(spec, origin);
  const [, oy, oz] = origin;
  const shoulderRadius = spec.chestDepth * 0.42;
  const chestTop = oy + spec.torsoLength - shoulderRadius;
  const x = side === 'left' ? form.shoulderTop.left[0] : form.shoulderTop.right[0];
  const rr = shoulderRadius + clearance;
  const pts: Vec3[] = [];
  const backZ = form.backZ - clearance;
  const frontZ = form.frontZ + clearance;
  // Up the back (a start above the straight part just begins at the shoulder).
  if (backStartY < chestTop - 41) pts.push([x, backStartY, backZ]);
  pts.push([x, chestTop - 40, backZ]);
  // Over the shoulder: from the back (180°) over the top (90°) to the front (0°).
  for (let deg = 180; deg >= 0; deg -= 15) {
    const a = (deg * Math.PI) / 180;
    pts.push([x, chestTop + rr * Math.sin(a), oz + rr * Math.cos(a)]);
  }
  // Down the front.
  pts.push([x, chestTop - 40, frontZ]);
  pts.push([x, oy, frontZ]);
  return pts;
}
