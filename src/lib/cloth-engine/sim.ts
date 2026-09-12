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
 * Signed distance and outward normal from a point to a solid's surface, written
 * into `out` as [dist, nx, ny, nz]. The hot path (`collide`, 100M+ calls on a
 * torso assembly) cannot afford the array-and-object allocation the public
 * `solidDistance` shape implies, so the maths lives here and that function
 * wraps it.
 */
function solidDistanceInto(s: CapsuleSolid | RoundedBoxSolid, px: number, py: number, pz: number, out: Float64Array): void {
  if (s.kind === 'capsule') {
    const abx = s.b[0] - s.a[0], aby = s.b[1] - s.a[1], abz = s.b[2] - s.a[2];
    const apx = px - s.a[0], apy = py - s.a[1], apz = pz - s.a[2];
    const l2 = abx * abx + aby * aby + abz * abz;
    let t = l2 > 0 ? (apx * abx + apy * aby + apz * abz) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = px - (s.a[0] + abx * t), qy = py - (s.a[1] + aby * t), qz = pz - (s.a[2] + abz * t);
    const d = Math.sqrt(qx * qx + qy * qy + qz * qz);
    out[0] = d - s.radius;
    if (d > 1e-9) { out[1] = qx / d; out[2] = qy / d; out[3] = qz / d; }
    else { out[1] = 0; out[2] = 0; out[3] = 1; }
    return;
  }
  // Rounded box: distance to the inner box shrunk by r, minus r.
  const qx = Math.abs(px - s.center[0]) - (s.half[0] - s.radius);
  const qy = Math.abs(py - s.center[1]) - (s.half[1] - s.radius);
  const qz = Math.abs(pz - s.center[2]) - (s.half[2] - s.radius);
  const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0, oz = qz > 0 ? qz : 0;
  const outside = Math.sqrt(ox * ox + oy * oy + oz * oz);
  const qmax = qx >= qy ? (qx >= qz ? qx : qz) : (qy >= qz ? qy : qz);
  out[0] = outside + (qmax < 0 ? qmax : 0) - s.radius;
  let nx: number, ny: number, nz: number;
  if (outside > 1e-9) { nx = ox / outside; ny = oy / outside; nz = oz / outside; }
  else {
    // Inside the inner box: push out through the nearest face.
    nx = 0; ny = 0; nz = 0;
    if (qx >= qy && qx >= qz) nx = 1; else if (qy >= qz) ny = 1; else nz = 1;
  }
  const sx = Math.sign(px - s.center[0]) || 1;
  const sy = Math.sign(py - s.center[1]) || 1;
  const sz = Math.sign(pz - s.center[2]) || 1;
  out[1] = nx * sx; out[2] = ny * sy; out[3] = nz * sz;
}

const SD_SCRATCH = new Float64Array(4);

/**
 * Signed distance and outward normal from a point to a solid's surface.
 * Boxes are handled by the continuous face push-out in `collide`; this covers
 * the smooth shapes a body is made of.
 */
export function solidDistance(s: CapsuleSolid | RoundedBoxSolid, p: Vec3): { dist: number; normal: Vec3 } {
  solidDistanceInto(s, p[0], p[1], p[2], SD_SCRATCH);
  return { dist: SD_SCRATCH[0], normal: [SD_SCRATCH[1], SD_SCRATCH[2], SD_SCRATCH[3]] };
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
   * Number of attachment points along the seam. Default: one per mesh cell of
   * the shorter side, so a gathered seam (a long edge sewn to a short one)
   * leaves the long side's extra fabric free to buckle between attachments.
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
  /** Per-constraint stiffness override (bending by material). */
  k?: number;
}

/**
 * Isometric bending constraint (Bergou 2006 / Bender 2014) over the two
 * triangles sharing edge x0–x1 with opposite vertices x2, x3. Q comes from the
 * FLAT pattern, so a flat sheet has zero energy and any curvature is resisted —
 * a real plate stiffness, which distance bends (second-order) cannot give.
 */
interface PlateConstraint {
  v: [number, number, number, number];
  q: number[];
  k: number;
}

/**
 * Plate (isometric bending) stiffness by material id: foam and webbing resist
 * curvature; cloth barely.
 *
 * Anything below `PLATE_MIN_STIFFNESS` is not built as a plate constraint at
 * all. Cordura's nominal 0.02 was measured (scratchpad profile-converge) to
 * move a settled clamshell by 1.0 mm rms — a quarter of a mesh cell, and no
 * change at all to the reported stretch, seam gap or penetration — while
 * costing 2.6× the whole solve, because every bending pair of every cloth
 * piece became a 4-vertex plate projection. Cordura is cloth: its bending
 * constraint (0.45) is what holds it.
 */
export function materialPlateStiffness(materialId: string | undefined): number {
  if (!materialId) return 0;
  if (materialId.startsWith('foam')) return 0.35;
  if (materialId.startsWith('webbing')) return 0.5;
  if (materialId.startsWith('cordura')) return 0.02;
  return 0;
}

/** Plate constraints below this stiffness are not built (see `materialPlateStiffness`). */
export const PLATE_MIN_STIFFNESS = 0.1;

/**
 * Bending stiffness by material id (per-iteration fraction). Closed-cell foam
 * and webbing are near-rigid plates and bands; spacer mesh is floppier than
 * Cordura. Unknown materials get the default cloth stiffness.
 */
export function materialBendStiffness(materialId: string | undefined, fallback: number): number {
  if (!materialId) return fallback;
  if (materialId.startsWith('foam')) return 1;
  if (materialId.startsWith('webbing') || materialId === 'velcro-hook' || materialId === 'velcro-loop') return 0.9;
  if (materialId === 'spacer-mesh') return 0.15;
  if (materialId.startsWith('cordura')) return Math.max(fallback, 0.45);
  return fallback;
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
  /** Isometric bending constraints for materials with plate stiffness (foam, webbing). */
  plates: PlateConstraint[];
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
  /** Bending stiffness per mesh (e.g. from the piece's material via `materialBendStiffness`); default `params.bendStiffness`. */
  bendStiffnessOf?: (meshIndex: number) => number | undefined;
  /** Plate stiffness per mesh (`materialPlateStiffness`); 0 or undefined = none. */
  plateStiffnessOf?: (meshIndex: number) => number | undefined;
  params?: Partial<ClothParams>;
}

function d3(a: Float64Array, i: number, j: number): number {
  const dx = a[3 * j] - a[3 * i];
  const dy = a[3 * j + 1] - a[3 * i + 1];
  const dz = a[3 * j + 2] - a[3 * i + 2];
  // sqrt, not hypot: hypot's overflow guard costs several times as much and the
  // magnitudes here are millimetres.
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
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
  const plates: PlateConstraint[] = [];
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
      const k2 = opts.bendStiffnessOf?.(mi);
      bend.push(k2 === undefined ? { i: gk, j: gl, rest } : { i: gk, j: gl, rest, k: k2 });
      const kp = opts.plateStiffnessOf?.(mi) ?? 0;
      if (kp >= PLATE_MIN_STIFFNESS && !anyTorn) {
        const q = plateMatrix(fp(i), fp(j), fp(k), fp(l));
        if (q) plates.push({ v: [base[mi] + i, base[mi] + j, gk, gl], q, k: kp });
      }
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
    // One attachment per mesh cell of the SHORTER side. A longer side sewn to a shorter one
    // (the pleated face bottom onto the card) then keeps free vertices between attachments,
    // and its extra length buckles into gathers instead of being crushed along the seam.
    const count = Math.max(2, s.samples ?? Math.ceil(Math.min(la, lb) / params.spacing) + 1);
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

  return { meshes, base, n, pos, prev, invMass, stretch, bend, seams, solids: opts.solids ?? [], params, steps: 0, tris: Uint32Array.from(triList), ring, plates };
}

/** Bending matrix Q (4×4, row-major) from the flat quad x0–x1 shared edge, x2 and x3 opposite. */
function plateMatrix(x0: Point, x1: Point, x2: Point, x3: Point): number[] | null {
  const e = (a: Point, b: Point) => ({ x: b.x - a.x, y: b.y - a.y });
  const cot = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const crossZ = a.x * b.y - a.y * b.x;
    if (Math.abs(crossZ) < 1e-9) return null;
    return (a.x * b.x + a.y * b.y) / Math.abs(crossZ);
  };
  const e0 = e(x0, x1), e1 = e(x0, x2), e2 = e(x0, x3), e3 = e(x1, x2), e4 = e(x1, x3);
  const ne0 = { x: -e0.x, y: -e0.y };
  const c01 = cot(e0, e1), c02 = cot(e0, e2), c03 = cot(ne0, e3), c04 = cot(ne0, e4);
  if (c01 === null || c02 === null || c03 === null || c04 === null) return null;
  const area = 0.5 * (Math.abs(e0.x * e1.y - e0.y * e1.x) + Math.abs(e0.x * e2.y - e0.y * e2.x));
  if (area < 1e-9) return null;
  const K = [c03 + c04, c01 + c02, -c01 - c03, -c02 - c04];
  const q: number[] = new Array(16);
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) q[4 * a + b] = (3 / area) * K[a] * K[b];
  return q;
}

// Scratch for projectPlate: 4 vertices × 3 components, reused every call. The plate
// constraint runs once per bending pair per iteration (24k × 12 × 360 on a clamshell),
// so the arrays it used to allocate dominated the whole solve.
const PLATE_X = new Float64Array(12);
const PLATE_G = new Float64Array(12);

/** Project the isometric bending constraint C = ½ Σ Q_ab x_a·x_b toward zero (flat). */
function projectPlate(pos: Float64Array, invMass: Float64Array, c: PlateConstraint): void {
  const v = c.v;
  const x = PLATE_X, grad = PLATE_G;
  for (let a = 0; a < 4; a++) {
    const g = 3 * v[a];
    x[3 * a] = pos[g]; x[3 * a + 1] = pos[g + 1]; x[3 * a + 2] = pos[g + 2];
    grad[3 * a] = 0; grad[3 * a + 1] = 0; grad[3 * a + 2] = 0;
  }
  const q = c.q;
  let energy = 0;
  for (let a = 0; a < 4; a++) {
    const ax = x[3 * a], ay = x[3 * a + 1], az = x[3 * a + 2];
    let gx = 0, gy = 0, gz = 0;
    for (let b = 0; b < 4; b++) {
      const qab = q[4 * a + b];
      if (qab === 0) continue;
      const bx = x[3 * b], by = x[3 * b + 1], bz = x[3 * b + 2];
      energy += 0.5 * qab * (ax * bx + ay * by + az * bz);
      gx += qab * bx; gy += qab * by; gz += qab * bz;
    }
    grad[3 * a] = gx; grad[3 * a + 1] = gy; grad[3 * a + 2] = gz;
  }
  if (energy < 1e-12 && energy > -1e-12) return;
  let denom = 0;
  for (let a = 0; a < 4; a++) {
    const gx = grad[3 * a], gy = grad[3 * a + 1], gz = grad[3 * a + 2];
    denom += invMass[v[a]] * (gx * gx + gy * gy + gz * gz);
  }
  if (denom < 1e-12) return;
  const lambda = -c.k * energy / denom;
  for (let a = 0; a < 4; a++) {
    const vi = v[a], w = invMass[vi];
    if (w === 0) continue;
    const g = 3 * vi, wl = w * lambda;
    pos[g] += wl * grad[3 * a]; pos[g + 1] += wl * grad[3 * a + 1]; pos[g + 2] += wl * grad[3 * a + 2];
  }
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
  // Numeric cell keys: string keys (`x,y,z`) allocated and hashed a string per
  // triangle per cell, which dominated this pass.
  const hash = new Map<number, number[]>();
  const B = 1 << 11, HALF = 1 << 10;
  const key = (x: number, y: number, z: number) => ((x + HALF) * B + (y + HALF)) * B + (z + HALF);
  const triCount = tris.length / 3;
  for (let t = 0; t < triCount; t++) {
    const a = tris[3 * t], b = tris[3 * t + 1], c = tris[3 * t + 2];
    let lox = Infinity, loy = Infinity, loz = Infinity, hix = -Infinity, hiy = -Infinity, hiz = -Infinity;
    for (let q = 0; q < 3; q++) {
      const v = tris[3 * t + q];
      const x = pos[3 * v], y = pos[3 * v + 1], z = pos[3 * v + 2];
      if (x < lox) lox = x; if (x > hix) hix = x;
      if (y < loy) loy = y; if (y > hiy) hiy = y;
      if (z < loz) loz = z; if (z > hiz) hiz = z;
    }
    if (!Number.isFinite(lox) || !Number.isFinite(hiz)) continue;
    const x0 = Math.floor(lox / cell), x1 = Math.floor(hix / cell);
    const y0 = Math.floor(loy / cell), y1 = Math.floor(hiy / cell);
    const z0 = Math.floor(loz / cell), z1 = Math.floor(hiz / cell);
    void a; void b; void c;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const k = key(x, y, z);
      const list = hash.get(k);
      if (list) list.push(t); else hash.set(k, [t]);
    }
  }
  const m2 = margin * margin;
  for (let g = 0; g < n; g++) {
    const p: Vec3 = [pos[3 * g], pos[3 * g + 1], pos[3 * g + 2]];
    const list = hash.get(key(Math.floor(p[0] / cell), Math.floor(p[1] / cell), Math.floor(p[2] / cell)));
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
  const i = 3 * c.i, j = 3 * c.j;
  const dx = pos[j] - pos[i];
  const dy = pos[j + 1] - pos[i + 1];
  const dz = pos[j + 2] - pos[i + 2];
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (d < 1e-9) return;
  let corr = k * (d - c.rest);
  if (Math.abs(corr) > maxMove * w) corr = Math.sign(corr) * maxMove * w;
  const s = corr / d / w;
  const si = wi * s, sj = wj * s;
  pos[i] += si * dx; pos[i + 1] += si * dy; pos[i + 2] += si * dz;
  pos[j] -= sj * dx; pos[j + 1] -= sj * dy; pos[j + 2] -= sj * dz;
}

/**
 * Push particles out of the (margin-expanded) boxes. Continuous in the sense
 * that a particle which was outside on some axis at the start of the step is
 * pushed back out through THAT face, so a seam cannot drag cloth through the
 * object — the lid slides over the magazine top instead of tunnelling.
 */
/** Axis-aligned bounds of a smooth solid, expanded by `margin`: [minX,minY,minZ,maxX,maxY,maxZ]. */
const SOLID_BB = new WeakMap<object, { margin: number; bb: Float64Array }>();
function solidBounds(s: CapsuleSolid | RoundedBoxSolid, margin: number): Float64Array {
  const hit = SOLID_BB.get(s);
  if (hit && hit.margin === margin) return hit.bb;
  const bb = new Float64Array(6);
  if (s.kind === 'capsule') {
    const r = s.radius + margin;
    for (let k = 0; k < 3; k++) {
      bb[k] = Math.min(s.a[k], s.b[k]) - r;
      bb[k + 3] = Math.max(s.a[k], s.b[k]) + r;
    }
  } else {
    for (let k = 0; k < 3; k++) {
      bb[k] = s.center[k] - s.half[k] - margin;
      bb[k + 3] = s.center[k] + s.half[k] + margin;
    }
  }
  SOLID_BB.set(s, { margin, bb });
  return bb;
}

function collide(pos: Float64Array, prev: Float64Array, invMass: Float64Array, n: number, solids: Solid[], margin: number): void {
  const sd = SD_SCRATCH;
  for (const s of solids) {
    if (s.kind !== 'box') {
      // Smooth solids: push out along the surface normal by the penetration. Most
      // particles are nowhere near a given capsule (an LBV panel against the neck),
      // so reject them on the solid's bounding box before evaluating its distance.
      const bb = solidBounds(s, margin);
      for (let g = 0; g < n; g++) {
        if (invMass[g] === 0) continue;
        const i = 3 * g;
        const x = pos[i], y = pos[i + 1], z = pos[i + 2];
        if (x < bb[0] || x > bb[3] || y < bb[1] || y > bb[4] || z < bb[2] || z > bb[5]) continue;
        solidDistanceInto(s, x, y, z, sd);
        const pen = margin - sd[0];
        if (pen <= 0) continue;
        pos[i] += sd[1] * pen; pos[i + 1] += sd[2] * pen; pos[i + 2] += sd[3] * pen;
      }
      continue;
    }
    const hx = s.half[0] + margin, hy = s.half[1] + margin, hz = s.half[2] + margin;
    const cx = s.center[0], cy = s.center[1], cz = s.center[2];
    for (let g = 0; g < n; g++) {
      if (invMass[g] === 0) continue;
      const i = 3 * g;
      const dx = pos[i] - cx, dy = pos[i + 1] - cy, dz = pos[i + 2] - cz;
      const adx = dx < 0 ? -dx : dx, ady = dy < 0 ? -dy : dy, adz = dz < 0 ? -dz : dz;
      if (adx >= hx || ady >= hy || adz >= hz) continue;
      const px = prev[i] - cx, py = prev[i + 1] - cy, pz = prev[i + 2] - cz;
      // Prefer the axis on which the particle was outside before this step (the face it entered).
      let axis = -1;
      let best = -Infinity;
      const o0 = (px < 0 ? -px : px) - hx;
      if (o0 >= -1e-9 && o0 > best) { best = o0; axis = 0; }
      const o1 = (py < 0 ? -py : py) - hy;
      if (o1 >= -1e-9 && o1 > best) { best = o1; axis = 1; }
      const o2 = (pz < 0 ? -pz : pz) - hz;
      if (o2 >= -1e-9 && o2 > best) { best = o2; axis = 2; }
      if (axis < 0) {
        const p0 = hx - adx, p1 = hy - ady, p2 = hz - adz;
        axis = p2 <= p0 && p2 <= p1 ? 2 : p0 <= p1 ? 0 : 1;
      }
      const pa = axis === 0 ? px : axis === 1 ? py : pz;
      const da = axis === 0 ? dx : axis === 1 ? dy : dz;
      const ha = axis === 0 ? hx : axis === 1 ? hy : hz;
      const ca = axis === 0 ? cx : axis === 1 ? cy : cz;
      pos[i + axis] = ca + (Math.sign(pa || da || 1)) * ha;
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
    for (const c of world.bend) project(pos, invMass, c, c.k ?? params.bendStiffness);
    for (const c of world.plates) projectPlate(pos, invMass, c);
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

/**
 * Root-mean-square distance every particle moved during the last `step`.
 * `prev` holds the position at the start of the step, so this is free.
 *
 * RMS, not max: a handful of vertices beside a gathered seam or between two
 * colliding layers jitter by a millimetre or two for ever, so the maximum
 * never settles even when the shape has (measured on the clamshell: max move
 * still 2.2 mm at step 360 while the rms distance to the final shape is
 * already 0.24 mm at step 300).
 */
export function stepMovement(world: ClothWorld): number {
  const { pos, prev, n } = world;
  let sum = 0;
  for (let g = 0; g < n; g++) {
    const i = 3 * g;
    const dx = pos[i] - prev[i], dy = pos[i + 1] - prev[i + 1], dz = pos[i + 2] - prev[i + 2];
    sum += dx * dx + dy * dy + dz * dz;
  }
  return n > 0 ? Math.sqrt(sum / n) : 0;
}

export interface SettleOptions {
  /** Hard cap on steps. Default 360. */
  maxSteps?: number;
  /** Steps per comparison window. Default 20. */
  window?: number;
  /**
   * Settled when the assembly's rms displacement over a window is under this
   * many millimetres. Default `spacing / 40` (0.2 mm on an 8 mm mesh) — a
   * fortieth of a cell, well under what the mesh itself can resolve.
   */
  tol?: number;
  /** Consecutive quiet windows required. Default 2. */
  hold?: number;
  /**
   * Never stop before this step. The seam ramp has to finish or the seams are
   * still being pulled closed. Default `seamRampSteps + 20`.
   */
  minSteps?: number;
  /** Called after every step; return false to stop (a time-sliced caller). */
  onStep?: (world: ClothWorld) => boolean | void;
}

export interface SettleMonitor {
  /** Call once after every `step`; true when the shape has stopped changing. */
  observe: () => boolean;
  /** Rms displacement over the last completed window, mm. */
  lastMovement: () => number;
}

/**
 * Stateful convergence detector, shared by `relaxUntilSettled` and any caller
 * that steps the world itself (the viewer, a frame at a time).
 *
 * The measure is rms displacement over a window of steps, not per-step
 * movement. A PBD solve never comes to rest: seam corrections, the stretch
 * projection and the self-collision pass trade hundredths of a millimetre back
 * and forth for ever, so per-step movement falls to a floor and stays there
 * (0.05–0.25 mm on the assemblies measured) whether or not the shape is still
 * changing. Over a window that jitter cancels, while coherent motion — a
 * circle skirt still falling at 0.7 mm a step — accumulates. Bounding the
 * window displacement therefore bounds how far the answer can still move.
 */
export function createSettleMonitor(world: ClothWorld, opts: SettleOptions = {}): SettleMonitor {
  const win = Math.max(2, opts.window ?? 20);
  const tol = opts.tol ?? world.params.spacing / 40;
  const hold = opts.hold ?? 2;
  const minSteps = opts.minSteps ?? world.params.seamRampSteps + 20;
  let mark = Float64Array.from(world.pos);
  let count = 0;
  let quiet = 0;
  let last = Infinity;
  return {
    lastMovement: () => last,
    observe: () => {
      if (++count < win) return false;
      count = 0;
      let sum = 0;
      const n = world.n;
      for (let g = 0; g < n; g++) {
        const i = 3 * g;
        const dx = world.pos[i] - mark[i], dy = world.pos[i + 1] - mark[i + 1], dz = world.pos[i + 2] - mark[i + 2];
        sum += dx * dx + dy * dy + dz * dz;
      }
      last = n > 0 ? Math.sqrt(sum / n) : 0;
      mark.set(world.pos);
      if (last < tol) quiet++; else quiet = 0;
      return world.steps >= minSteps && quiet >= hold;
    },
  };
}

export function relaxUntilSettled(world: ClothWorld, opts: SettleOptions = {}): { steps: number; settled: boolean } {
  const maxSteps = opts.maxSteps ?? 360;
  const monitor = createSettleMonitor(world, opts);
  while (world.steps < maxSteps) {
    step(world);
    const settled = monitor.observe();
    if (opts.onStep?.(world) === false) return { steps: world.steps, settled: false };
    if (settled) return { steps: world.steps, settled: true };
  }
  return { steps: world.steps, settled: false };
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

export interface StretchReport {
  /** Elongation at the requested quantile, e.g. 0.08 = 8 %. The headline figure. */
  value: number;
  /** Largest single-edge elongation. */
  max: number;
  /** Piece carrying that worst edge. */
  worstPiece: string | null;
  /** Share of edges elongated more than 10 % — how widespread the strain is. */
  strained: number;
  /** Edges measured. */
  count: number;
}

/**
 * Elongation across the mesh as a distribution rather than a single worst edge.
 *
 * The maximum is not a number a sewer can act on: one sheared cell beside a
 * gathered seam (the pleated face bottom) or one allowance flap dragged round a
 * corner reads as "116 % stretch" on a pattern whose seams all close to a tenth
 * of a millimetre. The quantile says whether the fabric as a whole has to
 * stretch to reach, and `worstPiece` says where to look if it does.
 */
export function stretchReport(world: ClothWorld, quantile = 0.99, inside?: (pieceId: string, flat: Point) => boolean): StretchReport {
  const floor = world.params.spacing / 2;
  const keep = inside ? insideMask(world, inside) : null;
  const vals: number[] = [];
  let max = 0;
  let worst = -1;
  for (const c of world.stretch) {
    if (c.rest < 1e-9) continue;
    if (keep && !(keep[c.i] && keep[c.j])) continue;
    const e = (d3(world.pos, c.i, c.j) - c.rest) / Math.max(c.rest, floor);
    vals.push(e);
    if (e > max) { max = e; worst = c.i; }
  }
  if (vals.length === 0) return { value: 0, max: 0, worstPiece: null, strained: 0, count: 0 };
  vals.sort((a, b) => a - b);
  const idx = Math.min(vals.length - 1, Math.max(0, Math.round(quantile * (vals.length - 1))));
  let strained = 0;
  for (let i = vals.length - 1; i >= 0 && vals[i] > 0.1; i--) strained++;
  let worstPiece: string | null = null;
  if (worst >= 0) {
    for (let mi = world.meshes.length - 1; mi >= 0; mi--) {
      if (worst >= world.base[mi]) { worstPiece = world.meshes[mi].pieceId; break; }
    }
  }
  return { value: vals[idx], max, worstPiece, strained: strained / vals.length, count: vals.length };
}

/** The quantile of edge elongation alone; see `stretchReport`. */
export function stretchPercentile(world: ClothWorld, quantile = 0.99, inside?: (pieceId: string, flat: Point) => boolean): number {
  return stretchReport(world, quantile, inside).value;
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
