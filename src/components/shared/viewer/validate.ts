/**
 * Pure guards for the 3D viewer (H2 hardening): seam validation, a vertex
 * budget for huge patterns, and a non-finite check for a diverged simulation.
 * Kept free of Three.js and React so they run in jsdom.
 */
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { SeamSpec } from '../../../lib/cloth-engine/sim.js';
import { bboxFromPiece } from '../../../lib/pattern-engine/geometry/bbox.js';

export interface SeamCheck {
  /** Seams safe to hand to the cloth engine. */
  seams: SeamSpec[];
  /** One line per seam dropped, for the stats panel. */
  skipped: string[];
}

const finitePoint = (p: { x: number; y: number }) => Number.isFinite(p.x) && Number.isFinite(p.y);

/**
 * Drop seams the engine cannot sew: a side on a piece that is not in the
 * scene, a non-finite coordinate, or a side shorter than half a millimetre.
 * The engine would otherwise throw (missing mesh) or divide by zero.
 */
export function validateSeams(seams: SeamSpec[], pieceIds: Iterable<string>): SeamCheck {
  const ids = new Set(pieceIds);
  const ok: SeamSpec[] = [];
  const skipped: string[] = [];
  seams.forEach((s, i) => {
    const name = s.label ?? `seam ${i + 1}`;
    for (const side of [s.a, s.b]) {
      if (!ids.has(side.pieceId)) { skipped.push(`${name}: piece "${side.pieceId}" is not in the scene`); return; }
      if (!finitePoint(side.from) || !finitePoint(side.to)) { skipped.push(`${name}: non-finite coordinates`); return; }
    }
    const la = Math.hypot(s.a.to.x - s.a.from.x, s.a.to.y - s.a.from.y);
    const lb = Math.hypot(s.b.to.x - s.b.from.x, s.b.to.y - s.b.from.y);
    if (la < 0.5 && lb < 0.5) { skipped.push(`${name}: zero length`); return; }
    ok.push(s);
  });
  return { seams: ok, skipped };
}

/**
 * Vertex budget for the browser cloth: above this the mesh coarsens.
 *
 * Solve time is roughly linear in vertices, so this is really a time budget.
 * Measured (headless Chromium, software rendering): a circle skirt at the old
 * 40 000 came out at 33 660 vertices and took 21 seconds to reach the step cap;
 * at 12 000 it meshes to 14 mm and 12 172 vertices and takes about a third of
 * that. No other assembly reaches even 12 000 — every one of them meshes at the
 * full 8 mm either way — so this only bites on the genuinely huge patterns it
 * is meant for.
 */
export const CLOTH_VERTEX_BUDGET = 12000;

/**
 * Pick a cloth spacing so the whole scene stays under the vertex budget: the
 * estimate is Σ bbox area / spacing². Returns the base spacing when it fits.
 */
export function clothSpacingFor(pieces: Piece[], base = 8, budget = CLOTH_VERTEX_BUDGET): { spacing: number; capped: boolean; estimate: number } {
  let areaMm2 = 0;
  for (const p of pieces) {
    const bb = bboxFromPiece(p);
    if (Number.isFinite(bb.width) && Number.isFinite(bb.height)) areaMm2 += bb.width * bb.height;
  }
  const estimate = areaMm2 / (base * base);
  if (estimate <= budget) return { spacing: base, capped: false, estimate };
  const spacing = Math.ceil(Math.sqrt(areaMm2 / budget));
  return { spacing, capped: true, estimate };
}

/** True when any coordinate is NaN or infinite — the simulation has diverged. */
export function hasNonFinite(pos: ArrayLike<number>): boolean {
  for (let i = 0; i < pos.length; i++) if (!Number.isFinite(pos[i])) return true;
  return false;
}

/** What the stats mean and what counts as good, for tooltips and the help block. */
export const STAT_HELP = {
  steps: 'Cloth solver steps run so far; the figures below settle as it reaches the end.',
  stretch: 'Largest elongation of any mesh edge against its flat length. Fabric does not stretch: under ~10% is a closed, easy seam; 10–30% is tight (allowance flaps and the shear beside a gathered seam count); above that the pieces do not reach.',
  seam: 'Average distance still open along the sewn seams. Under 1 mm is closed; a few mm means the panels nearly meet; more means a piece is too short to sew.',
  penetration: 'How far cloth sinks into the contents or body form. 0 is right; over a fabric thickness means the cloth was trapped inside the object.',
  envelope: 'Bounding box of the relaxed cloth (width × height × depth), allowance flaps and slack included — compare with the finished size you asked for.',
} as const;
