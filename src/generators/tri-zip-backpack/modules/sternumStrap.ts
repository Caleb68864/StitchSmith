import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult } from '../types.js';
import { sternumStrapSteps } from '../steps.js';

function pt(x: number, y: number) { return { x, y }; }

const STERNUM_STRAP_WIDTH = 25;
const STERNUM_STRAP_LENGTH = 300;

export function buildSternumStrap(r: ResolvedInputs): ModuleResult {
  if (!r.sternum_strap) {
    return { pieces: [], steps: [] };
  }

  const eid = makeEdgeIdGen('sternum-strap-outline');
  const seg = (sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: eid(), role: 'cut', start: pt(sx, sy), end: pt(ex, ey) });

  const path: Path = {
    id: 'sternum-strap-outline',
    edges: [
      seg(0, 0, STERNUM_STRAP_WIDTH, 0),
      seg(STERNUM_STRAP_WIDTH, 0, STERNUM_STRAP_WIDTH, STERNUM_STRAP_LENGTH),
      seg(STERNUM_STRAP_WIDTH, STERNUM_STRAP_LENGTH, 0, STERNUM_STRAP_LENGTH),
      seg(0, STERNUM_STRAP_LENGTH, 0, 0),
    ],
    closed: true,
  };

  const piece: Piece = {
    id: 'sternum-strap',
    name: 'Sternum Strap',
    mirror: false,
    quantity: 1,
    paths: [path],
    annotations: [
      { kind: 'label', label: `Sternum Strap\n${STERNUM_STRAP_WIDTH}×${STERNUM_STRAP_LENGTH} mm` },
    ],
  };

  return { pieces: [piece], steps: sternumStrapSteps() };
}
