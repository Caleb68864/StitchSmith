/**
 * Beanie — pattern builder (Convention B). N gores from `geometry/gore.ts`
 * (cut size: the finished gore offset by the seam allowance on its sides and
 * by the seam allowance or hem allowance on its base) and, with a cuff, a
 * band folded lengthwise. Every cut edge carries an explicit 0; sew lines,
 * the hem fold and the cuff fold are drawn.
 */
import { assignAssemblies } from '../../lib/pattern-engine/graph/Piece.js';
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import { offsetPolygonPerEdge } from '../../lib/pattern-engine/geometry/offset.js';
import { resolveHem, hemLines } from '../../lib/pattern-engine/primitives/hem.js';
import type { BeanieInputs, BeanieBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import { PLACEHOLDERS } from './defaults.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };
export const GORE_ID = 'beanie-gore';
export const CUFF_ID = 'beanie-cuff';
export const FABRIC_ID = 'beanie-fabric';

const IN = 25.4;
const fmtIn = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');
const dim = (mm: number) => `${Math.round(mm)} mm (${fmtIn(mm)}")`;

function seg(eid: () => EdgeId, role: Edge['role'], a: Point, b: Point): Edge { return { kind: 'straight', id: eid(), role, start: a, end: b }; }
function poly(eid: () => EdgeId, id: string, pts: Point[], role: Edge['role'], closed = false, label?: string): Path {
  const edges: Edge[] = [];
  for (let i = 1; i < pts.length; i++) edges.push(seg(eid, role, pts[i - 1], pts[i]));
  if (closed) edges.push(seg(eid, role, pts[pts.length - 1], pts[0]));
  return { id, closed, edges, label };
}
function zeroSa(path: Path): Record<EdgeId, number> { const o: Record<EdgeId, number> = {}; for (const e of path.edges) o[e.id] = 0; return o; }
const signedArea = (p: Point[]) => p.reduce((s, q, i) => { const n = p[(i + 1) % p.length]; return s + q.x * n.y - n.x * q.y; }, 0) / 2;

/** The finished gore (apex at the top, base at the bottom) and its cut outline, in one place. */
export function goreOutline(r: ResolvedInputs): { finished: Point[]; cut: Point[]; width: number; height: number } {
  const L = r.gore_length;
  const right = r.samples.map((q) => ({ x: q.half, y: L - q.s }));
  const left = [...r.samples].reverse().map((q) => ({ x: -q.half, y: L - q.s }));
  // Base left → base right, up the right side to the apex, down the left side.
  let ring: Point[] = [left[left.length - 1], ...right, ...left.slice(1, -1)];
  // The apex appears once: right ends at it, left starts at it.
  ring = ring.filter((p, i, a) => i === 0 || Math.hypot(p.x - a[i - 1].x, p.y - a[i - 1].y) > 1e-9);
  // Edge 0 is the base; the rest are the sides.
  const dists = ring.map((_, i) => (i === 0 ? r.base_allowance : r.seam_allowance));
  let off = offsetPolygonPerEdge(ring, dists);
  if (!off.ok || signedArea(off.value) * signedArea(ring) < 0 || Math.abs(signedArea(off.value)) < Math.abs(signedArea(ring))) {
    off = offsetPolygonPerEdge(ring, dists.map((x) => -x));
  }
  if (!off.ok) throw new Error(off.error);
  const xs = off.value.map((p) => p.x), ys = off.value.map((p) => p.y);
  const dx = -Math.min(...xs), dy = -Math.min(...ys);
  const mv = (p: Point) => ({ x: p.x + dx, y: p.y + dy });
  return { finished: ring.map(mv), cut: off.value.map(mv), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

function buildGore(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(GORE_ID);
  const o = goreOutline(r);
  const outline = poly(eid, `${GORE_ID}-outline`, o.cut, 'cut', true);
  const [bl, br] = o.finished;
  const sides = o.finished.slice(1).concat([bl]);
  const paths: Path[] = [outline, poly(eid, `${GORE_ID}-side-seam`, sides, 'stitch', false, `Side seams — ${fmtIn(r.seam_allowance)}" in, gore to gore up to the crown point`)];
  if (r.finish === 'cuff') paths.push(poly(eid, `${GORE_ID}-base-seam`, [bl, br], 'stitch', false, 'Base — sewn to the cuff'));
  else {
    const hem = resolveHem({ depth: r.hem_depth, fold: 'single' });
    if (hem.ok) paths.push(...hemLines({ hem: hem.value, finished: [bl, br], outward: { x: 0, y: 1 }, idPrefix: `${GORE_ID}-base`, eid, name: 'Base hem' }).paths);
  }
  const mid = { x: (bl.x + br.x) / 2, y: (bl.y + o.finished[Math.floor(o.finished.length / 2)].y) / 2 };
  return {
    id: GORE_ID, name: `Gore (cut ${r.gores})`, mirror: false, quantity: r.gores, materialId: FABRIC_ID, paths, seamAllowances: zeroSa(outline),
    annotations: [
      { kind: 'grain', label: 'grain (or the stretch) round the head', point: { x: mid.x, y: mid.y + 40 }, angle: 0 },
      { kind: 'label', label: `Gore — ${fmtIn(r.gore_base)}" base, ${fmtIn(r.gore_length)}" to the point; allowances included`, point: mid },
    ],
  };
}

function buildCuff(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(CUFF_ID);
  const s = r.seam_allowance;
  const w = r.circumference + 2 * s, h = 2 * r.cuff_height + 2 * s;
  const rect = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
  const outline = poly(eid, `${CUFF_ID}-outline`, rect, 'cut', true);
  return {
    id: CUFF_ID, name: 'Cuff band', mirror: false, quantity: 1, materialId: FABRIC_ID, seamAllowances: zeroSa(outline),
    paths: [
      outline,
      poly(eid, `${CUFF_ID}-fold`, [{ x: 0, y: h / 2 }, { x: w, y: h / 2 }], 'fold', false, 'Cuff fold (180°) — fold in half lengthwise, wrong sides together'),
      poly(eid, `${CUFF_ID}-end-0`, [{ x: s, y: 0 }, { x: s, y: h }], 'stitch', false, `End seam — join the ends into a loop, ${fmtIn(s)}" in`),
      poly(eid, `${CUFF_ID}-end-1`, [{ x: w - s, y: 0 }, { x: w - s, y: h }], 'stitch'),
    ],
    annotations: [{ kind: 'label', label: `Cuff — cut ${dim(w)} × ${dim(h)}, ${fmtIn(r.cuff_height)}" folded; stretch runs along the band`, point: { x: w / 2, y: h / 4 } }],
  };
}

function buildSteps(r: ResolvedInputs): Step[] {
  const N = r.gores;
  const steps: Step[] = [
    { id: 'beanie.cut', title: 'Cut the pieces', body: `${N} gores${r.finish === 'cuff' ? ' and the cuff band' : ''}, the allowances included. If the fabric stretches more one way, put that stretch round the head.`, dependsOn: [], refsPieces: r.finish === 'cuff' ? [GORE_ID, CUFF_ID] : [GORE_ID], group: 'Cut' },
    { id: 'beanie.crown', title: 'Sew the crown', body: N % 2 === 0
      ? `Right sides together, sew the gores in two halves of ${N / 2}, side seam to side seam from the base up to the point, ${fmtIn(r.seam_allowance)}" in. Then sew the two halves together across the top in one seam, matching the points.`
      : `Right sides together, sew the gores one to the next, side seam to side seam from the base up to the point, ${fmtIn(r.seam_allowance)}" in, then close the last seam; keep every point meeting at the top.`, dependsOn: ['beanie.cut'], refsPieces: [GORE_ID], group: 'Crown' },
    r.finish === 'cuff'
      ? { id: 'beanie.cuff', title: 'Cuff', body: `Sew the band's ends into a loop, fold it in half lengthwise wrong sides together, and sew both raw edges to the crown's base, right sides together, ${fmtIn(r.seam_allowance)}" in, the loop's seam at the back. Fold the cuff up.`, dependsOn: ['beanie.crown'], refsPieces: [CUFF_ID, GORE_ID], group: 'Finish' }
      : { id: 'beanie.hem', title: 'Hem the base', body: `Mark ${fmtIn(2 * r.hem_depth)}" in from the raw base, fold the raw edge to the mark and stitch with a stretch stitch.`, dependsOn: ['beanie.crown'], refsPieces: [GORE_ID], group: 'Finish' },
  ];
  return steps;
}

function mockDerived(inputs: BeanieInputs, r: ResolvedInputs): GeneratorWarning[] {
  const unit = r.units === 'in' ? (mm: number) => `${(mm / IN).toFixed(3).replace(/\.?0+$/, '')}"` : (mm: number) => `${Math.round(mm * 10) / 10} mm`;
  const applies = (f: keyof BeanieInputs) => (f === 'cuff_height' ? r.finish === 'cuff' : f === 'hem_depth' ? r.finish === 'hem' : true);
  const open = PLACEHOLDERS.filter((p) => applies(p.field) && (inputs[p.field] === undefined || inputs[p.field] === null));
  if (open.length === 0) return [];
  const show = (p: (typeof PLACEHOLDERS)[number]) => (p.kind === 'count' ? String(p.mm) : p.kind === 'sa' ? `${p.mm} mm` : unit(p.mm));
  return [{ id: 'mock-derived', severity: 'info', field: open[0].field, message: `[mock-derived] ${open.length} placeholder${open.length === 1 ? '' : 's'} ${open.length === 1 ? 'is' : 'are'} in use: ${open.map((p) => `${p.label} ${show(p)}`).join('; ')}. They are starting points, not a size chart: measure round the head at the brow and enter it.` }];
}

export function buildPattern(inputs: BeanieInputs): Result<BeanieBuildResult> {
  const v = validateInputs(inputs);
  if (!v.ok) return { ok: false, errors: v.errors };
  const r = resolveInputs(inputs);
  const pieces: Piece[] = [buildGore(r)];
  if (r.finish === 'cuff') pieces.push(buildCuff(r));
  const warnings = mockDerived(inputs, r);
  if (r.ease < 0) warnings.push({ id: 'negative-ease', severity: 'info', field: 'ease', message: `${fmtIn(-r.ease)}" of negative ease: a stretch fabric (fleece, jersey) only. A woven fabric needs positive ease.` });
  assignAssemblies(pieces, [[/gore/, 'Crown'], [/cuff/, 'Cuff']]);
  return { ok: true, value: { pieces, steps: buildSteps(r), warnings, hardware: [], resolved: r } };
}
