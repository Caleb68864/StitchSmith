/**
 * Flat / A-frame tarp — pattern builder.
 *
 * Convention B: every panel is drawn at CUT size. The ridge seam allowance and
 * the hems are baked into the outline, every edge carries an explicit 0, the
 * ridge stitch line is drawn, and the hems come from the Hem primitive (crease
 * on the finished edge, mark at double). Cat cuts come from the catenary helper.
 *
 * Flat panel frame: x runs along the ridge (cut edge at x = 0), y runs from the
 * ridge cut edge (y ≈ 0) to the eave. Inside the end-hem allowance every curve
 * is mirrored about the end crease, so the hem folds back flat onto its panel.
 */
import { assignAssemblies } from '../../lib/pattern-engine/graph/Piece.js';
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import { catenary } from '../../lib/pattern-engine/geometry/catenary.js';
import { resolveHem, hemLines, type Hem } from '../../lib/pattern-engine/primitives/hem.js';
import type { TarpInputs, TarpBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError, HardwareItem, TieOut } from './types.js';
import { resolveInputs, validateInputs, doorCut, beakCut } from './inputs.js';
import { PLACEHOLDERS } from './defaults.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };
export const PANEL_ID = 'tarp-panel';
export const PATCH_ID = 'tarp-patch';
export const LOOP_ID = 'tarp-loop';
export const FABRIC_ID = 'silnylon';
export const GROSGRAIN_ID = 'webbing-16';
/** Straight segments per curved edge. */
export const CURVE_SEGMENTS = 24;

const IN = 25.4;
const fmtIn = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');
const dim = (mm: number) => `${Math.round(mm)} mm (${fmtIn(mm)}")`;
const fmtFt = (mm: number) => { const inches = mm / IN; const ft = Math.floor(inches / 12 + 1e-9); const rest = inches - 12 * ft; return `${ft}' ${rest.toFixed(1).replace(/\.0$/, '')}"`; };

function seg(eid: () => EdgeId, role: Edge['role'], a: Point, b: Point): Edge {
  return { kind: 'straight', id: eid(), role, start: a, end: b };
}
function polyline(eid: () => EdgeId, id: string, pts: Point[], role: Edge['role'], label?: string): Path {
  const edges: Edge[] = [];
  for (let i = 1; i < pts.length; i++) edges.push(seg(eid, role, pts[i - 1], pts[i]));
  return { id, closed: false, edges, label };
}
function rectPath(eid: () => EdgeId, id: string, x0: number, y0: number, x1: number, y1: number, role: Edge['role'], label?: string): Path {
  const a = { x: x0, y: y0 }, b = { x: x1, y: y0 }, c = { x: x1, y: y1 }, d = { x: x0, y: y1 };
  return { id, closed: true, label, edges: [seg(eid, role, a, b), seg(eid, role, b, c), seg(eid, role, c, d), seg(eid, role, d, a)] };
}
function zeroSa(path: Path): Record<EdgeId, number> { const o: Record<EdgeId, number> = {}; for (const e of path.edges) o[e.id] = 0; return o; }

/** Depth functions of the two cat cuts over the finished span (0 for a straight edge). */
function depths(r: ResolvedInputs): { ridge: (t: number) => number; eave: (t: number) => number } {
  const make = (sag: number) => { const c = catenary(r.ridge_length, sag); return c.ok ? c.value.depth : () => 0; };
  return { ridge: make(r.ridge_sag), eave: make(r.eave_sag) };
}

/** The panel's geometry in its flat frame, in one place: the outline, the tests and the 3D check all read it. */
export interface PanelGeometry {
  hem: Hem;
  /** Cut x of each end crease. */
  endX: [number, number];
  /** Sample x positions across the whole cut length. */
  xs: number[];
  /** Finished top edge: the ridge stitch line (ridge seam) or the first eave (single panel). */
  top: (x: number) => number;
  /** Raw top edge. */
  topCut: (x: number) => number;
  /** Finished bottom eave. */
  bottom: (x: number) => number;
  bottomCut: (x: number) => number;
  /**
   * How far the finished end crease sits inside the straight end at cut y
   * (0 everywhere on straight ends). Mirrored about each span end, so inside
   * the eave hem and the ridge allowance it folds flat like the other curves.
   */
  endIn: (y: number) => number;
  /** Cat-cut ends: the finished spans the end curve runs over (start y, count of spans of `endSpan`), or null. */
  endSpans: { y0: number; n: number; span: number } | null;
  /** Single panel: the ridge reference line. */
  ridgeY?: number;
  cutLength: number;
  cutWidth: number;
}

export function panelGeometry(r: ResolvedInputs): PanelGeometry {
  const hemR = resolveHem({ depth: r.hem_depth_requested, fold: r.hem_fold, productionMode: r.production_mode });
  if (!hemR.ok) throw new Error(hemR.error);
  const hem = hemR.value;
  const e = hem.allowance;
  const L = r.ridge_length;
  const H = r.panel_finished_width;
  // Finished-span coordinate, mirrored about each end crease inside the end hem.
  // End allowances: the hem's, or the seam allowance at an end with a beak sewn on.
  const [ea, eb] = r.end_allowance;
  const u = (x: number) => { let t = x - ea; if (t < 0) t = -t; if (t > L) t = 2 * L - t; return Math.min(L, Math.max(0, t)); };
  const d = depths(r);
  const xs: number[] = [];
  if (ea > 0) xs.push(0);
  for (let i = 0; i <= CURVE_SEGMENTS; i++) xs.push(ea + (L * i) / CURVE_SEGMENTS);
  if (eb > 0) xs.push(L + ea + eb);
  const endC = catenary(r.end_span, r.end_sag);
  const endDepth = r.end_sag > 0 && endC.ok ? endC.value.depth : () => 0;
  const S = r.end_span;
  /** Depth over spans [y0, y0 + S], [y0 + S, y0 + 2S]..., mirrored outside the first and last. */
  const spanIn = (y0: number, n: number) => (y: number) => {
    let v = y - y0;
    if (v < 0) v = -v;
    if (v > n * S) v = 2 * n * S - v;
    v = Math.min(n * S, Math.max(0, v));
    const k = Math.min(n - 1, Math.floor(v / S));
    return endDepth(v - k * S);
  };
  if (r.construction === 'ridge_seam') {
    const s = r.seam_allowance;
    return {
      hem, endX: [ea, ea + L], xs, endIn: spanIn(s, 1), endSpans: r.end_sag > 0 ? { y0: s, n: 1, span: S } : null,
      top: (x) => s + d.ridge(u(x)),
      topCut: (x) => d.ridge(u(x)),
      bottom: (x) => s + H - d.eave(u(x)),
      bottomCut: (x) => s + H - d.eave(u(x)) + e,
      cutLength: L + ea + eb,
      cutWidth: s + H + e,
    };
  }
  return {
    hem, endX: [ea, ea + L], xs, endIn: spanIn(e, 2), endSpans: r.end_sag > 0 ? { y0: e, n: 2, span: S } : null,
    top: (x) => e + d.eave(u(x)),
    topCut: (x) => d.eave(u(x)),
    bottom: (x) => e + H - d.eave(u(x)),
    bottomCut: (x) => e + H - d.eave(u(x)) + e,
    ridgeY: e + H / 2,
    cutLength: L + ea + eb,
    cutWidth: H + 2 * e,
  };
}

/** Tie-out points and their patch squares on one panel. */
export function tieOuts(r: ResolvedInputs, g: PanelGeometry): TieOut[] {
  const p = r.patch_size;
  const [xa, xb] = g.endX;
  const out: TieOut[] = [];
  const eaveSet = (edge: 'bottom' | 'top', tag: string) => {
    const y = edge === 'bottom' ? g.bottom : g.top;
    // Patch squares sit inside the finished edge.
    const sq = (x0: number, x1: number, x: number) => (edge === 'bottom' ? { x0, x1, y0: y(x) - p, y1: y(x) } : { x0, x1, y0: y(x), y1: y(x) + p });
    out.push({ id: `${tag}-corner-0`, kind: 'corner', at: { x: xa, y: y(xa) }, patch: sq(xa, xa + p, xa) });
    for (let k = 1; k <= r.eave_tieouts; k++) {
      const x = xa + (r.ridge_length * k) / (r.eave_tieouts + 1);
      out.push({ id: `${tag}-eave-${k}`, kind: 'eave', at: { x, y: y(x) }, patch: sq(x - p / 2, x + p / 2, x) });
    }
    out.push({ id: `${tag}-corner-1`, kind: 'corner', at: { x: xb, y: y(xb) }, patch: sq(xb - p, xb, xb) });
  };
  eaveSet('bottom', 'eave');
  if (r.construction === 'single_panel') eaveSet('top', 'eave2');
  if (r.pullouts) {
    // Mid-span, midway across the panel (each half of a single panel), patch centred on it.
    const x = xa + r.ridge_length / 2;
    const at = (y: number, id: string) => out.push({ id, kind: 'pullout', at: { x, y }, patch: { x0: x - p / 2, x1: x + p / 2, y0: y - p / 2, y1: y + p / 2 } });
    if (r.construction === 'ridge_seam') at((g.top(x) + g.bottom(x)) / 2, 'pullout');
    else { at((g.top(x) + g.ridgeY!) / 2, 'pullout-0'); at((g.ridgeY! + g.bottom(x)) / 2, 'pullout-1'); }
  }
  if (r.ridge_tieouts) {
    if (r.construction === 'ridge_seam') {
      // The patch straddles the felled seam: half of it on each panel.
      const y = g.top(xa);
      out.push({ id: 'ridge-0', kind: 'ridge', onBeak: r.beak_ends[0] || undefined, at: { x: xa, y }, patch: { x0: xa, x1: xa + p, y0: y, y1: y + p / 2 } });
      out.push({ id: 'ridge-1', kind: 'ridge', onBeak: r.beak_ends[1] || undefined, at: { x: xb, y }, patch: { x0: xb - p, x1: xb, y0: y, y1: y + p / 2 } });
    } else {
      const y = g.ridgeY!;
      out.push({ id: 'ridge-0', kind: 'ridge', onBeak: r.beak_ends[0] || undefined, at: { x: xa, y }, patch: { x0: xa, x1: xa + p, y0: y - p / 2, y1: y + p / 2 } });
      out.push({ id: 'ridge-1', kind: 'ridge', onBeak: r.beak_ends[1] || undefined, at: { x: xb, y }, patch: { x0: xb - p, x1: xb, y0: y - p / 2, y1: y + p / 2 } });
    }
  }
  return out;
}

/** Sample y positions down a cat-cut end (cut frame, 0 to the cut width), or null for straight ends. */
export function endYs(g: PanelGeometry): number[] | null {
  const sp = g.endSpans;
  if (!sp) return null;
  const per = Math.max(4, Math.round(CURVE_SEGMENTS / sp.n));
  const ys = [0, g.cutWidth];
  for (let k = 0; k < sp.n; k++) for (let i = 0; i <= per; i++) ys.push(sp.y0 + sp.span * (k + i / per));
  return [...new Set(ys.map((y) => Math.round(y * 1e6) / 1e6))].filter((y) => y >= 0 && y <= g.cutWidth).sort((a, b) => a - b);
}

function buildPanel(r: ResolvedInputs, g: PanelGeometry, ties: TieOut[]): Piece {
  const eid = makeEdgeIdGen(PANEL_ID);
  const xs = g.xs;
  const W = g.cutLength;
  const topRaw = xs.map((x) => ({ x, y: g.topCut(x) }));
  const botRaw = xs.map((x) => ({ x, y: g.bottomCut(x) }));
  // Outline: top raw edge left → right, right end down, bottom raw edge right → left, left end up.
  let ring: Point[] = [...topRaw, ...[...botRaw].reverse()];
  const ys = endYs(g);
  if (ys) {
    // Cat-cut ends: the raw end is the finished crease moved out by the hem allowance.
    const yT = topRaw[0].y, yB = botRaw[0].y;
    const inner = ys.filter((y) => y > yT + 1e-6 && y < yB - 1e-6);
    topRaw[0] = { x: g.endIn(yT), y: yT };
    topRaw[topRaw.length - 1] = { x: W - g.endIn(topRaw[topRaw.length - 1].y), y: topRaw[topRaw.length - 1].y };
    botRaw[0] = { x: g.endIn(yB), y: yB };
    botRaw[botRaw.length - 1] = { x: W - g.endIn(botRaw[botRaw.length - 1].y), y: botRaw[botRaw.length - 1].y };
    ring = [
      ...topRaw,
      ...inner.map((y) => ({ x: W - g.endIn(y), y })),
      ...[...botRaw].reverse(),
      ...[...inner].reverse().map((y) => ({ x: g.endIn(y), y })),
    ];
  }
  const edges: Edge[] = ring.map((pt, i) => seg(eid, 'cut', pt, ring[(i + 1) % ring.length]));
  const outline: Path = { id: `${PANEL_ID}-outline`, closed: true, edges };
  const paths: Path[] = [outline];

  // Eave hem(s): the finished edge sampled across the whole cut length, so the
  // raw edge the primitive returns is exactly the outline's.
  const bottomHem = hemLines({ hem: g.hem, finished: xs.map((x) => ({ x, y: g.bottom(x) })), outward: { x: 0, y: 1 }, idPrefix: `${PANEL_ID}-eave`, eid, name: 'Eave hem' });
  paths.push(...bottomHem.paths);
  if (r.construction === 'single_panel') {
    paths.push(...hemLines({ hem: g.hem, finished: xs.map((x) => ({ x, y: g.top(x) })), outward: { x: 0, y: -1 }, idPrefix: `${PANEL_ID}-eave2`, eid, name: 'Eave hem (second eave)' }).paths);
  }
  // End hems: creases across the full cut width, straight or along the end cat cut.
  const [xa, xb] = g.endX;
  const endPts = ys ?? [0, g.cutWidth];
  // An end with a beak is a seam, not a hem: draw the sew line one allowance in.
  for (const [i, x, out] of [[0, xa, -1], [1, xb, 1]] as const) {
    if (r.beak_ends[i]) paths.push(polyline(eid, `${PANEL_ID}-beak-seam-${i}`, [{ x, y: 0 }, { x, y: g.cutWidth }], 'stitch', `Beak seam — the beak half sews on here, ${fmtIn(r.seam_allowance)}" in`));
    else paths.push(...hemLines({ hem: g.hem, finished: endPts.map((y) => ({ x: x - out * g.endIn(y), y })), outward: { x: out, y: 0 }, idPrefix: `${PANEL_ID}-end-${i}`, eid, name: 'End hem' }).paths);
  }

  if (r.construction === 'ridge_seam') {
    paths.push(polyline(eid, `${PANEL_ID}-ridge-stitch`, xs.map((x) => ({ x, y: g.top(x) })), 'stitch',
      `Ridge seam — flat-felled, stitched ${fmtIn(r.seam_allowance)}" in from the cut edge${r.ridge_sag > 0 ? `; cat cut ${fmtIn(r.ridge_sag)}" deep at mid-span` : ''}`));
  } else {
    paths.push(polyline(eid, `${PANEL_ID}-ridge-line`, [{ x: 0, y: g.ridgeY! }, { x: W, y: g.ridgeY! }], 'fold', 'Ridge line — lies over the ridgeline (0°)'));
  }
  // Tie-out patches: box-X through patch, loop and panel.
  if (r.patch_size > 0) {
    ties.filter((t) => !t.onBeak).forEach((t, i) => {
      const { x0, y0, x1, y1 } = t.patch;
      paths.push(rectPath(eid, `${PANEL_ID}-patch-${t.id}`, x0, y0, x1, y1, 'stitch', i === 0 ? `Tie-out patch ${fmtIn(r.patch_size)}" square, box-X stitched` : undefined));
      paths.push({ id: `${PANEL_ID}-patch-x-${t.id}`, closed: false, edges: [seg(eid, 'stitch', { x: x0, y: y0 }, { x: x1, y: y1 }), seg(eid, 'stitch', { x: x1, y: y0 }, { x: x0, y: y1 })] });
    });
  }
  const mid = { x: W / 2, y: (g.top(W / 2) + g.bottom(W / 2)) / 2 };
  return {
    id: PANEL_ID,
    name: r.panel_count === 2 ? 'Panel (cut 2)' : 'Panel',
    mirror: false,
    quantity: r.panel_count,
    materialId: FABRIC_ID,
    paths,
    seamAllowances: zeroSa(outline),
    annotations: [
      { kind: 'grain', label: 'grain along the ridge', point: { x: W / 2, y: mid.y - 60 }, angle: 0 },
      { kind: 'label', label: `Panel — cut ${dim(g.cutLength)} × ${dim(g.cutWidth)}, ${r.construction === 'ridge_seam' ? 'ridge seam allowance and hems included' : 'hems included'}`, point: mid },
    ],
  };
}

export const DOOR_ID = 'tarp-door';
export const BEAK_ID = 'tarp-beak';

/** One beak half (a mirrored pair per beaked end): panel-end and ridge edges seamed, the outer edge hemmed, the ridge tie-out patch at the tip. */
function buildBeak(r: ResolvedInputs, g: PanelGeometry): Piece {
  const eid = makeEdgeIdGen(BEAK_ID);
  const end = r.width / 2;
  const { finished, cut } = beakCut(r.beak_length, end, r.seam_allowance, r.hem_allowance);
  const dx = -Math.min(...cut.map((p) => p.x)), dy = -Math.min(...cut.map((p) => p.y));
  const mv = (p: Point) => ({ x: p.x + dx, y: p.y + dy });
  const [T, R, E] = finished.map(mv);
  const C = cut.map(mv);
  const outline: Path = { id: `${BEAK_ID}-outline`, closed: true, edges: C.map((p, i) => seg(eid, 'cut', p, C[(i + 1) % 3])) };
  const L = Math.hypot(r.beak_length, end);
  const paths: Path[] = [
    outline,
    polyline(eid, `${BEAK_ID}-ridge-seam`, [T, R], 'stitch', `Ridge seam — to the other beak half, ${fmtIn(r.seam_allowance)}" in, felled like the ridge`),
    polyline(eid, `${BEAK_ID}-end-seam`, [R, E], 'stitch', 'Panel seam — to the panel end'),
    ...hemLines({ hem: g.hem, finished: [T, E], outward: { x: -end / L, y: r.beak_length / L }, idPrefix: `${BEAK_ID}-outer`, eid, name: 'Beak outer hem' }).paths,
  ];
  if (r.ridge_tieouts && r.patch_size > 0) {
    // The tip patch straddles the ridge seam like the ridge patches: half on each beak half.
    const p = r.patch_size;
    paths.push(rectPath(eid, `${BEAK_ID}-tip-patch`, T.x, T.y, T.x + p, T.y + p / 2, 'stitch', `Tip tie-out patch — the ridge-end tie-out moves here`));
  }
  return {
    id: BEAK_ID, name: 'Beak half', mirror: true, quantity: (r.beak_ends[0] ? 1 : 0) + (r.beak_ends[1] ? 1 : 0), materialId: FABRIC_ID, paths, seamAllowances: zeroSa(outline),
    annotations: [{ kind: 'label', label: `Beak half — ${fmtIn(r.beak_length)}" reach past the end, ${fmtIn(end)}" panel end; allowances and hem included; cut a mirrored pair per beaked end`, point: { x: (T.x + R.x + E.x) / 3, y: (T.y + R.y + E.y) / 3 } }],
  };
}

/** One door half (cut as a mirrored pair per closed end): hemmed on all three edges, the cut outline the finished triangle offset by the hem allowance. */
function buildDoor(r: ResolvedInputs, g: PanelGeometry): Piece {
  const eid = makeEdgeIdGen(DOOR_ID);
  const { finished, cut } = doorCut(r.door_base, r.door_height, r.hem_allowance);
  const dx = -Math.min(...cut.map((p) => p.x)), dy = -Math.min(...cut.map((p) => p.y));
  const mv = (p: Point) => ({ x: p.x + dx, y: p.y + dy });
  const F = finished.map(mv), C = cut.map(mv);
  const outline: Path = { id: `${DOOR_ID}-outline`, closed: true, edges: C.map((p, i) => seg(eid, 'cut', p, C[(i + 1) % 3])) };
  const paths: Path[] = [outline];
  // Hem each edge: the finished edge, moved outward to the raw edge (outward normal of each finished edge).
  const names = ['Door centre hem (zipper)', 'Door ground hem', 'Door hem along the panel end'];
  for (let i = 0; i < 3; i++) {
    const a = F[i], b = F[(i + 1) % 3];
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    // Finished triangle runs apex → ground-centre → ground-out, clockwise on screen, so (dy, -dx) points out.
    const out = { x: -(b.y - a.y) / L, y: (b.x - a.x) / L };
    paths.push(...hemLines({ hem: g.hem, finished: [a, b], outward: out, idPrefix: `${DOOR_ID}-e${i}`, eid, name: names[i] }).paths);
  }
  return {
    id: DOOR_ID, name: 'Door half', mirror: true, quantity: r.door_ends, materialId: FABRIC_ID, paths, seamAllowances: zeroSa(outline),
    annotations: [
      { kind: 'grain', label: 'grain down the centre edge', point: { x: F[0].x + 60, y: (F[0].y + F[1].y) / 2 }, angle: 90 },
      { kind: 'label', label: `Door half — ${fmtIn(r.door_height)}" centre, ${fmtIn(r.door_base)}" ground, ${fmtIn(r.width / 2)}" along the panel end (finished); hems included; cut ${r.door_ends === 2 ? '2 pairs' : '1 pair'}, mirrored`, point: { x: F[1].x + r.door_base / 3, y: F[1].y - r.door_height / 4 } },
    ],
  };
}

function strip(id: string, name: string, w: number, h: number, quantity: number, materialId: string, label: string): Piece {
  const eid = makeEdgeIdGen(id);
  const outline = rectPath(eid, `${id}-outline`, 0, 0, w, h, 'cut');
  return { id, name, mirror: false, quantity, materialId, paths: [outline], seamAllowances: zeroSa(outline), annotations: [{ kind: 'label', label, point: { x: w / 2, y: h / 2 } }] };
}

/** The end cut's marking stations, as a sentence (empty on straight ends). */
function endStationText(r: ResolvedInputs): string {
  if (!(r.end_sag > 0)) return '';
  const c = catenary(r.end_span, r.end_sag);
  if (!c.ok) return '';
  const st = [1, 2, 3, 4].map((i) => { const t = (r.end_span * i) / 8; return `${fmtIn(t)}": ${fmtIn(c.value.depth(t))}"`; });
  return `Each end is cut too, ${fmtIn(r.end_sag)}" in at the middle of every ${fmtIn(r.end_span)}" ridge-to-eave edge${r.construction === 'single_panel' ? ' (two curves per end, meeting at the ridge line)' : ''}, measured in from the straight end from the corner: ${st.join('; ')}.`;
}

/** Offsets of each cat cut from its straight chord at eighth stations, for marking the curve on the cloth. */
export function catCutStations(r: ResolvedInputs): { t: number; ridge: number; eave: number }[] {
  const d = depths(r);
  return Array.from({ length: 9 }, (_, i) => { const t = (r.ridge_length * i) / 8; return { t, ridge: d.ridge(t), eave: d.eave(t) }; });
}

function buildSteps(r: ResolvedInputs, g: PanelGeometry): Step[] {
  const two = r.panel_count === 2;
  const hemWord = r.hem_fold === 'double'
    ? `roll it: turn the raw edge under ${fmtIn(r.hem_depth)}", then again on the ${fmtIn(r.hem_mark)}" mark`
    : `mark ${fmtIn(r.hem_mark)}" in from the raw edge (double the ${fmtIn(r.hem_depth)}" hem) and fold the raw edge to the mark`;
  const steps: Step[] = [
    { id: 'tarp.cut', title: 'Cut the panels', body: `${two ? 'Two panels' : 'One panel'}, each ${dim(g.cutLength)} × ${dim(g.cutWidth)} — ${two ? 'the ridge seam allowance and the hems are' : 'the hems are'} included in the cut. Lay ${two ? 'them end to end' : 'it'} along the roll so the grain runs along the ridge: ${dim(r.fabric_length)} (${fmtFt(r.fabric_length)}) of ${fmtIn(r.fabric_width)}" fabric. Sewn fabric only (silnylon, silpoly); this pattern has no taped or bonded option.`, dependsOn: [], refsPieces: [PANEL_ID], group: 'Cut' },
  ];
  if (r.cut_style === 'cat_cut' && (r.ridge_sag > 0 || r.eave_sag > 0 || r.end_sag > 0)) {
    const st = catCutStations(r).slice(1, 5);
    const parts = st.map((s) => `${fmtIn(s.t)}": ${[r.ridge_sag > 0 ? `ridge ${fmtIn(s.ridge)}"` : null, r.eave_sag > 0 ? `eave ${fmtIn(s.eave)}"` : null].filter(Boolean).join(', ')}`);
    steps.push({ id: 'tarp.cat-cut', title: 'Mark the cat-cut curves', body: `Before cutting, draw the straight edge, then measure in from it at each station (from either end; the curve is symmetric) and join the marks with a long batten: ${parts.join('; ')}. The curve is a catenary: ${r.ridge_sag > 0 ? `the ridge goes ${fmtIn(r.ridge_sag)}" in at mid-span` : ''}${r.ridge_sag > 0 && r.eave_sag > 0 ? ', ' : ''}${r.eave_sag > 0 ? `each eave ${fmtIn(r.eave_sag)}"` : ''}. ${endStationText(r)} Inside the end hems the curve is mirrored so the hem folds flat. Cut the outer line, which already includes the allowances.`, dependsOn: ['tarp.cut'], refsPieces: [PANEL_ID], group: 'Cut' });
  }
  const afterCut = steps[steps.length - 1].id;
  if (two) {
    steps.push({ id: 'tarp.ridge', title: 'Sew the ridge seam — flat-felled', body: `Right sides together, raw ridge edges matched, stitch ${fmtIn(r.seam_allowance)}" in along the marked line${r.ridge_sag > 0 ? ' (it follows the cat cut)' : ''}, the full cut length. Trim one allowance to half, fold the other over it, press both to one side and topstitch through every layer. Every row of stitches is a row of needle holes: seal it later.`, dependsOn: [afterCut], refsPieces: [PANEL_ID], group: 'Ridge' });
  }
  const before = two ? 'tarp.ridge' : afterCut;
  steps.push(
    { id: 'tarp.ends', title: r.beak_ends[0] && r.beak_ends[1] ? 'Ends: left for the beaks' : r.beak_ends[0] ? 'Hem the far end' : 'Hem both ends', body: `${r.beak_ends[0] && r.beak_ends[1] ? 'Both ends take a beak, so they are not hemmed: the beak seam finishes them.' : `On ${r.beak_ends[0] ? 'the end without a beak' : 'each end'}, ${hemWord}, then stitch.`} Hem the ends before the eaves so the eave hem folds over the end hem at each corner.${two ? ' Fold the felled ridge seam into the hem with it.' : ''}`, dependsOn: [before], refsPieces: [PANEL_ID], group: 'Hems' },
    { id: 'tarp.eaves', title: two ? 'Hem the eaves' : 'Hem both eaves', body: `Along each eave, ${hemWord}, then stitch.${r.eave_sag > 0 ? ' The eave is curved: ease the hem round it rather than pulling it straight.' : ''}`, dependsOn: ['tarp.ends'], refsPieces: [PANEL_ID], group: 'Hems' },
  );
  if (r.tieout_count > 0) {
    steps.push({ id: 'tarp.tieouts', title: 'Tie-outs: patch, loop, box-X', body: `${r.tieout_count} tie-outs: four corners${r.eave_tieouts > 0 ? `, ${r.eave_tieouts} along each eave` : ''}${r.ridge_tieouts ? ', and both ridge ends' : ''}${r.pullouts ? `, and a pull-out in the middle of each ${two ? 'panel' : 'side'}` : ''}. At each one fold a ${fmtIn(r.loop_length)}" length of ${fmtIn(r.loop_width)}" grosgrain in half, set its ends under a ${fmtIn(r.patch_size)}" patch on the inside face at the marked square${r.ridge_tieouts && two ? ' (the ridge patches straddle the felled seam)' : ''}, and box-X through patch, loop and panel.${r.pullouts ? ' A pull-out is away from any edge: put its patch on the inside face, sew the loop flat on the outside face over it so it lies along the panel, and box-X through all of them. It lifts the panel off a sleeper; it holds no structure.' : ''}`, dependsOn: ['tarp.eaves'], refsPieces: [PANEL_ID, PATCH_ID, LOOP_ID], group: 'Tie-outs' });
  }
  if (r.guylines && r.tieout_count > 0) {
    steps.push({ id: 'tarp.guylines', title: 'Guylines', body: `Cut ${r.tieout_count} guylines of ${fmtIn(r.guyline_length)}" (${dim(r.tieout_count * r.guyline_length)} of cord in all) and melt or whip the ends. Tie one to each loop with a bowline${r.line_locks ? ' and thread the free end through a line-lock, so it tensions at the stake' : '; tension each at the stake with a taut-line hitch'}. The ridge-end lines carry the pitch: guy them out along the ridgeline.`, dependsOn: ['tarp.tieouts'], refsPieces: [LOOP_ID], group: 'Tie-outs' });
  }
  if (r.beaks !== 'none') {
    const n = (r.beak_ends[0] ? 1 : 0) + (r.beak_ends[1] ? 1 : 0);
    steps.push({ id: 'tarp.beaks', title: n === 2 ? 'Beaks on both ends' : 'A beak on one end', body: `Cut ${n === 2 ? 'two mirrored pairs' : 'one mirrored pair'} of beak halves (allowances and hem included). Hem each outer edge, sew each pair together along its ridge edge (felled, like the ridge seam${two ? ', meeting the ridge seam at the end' : ''}), then sew the joined beak to the ${n === 2 ? 'panel ends' : 'panel end'} on the beak seam line, ${fmtIn(r.seam_allowance)}" in, ridge to ridge. The ridge-end tie-out goes at the beak tip: stake the tip down ${fmtIn(r.beak_length)}" past the end to close it in.`, dependsOn: [steps[steps.length - 1].id], refsPieces: [BEAK_ID, PANEL_ID], group: 'Beaks' });
  }
  if (r.door_ends > 0) {
    steps.push({ id: 'tarp.doors', title: r.door_ends === 2 ? 'Doors on both ends' : 'Doors on one end', body: `Cut ${r.door_ends === 2 ? 'two mirrored pairs' : 'one mirrored pair'} of door halves (hems included) and hem all three edges of each the same way as the tarp. Each half is sized to the pitch check: ${fmtIn(r.door_height)}" down the middle (the ridgeline height), ${fmtIn(r.door_base)}" along the ground, ${fmtIn(r.width / 2)}" along the panel end. Sew a ${dim(r.door_height)} separating zipper (slider at the top) between the two centre edges, then lap each half's long edge over its panel's finished end hem and topstitch it through both hems${two ? ', the felled ridge seam meeting the top of the zipper' : ', the halves meeting at the ridge line'}. A different ridgeline height pitches the end at a different angle: the doors then hang slack or pull, so recut them for the pitch you use.`, dependsOn: [steps[steps.length - 1].id], refsPieces: [DOOR_ID, PANEL_ID], group: 'Doors' });
  }
  const last = steps[steps.length - 1].id;
  steps.push(
    { id: 'tarp.seal', title: 'Seal the stitching', body: `Seal ${two ? 'the ridge seam and ' : ''}every tie-out's stitching on the outside face with a sealer made for the fabric (silicone sealer for silnylon). Let it cure flat.`, dependsOn: [last], refsPieces: [PANEL_ID], group: 'Finish' },
    { id: 'tarp.pitch', title: 'Pitch it before you rely on it', body: r.footprint_width > 0
      ? `On a ${fmtIn(r.ridge_height)}" ridgeline with the eaves staked to the ground the panels sit at ${r.pitch_deg.toFixed(0)}° and the footprint is ${fmtIn(r.footprint_width)}" across. Check that the cat-cut edges come taut without wrinkles; write down what you see, because every number in this pattern is a placeholder until it is checked against the vault.`
      : `A ${fmtIn(r.ridge_height)}" ridgeline is higher than the panel is wide, so the eaves hang ${fmtIn(r.eave_clearance)}" off the ground: guy them out. Write down what you see; every number in this pattern is a placeholder until it is checked against the vault.`, dependsOn: ['tarp.seal'], refsPieces: [PANEL_ID], group: 'Finish' },
  );
  return steps;
}

/**
 * Every placeholder the user has not entered, as ONE note (the LBV's pattern):
 * a stack of identical yellow warnings only teaches the user to ignore them.
 */
function mockDerived(inputs: TarpInputs, r: ResolvedInputs): GeneratorWarning[] {
  const unit = r.units === 'in' ? (mm: number) => `${(mm / IN).toFixed(3).replace(/\.?0+$/, '')}"` : (mm: number) => `${Math.round(mm * 10) / 10} mm`;
  const applies = (f: keyof TarpInputs) => {
    if (f === 'ridge_sag') return r.cut_style === 'cat_cut' && r.construction === 'ridge_seam';
    if (f === 'eave_sag') return r.cut_style === 'cat_cut';
    if (f === 'seam_allowance') return r.construction === 'ridge_seam' || r.beaks !== 'none';
    if (f === 'beak_length') return r.beaks !== 'none';
    if (f === 'patch_size' || f === 'loop_length' || f === 'loop_width') return r.tieout_count > 0;
    if (f === 'guyline_length') return r.guylines && r.tieout_count > 0;
    if (f === 'end_sag') return r.end_sag > 0;
    return true;
  };
  const open = PLACEHOLDERS.filter((p) => applies(p.field) && (inputs[p.field] === undefined || inputs[p.field] === null));
  if (open.length === 0) return [];
  const show = (p: (typeof PLACEHOLDERS)[number]) => (p.kind === 'count' ? String(p.mm) : p.kind === 'mm' ? `${p.mm.toFixed(1)} mm` : unit(p.mm));
  return [{
    id: 'mock-derived', severity: 'info', field: open[0].field,
    message: `[mock-derived] ${open.length} placeholder${open.length === 1 ? '' : 's'} with no vault source ${open.length === 1 ? 'is' : 'are'} in use: ${open.map((p) => `${p.label} ${show(p)}`).join('; ')}. The vault's shelter notes were not available when this pattern was built, so check each one against the vault or a pitched mock-up, then enter it.`,
  }];
}

function buildWarnings(inputs: TarpInputs, r: ResolvedInputs): GeneratorWarning[] {
  const w = mockDerived(inputs, r);
  if (r.eave_clearance > 0) w.push({ id: 'eaves-off-ground', severity: 'warning', field: 'ridge_height', message: `The ridgeline (${fmtIn(r.ridge_height)}") is higher than the panel is wide (${fmtIn(r.width / 2)}"), so the eaves cannot reach the ground: they hang ${fmtIn(r.eave_clearance)}" up. Lower the ridgeline, widen the tarp or plan on guylines.` });
  if (r.hem_raised) w.push({ id: 'hem-raised', severity: 'info', field: 'hem_depth', message: `Production mode raised the ${fmtIn(r.hem_depth_requested)}" hem to ${fmtIn(r.hem_depth)}"; the cut grew to match.` });
  if (r.construction === 'single_panel' && r.cut_style === 'cat_cut' && inputs.ridge_sag !== undefined && inputs.ridge_sag !== null && inputs.ridge_sag !== 0) w.push({ id: 'ridge-sag-ignored', severity: 'info', field: 'ridge_sag', message: 'A single panel has no ridge seam to cut a curve into, so the ridge cat cut is ignored.' });
  return w;
}

export function buildPattern(inputs: TarpInputs): Result<TarpBuildResult> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  const r = resolveInputs(inputs);
  const g = panelGeometry(r);
  const ties = tieOuts(r, g);
  const pieces: Piece[] = [buildPanel(r, g, ties)];
  if (r.patch_size > 0 && r.tieout_count > 0) pieces.push(strip(PATCH_ID, 'Tie-out patch', r.patch_size, r.patch_size, r.tieout_count, FABRIC_ID, `Patch ${fmtIn(r.patch_size)}" square — ${r.tieout_count}, one per tie-out`));
  if (r.tieout_count > 0) pieces.push(strip(LOOP_ID, 'Grosgrain tie-out loop', r.loop_length, r.loop_width, r.tieout_count, GROSGRAIN_ID, `Loop ${fmtIn(r.loop_width)} × ${fmtIn(r.loop_length)}", folded in half`));
  if (r.door_ends > 0) pieces.push(buildDoor(r, g));
  if (r.beaks !== 'none') pieces.push(buildBeak(r, g));
  const hardware: HardwareItem[] = [{ id: 'seam-sealer', name: 'Seam sealer for the fabric', quantity: 1, notes: 'Silicone sealer for silnylon; ridge seam and tie-outs' }];
  if (r.door_ends > 0) hardware.push({ id: 'door-zipper', name: 'Separating zipper for the door', quantity: r.door_ends, notes: `${dim(r.door_height)} each, the ridgeline height; slider at the top` });
  if (r.guylines && r.tieout_count > 0) {
    hardware.push({ id: 'guyline', name: 'Guyline', quantity: r.tieout_count, notes: `${fmtIn(r.guyline_length)}" of cord each (mock-derived), ${dim(r.tieout_count * r.guyline_length)} in all` });
    if (r.line_locks) hardware.push({ id: 'line-lock', name: 'Line-lock tensioner', quantity: r.tieout_count, notes: 'one per guyline, sized to the cord' });
    hardware.push({ id: 'stake', name: 'Stake', quantity: r.tieout_count, notes: 'one per guyline' });
  }
  assignAssemblies(pieces, [[/panel|door|beak/, 'Canopy'], [/patch|loop/, 'Tie-outs']]);
  return { ok: true, value: { pieces, steps: buildSteps(r, g), warnings: buildWarnings(inputs, r), hardware, resolved: r, tieouts: ties } };
}
