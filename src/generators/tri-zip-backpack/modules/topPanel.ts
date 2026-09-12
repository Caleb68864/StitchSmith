import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult } from '../types.js';
import { topPanelSteps } from '../steps.js';

function pt(x: number, y: number) { return { x, y }; }

/** Shared seam id: each end of the perimeter gusset ↔ a short side of the top panel. */
export const TOP_GUSSET_END_SEAM_PATH_ID = 'seam:gusset-end-top';

/**
 * Top panel — closes the pack. The perimeter gusset runs bottom and sides only
 * and stops at the top corners; before this panel nothing joined the front and
 * back top edges (the 3D cloth check left the pack open). Finished width × depth:
 * the front and back top edges sew to its long sides, the gusset ends to its
 * short sides. The top handle attaches to it.
 */
export function buildTopPanel(r: ResolvedInputs): ModuleResult {
  const { width, depth } = r;
  const eid = makeEdgeIdGen('top-panel-outline');
  const seg = (sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: eid(), role: 'cut', start: pt(sx, sy), end: pt(ex, ey) });
  const outline: Path = {
    id: 'top-panel-outline',
    edges: [seg(0, 0, width, 0), seg(width, 0, width, depth), seg(width, depth, 0, depth), seg(0, depth, 0, 0)],
    closed: true,
  };
  const seamEid = makeEdgeIdGen(TOP_GUSSET_END_SEAM_PATH_ID);
  const endSeam: Path = {
    id: TOP_GUSSET_END_SEAM_PATH_ID,
    edges: [{ kind: 'straight', id: seamEid(), role: 'seam', start: pt(0, 0), end: pt(0, depth) }],
    closed: false,
  };
  const piece: Piece = {
    id: 'top-panel',
    name: 'Top Panel',
    mirror: false,
    quantity: 1,
    paths: [outline, endSeam],
    annotations: [
      { kind: 'label', label: `Top Panel\n${Math.round(width)}×${depth} mm` },
    ],
  };
  return { pieces: [piece], steps: topPanelSteps() };
}
