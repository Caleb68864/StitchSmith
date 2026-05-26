import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult } from '../types.js';
import { frontWingSteps } from '../steps.js';

function pt(x: number, y: number) { return { x, y }; }

export function buildFrontWing(r: ResolvedInputs): ModuleResult {
  const centerWidth = r.width * (r.center_panel_width_percent / 100);
  const wingWidth = (r.width - centerWidth) / 2;
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

  // Expose the y-split coordinate as an annotation for testing / UI consumption.
  const piece: Piece = {
    id: 'front-wing',
    name: 'Front Wing',
    mirror: true,
    quantity: 2,
    paths: [path],
    annotations: [
      { kind: 'notch', label: 'Y-split', point: pt(0, ySplit), angle: 0 },
      { kind: 'label', label: `Front Wing\n${Math.round(wingWidth)}×${height} mm` },
    ],
  };

  return { pieces: [piece], steps: frontWingSteps() };
}
