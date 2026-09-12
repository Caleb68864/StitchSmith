import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult } from '../types.js';
import { frontWingSteps } from '../steps.js';

function pt(x: number, y: number) { return { x, y }; }

/**
 * Finished width of one front wing. In the gusseted zipper method a zipper
 * gusset strip sits between each wing and the centre panel, so the wings give
 * up that width — otherwise the assembled front is 2 × gusset wider than the
 * back panel and the perimeter gusset (the 3D cloth check could not close it).
 */
export function frontWingWidth(r: ResolvedInputs): number {
  const centerWidth = r.width * (r.center_panel_width_percent / 100);
  const zipGusset = r.zipper_method === 'gusseted' ? r.zipper_gusset_width : 0;
  return (r.width - centerWidth) / 2 - zipGusset;
}

/** Shared seam id: wing interior edge ↔ zipper gusset strip outer edge (gusseted method). */
export const WING_ZIP_SEAM_PATH_ID = 'seam:wing-tzi';

export function buildFrontWing(r: ResolvedInputs): ModuleResult {
  const wingWidth = frontWingWidth(r);
  const { height } = r;

  // y_split_height_percent measured from top
  const ySplit = height * (r.y_split_height_percent / 100);

  const eid = makeEdgeIdGen('front-wing-outline');
  const seg = (role: Edge['role'], sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: eid(), role, start: pt(sx, sy), end: pt(ex, ey) });

  // Interior edge is split at ySplit to create an explicit vertex at the Y-intersection point.
  // This allows tests to verify the split coordinate by sampling edge endpoints.
  const edges: Edge[] = [
    seg('cut', 0, 0, wingWidth, 0),        // top
    seg('cut', wingWidth, 0, wingWidth, height), // outer
    seg('cut', wingWidth, height, 0, height),    // bottom
    seg('seam', 0, height, 0, ySplit),           // lower interior (bottom → split)
    seg('seam', 0, ySplit, 0, 0),                // upper interior (split → top)
  ];

  const path: Path = { id: 'front-wing-outline', edges, closed: true };
  const paths: Path[] = [path];
  if (r.zipper_method === 'gusseted') {
    const seamEid = makeEdgeIdGen(WING_ZIP_SEAM_PATH_ID);
    paths.push({
      id: WING_ZIP_SEAM_PATH_ID,
      edges: [{ kind: 'straight', id: seamEid(), role: 'seam', start: pt(0, 0), end: pt(0, height) }],
      closed: false,
    });
  }

  // Expose the y-split coordinate as an annotation for testing / UI consumption.
  const piece: Piece = {
    id: 'front-wing',
    name: 'Front Wing',
    mirror: true,
    quantity: 2,
    paths,
    annotations: [
      { kind: 'notch', label: 'Y-split', point: pt(0, ySplit), angle: 0 },
      { kind: 'label', label: `Front Wing\n${Math.round(wingWidth)}×${height} mm` },
    ],
  };

  return { pieces: [piece], steps: frontWingSteps() };
}
