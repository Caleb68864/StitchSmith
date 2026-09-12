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

/** Line segment a–b swept by a sphere: a limb, a neck, a shoulder line. */
export interface CapsuleSolid {
  kind: 'capsule';
  a: Vec3;
  b: Vec3;
  radius: number;
}

/** Box with rounded edges (radius r): a chest or a foam block. `half` is the outer half-extent. */
export interface RoundedBoxSolid {
  kind: 'rounded_box';
  center: Vec3;
  half: Vec3;
  radius: number;
}

export type Solid = BoxSolid | CapsuleSolid | RoundedBoxSolid;

/**
 * Signed distance and outward normal from a point to a solid's surface.
 * Boxes are handled by the continuous face push-out in `collide`; this covers
 * the smooth shapes a body is made of.
 */
export function solidDistance(s: CapsuleSolid | RoundedBoxSolid, p: Vec3): { dist: number; normal: Vec3 } {
  if (s.kind === 'capsule') {
    const ab: Vec3 = [s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]];
    const ap: Vec3 = [p[0] - s.a[0], p[1] - s.a[1], p[2] - s.a[2]];
    const l2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
    const t = l2 > 0 ? Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / l2)) : 0;
    const q: Vec3 = [p[0] - (s.a[0] + ab[0] * t), p[1] - (s.a[1] + ab[1] * t), p[2] - (s.a[2] + ab[2] * t)];
    const d = Math.hypot(q[0], q[1], q[2]);
    const normal: Vec3 = d > 1e-9 ? [q[0] / d, q[1] / d, q[2] / d] : [0, 0, 1];
    return { dist: d - s.radius, normal };
  }
  // Rounded box: distance to the inner box shrunk by r, minus r.
  const q: Vec3 = [
    Math.abs(p[0] - s.center[0]) - (s.half[0] - s.radius),
    Math.abs(p[1] - s.center[1]) - (s.half[1] - s.radius),
    Math.abs(p[2] - s.center[2]) - (s.half[2] - s.radius),
  ];
  const o: Vec3 = [Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)];
  const outside = Math.hypot(o[0], o[1], o[2]);
  const inside = Math.min(Math.max(q[0], q[1], q[2]), 0);
  const dist = outside + inside - s.radius;
  let normal: Vec3;
  if (outside > 1e-9) {
    normal = [o[0] / outside, o[1] / outside, o[2] / outside];
  } else {
    // Inside the inner box: push out through the nearest face.
    const axis = q[0] >= q[1] && q[0] >= q[2] ? 0 : q[1] >= q[2] ? 1 : 2;
    normal = [0, 0, 0];
    normal[axis] = 1;
  }
  const sx = Math.sign(p[0] - s.center[0]) || 1;
  const sy = Math.sign(p[1] - s.center[1]) || 1;
  const sz = Math.sign(p[2] - s.center[2]) || 1;
  return { dist, normal: [normal[0] * sx, normal[1] * sy, normal[2] * sz] };
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
  /**
   * Cloth-to-cloth collision: vertices are kept one thickness off every triangle
   * they are not part of (own mesh and others), so a lid rests on a face and a
   * folded double layer stays two layers. Vertex–triangle, spatial-hashed, run
   * every `selfCollisionEvery` steps.
   */
  selfCollision: boolean;
  selfCollisionEvery: number;
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
  selfCollision: false,
  selfCollisionEvery: 2,
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
  solids: Solid[];
  params: ClothParams;
  /** Global triangle vertex indices, 3 per triangle (all meshes). */
  tris: Uint32Array;
  /** For each global vertex, its 1-ring neighbours (global indices) — excluded from self-collision. */
  ring: Uint32Array[];
  steps: number;
}

export interface CreateWorldOptions {
  meshes: ClothMesh[];
  /** Initial 3D position for (mesh index, vertex index, flat point) — normally from the rigid fold. */
  initial: (meshIndex: number, vertex: number, flat: Point) => Vec3;
  seams?: SeamSpec[];
  solids?: Solid[];
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

  const triList: number[] = [];
  const ringSets: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  meshes.forEach((m, mi) => {
    for (let t = 0; t < m.triangles.length; t += 3) triList.push(base[mi] + m.triangles[t], base[mi] + m.triangles[t + 1], base[mi] + m.triangles[t + 2]);
    for (const [i, j] of m.edges) { ringSets[base[mi] + i].add(base[mi] + j); ringSets[base[mi] + j].add(base[mi] + i); }
  });
  const ring = ringSets.map((set) => Uint32Array.from(set));

  return { meshes, base, n, pos, prev, invMass, stretch, bend, seams, solids: opts.solids ?? [], params, steps: 0, tris: Uint32Array.from(triList), ring };
}

/** Closest point on triangle (a, b, c) to p — Ericson, Real-Time Collision Detection 5.1.5. */
function closestOnTriangle(p: Vec3, a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const ap: Vec3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const d1 = ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2];
  const d2 = ac[0] * ap[0] + ac[1] * ap[1] + ac[2] * ap[2];
  if (d1 <= 0 && d2 <= 0) return a;
  const bp: Vec3 = [p[0] - b[0], p[1] - b[1], p[2] - b[2]];
  const d3 = ab[0] * bp[0] + ab[1] * bp[1] + ab[2] * bp[2];
  const d4 = ac[0] * bp[0] + ac[1] * bp[1] + ac[2] * bp[2];
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v]; }
  const cp: Vec3 = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  const d5 = ab[0] * cp[0] + ab[1] * cp[1] + ab[2] * cp[2];
  const d6 = ac[0] * cp[0] + ac[1] * cp[1] + ac[2] * cp[2];
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w]; }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w]; }
  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  return [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
}

/**
 * Keep every vertex at least `margin` from every triangle it does not belong to
 * (nor its 1-ring). Triangles are hashed by bounding box into cells of `cell`;
 * each vertex checks its cell and the 26 around it.
 */
function selfCollide(world: ClothWorld, margin: number, cell: number): void {
  const { pos, invMass, n, tris, ring } = world;
  const hash = new Map<string, number[]>();
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const triCount = tris.length / 3;
  for (let t = 0; t < triCount; t++) {
    const a = tris[3 * t], b = tris[3 * t + 1], c = tris[3 * t + 2];
    let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pos[3 * v + k]); hi[k] = Math.max(hi[k], pos[3 * v + k]); }
    const c0 = lo.map((x) => Math.floor(x / cell)), c1 = hi.map((x) => Math.floor(x / cell));
    for (let x = c0[0]; x <= c1[0]; x++) for (let y = c0[1]; y <= c1[1]; y++) for (let z = c0[2]; z <= c1[2]; z++) {
      const k = key(x, y, z);
      const list = hash.get(k);
      if (list) list.push(t); else hash.set(k, [t]);
    }
  }
  const m2 = margin * margin;
  for (let g = 0; g < n; g++) {
    const p: Vec3 = [pos[3 * g], pos[3 * g + 1], pos[3 * g + 2]];
    const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell);
    const list = hash.get(key(cx, cy, cz));
    if (!list) continue;
    const nb = ring[g];
    for (const t of list) {
      const a = tris[3 * t], b = tris[3 * t + 1], c = tris[3 * t + 2];
      if (a === g || b === g || c === g) continue;
      let skip = false;
      for (let k = 0; k < nb.length; k++) if (nb[k] === a || nb[k] === b || nb[k] === c) { skip = true; break; }
      if (skip) continue;
      const pa: Vec3 = [pos[3 * a], pos[3 * a + 1], pos[3 * a + 2]];
      const pb: Vec3 = [pos[3 * b], pos[3 * b + 1], pos[3 * b + 2]];
      const pc: Vec3 = [pos[3 * c], pos[3 * c + 1], pos[3 * c + 2]];
      const q = closestOnTriangle(p, pa, pb, pc);
      const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= m2) continue;
      const dist = Math.sqrt(d2);
      let nx: number, ny: number, nz: number;
      if (dist > 1e-6) { nx = dx / dist; ny = dy / dist; nz = dz / dist; }
      else {
        // On the plane: use the triangle normal, on the side the vertex came from.
        const e1: Vec3 = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]], e2: Vec3 = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]];
        nx = e1[1] * e2[2] - e1[2] * e2[1]; ny = e1[2] * e2[0] - e1[0] * e2[2]; nz = e1[0] * e2[1] - e1[1] * e2[0];
        const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        const side = (world.prev[3 * g] - q[0]) * nx + (world.prev[3 * g + 1] - q[1]) * ny + (world.prev[3 * g + 2] - q[2]) * nz;
        if (side < 0) { nx = -nx; ny = -ny; nz = -nz; }
      }
      const pen = margin - dist;
      const wv = invMass[g];
      const wt = (invMass[a] + invMass[b] + invMass[c]) / 3;
      const wsum = wv + wt;
      if (wsum === 0) continue;
      const sv = (pen * wv) / wsum;
      const st = (pen * wt) / wsum / 3;
      pos[3 * g] += nx * sv; pos[3 * g + 1] += ny * sv; pos[3 * g + 2] += nz * sv;
      p[0] += nx * sv; p[1] += ny * sv; p[2] += nz * sv;
      for (const v of [a, b, c]) {
        if (invMass[v] === 0) continue;
        pos[3 * v] -= nx * st; pos[3 * v + 1] -= ny * st; pos[3 * v + 2] -= nz * st;
      }
    }
  }
}

/**
 * Axis-aligned bounds of one mesh's particles, or of the whole assembly when
 * `meshIndex` is omitted. `inside` restricts the measure to vertices whose flat
 * point passes (e.g. inside the stitch lines, so seam allowances and hems do
 * not count toward a finished size).
 */
export function clothBounds(world: ClothWorld, meshIndex?: number, inside?: (pieceId: string, flat: Point) => boolean): { lo: Vec3; hi: Vec3; size: Vec3 } {
  const lo: Vec3 = [Infinity, Infinity, Infinity];
  const hi: Vec3 = [-Infinity, -Infinity, -Infinity];
  world.meshes.forEach((m, mi) => {
    if (meshIndex !== undefined && mi !== meshIndex) return;
    for (let v = 0; v < m.vertexCount; v++) {
      if (inside && !inside(m.pieceId, { x: m.flat[2 * v], y: m.flat[2 * v + 1] })) continue;
      const g = world.base[mi] + v;
      for (let k = 0; k < 3; k++) {
        const c = world.pos[3 * g + k];
        if (c < lo[k]) lo[k] = c;
        if (c > hi[k]) hi[k] = c;
      }
    }
  });
  return { lo, hi, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]] };
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
function collide(pos: Float64Array, prev: Float64Array, invMass: Float64Array, n: number, solids: Solid[], margin: number): void {
  for (const s of solids) {
    if (s.kind !== 'box') {
      // Smooth solids: push out along the surface normal by the penetration.
      for (let g = 0; g < n; g++) {
        if (invMass[g] === 0) continue;
        const p: Vec3 = [pos[3 * g], pos[3 * g + 1], pos[3 * g + 2]];
        const { dist, normal } = solidDistance(s, p);
        const pen = margin - dist;
        if (pen <= 0) continue;
        pos[3 * g] += normal[0] * pen; pos[3 * g + 1] += normal[1] * pen; pos[3 * g + 2] += normal[2] * pen;
      }
      continue;
    }
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
  if (params.selfCollision && world.steps % Math.max(1, params.selfCollisionEvery) === 0) {
    selfCollide(world, params.thickness, params.spacing);
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
 * Largest relative edge elongation, e.g. 0.02 = 2 % stretch. The error is
 * taken over at least half a cell: the mesher leaves sliver edges where an arc
 * or a diagonal clips a grid cell, and a millimetre on a sliver is not cloth
 * stretched threefold.
 */
export function maxStretch(world: ClothWorld, inside?: (pieceId: string, flat: Point) => boolean): number {
  let max = 0;
  const floor = world.params.spacing / 2;
  const keep = inside ? insideMask(world, inside) : null;
  for (const c of world.stretch) {
    if (c.rest < 1e-9) continue;
    if (keep && !(keep[c.i] && keep[c.j])) continue;
    // Elongation only: fabric cannot stretch, but it buckles freely, and on a coarse mesh a
    // wrinkle shorter than two cells shows up as a compressed edge, which is slack, not a fault.
    max = Math.max(max, (d3(world.pos, c.i, c.j) - c.rest) / Math.max(c.rest, floor));
  }
  return max;
}

/** Vertices whose flat point passes `inside` (e.g. within the stitch lines, leaving out allowance flaps). */
function insideMask(world: ClothWorld, inside: (pieceId: string, flat: Point) => boolean): Uint8Array {
  const mask = new Uint8Array(world.n);
  world.meshes.forEach((m, mi) => {
    for (let v = 0; v < m.vertexCount; v++) if (inside(m.pieceId, { x: m.flat[2 * v], y: m.flat[2 * v + 1] })) mask[world.base[mi] + v] = 1;
  });
  return mask;
}

/** Largest relative edge compression (wrinkling), for information; see `maxStretch`. */
export function maxCompression(world: ClothWorld): number {
  let max = 0;
  const floor = world.params.spacing / 2;
  for (const c of world.stretch) {
    if (c.rest < 1e-9) continue;
    max = Math.max(max, (c.rest - d3(world.pos, c.i, c.j)) / Math.max(c.rest, floor));
  }
  return max;
}

/** Deepest penetration of any particle into any solid (mm, 0 = none). */
export function maxPenetration(world: ClothWorld): number {
  let max = 0;
  for (const s of world.solids) {
    if (s.kind !== 'box') {
      for (let g = 0; g < world.n; g++) {
        const pen = -solidDistance(s, [world.pos[3 * g], world.pos[3 * g + 1], world.pos[3 * g + 2]]).dist;
        if (pen > max) max = pen;
      }
      continue;
    }
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
