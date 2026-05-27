import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult } from '../types.js';
import { backPanelSteps } from '../steps.js';

function pt(x: number, y: number) { return { x, y }; }

function makeRectPath(id: string, w: number, h: number): Path {
  const eid = makeEdgeIdGen(id);
  const seg = (sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: eid(), role: 'cut', start: pt(sx, sy), end: pt(ex, ey) });
  return {
    id,
    edges: [
      seg(0, 0, w, 0),
      seg(w, 0, w, h),
      seg(w, h, 0, h),
      seg(0, h, 0, 0),
    ],
    closed: true,
  };
}

function makeRoundedPath(id: string, w: number, h: number, r: number): Path {
  const eid = makeEdgeIdGen(id);
  const seg = (sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: eid(), role: 'cut', start: pt(sx, sy), end: pt(ex, ey) });
  const arc = (sx: number, sy: number, ex: number, ey: number, cx: number, cy: number, radius: number): Edge =>
    ({ kind: 'arc', id: eid(), role: 'cut', start: pt(sx, sy), end: pt(ex, ey), center: pt(cx, cy), radius, clockwise: true });
  const edges: Edge[] = [
    seg(r, 0, w - r, 0),
    arc(w - r, 0, w, r, w - r, r, r),
    seg(w, r, w, h),
    seg(w, h, 0, h),
    seg(0, h, 0, r),
    arc(0, r, r, 0, r, r, r),
  ];
  return { id, edges, closed: true };
}

function makeTacticalPath(id: string, w: number, h: number): Path {
  const eid = makeEdgeIdGen(id);
  const seg = (sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: eid(), role: 'cut', start: pt(sx, sy), end: pt(ex, ey) });
  const shoulderInset = w * 0.12;
  const shoulderDepth = h * 0.08;
  const edges: Edge[] = [
    seg(shoulderInset, 0, w - shoulderInset, 0),
    seg(w - shoulderInset, 0, w, shoulderDepth),
    seg(w, shoulderDepth, w, h),
    seg(w, h, 0, h),
    seg(0, h, 0, shoulderDepth),
    seg(0, shoulderDepth, shoulderInset, 0),
  ];
  return { id, edges, closed: true };
}

export function buildBackPanel(r: ResolvedInputs): ModuleResult {
  const { width, height, back_panel_shape } = r;
  const cornerRadius = 20;

  let outlinePath: Path;
  if (back_panel_shape === 'rounded') {
    outlinePath = makeRoundedPath('back-panel-outline', width, height, cornerRadius);
  } else if (back_panel_shape === 'tactical') {
    outlinePath = makeTacticalPath('back-panel-outline', width, height);
  } else {
    outlinePath = makeRectPath('back-panel-outline', width, height);
  }

  const piece: Piece = {
    id: 'back-panel',
    name: 'Back Panel',
    mirror: false,
    quantity: 1,
    paths: [outlinePath],
    annotations: [
      { kind: 'grain', label: 'Grain', point: pt(width / 2, height / 2), angle: 90 },
      { kind: 'label', label: `Back Panel\n${width}×${height} mm` },
    ],
  };

  return { pieces: [piece], steps: backPanelSteps() };
}
