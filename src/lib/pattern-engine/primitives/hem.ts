/**
 * Hem primitive: per-edge hem depth, the mark-at-double line, and
 * cut = finished + hems (vault bags/construction-hem-mark-at-double.md;
 * roadmap "Engine work that unlocks several patterns").
 *
 * The vault rule is a single-fold hem marked at double its depth: draw a line
 * 2 × depth in from the raw edge, fold the raw edge to the line, and the
 * crease lands at the finished edge every time. Production mode floors every
 * hand-folded hem at 1/2", the depth that can be hit repeatably.
 *
 * A double-fold (rolled) hem turns the raw edge under twice and encloses it,
 * for fabric that frays. It takes 2 × depth beyond the finished edge, and the
 * same mark (2 × depth from the raw edge) becomes its second, finished crease.
 *
 * Distances here are measured outward from the FINISHED edge: the raw (cut)
 * edge sits at +allowance, the mark of a single-fold hem at −depth (inside
 * the finished piece).
 */
import type { Path } from '../graph/Path.js';
import type { Edge, EdgeId } from '../graph/Edge.js';
import type { Point } from '../graph/Point.js';

const IN = 25.4;
/** The production floor for a hand-folded hem (vault: 1/2"). */
export const HEM_PRODUCTION_MIN_MM = 0.5 * IN;

export type HemFold = 'single' | 'double';

export interface HemSpec {
  /** Finished hem depth, mm. */
  depth: number;
  /** Single fold (the vault default) or double fold (rolled, raw edge enclosed). */
  fold?: HemFold;
  /** Floor the depth at `productionMinimum`. */
  productionMode?: boolean;
  /** Production floor, mm. Default 1/2". */
  productionMinimum?: number;
}

export interface Hem {
  /** Finished depth after the production floor. */
  depth: number;
  /** The depth asked for. */
  requestedDepth: number;
  /** True when production mode raised the depth. */
  raised: boolean;
  fold: HemFold;
  /** Fabric beyond the finished edge: depth (single) or 2 × depth (double). */
  allowance: number;
  /** The mark line, measured in from the RAW edge: always 2 × depth. */
  markFromRaw: number;
  /** Crease lines, measured outward from the finished edge, outermost first. */
  folds: number[];
}

export type HemResult = { ok: true; value: Hem } | { ok: false; error: string };

export function resolveHem(spec: HemSpec): HemResult {
  const fold = spec.fold ?? 'single';
  if (fold !== 'single' && fold !== 'double') return { ok: false, error: 'hem fold must be single or double' };
  if (!Number.isFinite(spec.depth) || spec.depth < 0) return { ok: false, error: 'hem depth must be 0 or greater' };
  const floor = spec.productionMinimum ?? HEM_PRODUCTION_MIN_MM;
  if (!Number.isFinite(floor) || floor < 0) return { ok: false, error: 'production minimum must be 0 or greater' };
  const raised = !!spec.productionMode && spec.depth < floor;
  const depth = raised ? floor : spec.depth;
  const allowance = fold === 'double' ? 2 * depth : depth;
  // Single: the only crease is the finished edge. Double: the raw edge turns under
  // at `depth` (+depth from the finished edge), then the finished crease at 0.
  const folds = depth === 0 ? [] : fold === 'double' ? [depth, 0] : [0];
  return { ok: true, value: { depth, requestedDepth: spec.depth, raised, fold, allowance, markFromRaw: 2 * depth, folds } };
}

/** Cut length of a span hemmed at either end: finished + each hem's allowance. */
export function hemmedCut(finished: number, ...hems: (Hem | null | undefined)[]): number {
  return finished + hems.reduce((s, h) => s + (h ? h.allowance : 0), 0);
}

export interface HemLinesSpec {
  hem: Hem;
  /** The finished edge, as a polyline (two points for a straight edge). */
  finished: Point[];
  /**
   * Direction from the finished edge out to the raw edge (normalised here).
   * Every line is the finished edge TRANSLATED along it: exact for a straight
   * edge; on a shallow curve whose slope against `outward`'s normal is θ the
   * true perpendicular hem is depth · (1 − cos θ) narrower, which tests bound.
   */
  outward: Point;
  idPrefix: string;
  eid: () => EdgeId;
  /** Words for the first crease label, e.g. "Eave hem". Must keep "hem" for the 3D preview's 180°. */
  name?: string;
}

export interface HemLines {
  /** The raw (cut) edge: the finished edge moved out by the allowance. */
  raw: Point[];
  /** Fold paths (role `fold`, labelled so the preview folds them 180°) and the mark (role `notch`). */
  paths: Path[];
}

function polyPath(id: string, pts: Point[], role: Edge['role'], eid: () => EdgeId, label?: string): Path {
  const edges: Edge[] = [];
  for (let i = 1; i < pts.length; i++) edges.push({ kind: 'straight', id: eid(), role, start: pts[i - 1], end: pts[i] });
  return { id, closed: false, edges, label };
}

const fmt = (mm: number) => `${(mm / IN).toFixed(3).replace(/\.?0+$/, '')}"`;

export function hemLines(spec: HemLinesSpec): HemLines {
  const { hem, finished, idPrefix, eid } = spec;
  if (finished.length < 2) throw new Error('a hem needs an edge of at least two points');
  const len = Math.hypot(spec.outward.x, spec.outward.y);
  if (!(len > 0)) throw new Error('hem outward direction must be non-zero');
  const ox = spec.outward.x / len, oy = spec.outward.y / len;
  const at = (d: number) => finished.map((p) => ({ x: p.x + ox * d, y: p.y + oy * d }));
  const raw = at(hem.allowance);
  if (hem.depth === 0) return { raw, paths: [] };
  const name = spec.name ?? 'Hem';
  const paths: Path[] = [];
  hem.folds.forEach((d, i) => {
    const finishedCrease = d === 0;
    const label = finishedCrease
      ? `${name} — ${fmt(hem.depth)} ${hem.fold === 'double' ? 'double-fold (rolled)' : 'single-fold'}, finished crease`
      : `${name} — first turn of the rolled hem, raw edge under ${fmt(hem.depth)}`;
    paths.push(polyPath(`${idPrefix}-hem-fold-${i}`, at(d), 'fold', eid, label));
  });
  // The mark: 2 × depth in from the raw edge. On a double hem it is the finished
  // crease itself, already drawn.
  const markAt = hem.allowance - hem.markFromRaw;
  if (!hem.folds.some((d) => Math.abs(d - markAt) < 1e-9)) {
    paths.push(polyPath(`${idPrefix}-hem-mark`, at(markAt), 'notch', eid, `Mark at ${fmt(hem.markFromRaw)} (double the hem) — fold the raw edge to this line`));
  }
  return { raw, paths };
}
