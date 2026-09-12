/**
 * Cloth engine — position-based dynamics (roadmap Stage 3).
 *
 * Particles are the mesh vertices. Constraints:
 *   stretch — every mesh edge keeps its FLAT length (fabric does not stretch)
 *   bend    — the two vertices opposite each interior edge keep the distance
 *             they had in the INITIAL (rigid-folded) state, so creases are
 *             remembered like pressed Cordura and flat areas resist buckling
 *   seam    — matched samples along two stitch lines are pulled to `gap`
 *   solids  — axis-aligned boxes (the magazine) push particles out
 *
 * Stiffness values are per-iteration fractions in (0, 1]. Time is unitless:
 * the integrator is damped Verlet without gravity by default, so the result
 * is a quasi-static relaxation from the rigid fold toward a seamed shape.
 */

import type { Point } from '../pattern-engine/graph/Point.js';
import type { ClothMesh } from './mesh.js';
import { nearestVertex } from './mesh.js';

export type Vec3 = [number, number, number];

export interface BoxSolid {
  kind: 'box';
  center: Vec3;
  half: Vec3;
}

export interface SeamSide {
  pieceId: string;
  /** Straight stitch line in that piece's flat coordinates (ignored when `points` is given). */
  from: Point;
  to: Point;
  /** Polyline stitch line (≥ 2 points), sampled by arc length; overrides from/to. */
  points?: Point[];
}

/** Total length of a seam side and a point at a fraction of that length. */
function sideLength(side: SeamSide): number {
  const pts = side.points ?? [side.from, side.to];
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return len;
}
function sideAt(side: SeamSide, t: number): Point {
  const pts = side.points ?? [side.from, side.to];
  const total = sideLength(side);
  let target = t * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (target <= seg || i === pts.length - 1) {
      const u = seg > 0 ? Math.min(1, target / seg) : 0;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * u, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * u };
    }
    target -= seg;
  }
  return pts[pts.length - 1];
}

export interface SeamSpec {
  a: SeamSide;
  b: SeamSide;
  /** Rest distance between matched points; defaults to the fabric thickness. */
  gap?: number;
  /**
   * Number of attachment points along the seam. Default: one per mesh spacing.
   * Use a few for a gathered seam (a long edge sewn to a short one): the fabric
   * between tacks stays free instead of being compressed, which a coarse mesh
   * cannot pleat.
   */
  samples?: number;
  label?: string;
}

export interface ClothParams {
  /** Mesh spacing used when the meshes were built (drives seam sampling). */
  spacing: number;
  stretchStiffness: number;
  bendStiffness: number;
  seamStiffness: number;
  /** Constraint iterations per step. */
  iterations: number;
  /** Velocity damping per step (0.9–0.99). */
  damping: number;
  gravity: Vec3;
  /** Fabric thickness, mm — collision margin and default seam gap. */
  thickness: number;
  /**
   * Steps over which each seam's rest length ramps from its initial distance down
   * to its gap, so sewing two distant edges (a lid closure) pulls the cloth in
   * gradually instead of yanking a few vertices through the object.
   */
  seamRampSteps: number;
  /**
   * Largest move a seam may impose on a particle per iteration, mm. Keeps a far
   * closure (lid tip to face) from yanking one vertex through its neighbours;
   * the fabric follows at the stretch constraints' pace. Default spacing / 4.
   */
  maxSeamCorrection?: number;
}

export const DEFAULT_CLOTH_PARAMS: ClothParams = {
  spacing: 8,
  stretchStiffness: 1,
  bendStiffness: 0.35,
  seamStiffness: 0.6,
  iterations: 12,
  damping: 0.92,
  gravity: [0, 0, 0],
  thickness: 1.2,
  seamRampSteps: 120,
};

interface DistanceConstraint {
  i: number;
  j: number;
  rest: number;
  /** Seams only: distance at creation, ramped down to `rest` over `seamRampSteps`. */
  initial?: number;
}

export interface ClothWorld {
  meshes: ClothMesh[];
  /** Global vertex index of each mesh's first vertex. */
  base: number[];
  n: number;
  pos: Float64Array;
  prev: Float64Array;
  invMass: Float64Array;
  stretch: DistanceConstraint[];
  bend: DistanceConstraint[];
  seams: DistanceConstraint[];
  solids: BoxSolid[];
  params: ClothParams;
  steps: number;
}

export interface CreateWorldOptions {
  meshes: ClothMesh[];
  /** Initial 3D position for (mesh index, vertex index, flat point) — normally from the rigid fold. */
  initial: (meshIndex: number, vertex: number, flat: Point) => Vec3;
  seams?: SeamSpec[];
  solids?: BoxSolid[];
  /** Vertices to pin: (mesh index, vertex index) → true. */
  pinned?: (meshIndex: number, vertex: number, flat: Point) => boolean;
  /**
   * Rest distance for a bending pair (k, l) across shared edge (i, j), all as flat
   * points. Default: the flat distance (fabric wants to be flat). Return a crease
   * distance across fold lines so pressed folds are remembered — see `foldedCreaseRest`.
   */
  bendRest?: (meshIndex: number, k: Point, l: Point, i: Point, j: Point) => number;
  params?: Partial<ClothParams>;
}

function d3(a: Float64Array, i: number, j: number): number {
  const dx = a[3 * j] - a[3 * i];
  const dy = a[3 * j + 1] - a[3 * i + 1];
  const dz = a[3 * j + 2] - a[3 * i + 2];
  return Math.hypot(dx, dy, dz);
}

export function createWorld(opts: CreateWorldOptions): ClothWorld {
  const params: ClothParams = { ...DEFAULT_CLOTH_PARAMS, ...(opts.params ?? {}) };
  const meshes = opts.meshes;
  const base: number[] = [];
  let n = 0;
  for (const m of meshes) { base.push(n); n += m.vertexCount; }
  const pos = new Float64Array(3 * n);
  const invMass = new Float64Array(n).fill(1);

  meshes.forEach((m, mi) => {
    for (let v = 0; v < m.vertexCount; v++) {
      const flat = { x: m.flat[2 * v], y: m.flat[2 * v + 1] };
      const p = opts.initial(mi, v, flat);
      const g = base[mi] + v;
      pos[3 * g] = p[0]; pos[3 * g + 1] = p[1]; pos[3 * g + 2] = p[2];
      if (opts.pinned?.(mi, v, flat)) invMass[g] = 0;
    }
  });
  const prev = Float64Array.from(pos);

  const stretch: DistanceConstraint[] = [];
  const bend: DistanceConstraint[] = [];
  // A rigid start is discontinuous wherever three panels meet (a wing, a band and
  // its side strip): edges torn at initialisation mark their vertices, and no
  // crease is trusted there — the fabric wants flat and the seams decide.
  const torn = new Uint8Array(n);
  meshes.forEach((m, mi) => {
    for (const [i, j] of m.edges) {
      const rest = Math.hypot(m.flat[2 * j] - m.flat[2 * i], m.flat[2 * j + 1] - m.flat[2 * i + 1]);
      const gi = base[mi] + i;
      const gj = base[mi] + j;
      stretch.push({ i: gi, j: gj, rest });
      if (rest > 1e-9 && Math.abs(d3(pos, gi, gj) / rest - 1) > 0.25) { torn[gi] = 1; torn[gj] = 1; }
    }
  });
  meshes.forEach((m, mi) => {
    const fp = (v: number): Point => ({ x: m.flat[2 * v], y: m.flat[2 * v + 1] });
    for (const [k, l, i, j] of m.bends) {
      const gk = base[mi] + k;
      const gl = base[mi] + l;
      const flatRest = Math.hypot(m.flat[2 * l] - m.flat[2 * k], m.flat[2 * l + 1] - m.flat[2 * k + 1]);
      const anyTorn = torn[gk] || torn[gl] || torn[base[mi] + i] || torn[base[mi] + j];
      const rest = opts.bendRest && !anyTorn ? opts.bendRest(mi, fp(k), fp(l), fp(i), fp(j)) : flatRest;
      bend.push({ i: gk, j: gl, rest });
    }
  });

  const seams: DistanceConstraint[] = [];
  const seen = new Set<string>();
  for (const s of opts.seams ?? []) {
    const ma = meshes.findIndex((m) => m.pieceId === s.a.pieceId);
    const mb = meshes.findIndex((m) => m.pieceId === s.b.pieceId);
    if (ma < 0 || mb < 0) continue;
    const la = sideLength(s.a);
    const lb = sideLength(s.b);
    const count = Math.max(2, s.samples ?? Math.ceil(Math.max(la, lb) / params.spacing) + 1);
    const gap = s.gap ?? params.thickness;
    for (let k = 0; k < count; k++) {
      const t = k / (count - 1);
      const pa = sideAt(s.a, t);
      const pb = sideAt(s.b, t);
      const va = nearestVertex(meshes[ma], pa);
      const vb = nearestVertex(meshes[mb], pb);
      if (va < 0 || vb < 0) continue;
      const gi = base[ma] + va;
      const gj = base[mb] + vb;
      if (gi === gj) continue;
      const key = gi < gj ? `${gi}:${gj}` : `${gj}:${gi}`;
      if (seen.has(key)) continue;
      seen.add(key);
      seams.push({ i: gi, j: gj, rest: gap, initial: d3(pos, gi, gj) });
    }
  }

  return { meshes, base, n, pos, prev, invMass, stretch, bend, seams, solids: opts.solids ?? [], params, steps: 0 };
}

function project(pos: Float64Array, invMass: Float64Array, c: DistanceConstraint, k: number, maxMove = Infinity): void {
  const wi = invMass[c.i];
  const wj = invMass[c.j];
  const w = wi + wj;
  if (w === 0) return;
  const dx = pos[3 * c.j] - pos[3 * c.i];
  const dy = pos[3 * c.j + 1] - pos[3 * c.i + 1];
  const dz = pos[3 * c.j + 2] - pos[3 * c.i + 2];
  const d = Math.hypot(dx, dy, dz);
  if (d < 1e-9) return;
  let corr = k * (d - c.rest);
  if (Math.abs(corr) > maxMove * w) corr = Math.sign(corr) * maxMove * w;
  const s = corr / d / w;
  pos[3 * c.i] += wi * s * dx; pos[3 * c.i + 1] += wi * s * dy; pos[3 * c.i + 2] += wi * s * dz;
  pos[3 * c.j] -= wj * s * dx; pos[3 * c.j + 1] -= wj * s * dy; pos[3 * c.j + 2] -= wj * s * dz;
}

/**
 * Push particles out of the (margin-expanded) boxes. Continuous in the sense
 * that a particle which was outside on some axis at the start of the step is
 * pushed back out through THAT face, so a seam cannot drag cloth through the
 * object — the lid slides over the magazine top instead of tunnelling.
 */
function collide(pos: Float64Array, prev: Float64Array, invMass: Float64Array, n: number, solids: BoxSolid[], margin: number): void {
  for (const s of solids) {
    const h = [s.half[0] + margin, s.half[1] + margin, s.half[2] + margin];
    for (let g = 0; g < n; g++) {
      if (invMass[g] === 0) continue;
      const d = [pos[3 * g] - s.center[0], pos[3 * g + 1] - s.center[1], pos[3 * g + 2] - s.center[2]];
      if (Math.abs(d[0]) >= h[0] || Math.abs(d[1]) >= h[1] || Math.abs(d[2]) >= h[2]) continue;
      const dp = [prev[3 * g] - s.center[0], prev[3 * g + 1] - s.center[1], prev[3 * g + 2] - s.center[2]];
      // Prefer the axis on which the particle was outside before this step (the face it entered).
      let axis = -1;
      let best = -Infinity;
      for (let a = 0; a < 3; a++) {
        const outside = Math.abs(dp[a]) - h[a];
        if (outside >= -1e-9 && outside > best) { best = outside; axis = a; }
      }
      if (axis < 0) {
        const pen = [h[0] - Math.abs(d[0]), h[1] - Math.abs(d[1]), h[2] - Math.abs(d[2])];
        axis = pen[2] <= pen[0] && pen[2] <= pen[1] ? 2 : pen[0] <= pen[1] ? 0 : 1;
      }
      const sign = axis === -1 ? 1 : Math.sign(dp[axis] || d[axis] || 1);
      pos[3 * g + axis] = s.center[axis] + sign * h[axis];
    }
  }
}

/** Advance one time step: integrate, then iterate constraints and collisions. */
export function step(world: ClothWorld): void {
  const { pos, prev, invMass, n, params } = world;
  const [gx, gy, gz] = params.gravity;
  for (let g = 0; g < n; g++) {
    if (invMass[g] === 0) continue;
    const x = pos[3 * g], y = pos[3 * g + 1], z = pos[3 * g + 2];
    const vx = (x - prev[3 * g]) * params.damping;
    const vy = (y - prev[3 * g + 1]) * params.damping;
    const vz = (z - prev[3 * g + 2]) * params.damping;
    prev[3 * g] = x; prev[3 * g + 1] = y; prev[3 * g + 2] = z;
    pos[3 * g] = x + vx + gx; pos[3 * g + 1] = y + vy + gy; pos[3 * g + 2] = z + vz + gz;
  }
  const margin = params.thickness / 2;
  const ramp = params.seamRampSteps > 0 ? Math.min(1, world.steps / params.seamRampSteps) : 1;
  const maxSeam = params.maxSeamCorrection ?? params.spacing / 4;
  for (let it = 0; it < params.iterations; it++) {
    for (const c of world.stretch) project(pos, invMass, c, params.stretchStiffness);
    for (const c of world.bend) project(pos, invMass, c, params.bendStiffness);
    for (const c of world.seams) {
      const target = c.initial === undefined ? c.rest : c.rest + (c.initial - c.rest) * (1 - ramp);
      project(pos, invMass, { i: c.i, j: c.j, rest: target }, params.seamStiffness, maxSeam);
    }
    collide(pos, prev, invMass, n, world.solids, margin);
  }
  world.steps++;
}

export function relax(world: ClothWorld, steps: number): void {
  for (let i = 0; i < steps; i++) step(world);
}

/** Max and mean distance error across seam constraints (mm). */
export function seamResidual(world: ClothWorld): { max: number; mean: number } {
  let max = 0;
  let sum = 0;
  for (const c of world.seams) {
    const e = Math.abs(d3(world.pos, c.i, c.j) - c.rest);
    max = Math.max(max, e);
    sum += e;
  }
  return { max, mean: world.seams.length ? sum / world.seams.length : 0 };
}

/**
 * Largest relative edge-length error, e.g. 0.02 = 2 % stretch. The error is
 * taken over at least half a cell: the mesher leaves sliver edges where an arc
 * or a diagonal clips a grid cell, and a millimetre on a sliver is not cloth
 * stretched threefold.
 */
export function maxStretch(world: ClothWorld): number {
  let max = 0;
  const floor = world.params.spacing / 2;
  for (const c of world.stretch) {
    if (c.rest < 1e-9) continue;
    max = Math.max(max, Math.abs(d3(world.pos, c.i, c.j) - c.rest) / Math.max(c.rest, floor));
  }
  return max;
}

/** Deepest penetration of any particle into any solid (mm, 0 = none). */
export function maxPenetration(world: ClothWorld): number {
  let max = 0;
  for (const s of world.solids) {
    for (let g = 0; g < world.n; g++) {
      const dx = Math.abs(world.pos[3 * g] - s.center[0]);
      const dy = Math.abs(world.pos[3 * g + 1] - s.center[1]);
      const dz = Math.abs(world.pos[3 * g + 2] - s.center[2]);
      const pen = Math.min(s.half[0] - dx, s.half[1] - dy, s.half[2] - dz);
      if (pen > max) max = pen;
    }
  }
  return max;
}

/** Position of one mesh vertex. */
export function vertexPosition(world: ClothWorld, meshIndex: number, vertex: number): Vec3 {
  const g = world.base[meshIndex] + vertex;
  return [world.pos[3 * g], world.pos[3 * g + 1], world.pos[3 * g + 2]];
}


/**
 * Seams implied by a pattern: every path id starting with `seam:` that appears
 * on two pieces is one seam, sampled by arc length along both polylines. This
 * is the Tri-Zip convention (its builder already verifies the lengths match).
 */
export function seamsFromSharedPaths(pieces: Array<{ id: string; paths: Array<{ id: string; edges: Array<{ start: Point; end: Point }> }> }>): SeamSpec[] {
  const byId = new Map<string, Array<{ pieceId: string; points: Point[] }>>();
  for (const piece of pieces) {
    for (const path of piece.paths) {
      if (!path.id.startsWith('seam:') || path.edges.length === 0) continue;
      const points: Point[] = [path.edges[0].start, ...path.edges.map((e) => e.end)];
      const arr = byId.get(path.id) ?? [];
      arr.push({ pieceId: piece.id, points });
      byId.set(path.id, arr);
    }
  }
  const seams: SeamSpec[] = [];
  for (const [id, sides] of byId) {
    if (sides.length !== 2) continue;
    const [a, b] = sides;
    seams.push({
      label: id,
      a: { pieceId: a.pieceId, from: a.points[0], to: a.points[a.points.length - 1], points: a.points },
      b: { pieceId: b.pieceId, from: b.points[0], to: b.points[b.points.length - 1], points: b.points },
    });
  }
  return seams;
}
