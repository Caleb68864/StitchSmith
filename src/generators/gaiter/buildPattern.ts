/**
 * Gaiters — pattern builder (Convention B). One piece, cut as a mirrored
 * pair: the tube development from `geometry.ts`, the top elastic channel and
 * the bottom hem from the Hem primitive, the front edges hemmed (hook-and-
 * loop) or seam-allowanced for a zipper, the hook-and-loop strips, the
 * instep strap anchors and the lace hook marked.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import { resolveHem, hemLines, type Hem } from '../../lib/pattern-engine/primitives/hem.js';
import type { GaiterInputs, GaiterBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError, HardwareItem } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import { PLACEHOLDERS } from './defaults.js';
import { gaiterShape, SAMPLES, type GaiterShape } from './geometry.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };
export const GAITER_ID = 'gaiter';
export const FABRIC_ID = 'gaiter-fabric';

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

export function shapeOf(r: ResolvedInputs): GaiterShape {
  const g = gaiterShape({ top: r.top_circumference, bottom: r.bottom_circumference, height: r.height, drop: r.front_drop, channelAllowance: r.channel_allowance, hemAllowance: r.hem_allowance, front: r.front_allowance });
  if (!g) throw new Error('gaiter shape did not resolve');
  return g;
}
function hemOf(r: ResolvedInputs, depth: number): Hem {
  const h = resolveHem({ depth, fold: r.hem_fold });
  if (!h.ok) throw new Error(h.error);
  return h.value;
}

function buildGaiter(r: ResolvedInputs, g: GaiterShape): Piece {
  const eid = makeEdgeIdGen(GAITER_ID);
  const outline = poly(eid, `${GAITER_ID}-outline`, g.cut, 'cut', true);
  const paths: Path[] = [outline];
  const us = (u0: number, u1: number) => Array.from({ length: SAMPLES + 1 }, (_, i) => u0 + ((u1 - u0) * i) / SAMPLES);
  // Top channel across the full cut width at the finished top.
  const topU = us(g.uOutside(0, 0, r.front_allowance[0]), g.uOutside(1, 0, r.front_allowance[1]));
  paths.push(...hemLines({ hem: hemOf(r, r.channel_depth), finished: topU.map((u) => g.at(u, 0)), outward: { x: 0, y: -1 }, idPrefix: `${GAITER_ID}-top`, eid, name: 'Top elastic channel hem' }).paths);
  const chanStitchS = r.channel_depth;
  paths.push(poly(eid, `${GAITER_ID}-channel-stitch`, topU.map((u) => g.at(u, chanStitchS)), 'stitch', false, `Channel stitch — ${fmtIn(r.channel_depth)}" channel for the elastic`));
  // Bottom hem along the dropped edge.
  const botU = us(g.uOutside(0, g.bottomS(0), r.front_allowance[0]), g.uOutside(1, g.bottomS(1), r.front_allowance[1]));
  const bS = (u: number) => g.bottomS(Math.min(1, Math.max(0, u)));
  paths.push(...hemLines({ hem: hemOf(r, r.hem_depth), finished: botU.map((u) => g.at(u, bS(u))), outward: { x: 0, y: 1 }, idPrefix: `${GAITER_ID}-bottom`, eid, name: 'Bottom hem' }).paths);
  // Front edges.
  const edgeAt = (u: number) => [g.at(u, -r.channel_allowance), g.at(u, bS(u) + r.hem_allowance)];
  if (r.closure === 'velcro') {
    const hem = hemOf(r, r.hem_depth);
    // Underlap: the finished edge at u = 0. Overlap: the finished edge is the overlap's outer edge, `overlap` beyond u = 1.
    const n0 = g.edgeNormal(0), n1 = g.edgeNormal(1);
    const e0 = edgeAt(0), e1 = edgeAt(1).map((p) => ({ x: p.x + n1.x * r.overlap, y: p.y + n1.y * r.overlap }));
    paths.push(...hemLines({ hem, finished: e0, outward: n0, idPrefix: `${GAITER_ID}-front-0`, eid, name: 'Front hem (underlap)' }).paths);
    paths.push(...hemLines({ hem, finished: e1, outward: n1, idPrefix: `${GAITER_ID}-front-1`, eid, name: 'Front hem (overlap)' }).paths);
    // Loop strip on the outside of the underlap, hook on the inside of the overlap, each `overlap` wide.
    const strip = (pts: Point[], n: Point, w: number) => [...pts, ...[...pts].reverse().map((p) => ({ x: p.x - n.x * w, y: p.y - n.y * w }))];
    const fe0 = [g.at(0, r.channel_depth), g.at(0, bS(0) - r.hem_depth)];
    const fe1 = [g.at(1, r.channel_depth), g.at(1, bS(1) - r.hem_depth)].map((p) => ({ x: p.x + n1.x * r.overlap, y: p.y + n1.y * r.overlap }));
    paths.push(poly(eid, `${GAITER_ID}-loop`, strip(fe0, n0, r.overlap), 'stitch', true, `Loop strip ${fmtIn(r.overlap)}" wide on the OUTSIDE of the underlap`));
    paths.push(poly(eid, `${GAITER_ID}-hook`, strip(fe1, n1, r.overlap), 'stitch', true, `Hook strip ${fmtIn(r.overlap)}" wide on the INSIDE of the overlap`));
  } else {
    // Zipper tapes sew along the finished front edges, the allowance outside them.
    paths.push(poly(eid, `${GAITER_ID}-zip-0`, edgeAt(0), 'stitch', false, `Zipper seam — ${fmtIn(r.seam_allowance)}" in`));
    paths.push(poly(eid, `${GAITER_ID}-zip-1`, edgeAt(1), 'stitch'));
  }
  // Instep strap anchors half-way round each side, the lace hook at the underlap front.
  for (const [i, u] of [[0, 0.25], [1, 0.75]] as const) {
    const p = g.at(u, bS(u) - r.hem_depth), q = g.at(u, bS(u) - r.hem_depth - 15);
    paths.push(poly(eid, `${GAITER_ID}-instep-${i}`, [q, p], 'notch', false, i === 0 ? 'Instep strap anchor (grommet or webbing tab), both sides' : undefined));
  }
  const lh = g.at(0.02, bS(0) - r.hem_depth - 10);
  paths.push(poly(eid, `${GAITER_ID}-lace-hook`, [lh, { x: lh.x, y: lh.y - 15 }], 'notch', false, 'Lace hook'));
  const mid = g.at(0.5, r.height / 2);
  return {
    id: GAITER_ID, name: 'Gaiter (cut a mirrored pair)', mirror: true, quantity: 1, materialId: FABRIC_ID, paths, seamAllowances: zeroSa(outline),
    annotations: [
      { kind: 'grain', label: 'grain down the leg', point: { x: mid.x, y: mid.y - 60 }, angle: 90 },
      { kind: 'label', label: `Gaiter — ${fmtIn(r.top_circumference)}" top, ${fmtIn(r.bottom_circumference)}" bottom, ${fmtIn(r.height)}" at the back; channel, hems and ${r.closure === 'velcro' ? 'overlap' : 'zipper allowance'} included`, point: mid },
    ],
  };
}

function buildSteps(r: ResolvedInputs, g: GaiterShape): Step[] {
  const rolled = r.hem_fold === 'double';
  const hemWord = (depth: number) => rolled ? `roll it (turn under ${fmtIn(depth)}", then again)` : `fold it once to the mark at ${fmtIn(2 * depth)}"`;
  const steps: Step[] = [
    { id: 'gaiter.cut', title: 'Cut a mirrored pair', body: `Two pieces, one flipped, each ${dim(g.width)} × ${dim(g.height)} at the widest — the channel, hems and ${r.closure === 'velcro' ? 'hook-and-loop overlap' : 'zipper allowance'} are included. Grain down the leg. Mark the strap anchors and the lace hook. Sewn fabric only.`, dependsOn: [], refsPieces: [GAITER_ID], group: 'Cut' },
  ];
  if (r.closure === 'velcro') {
    steps.push(
      { id: 'gaiter.front', title: 'Hem the front edges', body: `${hemWord(r.hem_depth)[0].toUpperCase()}${hemWord(r.hem_depth).slice(1)} on both front edges and stitch.`, dependsOn: ['gaiter.cut'], refsPieces: [GAITER_ID], group: 'Front' },
      { id: 'gaiter.velcro', title: 'Hook and loop', body: `Sew a ${fmtIn(r.overlap)}" loop strip on the outside of the underlap edge and a hook strip on the inside of the overlap, each ${fmtIn(r.front_length - r.channel_depth - r.hem_depth)}" long, all round their edges. Mirror them on the second gaiter so both close toward the outside of the leg.`, dependsOn: ['gaiter.front'], refsPieces: [GAITER_ID], group: 'Front' },
    );
  } else {
    steps.push({ id: 'gaiter.front', title: 'Zipper down the front', body: `Sew a ${dim(r.front_length)} separating zipper, slider at the top, between the two front edges, ${fmtIn(r.seam_allowance)}" in, and finish the allowances. Mirror the zipper side on the second gaiter.`, dependsOn: ['gaiter.cut'], refsPieces: [GAITER_ID], group: 'Front' });
  }
  const prev = steps[steps.length - 1].id;
  steps.push(
    { id: 'gaiter.bottom', title: 'Hem the bottom', body: `Along the bottom, which drops ${fmtIn(r.front_drop)}" at the front over the laces, ${hemWord(r.hem_depth)} and stitch, easing it round the curve.`, dependsOn: [prev], refsPieces: [GAITER_ID], group: 'Edges' },
    { id: 'gaiter.top', title: 'Elastic channel at the top', body: `At the top, ${hemWord(r.channel_depth)} to make a ${fmtIn(r.channel_depth)}" channel and stitch along the drawn line, leaving both front ends open. Thread ${dim(r.elastic_length)} of elastic (${r.elastic_pct} % of the top circumference) through and bar-tack each end at the front.`, dependsOn: ['gaiter.bottom'], refsPieces: [GAITER_ID], group: 'Edges' },
    { id: 'gaiter.hardware', title: 'Instep strap and lace hook', body: `Set a grommet (or sew a webbing tab) at each instep anchor and fit a ${dim(r.instep_strap_length)} strap of cord or webbing under the boot between them, adjustable on one side. Rivet or sew the lace hook at the front bottom of the underlap.`, dependsOn: ['gaiter.top'], refsPieces: [GAITER_ID], group: 'Hardware' },
    { id: 'gaiter.fit', title: 'Fit it on the boot', body: 'Close it over the boot and the trouser leg, hook the laces and tension the strap: the bottom should seal round the boot without pulling up at the heel. Every number here is a starting point until checked on the leg it is for.', dependsOn: ['gaiter.hardware'], refsPieces: [GAITER_ID], group: 'Finish' },
  );
  return steps;
}

function mockDerived(inputs: GaiterInputs, r: ResolvedInputs): GeneratorWarning[] {
  const unit = r.units === 'in' ? (mm: number) => `${(mm / IN).toFixed(3).replace(/\.?0+$/, '')}"` : (mm: number) => `${Math.round(mm * 10) / 10} mm`;
  const applies = (f: keyof GaiterInputs) => (f === 'overlap' ? r.closure === 'velcro' : f === 'seam_allowance' ? r.closure === 'zipper' : true);
  const open = PLACEHOLDERS.filter((p) => applies(p.field) && (inputs[p.field] === undefined || inputs[p.field] === null));
  if (open.length === 0) return [];
  const show = (p: (typeof PLACEHOLDERS)[number]) => (p.kind === 'percent' ? `${p.mm} %` : p.kind === 'sa' ? `${p.mm} mm` : unit(p.mm));
  return [{ id: 'mock-derived', severity: 'info', field: open[0].field, message: `[mock-derived] ${open.length} placeholder${open.length === 1 ? '' : 's'} ${open.length === 1 ? 'is' : 'are'} in use: ${open.map((p) => `${p.label} ${show(p)}`).join('; ')}. They are common starting points for a mid-height gaiter, not measurements: measure the leg and boot, then enter them.` }];
}

function buildWarnings(inputs: GaiterInputs, r: ResolvedInputs): GeneratorWarning[] {
  const w = mockDerived(inputs, r);
  if (r.bottom_circumference < r.top_circumference) w.push({ id: 'narrow-bottom', severity: 'info', field: 'bottom_circumference', message: 'The bottom is narrower than the top: the gaiter will not slide over the boot closed, so open it to put it on.' });
  if (r.closure === 'velcro' && inputs.seam_allowance !== undefined && inputs.seam_allowance !== null) w.push({ id: 'seam-allowance-unused', severity: 'info', field: 'seam_allowance', message: 'A hook-and-loop gaiter has no seam: its front edges are hemmed, so the seam allowance is not used.' });
  return w;
}

export function buildPattern(inputs: GaiterInputs): Result<GaiterBuildResult> {
  const v = validateInputs(inputs);
  if (!v.ok) return { ok: false, errors: v.errors };
  const r = resolveInputs(inputs);
  const g = shapeOf(r);
  const vel = r.front_length - r.channel_depth - r.hem_depth;
  const hardware: HardwareItem[] = [
    ...(r.closure === 'velcro'
      ? [{ id: 'hook', name: `Hook tape, ${fmtIn(r.overlap)}" wide`, quantity: 2, notes: `${dim(vel)} per gaiter` }, { id: 'loop', name: `Loop tape, ${fmtIn(r.overlap)}" wide`, quantity: 2, notes: `${dim(vel)} per gaiter` }]
      : [{ id: 'zipper', name: 'Separating zipper', quantity: 2, notes: `${dim(r.front_length)} each` }]),
    { id: 'elastic', name: 'Elastic for the top channel', quantity: 2, notes: `${dim(r.elastic_length)} each, narrower than the ${fmtIn(r.channel_depth)}" channel` },
    { id: 'instep-strap', name: 'Instep strap (cord or webbing)', quantity: 2, notes: `${dim(r.instep_strap_length)} each` },
    { id: 'grommet', name: 'Grommet or webbing tab for the strap', quantity: 4, notes: 'two per gaiter' },
    { id: 'lace-hook', name: 'Lace hook', quantity: 2 },
  ];
  return { ok: true, value: { pieces: [buildGaiter(r, g)], steps: buildSteps(r, g), warnings: buildWarnings(inputs, r), hardware, resolved: r } };
}
