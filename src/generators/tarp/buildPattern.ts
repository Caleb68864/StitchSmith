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
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import { catenary } from '../../lib/pattern-engine/geometry/catenary.js';
import { resolveHem, hemLines, type Hem } from '../../lib/pattern-engine/primitives/hem.js';
import type { TarpInputs, TarpBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError, HardwareItem, TieOut } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
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
  const u = (x: number) => { let t = x - e; if (t < 0) t = -t; if (t > L) t = 2 * L - t; return Math.min(L, Math.max(0, t)); };
  const d = depths(r);
  const xs: number[] = [];
  if (e > 0) xs.push(0);
  for (let i = 0; i <= CURVE_SEGMENTS; i++) xs.push(e + (L * i) / CURVE_SEGMENTS);
  if (e > 0) xs.push(L + 2 * e);
  if (r.construction === 'ridge_seam') {
    const s = r.seam_allowance;
    return {
      hem, endX: [e, e + L], xs,
      top: (x) => s + d.ridge(u(x)),
      topCut: (x) => d.ridge(u(x)),
      bottom: (x) => s + H - d.eave(u(x)),
      bottomCut: (x) => s + H - d.eave(u(x)) + e,
      cutLength: L + 2 * e,
      cutWidth: s + H + e,
    };
  }
  return {
    hem, endX: [e, e + L], xs,
    top: (x) => e + d.eave(u(x)),
    topCut: (x) => d.eave(u(x)),
    bottom: (x) => e + H - d.eave(u(x)),
    bottomCut: (x) => e + H - d.eave(u(x)) + e,
    ridgeY: e + H / 2,
    cutLength: L + 2 * e,
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
  if (r.ridge_tieouts) {
    if (r.construction === 'ridge_seam') {
      // The patch straddles the felled seam: half of it on each panel.
      const y = g.top(xa);
      out.push({ id: 'ridge-0', kind: 'ridge', at: { x: xa, y }, patch: { x0: xa, x1: xa + p, y0: y, y1: y + p / 2 } });
      out.push({ id: 'ridge-1', kind: 'ridge', at: { x: xb, y }, patch: { x0: xb - p, x1: xb, y0: y, y1: y + p / 2 } });
    } else {
      const y = g.ridgeY!;
      out.push({ id: 'ridge-0', kind: 'ridge', at: { x: xa, y }, patch: { x0: xa, x1: xa + p, y0: y - p / 2, y1: y + p / 2 } });
      out.push({ id: 'ridge-1', kind: 'ridge', at: { x: xb, y }, patch: { x0: xb - p, x1: xb, y0: y - p / 2, y1: y + p / 2 } });
    }
  }
  return out;
}

function buildPanel(r: ResolvedInputs, g: PanelGeometry, ties: TieOut[]): Piece {
  const eid = makeEdgeIdGen(PANEL_ID);
  const xs = g.xs;
  const W = g.cutLength;
  const topRaw = xs.map((x) => ({ x, y: g.topCut(x) }));
  const botRaw = xs.map((x) => ({ x, y: g.bottomCut(x) }));
  // Outline: top raw edge left → right, right end down, bottom raw edge right → left, left end up.
  const ring: Point[] = [...topRaw, ...[...botRaw].reverse()];
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
  // End hems: straight creases across the full cut width.
  const [xa, xb] = g.endX;
  paths.push(...hemLines({ hem: g.hem, finished: [{ x: xa, y: 0 }, { x: xa, y: g.cutWidth }], outward: { x: -1, y: 0 }, idPrefix: `${PANEL_ID}-end-0`, eid, name: 'End hem' }).paths);
  paths.push(...hemLines({ hem: g.hem, finished: [{ x: xb, y: 0 }, { x: xb, y: g.cutWidth }], outward: { x: 1, y: 0 }, idPrefix: `${PANEL_ID}-end-1`, eid, name: 'End hem' }).paths);

  if (r.construction === 'ridge_seam') {
    paths.push(polyline(eid, `${PANEL_ID}-ridge-stitch`, xs.map((x) => ({ x, y: g.top(x) })), 'stitch',
      `Ridge seam — flat-felled, stitched ${fmtIn(r.seam_allowance)}" in from the cut edge${r.ridge_sag > 0 ? `; cat cut ${fmtIn(r.ridge_sag)}" deep at mid-span` : ''}`));
  } else {
    paths.push(polyline(eid, `${PANEL_ID}-ridge-line`, [{ x: 0, y: g.ridgeY! }, { x: W, y: g.ridgeY! }], 'fold', 'Ridge line — lies over the ridgeline (0°)'));
  }
  // Tie-out patches: box-X through patch, loop and panel.
  if (r.patch_size > 0) {
    ties.forEach((t, i) => {
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

function strip(id: string, name: string, w: number, h: number, quantity: number, materialId: string, label: string): Piece {
  const eid = makeEdgeIdGen(id);
  const outline = rectPath(eid, `${id}-outline`, 0, 0, w, h, 'cut');
  return { id, name, mirror: false, quantity, materialId, paths: [outline], seamAllowances: zeroSa(outline), annotations: [{ kind: 'label', label, point: { x: w / 2, y: h / 2 } }] };
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
  if (r.cut_style === 'cat_cut' && (r.ridge_sag > 0 || r.eave_sag > 0)) {
    const st = catCutStations(r).slice(1, 5);
    const parts = st.map((s) => `${fmtIn(s.t)}": ${[r.ridge_sag > 0 ? `ridge ${fmtIn(s.ridge)}"` : null, r.eave_sag > 0 ? `eave ${fmtIn(s.eave)}"` : null].filter(Boolean).join(', ')}`);
    steps.push({ id: 'tarp.cat-cut', title: 'Mark the cat-cut curves', body: `Before cutting, draw the straight edge, then measure in from it at each station (from either end; the curve is symmetric) and join the marks with a long batten: ${parts.join('; ')}. The curve is a catenary: ${r.ridge_sag > 0 ? `the ridge goes ${fmtIn(r.ridge_sag)}" in at mid-span` : ''}${r.ridge_sag > 0 && r.eave_sag > 0 ? ', ' : ''}${r.eave_sag > 0 ? `each eave ${fmtIn(r.eave_sag)}"` : ''}. Inside the end hems the curve is mirrored so the hem folds flat. Cut the outer line, which already includes the allowances.`, dependsOn: ['tarp.cut'], refsPieces: [PANEL_ID], group: 'Cut' });
  }
  const afterCut = steps[steps.length - 1].id;
  if (two) {
    steps.push({ id: 'tarp.ridge', title: 'Sew the ridge seam — flat-felled', body: `Right sides together, raw ridge edges matched, stitch ${fmtIn(r.seam_allowance)}" in along the marked line${r.ridge_sag > 0 ? ' (it follows the cat cut)' : ''}, the full cut length. Trim one allowance to half, fold the other over it, press both to one side and topstitch through every layer. Every row of stitches is a row of needle holes: seal it later.`, dependsOn: [afterCut], refsPieces: [PANEL_ID], group: 'Ridge' });
  }
  const before = two ? 'tarp.ridge' : afterCut;
  steps.push(
    { id: 'tarp.ends', title: 'Hem both ends', body: `On each end, ${hemWord}, then stitch. Hem the ends before the eaves so the eave hem folds over the end hem at each corner.${two ? ' Fold the felled ridge seam into the hem with it.' : ''}`, dependsOn: [before], refsPieces: [PANEL_ID], group: 'Hems' },
    { id: 'tarp.eaves', title: two ? 'Hem the eaves' : 'Hem both eaves', body: `Along each eave, ${hemWord}, then stitch.${r.eave_sag > 0 ? ' The eave is curved: ease the hem round it rather than pulling it straight.' : ''}`, dependsOn: ['tarp.ends'], refsPieces: [PANEL_ID], group: 'Hems' },
  );
  if (r.tieout_count > 0) {
    steps.push({ id: 'tarp.tieouts', title: 'Tie-outs: patch, loop, box-X', body: `${r.tieout_count} tie-outs: four corners${r.eave_tieouts > 0 ? `, ${r.eave_tieouts} along each eave` : ''}${r.ridge_tieouts ? ', and both ridge ends' : ''}. At each one fold a ${fmtIn(r.loop_length)}" length of ${fmtIn(r.loop_width)}" grosgrain in half, set its ends under a ${fmtIn(r.patch_size)}" patch on the inside face at the marked square${r.ridge_tieouts && two ? ' (the ridge patches straddle the felled seam)' : ''}, and box-X through patch, loop and panel.`, dependsOn: ['tarp.eaves'], refsPieces: [PANEL_ID, PATCH_ID, LOOP_ID], group: 'Tie-outs' });
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
    if (f === 'seam_allowance') return r.construction === 'ridge_seam';
    if (f === 'patch_size' || f === 'loop_length' || f === 'loop_width') return r.tieout_count > 0;
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
  const hardware: HardwareItem[] = [{ id: 'seam-sealer', name: 'Seam sealer for the fabric', quantity: 1, notes: 'Silicone sealer for silnylon; ridge seam and tie-outs' }];
  return { ok: true, value: { pieces, steps: buildSteps(r, g), warnings: buildWarnings(inputs, r), hardware, resolved: r, tieouts: ties } };
}
