import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult, SeamRef } from '../types.js';
import { frontCenterPanelSteps } from '../steps.js';

function pt(x: number, y: number) { return { x, y }; }
function seg(role: Edge['role'], sx: number, sy: number, ex: number, ey: number): Edge {
  return { kind: 'straight', role, start: pt(sx, sy), end: pt(ex, ey) };
}

export const SHARED_SEAM_PATH_ID = 'seam:fcp-tzi';

export function buildFrontCenterPanel(r: ResolvedInputs): ModuleResult & { seamRef: SeamRef } {
  const centerWidth = r.width * (r.center_panel_width_percent / 100);
  const { height } = r;

  const outlineEdges: Edge[] = [
    seg('cut', 0, 0, centerWidth, 0),
    seg('cut', centerWidth, 0, centerWidth, height),
    seg('cut', centerWidth, height, 0, height),
    seg('seam', 0, height, 0, 0),
  ];

  const outlinePath: Path = {
    id: 'front-center-panel-outline',
    edges: outlineEdges,
    closed: true,
  };

  const sharedSeamPath: Path = {
    id: SHARED_SEAM_PATH_ID,
    edges: [seg('seam', 0, 0, 0, height)],
    closed: false,
  };

  const piece: Piece = {
    id: 'front-center-panel',
    name: 'Front Center Panel',
    mirror: false,
    quantity: 1,
    paths: [outlinePath, sharedSeamPath],
    annotations: [
      { kind: 'label', label: `Front Center Panel\n${Math.round(centerWidth)}×${height} mm` },
    ],
  };

  const seamRef: SeamRef = {
    pieceId: 'front-center-panel',
    pathId: SHARED_SEAM_PATH_ID,
    length: height,
  };

  return { pieces: [piece], steps: frontCenterPanelSteps(), seamRef };
}
