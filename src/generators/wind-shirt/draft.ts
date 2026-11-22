/**
 * Wind shirt geometry in one place: the measurement set, the bodice and
 * sleeve blocks from the drafting engine, and each piece's finished outline
 * tagged by edge (neck, shoulder, armhole, side, hem; cap, underseam, wrist)
 * so the cut outline, the sew lines and the seam checks all read the same
 * edges. Back and front are drafted as halves and mirrored into whole pieces.
 */
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import { resolveMeasurements } from '../../lib/pattern-engine/drafting/measurements.js';
import { draftBodice, polylineLength, type BodiceHalf, type BodiceBlock } from '../../lib/pattern-engine/drafting/bodice.js';
import { draftSleeve, type SleeveBlock } from '../../lib/pattern-engine/drafting/sleeve.js';
import { offsetPolygonPerEdge } from '../../lib/pattern-engine/geometry/offset.js';
import type { ResolvedInputs, BuildPatternError, SeamLengths } from './types.js';

export type Tag = 'neck' | 'shoulder' | 'armhole' | 'side' | 'hem' | 'cap' | 'underseam' | 'wrist';

export interface Outline {
  /** Finished outline, closed; edge i runs from point i to i + 1. */
  finished: Point[];
  tags: Tag[];
  cut: Point[];
  width: number;
  height: number;
}

export interface ShirtDraft {
  bodice: BodiceBlock;
  sleeve: SleeveBlock;
  back: Outline;
  front: Outline;
  sleevePiece: Outline;
  seams: SeamLengths;
}

const signedArea = (p: Point[]) => p.reduce((s, q, i) => { const n = p[(i + 1) % p.length]; return s + q.x * n.y - n.x * q.y; }, 0) / 2;

/** Offset a tagged finished outline by its edges' allowances and move it to the origin. */
function cutOf(finished: Point[], tags: Tag[], allow: (t: Tag) => number): Outline {
  const d = tags.map(allow);
  let off = offsetPolygonPerEdge(finished, d);
  if (!off.ok || Math.abs(signedArea(off.value)) < Math.abs(signedArea(finished))) off = offsetPolygonPerEdge(finished, d.map((x) => -x));
  if (!off.ok) throw new Error(off.error);
  const xs = off.value.map((p) => p.x), ys = off.value.map((p) => p.y);
  const dx = -Math.min(...xs), dy = -Math.min(...ys);
  const mv = (p: Point) => ({ x: p.x + dx, y: p.y + dy });
  return { finished: finished.map(mv), tags, cut: off.value.map(mv), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

/** A bodice half mirrored about its centre line into the whole piece, with edge tags. */
function wholeFrom(h: BodiceHalf): { pts: Point[]; tags: Tag[] } {
  const R = h.outline;
  const t: Tag[] = [];
  for (let i = 0; i < h.neck.length - 1; i++) t.push('neck');
  t.push('shoulder');
  for (let i = 0; i < h.armhole.length - 1; i++) t.push('armhole');
  for (let i = 0; i < h.side.length - 1; i++) t.push('side');
  t.push('hem');
  // R[n-1] is on the centre line at the hem; mirror back up the other side.
  const n = R.length;
  const L = [...R].reverse().map((p) => ({ x: -p.x, y: p.y }));
  const pts = [...R, ...L.slice(1, n - 1)];
  const tags: Tag[] = [...t, ...[...t].reverse()];
  return { pts, tags };
}

export function draftShirt(r: ResolvedInputs): { ok: true; value: ShirtDraft } | { ok: false; errors: BuildPatternError[] } {
  const m = r.measurements;
  const e = r.ease;
  // Straight body: the side seam drops straight from the eased chest.
  const ease = r.body === 'straight'
    ? { ...e, waist: m.chest + e.chest - m.waist, hip: m.chest + e.chest - m.hip }
    : e;
  const mr = resolveMeasurements({ ...m, ease }, 'mm');
  if (!mr.ok) return { ok: false, errors: mr.errors.map((x) => ({ field: x.field.startsWith('ease.') ? `ease_${x.field.slice(5)}` : x.field, message: x.message })) };
  const b = draftBodice(mr.value, { shoulderDrop: r.shoulder_drop });
  if (!b.ok) return { ok: false, errors: [{ field: /shoulder drop/.test(b.error) ? 'shoulder_drop' : 'shoulder_width', message: `The bodice cannot be drafted: ${b.error}.` }] };
  const s = draftSleeve(mr.value, b.value, { capEase: r.cap_ease });
  if (!s.ok) return { ok: false, errors: [{ field: /wrist/.test(s.error) ? 'wrist' : 'bicep', message: `The sleeve cannot be drafted: ${s.error}.` }] };
  const sa = r.seam_allowance;
  const allow = (t: Tag) => (t === 'neck' ? 0 : t === 'hem' ? r.hem_allowance : t === 'wrist' ? r.cuff_allowance : sa);
  const bw = wholeFrom(b.value.back), fw = wholeFrom(b.value.front);
  const back = cutOf(bw.pts, bw.tags, allow), front = cutOf(fw.pts, fw.tags, allow);
  const sv = s.value;
  const n = sv.capBack.length;
  const sPts = [...[...sv.capBack].reverse(), ...sv.capFront.slice(1), sv.underseamFront[1], sv.underseamBack[1]];
  const sTags: Tag[] = [...Array(2 * (n - 1)).fill('cap'), 'underseam', 'wrist', 'underseam'];
  const sleevePiece = cutOf(sPts, sTags, allow);
  const L = b.value.lengths;
  const seams: SeamLengths = {
    shoulder: L.shoulder,
    side: L.side,
    armhole: L.armhole[0] + L.armhole[1],
    cap: sv.lengths.capBack + sv.lengths.capFront,
    underseam: [sv.lengths.underseam, Math.hypot(sv.underseamBack[1].x - sv.underseamBack[0].x, sv.underseamBack[1].y - sv.underseamBack[0].y)],
    neckline: 2 * (L.neck[0] + L.neck[1]),
    binding: 2 * (L.neck[0] + L.neck[1]),
  };
  return { ok: true, value: { bodice: b.value, sleeve: sv, back, front, sleevePiece, seams } };
}

/** Points along the finished outline for every edge carrying `tag`, as runs of connected polylines. */
export function runs(o: Outline, tag: Tag): Point[][] {
  const out: Point[][] = [];
  let cur: Point[] | null = null;
  const N = o.finished.length;
  for (let i = 0; i < N; i++) {
    if (o.tags[i] === tag) {
      const a = o.finished[i], b = o.finished[(i + 1) % N];
      if (cur && cur[cur.length - 1] === a) cur.push(b);
      else { cur = [a, b]; out.push(cur); }
    } else cur = null;
  }
  // A run that wraps round the start of the ring.
  if (out.length > 1 && o.tags[0] === tag && o.tags[N - 1] === tag) { const first = out.shift()!; out[out.length - 1].push(...first.slice(1)); }
  return out;
}

export const runLength = polylineLength;
