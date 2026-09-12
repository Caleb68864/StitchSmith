/**
 * Settled-cloth cache.
 *
 * `PreviewTabs` unmounts the viewer when the user switches to the Pattern tab,
 * so coming back used to re-run the whole solve from the rigid fold. The inputs
 * to a solve are entirely numeric (mesh vertices, seam endpoints, pins, solids,
 * gravity, spacing), so they hash cheaply; a settled result is a Float64Array
 * of positions we can hand straight back.
 *
 * Small and in-memory: a handful of entries is enough for "flip to the pattern
 * and back", and a reload should re-solve rather than trust stale numbers.
 */
import type { ClothMesh, SeamSpec, Solid } from '../../../lib/cloth-engine/index.js';

/** FNV-1a over a float, via its two 32-bit halves. */
const FLOAT_BUF = new Float64Array(1);
const FLOAT_VIEW = new Uint32Array(FLOAT_BUF.buffer);

function mixFloat(h: number, v: number): number {
  FLOAT_BUF[0] = Number.isFinite(v) ? v : 0;
  h ^= FLOAT_VIEW[0];
  h = Math.imul(h, 0x01000193);
  h ^= FLOAT_VIEW[1];
  return Math.imul(h, 0x01000193);
}

function mixString(h: number, s: string): number {
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h;
}

export interface SolveKeyParts {
  meshes: ClothMesh[];
  seams: SeamSpec[];
  solids: Solid[];
  /** Pin descriptors, already flattened to numbers by the caller. */
  pins: number[];
  gravity: readonly [number, number, number];
  spacing: number;
  selfCollision: boolean;
  /** Fold angles in play, so moving a slider re-solves. */
  angles: number[];
  progress: number;
}

/**
 * Hash everything the solve reads. Mesh vertices are sampled rather than fully
 * hashed (every 7th coordinate): a geometry change moves many vertices, and the
 * vertex count, piece ids and seam endpoints are all hashed in full, so a
 * collision would need a change that misses the sample *and* keeps every
 * structural number identical.
 */
export function solveKey(p: SolveKeyParts): string {
  let h = 0x811c9dc5;
  h = mixFloat(h, p.spacing);
  h = mixFloat(h, p.selfCollision ? 1 : 0);
  h = mixFloat(h, p.progress);
  for (const g of p.gravity) h = mixFloat(h, g);
  for (const a of p.angles) h = mixFloat(h, a);
  for (const m of p.meshes) {
    h = mixString(h, m.pieceId);
    h = mixFloat(h, m.vertexCount);
    h = mixFloat(h, m.triangles.length);
    for (let i = 0; i < m.flat.length; i += 7) h = mixFloat(h, m.flat[i]);
  }
  for (const s of p.seams) {
    h = mixString(h, s.a.pieceId);
    h = mixString(h, s.b.pieceId);
    for (const side of [s.a, s.b]) {
      for (const pt of side.points ?? [side.from, side.to]) { h = mixFloat(h, pt.x); h = mixFloat(h, pt.y); }
    }
    h = mixFloat(h, s.gap ?? -1);
    h = mixFloat(h, s.samples ?? -1);
  }
  for (const s of p.solids) {
    h = mixString(h, s.kind);
    if (s.kind === 'capsule') { for (const v of [...s.a, ...s.b, s.radius]) h = mixFloat(h, v); }
    else { for (const v of [...s.center, ...s.half]) h = mixFloat(h, v); h = mixFloat(h, s.kind === 'rounded_box' ? s.radius : 0); }
  }
  for (const v of p.pins) h = mixFloat(h, v);
  return (h >>> 0).toString(36);
}

export interface CachedSolve {
  pos: Float64Array;
  steps: number;
  settled: boolean;
}

const CACHE = new Map<string, CachedSolve>();
const MAX_ENTRIES = 6;

export function getSolve(key: string, length: number): CachedSolve | null {
  const hit = CACHE.get(key);
  if (!hit || hit.pos.length !== length) return null;
  // Refresh recency.
  CACHE.delete(key);
  CACHE.set(key, hit);
  return hit;
}

export function putSolve(key: string, pos: Float64Array, steps: number, settled: boolean): void {
  CACHE.set(key, { pos: Float64Array.from(pos), steps, settled });
  while (CACHE.size > MAX_ENTRIES) {
    const oldest = CACHE.keys().next();
    if (oldest.done) break;
    CACHE.delete(oldest.value);
  }
}

/** Tests and the reset control. */
export function clearSolveCache(): void {
  CACHE.clear();
}
