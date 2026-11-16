/**
 * 3D check for the tarp: the two panels pitched as an A-frame from the
 * ridgeline, sewn along the ridge stitch line (the cat-cut curve, one seam
 * per segment), held at every tie-out (the stakes) and at the ridge ends,
 * then hung by gravity. A single panel is folded over the ridgeline at its
 * ridge line instead (no seam), held the same way.
 *
 * Flat frame → world: flat +y points down the slope. Rotating a panel about
 * its own x axis by ±(90° − pitch) leans it out to either side of the ridge.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import { makeEdgeIdGen, type Edge } from '../../lib/pattern-engine/graph/Edge.js';
import { hemLines } from '../../lib/pattern-engine/primitives/hem.js';
import { mirrorPieceX, type PiecePlacement } from '../../lib/fold-engine/index.js';
import type { SeamSpec, PinSpec, Vec3 } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs, TieOut } from './types.js';
import { PANEL_ID, FABRIC_ID, panelGeometry, tieOuts, type PanelGeometry } from './buildPattern.js';

export const PANEL_B_ID = 'tarp-panel-b';
/** Steepest pitch the check will draw; a ridge above the eaves would otherwise stand both panels on top of each other. */
const MAX_PITCH_DEG = 70;
/** Smallest held square at a tie-out, mm, so a pin always catches mesh vertices. */
const MIN_PIN_MM = 40;

export interface TarpAssembly {
  pieces: Piece[];
  placements: Record<string, PiecePlacement>;
  seams: SeamSpec[];
  pins: PinSpec[];
  gravity: Vec3;
  pitchDeg: number;
  /** The check in words (the padded strap's fit report is the model). */
  report: string[];
}

const IN = 25.4;
const fmtIn = (mm: number) => (mm / IN).toFixed(1).replace(/\.0$/, '');

function pinOf(pieceId: string, t: TieOut): PinSpec {
  let { x0, y0, x1, y1 } = t.patch;
  const grow = (lo: number, hi: number) => { const m = (lo + hi) / 2, h = Math.max(hi - lo, MIN_PIN_MM) / 2; return [m - h, m + h]; };
  [x0, x1] = grow(x0, x1);
  [y0, y1] = grow(y0, y1);
  // A ridge tie-out also holds the seam allowance above it.
  if (t.kind === 'ridge') y0 = Math.min(y0, 0);
  return { pieceId, rect: { x0, y0, x1, y1 } };
}

function pitchReport(r: ResolvedInputs, pitchDeg: number): string[] {
  const report: string[] = [];
  if (r.footprint_width > 0) {
    report.push(`On a ${fmtIn(r.ridge_height)}" ridgeline with the eaves staked to the ground, the panels sit at ${r.pitch_deg.toFixed(0)}° and cover a footprint ${fmtIn(r.footprint_width)}" across by ${fmtIn(r.ridge_length)}" along the ridge.`);
  } else {
    report.push(`The ${fmtIn(r.ridge_height)}" ridgeline is above the ${fmtIn(r.width / 2)}" panel, so the eaves hang ${fmtIn(r.eave_clearance)}" off the ground; the check draws the panels at ${pitchDeg}°.`);
  }
  if (r.cut_style === 'cat_cut') {
    report.push(r.construction === 'ridge_seam'
      ? `Cat cuts: ridge ${fmtIn(r.ridge_sag)}", eaves ${fmtIn(r.eave_sag)}" at mid-span; the panel is ${fmtIn(r.panel_mid_width)}" deep there against ${fmtIn(r.panel_finished_width)}" at the ends.`
      : `Cat cuts: eaves ${fmtIn(r.eave_sag)}" at mid-span; the panel is ${fmtIn(r.panel_mid_width)}" across there against ${fmtIn(r.panel_finished_width)}" at the ends.`);
  }
  return report;
}

/**
 * One panel folded over the ridgeline. A rigid hinge across the end hems cannot be folded
 * consistently (a 180° hem and an oblique ridge fold do not commute, so half of each end hem
 * flips the wrong way), so the 3D check splits the panel at its ridge reference line into two
 * halves and joins them there with a zero-allowance seam: the same A-frame as two panels, with
 * the fold standing in for the felled seam. The panel is symmetric about the ridge line, so
 * the second half is the first mirrored. The exported pattern is not touched (one piece, a (0°)
 * ridge reference line).
 */
function halfPanel(g: PanelGeometry): Piece {
  const eid = makeEdgeIdGen(PANEL_ID);
  const y0 = g.ridgeY!;
  const W = g.cutLength;
  const xs = g.xs;
  const ring: Point[] = [{ x: 0, y: 0 }, { x: W, y: 0 }, ...[...xs].reverse().map((x) => ({ x, y: g.bottomCut(x) - y0 }))];
  const edges: Edge[] = ring.map((pt, i) => ({ kind: 'straight', id: eid(), role: 'cut', start: pt, end: ring[(i + 1) % ring.length] }));
  const outline: Path = { id: `${PANEL_ID}-outline`, closed: true, edges };
  const depth = g.bottomCut(0) - y0;
  const [xa, xb] = g.endX;
  const paths: Path[] = [
    outline,
    ...hemLines({ hem: g.hem, finished: xs.map((x) => ({ x, y: g.bottom(x) - y0 })), outward: { x: 0, y: 1 }, idPrefix: `${PANEL_ID}-eave`, eid, name: 'Eave hem' }).paths,
    ...hemLines({ hem: g.hem, finished: [{ x: xa, y: 0 }, { x: xa, y: depth }], outward: { x: -1, y: 0 }, idPrefix: `${PANEL_ID}-end-0`, eid, name: 'End hem' }).paths,
    ...hemLines({ hem: g.hem, finished: [{ x: xb, y: 0 }, { x: xb, y: depth }], outward: { x: 1, y: 0 }, idPrefix: `${PANEL_ID}-end-1`, eid, name: 'End hem' }).paths,
  ];
  const seamAllowances: Record<string, number> = {};
  for (const e of edges) seamAllowances[e.id] = 0;
  const mid = { x: W / 2, y: (g.bottom(W / 2) - y0) / 2 };
  return {
    id: PANEL_ID, name: 'Panel (half to the first eave)', mirror: false, quantity: 1, materialId: FABRIC_ID,
    paths, seamAllowances, annotations: [{ kind: 'label', label: 'Panel half', point: mid }],
  };
}

function singlePanelAssembly(r: ResolvedInputs): TarpAssembly {
  const g = panelGeometry(r);
  const ties = tieOuts(r, g);
  const pitchDeg = Math.min(r.pitch_deg, MAX_PITCH_DEG);
  const lean = 90 - pitchDeg;
  const yR = g.ridgeY!;
  const a = halfPanel(g);
  const b = mirrorPieceX(a, PANEL_B_ID, 'Panel (half to the second eave)');
  const placements: Record<string, PiecePlacement> = {
    [PANEL_ID]: { keep: true, rx: lean },
    [PANEL_B_ID]: { keep: true, rx: -lean },
  };
  const seams: SeamSpec[] = [];
  for (let i = 1; i < g.xs.length; i++) {
    const p0 = { x: g.xs[i - 1], y: 0 };
    const p1 = { x: g.xs[i], y: 0 };
    seams.push({ label: `ridge fold ${i}`, a: { pieceId: PANEL_ID, from: p0, to: p1 }, b: { pieceId: PANEL_B_ID, from: p0, to: p1 } });
  }
  // Tie-outs into each half's frame: the first eave's below the ridge line, the second eave's
  // reflected about it, ridge ends on both halves. Flat x is the same on both halves (the
  // panel is symmetric end to end, as on the two-panel tarp).
  const onA = (t: TieOut): TieOut => ({ ...t, patch: { x0: t.patch.x0, x1: t.patch.x1, y0: Math.max(0, t.patch.y0 - yR), y1: t.patch.y1 - yR } });
  const onB = (t: TieOut): TieOut => ({ ...t, patch: { x0: t.patch.x0, x1: t.patch.x1, y0: Math.max(0, yR - t.patch.y1), y1: yR - t.patch.y0 } });
  const pins: PinSpec[] = [];
  for (const t of ties) {
    if (t.kind === 'ridge') { pins.push(pinOf(PANEL_ID, onA(t))); pins.push(pinOf(PANEL_B_ID, onB(t))); }
    else if (t.id.startsWith('eave2')) pins.push(pinOf(PANEL_B_ID, onB(t)));
    else pins.push(pinOf(PANEL_ID, onA(t)));
  }
  const report = pitchReport(r, pitchDeg);
  report.push('One panel folded over the ridgeline, no ridge seam (the check joins the two halves at the ridge line). Held at every tie-out on both eaves and at both ridge ends.');
  return { pieces: [a, b], placements, seams, pins, gravity: [0, -0.01, 0], pitchDeg, report };
}

export function tarpAssembly(pieces: Piece[], r: ResolvedInputs): TarpAssembly | null {
  const panel = pieces.find((p) => p.id === PANEL_ID);
  if (!panel) return null;
  if (r.construction === 'single_panel') return singlePanelAssembly(r);
  const g = panelGeometry(r);
  const ties = tieOuts(r, g);
  const pitchDeg = Math.min(r.pitch_deg, MAX_PITCH_DEG);
  const a: Piece = { ...panel, quantity: 1, name: 'Panel' };
  const b = mirrorPieceX(a, PANEL_B_ID, 'Panel (second)');
  const lean = 90 - pitchDeg;
  // Rotation only: both panels hinge on the ridge at the origin. The viewer and the
  // cloth harness both honour a rotation-only placement (`isScenePlaced`).
  const placements: Record<string, PiecePlacement> = {
    [PANEL_ID]: { keep: true, rx: lean },
    [PANEL_B_ID]: { keep: true, rx: -lean },
  };
  const seams: SeamSpec[] = [];
  for (let i = 1; i < g.xs.length; i++) {
    const p0 = { x: g.xs[i - 1], y: g.top(g.xs[i - 1]) };
    const p1 = { x: g.xs[i], y: g.top(g.xs[i]) };
    // The panel is symmetric end to end, so the mirrored copy's stitch line is the same flat line.
    seams.push({ label: `ridge ${i}`, a: { pieceId: PANEL_ID, from: p0, to: p1 }, b: { pieceId: PANEL_B_ID, from: p0, to: p1 } });
  }
  const pins: PinSpec[] = [];
  for (const t of ties) {
    pins.push(pinOf(PANEL_ID, t));
    pins.push(pinOf(PANEL_B_ID, t));
  }
  const report = pitchReport(r, pitchDeg);
  report.push('Held at every tie-out and at both ridge ends; the ridge between them hangs from the seam alone, as it does on a sagging ridgeline.');
  return { pieces: [a, b], placements, seams, pins, gravity: [0, -0.01, 0], pitchDeg, report };
}
