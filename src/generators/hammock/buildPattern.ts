/**
 * Gathered-end hammock — pattern builder.
 *
 * Convention B: the body is drawn at CUT size. The side hems and the end
 * channels (or whipping tails) are baked into the outline, every edge carries
 * an explicit 0, and the channel stitch lines are drawn. Side hems and
 * channels both come from the Hem primitive: a channel is a hem deep enough
 * to take a cord (crease on the finished end, mark at double).
 *
 * Flat frame: x runs along the length (cut end at x = 0), y across the width
 * (cut side at y = 0). Grain runs along the length.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import { resolveHem, hemLines, type Hem } from '../../lib/pattern-engine/primitives/hem.js';
import type { HammockInputs, HammockBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError, HardwareItem } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import { PLACEHOLDERS } from './defaults.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };
export const BODY_ID = 'hammock-body';
export const FABRIC_ID = 'hammock-nylon';
export const NET_ID = 'hammock-bug-net';
export const MESH_ID = 'hammock-mesh';

const IN = 25.4;
const LB = 0.45359237;
const fmtIn = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');
const dim = (mm: number) => `${Math.round(mm)} mm (${fmtIn(mm)}")`;
const fmtFt = (mm: number) => { const inches = mm / IN; const ft = Math.floor(inches / 12 + 1e-9); const rest = inches - 12 * ft; return `${ft}' ${rest.toFixed(1).replace(/\.0$/, '')}"`; };

function seg(eid: () => EdgeId, role: Edge['role'], a: Point, b: Point): Edge {
  return { kind: 'straight', id: eid(), role, start: a, end: b };
}
function line(eid: () => EdgeId, id: string, a: Point, b: Point, role: Edge['role'], label?: string): Path {
  return { id, closed: false, edges: [seg(eid, role, a, b)], label };
}
function zeroSa(path: Path): Record<EdgeId, number> { const o: Record<EdgeId, number> = {}; for (const e of path.edges) o[e.id] = 0; return o; }

function hemOf(r: ResolvedInputs, depth: number): Hem {
  // Depths are already floored by resolveInputs; production mode off here keeps them as resolved.
  const h = resolveHem({ depth, fold: r.hem_fold });
  if (!h.ok) throw new Error(h.error);
  return h.value;
}

/** The body's lines in its flat frame, in one place: the outline, the steps and the tests read it. */
export interface BodyGeometry {
  side: Hem;
  channel: Hem;
  /** Cut x of each finished end (channel crease or whip line). */
  endX: [number, number];
  /** Cut y of each finished long side. */
  sideY: [number, number];
  /** Channel ends: cut x of each channel stitch line. */
  channelStitchX?: [number, number];
  cutLength: number;
  cutWidth: number;
}

export function bodyGeometry(r: ResolvedInputs): BodyGeometry {
  const side = hemOf(r, r.side_hem_depth);
  const channel = hemOf(r, r.channel_depth);
  const e = r.end_allowance, s = r.side_allowance;
  const L = r.cut_length, W = r.cut_width;
  return {
    side, channel,
    endX: [e, L - e],
    // A joined half: one hemmed side, the centre seam on the other.
    sideY: [s, r.join_widths ? W - r.seam_allowance : W - s],
    channelStitchX: r.end_style === 'channel' ? [e + channel.depth, L - e - channel.depth] : undefined,
    cutLength: L,
    cutWidth: W,
  };
}

function buildBody(r: ResolvedInputs, g: BodyGeometry): Piece {
  const eid = makeEdgeIdGen(BODY_ID);
  const L = g.cutLength, W = g.cutWidth;
  const c = [{ x: 0, y: 0 }, { x: L, y: 0 }, { x: L, y: W }, { x: 0, y: W }];
  const outline: Path = { id: `${BODY_ID}-outline`, closed: true, edges: c.map((p, i) => seg(eid, 'cut', p, c[(i + 1) % 4])) };
  const paths: Path[] = [outline];
  // Side hems first, the full cut length: the end channels fold over them.
  const [y0, y1] = g.sideY;
  if (r.side_edge === 'hem') {
    paths.push(...hemLines({ hem: g.side, finished: [{ x: 0, y: y0 }, { x: L, y: y0 }], outward: { x: 0, y: -1 }, idPrefix: `${BODY_ID}-side-0`, eid, name: 'Side hem' }).paths);
    if (!r.join_widths) paths.push(...hemLines({ hem: g.side, finished: [{ x: 0, y: y1 }, { x: L, y: y1 }], outward: { x: 0, y: 1 }, idPrefix: `${BODY_ID}-side-1`, eid, name: 'Side hem' }).paths);
  }
  if (r.join_widths) paths.push(line(eid, `${BODY_ID}-centre-seam`, { x: 0, y: y1 }, { x: L, y: y1 }, 'stitch', `Centre seam — join the two halves, ${fmtIn(r.seam_allowance)}" in, flat-felled (it carries the load)`));
  const [xa, xb] = g.endX;
  if (r.end_style === 'channel') {
    paths.push(...hemLines({ hem: g.channel, finished: [{ x: xa, y: 0 }, { x: xa, y: W }], outward: { x: -1, y: 0 }, idPrefix: `${BODY_ID}-end-0`, eid, name: 'End channel hem' }).paths);
    paths.push(...hemLines({ hem: g.channel, finished: [{ x: xb, y: 0 }, { x: xb, y: W }], outward: { x: 1, y: 0 }, idPrefix: `${BODY_ID}-end-1`, eid, name: 'End channel hem' }).paths);
    const [s0, s1] = g.channelStitchX!;
    const label = `Channel stitch — ${fmtIn(r.channel_depth)}" channel, leave both sides open for the cord; backstitch at each end`;
    paths.push(line(eid, `${BODY_ID}-channel-stitch-0`, { x: s0, y: 0 }, { x: s0, y: W }, 'stitch', label));
    paths.push(line(eid, `${BODY_ID}-channel-stitch-1`, { x: s1, y: 0 }, { x: s1, y: W }, 'stitch'));
  } else {
    // Whipping: roll the raw end of each tail, then gather and whip on the whip line.
    const t = g.side.allowance;
    paths.push(...hemLines({ hem: g.side, finished: [{ x: t, y: 0 }, { x: t, y: W }], outward: { x: -1, y: 0 }, idPrefix: `${BODY_ID}-tail-0`, eid, name: 'Tail hem' }).paths);
    paths.push(...hemLines({ hem: g.side, finished: [{ x: L - t, y: 0 }, { x: L - t, y: W }], outward: { x: 1, y: 0 }, idPrefix: `${BODY_ID}-tail-1`, eid, name: 'Tail hem' }).paths);
    paths.push(line(eid, `${BODY_ID}-whip-0`, { x: xa, y: 0 }, { x: xa, y: W }, 'notch', `Whip line — gather here; ${fmtIn(r.whip_tail)}" tail beyond it`));
    paths.push(line(eid, `${BODY_ID}-whip-1`, { x: xb, y: 0 }, { x: xb, y: W }, 'notch'));
  }
  // Centre mark across the body: where the structural ridgeline's midpoint sits and the lay is checked.
  paths.push(line(eid, `${BODY_ID}-centre`, { x: L / 2, y: 0 }, { x: L / 2, y: Math.min(W, 2 * IN) }, 'notch', 'Centre mark'));
  paths.push(line(eid, `${BODY_ID}-centre-b`, { x: L / 2, y: Math.max(0, W - 2 * IN) }, { x: L / 2, y: W }, 'notch'));
  return {
    id: BODY_ID,
    name: r.join_widths ? `Hammock body half (cut ${2 * r.layers})` : r.layers === 2 ? 'Hammock body (cut 2)' : 'Hammock body',
    mirror: false,
    quantity: r.layers * (r.join_widths ? 2 : 1),
    materialId: FABRIC_ID,
    paths,
    seamAllowances: zeroSa(outline),
    annotations: [
      { kind: 'grain', label: 'grain along the length', point: { x: L / 2, y: W / 2 - 60 }, angle: 0 },
      { kind: 'label', label: `Body — cut ${dim(L)} × ${dim(W)}, ${r.end_style === 'channel' ? 'channels' : 'whip tails'}${r.side_edge === 'hem' ? ' and side hems' : ''} included`, point: { x: L / 2, y: W / 2 } },
    ],
  };
}

/** The bug net: the body's cut length (its ends go into the channels or whippings with the body) by the finished width plus a seam allowance each side. */
function buildNet(r: ResolvedInputs, g: BodyGeometry): Piece {
  const eid = makeEdgeIdGen(NET_ID);
  const L = g.cutLength, W = r.net_cut_width, s = r.seam_allowance;
  const c = [{ x: 0, y: 0 }, { x: L, y: 0 }, { x: L, y: W }, { x: 0, y: W }];
  const outline: Path = { id: `${NET_ID}-outline`, closed: true, edges: c.map((p, i) => seg(eid, 'cut', p, c[(i + 1) % 4])) };
  return {
    id: NET_ID, name: 'Bug net', mirror: false, quantity: 1, materialId: MESH_ID, seamAllowances: zeroSa(outline),
    paths: [
      outline,
      line(eid, `${NET_ID}-sewn-side`, { x: 0, y: s }, { x: L, y: s }, 'stitch', `Sewn side — to one long side of the body, ${fmtIn(s)}" in`),
      line(eid, `${NET_ID}-zip-side`, { x: 0, y: W - s }, { x: L, y: W - s }, 'stitch', 'Zipped side — the zipper tape, the other half on the body'),
    ],
    annotations: [{ kind: 'label', label: `Bug net — no-see-um mesh, cut ${dim(L)} × ${dim(W)}; it lies over the structural ridgeline`, point: { x: L / 2, y: W / 2 } }],
  };
}

function buildSteps(r: ResolvedInputs, g: BodyGeometry): Step[] {
  const rolled = r.hem_fold === 'double';
  const hemWord = (depth: number, mark: number) => rolled
    ? `roll it: turn the raw edge under ${fmtIn(depth)}", then again on the ${fmtIn(mark)}" mark`
    : `mark ${fmtIn(mark)}" in from the raw edge (double the ${fmtIn(depth)}" hem) and fold the raw edge to the mark`;
  const steps: Step[] = [
    { id: 'hammock.cut', title: 'Cut the body', body: `${r.layers === 2 ? 'Two layers' : 'One piece'}, ${dim(g.cutLength)} × ${dim(g.cutWidth)} — the ${r.end_style === 'channel' ? 'end channels' : 'whip tails'}${r.side_edge === 'hem' ? ' and side hems are' : ' are'} included in the cut. Grain along the length: ${dim(r.fabric_length)} (${fmtFt(r.fabric_length)}) of ${fmtIn(r.fabric_width)}" fabric.${r.side_edge === 'selvedge' ? ' Cut so both long sides are the selvedge.' : ''} Mark the centre on both long sides. Sewn fabric only.`, dependsOn: [], refsPieces: [BODY_ID], group: 'Cut' },
  ];
  let prev = 'hammock.cut';
  if (r.join_widths) {
    steps.push({ id: 'hammock.join', title: 'Join the halves', body: `Right sides together, sew each pair of halves along the centre seam line, ${fmtIn(r.seam_allowance)}" in, then flat-fell it: trim one allowance, fold the other over it and topstitch. The seam runs the length of the hammock and takes load, so stitch it twice.`, dependsOn: [prev], refsPieces: [BODY_ID], group: 'Body' });
    prev = 'hammock.join';
  }
  if (r.layers === 2) {
    steps.push({ id: 'hammock.layers', title: 'Two layers', body: 'Lay the two bodies wrong sides together and treat them as one through the side hems and the ends: the hems and the channels (or whippings) catch both layers. Leave one side hem unstitched for a hand span at the middle if a pad will slide in between.', dependsOn: ['hammock.cut'], refsPieces: [BODY_ID], group: 'Layers' });
    prev = 'hammock.layers';
  }
  if (r.side_edge === 'hem') {
    steps.push({ id: 'hammock.sides', title: 'Hem both long sides', body: `Along each long side, ${hemWord(g.side.depth, g.side.markFromRaw)}, then stitch the full length. Hem the sides before the ends so the ${r.end_style === 'channel' ? 'channels fold' : 'tail hems fold'} over them.`, dependsOn: [prev], refsPieces: [BODY_ID], group: 'Hems' });
    prev = 'hammock.sides';
  }
  if (r.bug_net) {
    steps.push({ id: 'hammock.net', title: 'Bug net', body: `Sew the net's sewn side to one long side of the body on the side hem, ${fmtIn(r.seam_allowance)}" in, and set the zipper between the net's other side and the other long side of the body. The net's ends go into the channels (or the whipping) with the body; it lies over the structural ridgeline when hung.`, dependsOn: [prev], refsPieces: [NET_ID, BODY_ID], group: 'Net' });
    prev = 'hammock.net';
  }
  if (r.end_style === 'channel') {
    steps.push({ id: 'hammock.channels', title: 'Sew the end channels', body: `At each end, ${hemWord(g.channel.depth, g.channel.markFromRaw)} to make a ${fmtIn(r.channel_depth)}" channel. Stitch along the drawn channel line, backstitching hard at both sides: the gathered end carries the whole load through this line. Leave the channel open at both sides for the cord.`, dependsOn: [prev], refsPieces: [BODY_ID], group: 'Ends' });
    prev = 'hammock.channels';
    steps.push({ id: 'hammock.gather', title: 'Thread and gather the ends', body: 'Pass the end cord (a continuous loop or a doubled cord) through each channel, gather the fabric tight along it, and bring the loop out at one side for the suspension.', dependsOn: [prev], refsPieces: [BODY_ID], group: 'Ends' });
  } else {
    steps.push({ id: 'hammock.tails', title: 'Hem the tails', body: `On each raw end, ${hemWord(g.side.depth, g.side.markFromRaw)}, then stitch, so the tail cannot fray back to the whipping.`, dependsOn: [prev], refsPieces: [BODY_ID], group: 'Ends' });
    prev = 'hammock.tails';
    steps.push({ id: 'hammock.gather', title: 'Gather and whip the ends', body: `At each end, gather the fabric on the marked whip line (the ${fmtIn(r.whip_tail)}" tail stays beyond it), fold the tail back into a bight for the suspension and whip tightly over the gather with cord, then lock the whipping off.`, dependsOn: [prev], refsPieces: [BODY_ID], group: 'Ends' });
  }
  steps.push(
    { id: 'hammock.ridgeline', title: 'Structural ridgeline', body: `A fixed ridgeline ${dim(r.ridgeline_length)} (${fmtFt(r.ridgeline_length)}) eye to eye — ${r.ridgeline_pct.toFixed(0)} % of the ${fmtIn(r.length)}" length — from one gathered end to the other. It sets the sag on every hang, whatever the tree spacing. The percentage is a placeholder: adjust it to the lay you want and write it down.`, dependsOn: ['hammock.gather'], refsPieces: [BODY_ID], group: 'Hang' },
    { id: 'hammock.test', title: 'Test hang low', body: 'Hang it low over soft ground, sit in it first and load it slowly. Check the channel or whipping, the ridgeline and the suspension after the first night. Suspension (straps, whoopie slings) is not part of this pattern.', dependsOn: ['hammock.ridgeline'], refsPieces: [BODY_ID], group: 'Hang' },
  );
  return steps;
}

/** Every placeholder the user has not entered, as ONE note (the tarp's pattern). */
function mockDerived(inputs: HammockInputs, r: ResolvedInputs): GeneratorWarning[] {
  const unit = r.units === 'in' ? (mm: number) => `${(mm / IN).toFixed(3).replace(/\.?0+$/, '')}"` : (mm: number) => `${Math.round(mm * 10) / 10} mm`;
  const applies = (f: keyof HammockInputs) => {
    if (f === 'channel_depth') return r.end_style === 'channel';
    if (f === 'whip_tail') return r.end_style === 'whipping';
    if (f === 'side_hem_depth') return r.side_edge === 'hem' || r.end_style === 'whipping';
    if (f === 'strap_length') return r.suspension === 'tree_straps';
    if (f === 'seam_allowance') return r.join_widths || r.bug_net;
    return true;
  };
  const open = PLACEHOLDERS.filter((p) => applies(p.field) && (inputs[p.field] === undefined || inputs[p.field] === null));
  if (open.length === 0) return [];
  const show = (p: (typeof PLACEHOLDERS)[number]) => (p.kind === 'percent' ? `${p.mm} %` : p.kind === 'sa' ? `${p.mm} mm` : unit(p.mm));
  return [{
    id: 'mock-derived', severity: 'info', field: open[0].field,
    message: `[mock-derived] ${open.length} placeholder${open.length === 1 ? '' : 's'} with no vault source ${open.length === 1 ? 'is' : 'are'} in use: ${open.map((p) => `${p.label} ${show(p)}`).join('; ')}. The vault's shelter and sleep notes were not available when this pattern was built, so check each one against the vault or a test hang, then enter it.`,
  }];
}

function weight(kg: number, units: 'mm' | 'in'): string { return units === 'in' ? `${Math.round(kg / LB)} lb` : `${Math.round(kg)} kg`; }

function buildWarnings(inputs: HammockInputs, r: ResolvedInputs): GeneratorWarning[] {
  const w = mockDerived(inputs, r);
  // Safety policy (decisions.md 2026-11-16): one standing load warning, never dismissed by a number.
  const both = Number.isFinite(r.occupant_kg) && Number.isFinite(r.rating_kg);
  if (both && r.occupant_kg > r.rating_kg) {
    w.push({ id: 'load-over-rating', severity: 'warning', field: 'occupant_weight', message: `Over the fabric's rating: ${weight(r.occupant_kg, r.units)} occupant on fabric rated to ${weight(r.rating_kg, r.units)}. Use a heavier fabric or a double layer; do not hang this one.` });
  } else {
    w.push({
      id: 'load-safety', severity: 'warning', field: 'occupant_weight',
      message: both
        ? `Load: ${weight(r.occupant_kg, r.units)} occupant against a ${weight(r.rating_kg, r.units)} fabric rating (${Math.round((100 * r.occupant_kg) / r.rating_kg)} %). This pattern does not rate the stitching, the ends or the suspension: hang it low over soft ground and load it slowly the first time.`
        : 'A hammock holds a person off the ground, and this pattern does not rate the fabric, the stitching, the ends or the suspension. Enter the occupant weight and the fabric maker\'s rating to check them against each other, then hang it low over soft ground and load it slowly the first time.',
    });
  }
  if (r.ridgeline_pct < 78 || r.ridgeline_pct > 88) w.push({ id: 'ridgeline-range', severity: 'warning', field: 'ridgeline_pct', message: `[mock-derived] A ${r.ridgeline_pct} % ridgeline is outside the usual 78–88 % band: ${r.ridgeline_pct < 78 ? 'the hammock will hang deep and tight across the shoulders' : 'the hammock will hang flat and tippy'}. The band is a placeholder too.` });
  if (r.side_edge === 'selvedge' && r.fabric_trim > 1e-6) w.push({ id: 'selvedge-trim', severity: 'warning', field: 'side_edge', message: `The fabric is ${fmtIn(r.fabric_trim)}" wider than the hammock, so one long side would be a cut edge, not the selvedge. Hem the sides, or set the width to the fabric width.` });
  if (r.side_edge === 'hem' && r.fabric_trim > 1e-6) w.push({ id: 'fabric-trim', severity: 'info', field: 'fabric_width', message: `${fmtIn(r.fabric_trim)}" of the fabric width is left over after the ${fmtIn(r.cut_width)}" cut. Trim it from one side, or widen the hammock to use it.` });
  if (r.hem_raised) w.push({ id: 'hem-raised', severity: 'info', field: 'side_hem_depth', message: 'Production mode raised a hem to 1/2"; the cut grew to match.' });
  if (!r.join_widths && !r.bug_net && inputs.seam_allowance !== undefined && inputs.seam_allowance !== null && inputs.seam_allowance !== 0) w.push({ id: 'seam-allowance-ignored', severity: 'info', field: 'seam_allowance', message: 'A gathered-end hammock is one piece with no joining seam, so the seam allowance is not used.' });
  return w;
}

export function buildPattern(inputs: HammockInputs): Result<HammockBuildResult> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  const r = resolveInputs(inputs);
  const g = bodyGeometry(r);
  const pieces: Piece[] = [buildBody(r, g)];
  if (r.bug_net) pieces.push(buildNet(r, g));
  const hardware: HardwareItem[] = [
    r.end_style === 'channel'
      ? { id: 'end-cord', name: 'End cord through each channel (continuous loop or doubled cord)', quantity: 2, notes: `one per channel; the channel is ${fmtIn(r.channel_depth)}" deep` }
      : { id: 'whipping-cord', name: 'Whipping cord', quantity: 2, notes: 'one length per end' },
    { id: 'ridgeline', name: 'Structural ridgeline', quantity: 1, notes: `${dim(r.ridgeline_length)} eye to eye (${r.ridgeline_pct.toFixed(0)} % of the length; mock-derived)` },
  ];
  if (r.bug_net) hardware.push({ id: 'net-zipper', name: 'Two-way zipper for the bug net', quantity: 1, notes: `${dim(r.length)}, along the body's long side` });
  if (r.suspension === 'tree_straps') {
    hardware.push(
      { id: 'tree-strap', name: 'Tree strap (wide, tree-friendly webbing)', quantity: 2, notes: `${dim(r.strap_length)} each (mock-derived); rated for the load` },
      { id: 'carabiner', name: 'Load-rated carabiner', quantity: 2, notes: 'one per end, strap to the end loop; check its rating against the load' },
    );
  }
  return { ok: true, value: { pieces, steps: buildSteps(r, g), warnings: buildWarnings(inputs, r), hardware, resolved: r } };
}
