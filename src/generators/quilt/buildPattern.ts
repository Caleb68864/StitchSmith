/**
 * Top quilt — pattern builder.
 *
 * Convention B: shell, liner and baffles are drawn at CUT size with the seam
 * allowance baked in; every cut edge carries an explicit 0; the perimeter sew
 * line and the chamber walls are drawn as `stitch` lines. Chamber walls and
 * fill come from the baffle-chamber primitive
 * (`pattern-engine/primitives/chambers.ts`); panel outlines from `geometry.ts`.
 *
 * Panel frame: y runs head to foot, x across. Grain along the length.
 */
import { assignAssemblies } from '../../lib/pattern-engine/graph/Piece.js';
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { ChamberLayout } from '../../lib/pattern-engine/primitives/chambers.js';
import { resolveHem, hemLines } from '../../lib/pattern-engine/primitives/hem.js';
import { offsetPolygonPerEdge } from '../../lib/pattern-engine/geometry/offset.js';
import type { QuiltInputs, QuiltBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError, HardwareItem } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import { PLACEHOLDERS } from './defaults.js';
import { panelOutline, type PanelOutline } from './geometry.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };
export const LINER_ID = 'quilt-liner';
export const SHELL_ID = 'quilt-shell';
export const BAFFLE_PREFIX = 'quilt-baffle-';
export const SIDE_BAFFLE_ID = 'quilt-side-baffle';
export const SHELL_FABRIC_ID = 'quilt-shell-fabric';
export const LINER_FABRIC_ID = 'quilt-liner-fabric';
export const MESH_ID = 'quilt-baffle-mesh';

const IN = 25.4;
const fmtIn = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');
const dim = (mm: number) => `${Math.round(mm)} mm (${fmtIn(mm)}")`;
const grams = (g: number) => `${g < 10 ? g.toFixed(1) : Math.round(g)} g`;
const ounces = (g: number) => `${(g / 28.349523125).toFixed(1)} oz`;

function seg(eid: () => EdgeId, role: Edge['role'], a: Point, b: Point): Edge {
  return { kind: 'straight', id: eid(), role, start: a, end: b };
}
function line(eid: () => EdgeId, id: string, a: Point, b: Point, role: Edge['role'], label?: string): Path {
  return { id, closed: false, edges: [seg(eid, role, a, b)], label };
}
function closed(eid: () => EdgeId, id: string, pts: Point[], role: Edge['role'], label?: string): Path {
  return { id, closed: true, edges: pts.map((p, i) => seg(eid, role, p, pts[(i + 1) % pts.length])), label };
}
function zeroSa(path: Path): Record<EdgeId, number> { const o: Record<EdgeId, number> = {}; for (const e of path.edges) o[e.id] = 0; return o; }

/** The panels in one place: the resolver, the pieces and the tests read it. */
export interface QuiltGeometry {
  liner: PanelOutline;
  shell: PanelOutline;
  chambers: ChamberLayout;
  /** Finished-frame y of the footbox mark (from the head). */
  footboxY: number;
}

export function quiltGeometry(r: ResolvedInputs): QuiltGeometry {
  if (!r.chambers) throw new Error('quilt chambers did not resolve');
  const f = 1 + r.shell_differential / 100;
  const fs = r.wider_layer === 'shell' ? f : 1, fl = r.wider_layer === 'liner' ? f : 1;
  return {
    liner: panelOutline(r.length, r.shoulder_width * fl, r.foot_width * fl, r.seam_allowance, r.head_allowance, r.foot_allowance),
    shell: panelOutline(r.length, r.shoulder_width * fs, r.foot_width * fs, r.seam_allowance, r.head_allowance, r.foot_allowance),
    chambers: r.chambers,
    footboxY: r.length - r.footbox_length,
  };
}

function buildPanel(r: ResolvedInputs, g: QuiltGeometry, which: 'liner' | 'shell'): Piece {
  const id = which === 'liner' ? LINER_ID : SHELL_ID;
  const o = which === 'liner' ? g.liner : g.shell;
  const eid = makeEdgeIdGen(id);
  const outline = closed(eid, `${id}-outline`, o.cut, 'cut');
  const uq = r.kind === 'underquilt';
  const paths: Path[] = [outline];
  const neck = r.neck === 'drawcord';
  if (!uq && !neck) paths.push(closed(eid, `${id}-sew`, o.finished, 'stitch', `Perimeter sew line — ${fmtIn(r.seam_allowance)}" in from the cut edge`));
  else if (!uq) {
    // Neck drawcord: the perimeter is sewn on the sides and foot; the head rolls into the channel.
    const [hl, hr, fr, fl] = o.finished;
    paths.push({ id: `${id}-sew`, closed: false, label: `Sew line — sides and foot, ${fmtIn(r.seam_allowance)}" in; the head rolls into the neck channel`, edges: [hr, fr, fl, hl].slice(1).map((p, i, arr) => ({ kind: 'straight' as const, id: eid(), role: 'stitch' as const, start: i === 0 ? hr : arr[i - 1], end: p })) });
    const hem = resolveHem({ depth: r.head_channel, fold: 'double' });
    if (hem.ok) {
      paths.push(...hemLines({ hem: hem.value, finished: [{ x: 0, y: o.yAt(0) }, { x: o.cutWidth, y: o.yAt(0) }], outward: { x: 0, y: -1 }, idPrefix: `${id}-head`, eid, name: 'Neck channel hem' }).paths);
      paths.push(line(eid, `${id}-channel-head`, { x: o.cx - o.halfWidthAt(r.head_channel), y: o.yAt(r.head_channel) }, { x: o.cx + o.halfWidthAt(r.head_channel), y: o.yAt(r.head_channel) }, 'stitch', `Neck channel stitch — ${fmtIn(r.head_channel)}" for the drawcord, through both layers`));
    }
  } else {
    // Underquilt: the sides are seamed; the ends roll, both layers together, into the suspension channel.
    const [hl, hr, fr, fl] = o.finished;
    paths.push(line(eid, `${id}-sew-left`, hl, fl, 'stitch', `Side sew line — ${fmtIn(r.seam_allowance)}" in`));
    paths.push(line(eid, `${id}-sew-right`, hr, fr, 'stitch'));
    const hem = resolveHem({ depth: r.end_channel, fold: 'double' });
    if (hem.ok) {
      const across = (y: number) => [{ x: 0, y }, { x: o.cutWidth, y }];
      paths.push(...hemLines({ hem: hem.value, finished: across(o.yAt(0)), outward: { x: 0, y: -1 }, idPrefix: `${id}-head`, eid, name: 'Head end channel hem' }).paths);
      paths.push(...hemLines({ hem: hem.value, finished: across(o.yAt(r.length)), outward: { x: 0, y: 1 }, idPrefix: `${id}-foot`, eid, name: 'Foot end channel hem' }).paths);
      paths.push(line(eid, `${id}-channel-head`, { x: o.cx - o.halfWidthAt(r.end_channel), y: o.yAt(r.end_channel) }, { x: o.cx + o.halfWidthAt(r.end_channel), y: o.yAt(r.end_channel) }, 'stitch', `Channel stitch — ${fmtIn(r.end_channel)}" channel for the shock cord, through both layers`));
      paths.push(line(eid, `${id}-channel-foot`, { x: o.cx - o.halfWidthAt(r.length - r.end_channel), y: o.yAt(r.length - r.end_channel) }, { x: o.cx + o.halfWidthAt(r.length - r.end_channel), y: o.yAt(r.length - r.end_channel) }, 'stitch'));
    }
  }
  const wallWord = r.construction === 'baffled' ? 'Baffle line' : 'Sewn-through line';
  g.chambers.wallY.forEach((y, i) => {
    const h = o.halfWidthAt(y), py = o.yAt(y);
    paths.push(line(eid, `${id}-wall-${i + 1}`, { x: o.cx - h, y: py }, { x: o.cx + h, y: py }, 'stitch', i === 0 ? `${wallWord} ${i + 1} of ${g.chambers.wallY.length} — ${fmtIn(g.chambers.pitch)}" apart` : undefined));
  });
  // Footbox marks on both sides, across the seam allowance (top quilt only).
  if (!uq) {
    const fy = o.yAt(g.footboxY), fh = o.halfWidthAt(g.footboxY), sa = Math.max(r.seam_allowance, 6);
    paths.push(line(eid, `${id}-footbox-l`, { x: o.cx - fh - sa, y: fy }, { x: o.cx - fh, y: fy }, 'notch', r.footbox === 'zip' ? 'Footbox zip end' : 'Footbox — sew the sides together from here to the foot'));
    paths.push(line(eid, `${id}-footbox-r`, { x: o.cx + fh, y: fy }, { x: o.cx + fh + sa, y: fy }, 'notch'));
  }
  // Pad strap loops: a third and two thirds of the way down each side, caught in the side seam.
  if (r.pad_straps) {
    const sa = Math.max(r.seam_allowance, 6);
    [1 / 3, 2 / 3].forEach((f, i) => {
      const y = r.length * f, py = o.yAt(y), h = o.halfWidthAt(y);
      paths.push(line(eid, `${id}-pad-loop-l-${i}`, { x: o.cx - h - sa, y: py }, { x: o.cx - h, y: py }, 'notch', i === 0 ? 'Pad strap loop — sew into the side seam here' : undefined));
      paths.push(line(eid, `${id}-pad-loop-r-${i}`, { x: o.cx + h, y: py }, { x: o.cx + h + sa, y: py }, 'notch'));
    });
  }
  // Centre marks at the head and foot so the shell and liner line up.
  paths.push(line(eid, `${id}-centre-head`, { x: o.cx, y: 0 }, { x: o.cx, y: o.yAt(0) }, 'notch', 'Centre'));
  paths.push(line(eid, `${id}-centre-foot`, { x: o.cx, y: o.yAt(r.length) }, { x: o.cx, y: o.cutLength }, 'notch'));
  const annotations: Piece['annotations'] = [
    { kind: 'grain', label: 'grain along the length', point: { x: o.cx, y: o.yAt(g.chambers.pitch / 2) + 40 }, angle: 90 },
    { kind: 'label', label: `${which === 'liner' ? 'Liner' : 'Shell'} — cut ${dim(o.cutWidth)} × ${dim(o.cutLength)}, ${uq ? `side allowance and ${fmtIn(r.end_channel)}" end channels included` : `${fmtIn(r.seam_allowance)}" seam allowance included`}${which === r.wider_layer && r.shell_differential > 0 ? `; ${r.shell_differential} % wider than the ${which === 'shell' ? 'liner' : 'shell'}` : ''}`, point: { x: o.cx, y: o.cutLength / 2 } },
  ];
  if (which === 'liner') {
    // Fill per chamber written in each chamber, for weighing out.
    for (const c of g.chambers.chambers) annotations.push({ kind: 'label', label: `Ch ${c.index}: ${grams(c.fillG)}`, point: { x: o.cx, y: o.yAt((c.y0 + c.y1) / 2) - 20 } });
  }
  return { id, name: which === 'liner' ? 'Liner' : 'Shell', mirror: false, quantity: 1, materialId: which === 'liner' ? LINER_FABRIC_ID : SHELL_FABRIC_ID, paths, seamAllowances: zeroSa(outline), annotations };
}

/**
 * A panel cut as the right half of itself with a centre seam (for a quilt wider than the
 * fabric): every path clipped to the right of the centre line, the cut outline the finished
 * half offset by its allowances (seam allowance on the new centre edge), a centre sew line.
 */
function halfPanel(r: ResolvedInputs, full: Piece, o: PanelOutline, end: [number, number]): Piece {
  const cx = o.cx, sa = r.seam_allowance;
  const [, hr, fr] = o.finished;
  const fin: Point[] = [{ x: cx, y: hr.y }, hr, fr, { x: cx, y: fr.y }];
  const dist = [end[0], sa, end[1], sa];
  const area = (p: Point[]) => p.reduce((s, q, i) => { const n = p[(i + 1) % p.length]; return s + q.x * n.y - n.x * q.y; }, 0) / 2;
  let off = offsetPolygonPerEdge(fin, dist);
  if (!off.ok || Math.abs(area(off.value)) < Math.abs(area(fin))) off = offsetPolygonPerEdge(fin, dist.map((d) => -d));
  if (!off.ok) throw new Error(off.error);
  const shiftX = -Math.min(...off.value.map((p) => p.x));
  const mv = (p: Point): Point => ({ x: p.x + shiftX, y: p.y });
  const eid = makeEdgeIdGen(`${full.id}-half`);
  const outline = closed(eid, `${full.id}-outline`, off.value.map(mv), 'cut');
  const clip = (e: Edge): Edge | null => {
    if (e.kind !== 'straight') return e;
    const a = e.start, b = e.end;
    if (a.x >= cx - 1e-9 && b.x >= cx - 1e-9) return { ...e, id: eid(), start: mv(a), end: mv(b) };
    if (a.x < cx && b.x < cx) return null;
    const t = (cx - a.x) / (b.x - a.x), m = { x: cx, y: a.y + t * (b.y - a.y) };
    return a.x < cx ? { ...e, id: eid(), start: mv(m), end: mv(b) } : { ...e, id: eid(), start: mv(a), end: mv(m) };
  };
  const paths: Path[] = [outline];
  for (const p of full.paths) {
    if (p.id === `${full.id}-outline` || p.id.includes('-centre-')) continue;
    const edges = p.edges.map(clip).filter((x): x is Edge => x !== null && Math.hypot(x.end.x - x.start.x, x.end.y - x.start.y) > 1e-6);
    if (edges.length) paths.push({ ...p, closed: false, edges });
  }
  paths.push(line(eid, `${full.id}-centre-seam`, mv(fin[0]), mv(fin[3]), 'stitch', `Centre seam — join the two halves, ${fmtIn(sa)}" in, flat-felled`));
  return {
    ...full, name: `${full.name} half (cut a mirrored pair)`, mirror: true, quantity: 1, paths, seamAllowances: zeroSa(outline),
    annotations: (full.annotations ?? []).filter((a) => !a.point || a.point.x >= cx - 1).map((a) => (a.point ? { ...a, point: mv({ x: Math.max(a.point.x, cx + 40), y: a.point.y }) } : a)),
  };
}

/** One baffle per chamber wall: shell edge (top) to the shell's width, liner edge (bottom) to the liner's, both ends into the side seam. */
function buildBaffles(r: ResolvedInputs, g: QuiltGeometry): Piece[] {
  const sa = r.seam_allowance, H = r.loft + 2 * sa;
  return g.chambers.wallY.map((y, i) => {
    const id = `${BAFFLE_PREFIX}${i + 1}`;
    const eid = makeEdgeIdGen(id);
    const top = 2 * g.shell.halfWidthAt(y) + 2 * sa;
    const bot = 2 * g.liner.halfWidthAt(y) + 2 * sa;
    const W = Math.max(top, bot), cx = W / 2;
    const cut: Point[] = [{ x: cx - top / 2, y: 0 }, { x: cx + top / 2, y: 0 }, { x: cx + bot / 2, y: H }, { x: cx - bot / 2, y: H }];
    const outline = closed(eid, `${id}-outline`, cut, 'cut');
    const at = (yy: number) => { const t = yy / H; return (top + (bot - top) * t) / 2; };
    const paths: Path[] = [
      outline,
      line(eid, `${id}-shell-stitch`, { x: cx - at(sa), y: sa }, { x: cx + at(sa), y: sa }, 'stitch', i === 0 ? `Shell edge — sew to the shell's baffle line, ${fmtIn(sa)}" in` : undefined),
      line(eid, `${id}-liner-stitch`, { x: cx - at(H - sa), y: H - sa }, { x: cx + at(H - sa), y: H - sa }, 'stitch', i === 0 ? 'Liner edge — sew to the liner\'s baffle line' : undefined),
      line(eid, `${id}-centre`, { x: cx, y: 0 }, { x: cx, y: Math.min(H, sa) }, 'notch'),
    ];
    return {
      id, name: `Baffle ${i + 1}`, mirror: false, quantity: 1, materialId: MESH_ID, paths, seamAllowances: zeroSa(outline),
      annotations: [{ kind: 'label', label: `Baffle ${i + 1} — ${fmtIn(r.loft)}" tall finished, ${fmtIn(top)}" shell edge / ${fmtIn(bot)}" liner edge cut`, point: { x: cx, y: H / 2 } }],
    };
  });
}

/** Side baffle: the finished side length (liner, head to foot between the end lines) by the loft, both edges seam-allowanced. */
function buildSideBaffle(r: ResolvedInputs, g: QuiltGeometry): Piece {
  const eid = makeEdgeIdGen(SIDE_BAFFLE_ID);
  const sa = r.seam_allowance;
  const side = Math.hypot(g.liner.halfWidthAt(r.length) - g.liner.halfWidthAt(0), r.length);
  const w = side + 2 * sa, h = r.loft + 2 * sa;
  const outline = closed(eid, `${SIDE_BAFFLE_ID}-outline`, [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], 'cut');
  return {
    id: SIDE_BAFFLE_ID, name: 'Side baffle (cut 2)', mirror: false, quantity: 2, materialId: MESH_ID, seamAllowances: zeroSa(outline),
    paths: [
      outline,
      line(eid, `${SIDE_BAFFLE_ID}-shell-stitch`, { x: sa, y: sa }, { x: w - sa, y: sa }, 'stitch', `Shell edge — to the shell's side, ${fmtIn(sa)}" in`),
      line(eid, `${SIDE_BAFFLE_ID}-liner-stitch`, { x: sa, y: h - sa }, { x: w - sa, y: h - sa }, 'stitch', "Liner edge — to the liner's side"),
    ],
    annotations: [{ kind: 'label', label: `Side baffle — ${fmtIn(side)}" long, ${fmtIn(r.loft)}" tall finished`, point: { x: w / 2, y: h / 2 } }],
  };
}

function buildSteps(r: ResolvedInputs, g: QuiltGeometry): Step[] {
  const baffled = r.construction === 'baffled';
  const ch = g.chambers;
  const fillList = ch.chambers.map((c) => `${c.index}: ${grams(c.fillG)}`).join(', ');
  const panels = [LINER_ID, SHELL_ID];
  const baffleIds = baffled ? ch.wallY.map((_, i) => `${BAFFLE_PREFIX}${i + 1}`) : [];
  const steps: Step[] = [
    { id: 'quilt.cut', title: 'Cut the shell and liner', body: `Liner ${dim(g.liner.cutWidth)} × ${dim(g.liner.cutLength)}, shell ${dim(g.shell.cutWidth)} × ${dim(g.shell.cutLength)}, both tapering from the head to the foot, the ${fmtIn(r.seam_allowance)}" seam allowance included. Grain along the length: ${dim(r.fabric_length)} of ${fmtIn(r.fabric_width)}" fabric for both. Sewn fabric only.${baffled ? ` Cut the ${ch.wallY.length} mesh baffles, each ${fmtIn(r.loft + 2 * r.seam_allowance)}" tall (the ${fmtIn(r.loft)}" loft and the seam allowance on both edges), numbered head to foot.` : ''}`, dependsOn: [], refsPieces: [...panels, ...baffleIds], group: 'Cut' },
    { id: 'quilt.mark', title: `Mark the ${baffled ? 'baffle' : 'stitch'} lines`, body: `Mark the ${ch.wallY.length} lines across both panels, ${fmtIn(ch.pitch)}" apart from the head (${ch.count} chambers)${r.kind === 'underquilt' ? `, the ${fmtIn(r.end_channel)}" channel lines at both ends` : `, the footbox marks ${fmtIn(r.footbox_length)}" up from the foot`} and the centre at both ends.`, dependsOn: ['quilt.cut'], refsPieces: panels, group: 'Mark' },
  ];
  if (baffled) {
    steps.push(
      { id: 'quilt.baffles-liner', title: 'Baffles to the liner', body: `Sew each baffle's liner (short) edge to its line on the liner, ${fmtIn(r.seam_allowance)}" in, centre to centre, head to foot. Leave the baffle ends loose: they go into the side seam.`, dependsOn: ['quilt.mark'], refsPieces: [LINER_ID, ...baffleIds], group: 'Baffles' },
      ...(r.side_baffles ? [{ id: 'quilt.side-baffles', title: 'Side baffles', body: `Sew a side baffle's liner edge down each long side of the liner on the side sew line, ${fmtIn(r.seam_allowance)}" in, the cross baffles' ends caught under it; its shell edge goes to the shell's side in the perimeter step, so the ${fmtIn(r.loft)}" loft runs out to the edge instead of pinching to nothing.`, dependsOn: ['quilt.baffles-liner'], refsPieces: [LINER_ID, SIDE_BAFFLE_ID], group: 'Baffles' }] : []),
      { id: 'quilt.baffles-shell', title: 'Baffles to the shell', body: `Lay the shell over the liner, centres matched, and sew each baffle's shell (long) edge to its line on the shell, working from the head.${r.shell_differential > 0 ? ` The shell is ${r.shell_differential} % wider, so it stands proud of the liner between the baffles: that is the differential.` : ''}`, dependsOn: ['quilt.baffles-liner'], refsPieces: [SHELL_ID, ...baffleIds], group: 'Baffles' },
    );
  } else {
    steps.push({ id: 'quilt.lines', title: 'Sew the lines through both layers', body: 'Lay the shell on the liner, wrong sides together and centres matched, and sew each marked line across through both layers, from finished side to finished side. Each chamber stays open at the sides until the perimeter is closed.', dependsOn: ['quilt.mark'], refsPieces: panels, group: 'Chambers' });
  }
  const before = baffled ? 'quilt.baffles-shell' : 'quilt.lines';
  steps.push(
    r.kind === 'underquilt'
      ? { id: 'quilt.perimeter', title: 'Sew one side', body: `Turn both layers' seam allowance in toward each other along one long side and topstitch it on the side line${baffled ? ', catching the baffle ends' : ''}. The ends stay open for the channels; the other side stays open to fill.`, dependsOn: [before], refsPieces: panels, group: 'Close' }
      : { id: 'quilt.perimeter', title: 'Sew the perimeter, one side open', body: baffled
      ? `Turn both layers' seam allowance in toward each other along ${r.neck === 'drawcord' ? 'the foot' : 'the head, the foot'} and one long side and topstitch on the perimeter line, catching the baffle ends in the side seam${r.shell_differential > 0 ? ' and easing the shell\'s extra width in along the head and the foot' : ''}. Leave the other side open to fill.`
      : `Turn both layers' seam allowance in toward each other along ${r.neck === 'drawcord' ? 'the foot' : 'the head, the foot'} and one long side and topstitch on the perimeter line. Leave the other side open to fill.`, dependsOn: [before], refsPieces: panels, group: 'Close' },
    { id: 'quilt.fill', title: 'Fill each chamber', body: `Weigh out the fill per chamber (head to foot) — ${fillList}; ${grams(r.total_fill_g)} (${ounces(r.total_fill_g)}) in all at ${r.fill_power} fill power and ${r.overstuff} % overstuff — and fill each through the open side. The weights are an estimate from the chamber volume (${baffled ? 'a box, width × pitch × loft' : 'a sewn-through lens, 2/3 of width × pitch × loft'}); check the loft before closing.`, dependsOn: ['quilt.perimeter'], refsPieces: panels, group: 'Fill' },
    { id: 'quilt.close', title: 'Close the open side', body: 'Turn the seam allowance in along the open side and topstitch it closed, a chamber at a time so the fill stays put.', dependsOn: ['quilt.fill'], refsPieces: panels, group: 'Close' },
    ...(r.neck === 'drawcord' ? [{ id: 'quilt.neck', title: 'Neck channel, drawcord and snap', body: `At the head, hold the two layers together and roll them as one (turn under ${fmtIn(r.head_channel)}", then again) into a ${fmtIn(r.head_channel)}" channel; stitch on the channel line, leaving both sides open. Thread a drawcord with a cord lock, and set a snap at the two head corners so the quilt closes round the neck.`, dependsOn: ['quilt.close'], refsPieces: panels, group: 'Neck' }] : []),
    ...(r.pad_straps ? [{ id: 'quilt.pad', title: 'Pad strap loops', body: `Sew a webbing loop into each side seam at the marks (a third and two thirds down). Two elastic straps, each about the ${fmtIn(r.pad_width)}" pad width plus its buckle tails, clip between opposite loops under the pad.`, dependsOn: ['quilt.close'], refsPieces: panels, group: 'Pad' }] : []),
    r.kind === 'underquilt'
      ? { id: 'quilt.channels', title: 'End channels and suspension', body: `At each end, hold the two layers together and roll them as one (turn under ${fmtIn(r.end_channel)}", then again) into a ${fmtIn(r.end_channel)}" channel; stitch on the channel line through everything, leaving the channel open at both sides. Thread a shock cord through each, with a cord lock, and hang it from the hammock's suspension at both ends. The ${r.wider_layer} is the wider layer${r.shell_differential > 0 ? ` (${r.shell_differential} %)` : ''}: hang it toward the hammock.`, dependsOn: ['quilt.close'], refsPieces: panels, group: 'Ends' }
      : r.footbox === 'sewn'
      ? { id: 'quilt.footbox', title: 'Sew the footbox', body: `Fold the quilt in half along its length, liner inside, and sew the foot end closed (${fmtIn(r.foot_width / 2)}" folded) and the two sides together from the foot up to the footbox marks, ${fmtIn(r.footbox_length)}".`, dependsOn: ['quilt.close'], refsPieces: panels, group: 'Footbox' }
      : { id: 'quilt.footbox', title: 'Zip the footbox', body: `Sew a ${dim(r.zipper_length)} separating zipper into the foot end and up one side to the footbox mark (${fmtIn(r.foot_width / 2)}" across the folded foot plus ${fmtIn(r.footbox_length)}" of side), so the foot opens flat as a blanket.`, dependsOn: ['quilt.close'], refsPieces: panels, group: 'Footbox' },
  );
  return steps;
}

/** Every placeholder the user has not entered, as ONE note (the tarp's pattern). */
function mockDerived(inputs: QuiltInputs, r: ResolvedInputs): GeneratorWarning[] {
  const unit = r.units === 'in' ? (mm: number) => `${(mm / IN).toFixed(3).replace(/\.?0+$/, '')}"` : (mm: number) => `${Math.round(mm * 10) / 10} mm`;
  const uq = r.kind === 'underquilt';
  const applies = (f: keyof QuiltInputs) => {
    if (f === 'shell_differential') return r.construction === 'baffled';
    if (f === 'foot_width' || f === 'footbox_length') return !uq;
    if (f === 'end_channel') return uq;
    if (f === 'neck_channel') return r.neck === 'drawcord';
    if (f === 'pad_width') return r.pad_straps;
    return true;
  };
  const open = PLACEHOLDERS.filter((p) => applies(p.field) && (inputs[p.field] === undefined || inputs[p.field] === null));
  if (open.length === 0) return [];
  const show = (p: (typeof PLACEHOLDERS)[number]) => (p.kind === 'percent' ? `${p.mm} %` : p.kind === 'fill_power' ? `${p.mm} in³/oz` : p.kind === 'sa' ? `${p.mm} mm` : unit(p.mm));
  return [{
    id: 'mock-derived', severity: 'info', field: open[0].field,
    message: `[mock-derived] ${open.length} placeholder${open.length === 1 ? '' : 's'} with no vault source ${open.length === 1 ? 'is' : 'are'} in use: ${open.map((p) => `${p.label} ${show(p)}`).join('; ')}. The vault's shelter and sleep notes were not available when this pattern was built, so check each one against the vault or a test sleep, then enter it.`,
  }];
}

function buildWarnings(inputs: QuiltInputs, r: ResolvedInputs): GeneratorWarning[] {
  const w = mockDerived(inputs, r);
  w.push({ id: 'fill-estimate', severity: 'info', field: 'fill_power', message: `Fill is an estimate: ${grams(r.total_fill_g)} (${ounces(r.total_fill_g)}) from the chamber volume (${r.construction === 'baffled' ? 'a box of the loft height' : 'a sewn-through lens, 2/3 of the box'}), the fill power and the overstuff. Real loft depends on the fill and the fabric; weigh each chamber's share and check the loft before closing.` });
  if (r.kind === 'underquilt' && fin(inputs.foot_width)) w.push({ id: 'foot-width-ignored', severity: 'info', field: 'foot_width', message: 'An underquilt is cut as a rectangle the shoulder width across, so the foot width is not used.' });
  if (r.foot_width > r.shoulder_width) w.push({ id: 'foot-wider', severity: 'warning', field: 'foot_width', message: `The foot (${fmtIn(r.foot_width)}") is wider than the shoulders (${fmtIn(r.shoulder_width)}"): the quilt tapers the wrong way.` });
  if (r.construction === 'sewn_through') {
    w.push({ id: 'sewn-through-cold', severity: 'info', field: 'construction', message: 'Sewn through: the loft falls to nothing at every stitch line, so each line is a cold spot. Baffles keep the full loft wall to wall.' });
    if (fin(inputs.shell_differential) && inputs.shell_differential !== 0) w.push({ id: 'differential-ignored', severity: 'info', field: 'shell_differential', message: 'A sewn-through quilt joins the shell to the liner at every line, so they are cut the same size: the differential is not used.' });
  }
  if (r.chambers && r.chambers.pitch < r.loft) w.push({ id: 'chamber-narrow', severity: 'warning', field: 'baffle_spacing', message: `Chambers ${fmtIn(r.chambers.pitch)}" apart are narrower than the ${fmtIn(r.loft)}" loft: the fill will not spread evenly in them.` });
  return w;
}
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function buildPattern(inputs: QuiltInputs): Result<QuiltBuildResult> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  const r = resolveInputs(inputs);
  const g = quiltGeometry(r);
  const ends: [number, number] = [r.head_allowance, r.foot_allowance];
  const panel = (w: 'shell' | 'liner') => { const p = buildPanel(r, g, w); return r.join_widths ? halfPanel(r, p, w === 'shell' ? g.shell : g.liner, ends) : p; };
  const pieces: Piece[] = [panel('shell'), panel('liner')];
  if (r.construction === 'baffled') pieces.push(...buildBaffles(r, g));
  if (r.side_baffles) pieces.push(buildSideBaffle(r, g));
  const hardware: HardwareItem[] = [
    { id: 'fill', name: 'Down fill', quantity: 1, notes: `${grams(r.total_fill_g)} (${ounces(r.total_fill_g)}) at ${r.fill_power} fill power, ${r.overstuff} % overstuff; estimate, mock-derived` },
  ];
  if (r.neck === 'drawcord') {
    hardware.push({ id: 'neck-cord', name: 'Neck drawcord', quantity: 1, notes: `the ${fmtIn(r.shoulder_width)}" head width plus enough to tie` });
    hardware.push({ id: 'neck-cord-lock', name: 'Cord lock', quantity: 1 });
    hardware.push({ id: 'neck-snap', name: 'Snap set at the neck', quantity: 1 });
  }
  if (r.pad_straps) {
    hardware.push({ id: 'pad-strap', name: 'Elastic pad strap with buckle', quantity: 2, notes: `about the ${fmtIn(r.pad_width)}" pad width each, plus the buckle tails (mock-derived)` });
    hardware.push({ id: 'pad-loop', name: 'Webbing loop for a pad strap', quantity: 4, notes: 'two each side, in the side seams' });
  }
  if (r.kind === 'underquilt') {
    hardware.push({ id: 'shock-cord', name: 'Shock cord for the end channels', quantity: 2, notes: `one per end: the ${fmtIn(r.shoulder_width)}" width plus the reach to the hammock's suspension, cut to the hammock` });
    hardware.push({ id: 'cord-lock', name: 'Cord lock', quantity: 2, notes: 'one per end' });
  } else if (r.footbox === 'zip') hardware.push({ id: 'footbox-zip', name: 'Separating zipper for the footbox', quantity: 1, notes: `${dim(r.zipper_length)}` });
  assignAssemblies(pieces, [[/^quilt-(shell|liner)$/, 'Shell and liner'], [/baffle/, 'Baffles']]);
  return { ok: true, value: { pieces, steps: buildSteps(r, g), warnings: buildWarnings(inputs, r), hardware, resolved: r } };
}
