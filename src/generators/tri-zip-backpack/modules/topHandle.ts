import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult } from '../types.js';
import { topHandleSteps } from '../steps.js';

function pt(x: number, y: number) { return { x, y }; }

const HANDLE_WIDTH = 35;
const HANDLE_LENGTH = 160;

export function buildTopHandle(_r: ResolvedInputs): ModuleResult {
  const outlineEid = makeEdgeIdGen('top-handle-outline');
  const seg = (sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: outlineEid(), role: 'cut', start: pt(sx, sy), end: pt(ex, ey) });
  const path: Path = {
    id: 'top-handle-outline',
    edges: [
      seg(0, 0, HANDLE_WIDTH, 0),
      seg(HANDLE_WIDTH, 0, HANDLE_WIDTH, HANDLE_LENGTH),
      seg(HANDLE_WIDTH, HANDLE_LENGTH, 0, HANDLE_LENGTH),
      seg(0, HANDLE_LENGTH, 0, 0),
    ],
    closed: true,
  };

  const foldEid = makeEdgeIdGen('top-handle-fold');
  const foldLine: Path = {
    id: 'top-handle-fold',
    edges: [{ kind: 'straight', id: foldEid(), role: 'fold', start: pt(HANDLE_WIDTH / 2, 0), end: pt(HANDLE_WIDTH / 2, HANDLE_LENGTH) }],
    closed: false,
  };

  const piece: Piece = {
    id: 'top-handle',
    name: 'Top Handle',
    mirror: false,
    quantity: 1,
    paths: [path, foldLine],
    annotations: [
      { kind: 'label', label: `Top Handle\n${HANDLE_WIDTH}×${HANDLE_LENGTH} mm` },
    ],
  };

  return { pieces: [piece], steps: topHandleSteps() };
}
