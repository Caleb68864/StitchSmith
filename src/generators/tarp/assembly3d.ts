/**
 * 3D check for the tarp: the two panels pitched as an A-frame from the
 * ridgeline, sewn along the ridge stitch line (the cat-cut curve, one seam
 * per segment), held at every tie-out (the stakes) and at the ridge ends,
 * then hung by gravity. The single-panel construction is not assembled.
 *
 * Flat frame → world: flat +y points down the slope. Rotating a panel about
 * its own x axis by ±(90° − pitch) leans it out to either side of the ridge.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import { mirrorPieceX, type PiecePlacement } from '../../lib/fold-engine/index.js';
import type { SeamSpec, PinSpec, Vec3 } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs, TieOut } from './types.js';
import { PANEL_ID, panelGeometry, tieOuts } from './buildPattern.js';

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

export function tarpAssembly(pieces: Piece[], r: ResolvedInputs): TarpAssembly | null {
  const panel = pieces.find((p) => p.id === PANEL_ID);
  if (!panel || r.construction !== 'ridge_seam') return null;
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
  const report: string[] = [];
  if (r.footprint_width > 0) {
    report.push(`On a ${fmtIn(r.ridge_height)}" ridgeline with the eaves staked to the ground, the panels sit at ${r.pitch_deg.toFixed(0)}° and cover a footprint ${fmtIn(r.footprint_width)}" across by ${fmtIn(r.ridge_length)}" along the ridge.`);
  } else {
    report.push(`The ${fmtIn(r.ridge_height)}" ridgeline is above the ${fmtIn(r.width / 2)}" panel, so the eaves hang ${fmtIn(r.eave_clearance)}" off the ground; the check draws the panels at ${pitchDeg}°.`);
  }
  if (r.cut_style === 'cat_cut') report.push(`Cat cuts: ridge ${fmtIn(r.ridge_sag)}", eaves ${fmtIn(r.eave_sag)}" at mid-span; the panel is ${fmtIn(r.panel_mid_width)}" deep there against ${fmtIn(r.panel_finished_width)}" at the ends.`);
  report.push('Held at every tie-out and at both ridge ends; the ridge between them hangs from the seam alone, as it does on a sagging ridgeline.');
  return { pieces: [a, b], placements, seams, pins, gravity: [0, -0.01, 0], pitchDeg, report };
}
