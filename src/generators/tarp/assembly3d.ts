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
import { mirrorPieceX, applyTransform, rotationAboutLine, type PiecePlacement } from '../../lib/fold-engine/index.js';
import { doorCut, beakCut } from './inputs.js';
import type { SeamSpec, PinSpec, Vec3 } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs, TieOut } from './types.js';
import { PANEL_ID, FABRIC_ID, DOOR_ID, BEAK_ID, panelGeometry, tieOuts, type PanelGeometry } from './buildPattern.js';

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
  // Pull-outs are guyed out, not fixed: the check does not pin them.
  const ties = tieOuts(r, g).filter((t) => t.kind !== 'pullout');
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
  const ties = tieOuts(r, g).filter((t) => t.kind !== 'pullout');
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
  const extra = endPieces(pieces, r, g, lean);
  seams.push(...extra.seams);
  pins.push(...extra.pins);
  Object.assign(placements, extra.placements);
  if (extra.report) report.push(extra.report);
  return { pieces: [a, b, ...extra.pieces], placements, seams, pins, gravity: [0, -0.01, 0], pitchDeg, report };
}

const DEG = Math.PI / 180;
/** The 3D check's pose for a staked beak: its ridge runs out from the panel end this far below horizontal (a check pose, not a sewing number). */
export const BEAK_STAKE_DEG = 30;
const BEAK_TIP_PIN_MM = 30;

/**
 * Doors and beaks on a ridge-seam tarp. Panel A leans to −z (rx = +lean), panel B to +z.
 *
 * Doors stand in the end plane: each half draped down a vertical line from the ridge end
 * (flat y down the centre edge, flat x out along ∓z), its long edge seamed to its panel's
 * end and the two centre edges (the zipper) to each other.
 *
 * Beaks are staked: each half hangs from its panel's end line with its ridge edge run out
 * and down at BEAK_STAKE_DEG in the centre plane (flat x along that line, flat y down the
 * panel end), so both halves' ridge edges start on the same line and their tips on the same
 * stake point. The tip is pinned there; the half is seamed to the panel end and the two
 * halves to each other along the ridge.
 */
function endPieces(pieces: Piece[], r: ResolvedInputs, g: PanelGeometry, lean: number): { pieces: Piece[]; placements: Record<string, PiecePlacement>; seams: SeamSpec[]; pins: PinSpec[]; report: string | null } {
  const out: Piece[] = [], placements: Record<string, PiecePlacement> = {}, seams: SeamSpec[] = [], pins: PinSpec[] = [];
  const s = r.seam_allowance, H = r.panel_finished_width;
  const ends: [0 | 1, number][] = [[0, g.endX[0]], [1, g.endX[1]]];
  const sides: [string, 1 | -1][] = [[PANEL_ID, 1], [PANEL_B_ID, -1]];
  // Flat panel point → 3D for a panel leaning by `sign · lean` (the same rotation the placement applies).
  const world = (sign: 1 | -1, p: Point): Vec3 => applyTransform(rotationAboutLine([0, 0, 0], [1, 0, 0], sign * lean * DEG), [p.x, -p.y, 0]);
  const door = pieces.find((p) => p.id === DOOR_ID);
  if (door && r.door_ends > 0) {
    const { finished, cut } = doorCut(r.door_base, r.door_height, r.hem_allowance);
    const dx = -Math.min(...cut.map((p) => p.x)), dy = -Math.min(...cut.map((p) => p.y));
    const [F0, F1, F2] = finished.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    ends.filter(([i]) => (r.door_ends === 2 ? true : i === 0)).forEach(([i, x]) => {
      const ridge = world(1, { x, y: s });
      const ids: string[] = [];
      for (const [panelId, sign] of sides) {
        const id = `${DOOR_ID}-${i}-${panelId === PANEL_ID ? 'a' : 'b'}`;
        ids.push(id);
        out.push({ ...door, id, name: `Door half (end ${i + 1}, ${panelId === PANEL_ID ? 'first' : 'second'} panel)`, quantity: 1, mirror: false });
        placements[id] = { keep: true, drape: { path: [[x, ridge[1] + F0.y, 0], [x, ridge[1] + F0.y - 2 * (r.door_height + 200), 0]], across: [0, 0, -sign], x0: F0.x } };
        // Long edge (apex → ground outer) to the panel's end line (ridge → eave).
        seams.push({ label: `${id} ↔ panel end`, a: { pieceId: id, from: F0, to: F2 }, b: { pieceId: panelId, from: { x, y: s }, to: { x, y: s + H } } });
      }
      seams.push({ label: `door ${i + 1} zipper`, a: { pieceId: ids[0], from: F0, to: F1 }, b: { pieceId: ids[1], from: F0, to: F1 } });
    });
  }
  const beak = pieces.find((p) => p.id === BEAK_ID);
  if (beak && r.beaks !== 'none') {
    const end = r.width / 2;
    const { finished, cut } = beakCut(r.beak_length, end, s, r.hem_allowance);
    const dx = -Math.min(...cut.map((p) => p.x)), dy = -Math.min(...cut.map((p) => p.y));
    const [T, R, E] = finished.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    ends.filter(([i]) => r.beak_ends[i]).forEach(([i, x]) => {
      const ids: string[] = [];
      const axis = (Math.min(...cut.map((p) => p.x + dx)) + Math.max(...cut.map((p) => p.x + dx))) / 2;
      const mx = (p: Point): Point => (i === 0 ? p : { x: 2 * axis - p.x, y: p.y });
      for (const [panelId, sign] of sides) {
        const id = `${BEAK_ID}-${i}-${panelId === PANEL_ID ? 'a' : 'b'}`;
        ids.push(id);
        // The far end's beak points the other way: the drawing mirrored.
        const piece = i === 0 ? { ...beak, id, quantity: 1, mirror: false } : mirrorPieceX(beak, id);
        const [rr, e] = [mx(R), mx(E)];
        out.push({ ...piece, name: `Beak half (end ${i + 1}, ${panelId === PANEL_ID ? 'first' : 'second'} panel)` });
        // Staked: flat x runs along the beak ridge, out from the panel end and down; flat y down the panel end.
        const R3 = world(sign, { x, y: s }), E3 = world(sign, { x, y: s + H });
        const out3: Vec3 = [i === 0 ? -Math.cos(BEAK_STAKE_DEG * DEG) : Math.cos(BEAK_STAKE_DEG * DEG), -Math.sin(BEAK_STAKE_DEG * DEG), 0];
        // Flat x grows toward the panel on end 0 (tip at small x) and toward the tip on end 1.
        const v: Vec3 = i === 0 ? [-out3[0], -out3[1], -out3[2]] : out3;
        const start: Vec3 = [R3[0] - rr.x * v[0], R3[1] - rr.x * v[1], R3[2] - rr.x * v[2]];
        const far = rr.x + 4 * (r.beak_length + 200);
        placements[id] = { keep: true, drape: { path: [start, [start[0] + far * v[0], start[1] + far * v[1], start[2] + far * v[2]]], across: [E3[0] - R3[0], E3[1] - R3[1], E3[2] - R3[2]], x0: rr.y, along: 'x' } };
        pins.push({ pieceId: id, point: mx(T), radius: BEAK_TIP_PIN_MM });
        seams.push({ label: `${id} ↔ panel end`, a: { pieceId: id, from: rr, to: e }, b: { pieceId: panelId, from: { x, y: s }, to: { x, y: s + H } } });
      }
      seams.push({ label: `beak ${i + 1} ridge`, a: { pieceId: ids[0], from: mx(T), to: mx(R) }, b: { pieceId: ids[1], from: mx(T), to: mx(R) } });
    });
  }
  const parts = [r.door_ends > 0 ? `${r.door_ends === 2 ? 'both ends closed by doors' : 'one end closed by a door'}` : null, r.beaks !== 'none' ? `${r.beaks === 'both_ends' ? 'beaks on both ends' : 'a beak on one end'} (each tip staked out and down at ${BEAK_STAKE_DEG}° below the ridge)` : null].filter(Boolean);
  return { pieces: out, placements, seams, pins, report: parts.length ? `Ends: ${parts.join('; ')}.` : null };
}
