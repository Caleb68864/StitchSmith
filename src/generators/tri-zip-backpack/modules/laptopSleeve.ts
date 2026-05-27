import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult } from '../types.js';
import { laptopSleeveSteps } from '../steps.js';

function pt(x: number, y: number) { return { x, y }; }

// Clearance between the sleeve and the inside of the pack body. Enough to
// slide a 15" laptop into the sleeve when the pack is partially open.
const SLEEVE_BODY_CLEARANCE = 20; // mm per side
const SLEEVE_TOP_CLEARANCE = 30;  // mm above the sleeve so the zipper run clears
const SLEEVE_BOTTOM_CLEARANCE = 30; // mm below for impact protection
// Floor sizes: don't shrink below a usable 11" laptop opening.
const SLEEVE_MIN_WIDTH = 200;
const SLEEVE_MIN_HEIGHT = 240;
// Fixed depth — a single laptop is ~20-30 mm thick; one foam-padded gusset
// covers that range. Not derived from pack depth, which is the whole bag.
const SLEEVE_DEPTH_MM = 25;

function computeSleeveDimensions(packWidth: number, packHeight: number): { width: number; height: number; depth: number } {
  const width = Math.max(SLEEVE_MIN_WIDTH, packWidth - 2 * SLEEVE_BODY_CLEARANCE);
  const height = Math.max(SLEEVE_MIN_HEIGHT, packHeight - SLEEVE_TOP_CLEARANCE - SLEEVE_BOTTOM_CLEARANCE);
  return { width, height, depth: SLEEVE_DEPTH_MM };
}

export function buildLaptopSleeve(r: ResolvedInputs): ModuleResult {
  const { laptop_sleeve_attachment, hem_allowance } = r;

  if (laptop_sleeve_attachment === 'none') {
    return { pieces: [], steps: [] };
  }

  const dims = computeSleeveDimensions(r.width, r.height);
  const SLEEVE_WIDTH = dims.width;
  const SLEEVE_HEIGHT = dims.height;
  const sleeveDepth = dims.depth;

  const steps = laptopSleeveSteps();
  const pieces: Piece[] = [];

  // The panel's top edge (the laptop opening) folds under by hem_allowance.
  // Extend the panel's cut height by that amount and emit a fold line at the
  // body-top line.
  const panelHemmedHeight = SLEEVE_HEIGHT + hem_allowance;
  const panelEid = makeEdgeIdGen('laptop-sleeve-panel-outline');
  // Edges in CCW order so the engine's SA-offset math sees the right normals.
  // Top edge (e0) is the hem edge; capture its id for the hem-fold line ref.
  const topEdge: Edge = { kind: 'straight', id: panelEid(), role: 'cut', start: pt(0, 0), end: pt(SLEEVE_WIDTH, 0) };
  const segPanel = (sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: panelEid(), role: 'cut', start: pt(sx, sy), end: pt(ex, ey) });
  const panelPath: Path = {
    id: 'laptop-sleeve-panel-outline',
    edges: [
      topEdge,
      segPanel(SLEEVE_WIDTH, 0, SLEEVE_WIDTH, panelHemmedHeight),
      segPanel(SLEEVE_WIDTH, panelHemmedHeight, 0, panelHemmedHeight),
      segPanel(0, panelHemmedHeight, 0, 0),
    ],
    closed: true,
  };

  // Hem fold line: a dashed open path at y = hem_allowance.
  const hemFoldEid = makeEdgeIdGen('laptop-sleeve-panel-hem');
  const hemFoldPath: Path | null = hem_allowance > 0 ? {
    id: 'laptop-sleeve-panel-hem',
    edges: [{ kind: 'straight', id: hemFoldEid(), role: 'fold', start: pt(0, hem_allowance), end: pt(SLEEVE_WIDTH, hem_allowance) }],
    closed: false,
  } : null;

  const gussetEid = makeEdgeIdGen('laptop-sleeve-gusset-outline');
  const segGusset = (sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: gussetEid(), role: 'cut', start: pt(sx, sy), end: pt(ex, ey) });
  const gussetPath: Path = {
    id: 'laptop-sleeve-gusset-outline',
    edges: [
      segGusset(0, 0, sleeveDepth, 0),
      segGusset(sleeveDepth, 0, sleeveDepth, SLEEVE_HEIGHT * 2 + SLEEVE_WIDTH),
      segGusset(sleeveDepth, SLEEVE_HEIGHT * 2 + SLEEVE_WIDTH, 0, SLEEVE_HEIGHT * 2 + SLEEVE_WIDTH),
      segGusset(0, SLEEVE_HEIGHT * 2 + SLEEVE_WIDTH, 0, 0),
    ],
    closed: true,
  };

  const attachLabel = laptop_sleeve_attachment === 'seam-sewn'
    ? 'seam-sewn (internal)'
    : 'webbing-loop (removable)';

  // Front panel includes the body cut + the hem fold line.
  const frontPaths = hemFoldPath ? [panelPath, hemFoldPath] : [panelPath];
  pieces.push({
    id: 'laptop-sleeve-front',
    name: 'Laptop Sleeve Front',
    mirror: false,
    quantity: 1,
    paths: frontPaths,
    // SA carries the top edge as a hem (not a seam), so the SA outer cut line
    // accounts for the fold-under fabric.
    // Top edge is the hem (already included in the cut height); zero its SA
    // so the SA outer line doesn't add another offset beyond the hem.
    seamAllowances: { [topEdge.id]: 0 },
    annotations: [
      { kind: 'label', label: `Laptop Sleeve Front\n${SLEEVE_WIDTH}×${SLEEVE_HEIGHT} mm (+${hem_allowance} mm hem)\n${attachLabel}` },
    ],
  });

  // Back panel: same geometry, same hem treatment.
  const backEid = makeEdgeIdGen('laptop-sleeve-back-outline');
  const backEdges = panelPath.edges.map(e => ({ ...e, id: backEid() }));
  const backTopEdgeId = backEdges[0].id;
  const backHemFoldEid = makeEdgeIdGen('laptop-sleeve-back-hem');
  const backHemFoldPath: Path | null = hem_allowance > 0 ? {
    id: 'laptop-sleeve-back-hem',
    edges: [{ kind: 'straight', id: backHemFoldEid(), role: 'fold', start: pt(0, hem_allowance), end: pt(SLEEVE_WIDTH, hem_allowance) }],
    closed: false,
  } : null;
  pieces.push({
    id: 'laptop-sleeve-back',
    name: 'Laptop Sleeve Back',
    mirror: false,
    quantity: 1,
    paths: backHemFoldPath
      ? [{ id: 'laptop-sleeve-back-outline', edges: backEdges, closed: true }, backHemFoldPath]
      : [{ id: 'laptop-sleeve-back-outline', edges: backEdges, closed: true }],
    seamAllowances: { [backTopEdgeId]: 0 },
    annotations: [{ kind: 'label', label: `Laptop Sleeve Back\n${SLEEVE_WIDTH}×${SLEEVE_HEIGHT} mm (+${hem_allowance} mm hem)` }],
  });

  pieces.push({
    id: 'laptop-sleeve-gusset',
    name: 'Laptop Sleeve Gusset',
    mirror: false,
    quantity: 1,
    paths: [gussetPath],
    annotations: [{ kind: 'label', label: `Laptop Sleeve Gusset\n${sleeveDepth}×${SLEEVE_HEIGHT * 2 + SLEEVE_WIDTH} mm` }],
  });

  return { pieces, steps };
}
