import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult } from '../types.js';
import { hipBeltSteps } from '../steps.js';

function pt(x: number, y: number) { return { x, y }; }

const WEBBING_WIDTH = 50;
const WEBBING_LENGTH = 600;
const PADDED_WIDTH = 80;
const PADDED_LENGTH = 600;
const PADDED_TAPER = 40;

export function buildHipBelt(r: ResolvedInputs): ModuleResult {
  if (r.hip_belt === 'none') {
    return { pieces: [], steps: [] };
  }

  const pieces: Piece[] = [];
  const steps = hipBeltSteps();
  const eid = makeEdgeIdGen('hip-belt-outline');
  const seg = (sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: eid(), role: 'cut', start: pt(sx, sy), end: pt(ex, ey) });

  if (r.hip_belt === 'webbing') {
    const path: Path = {
      id: 'hip-belt-outline',
      edges: [
        seg(0, 0, WEBBING_WIDTH, 0),
        seg(WEBBING_WIDTH, 0, WEBBING_WIDTH, WEBBING_LENGTH),
        seg(WEBBING_WIDTH, WEBBING_LENGTH, 0, WEBBING_LENGTH),
        seg(0, WEBBING_LENGTH, 0, 0),
      ],
      closed: true,
    };
    pieces.push({
      id: 'hip-belt',
      name: 'Hip Belt (Webbing)',
      mirror: false,
      quantity: 1,
      paths: [path],
      annotations: [{ kind: 'label', label: `Hip Belt Webbing\n${WEBBING_WIDTH}×${WEBBING_LENGTH} mm` }],
    });
  } else {
    // padded — tapered shape for comfort
    const path: Path = {
      id: 'hip-belt-outline',
      edges: [
        seg(PADDED_TAPER, 0, PADDED_WIDTH - PADDED_TAPER, 0),
        seg(PADDED_WIDTH - PADDED_TAPER, 0, PADDED_WIDTH, PADDED_TAPER),
        seg(PADDED_WIDTH, PADDED_TAPER, PADDED_WIDTH, PADDED_LENGTH - PADDED_TAPER),
        seg(PADDED_WIDTH, PADDED_LENGTH - PADDED_TAPER, PADDED_WIDTH - PADDED_TAPER, PADDED_LENGTH),
        seg(PADDED_WIDTH - PADDED_TAPER, PADDED_LENGTH, PADDED_TAPER, PADDED_LENGTH),
        seg(PADDED_TAPER, PADDED_LENGTH, 0, PADDED_LENGTH - PADDED_TAPER),
        seg(0, PADDED_LENGTH - PADDED_TAPER, 0, PADDED_TAPER),
        seg(0, PADDED_TAPER, PADDED_TAPER, 0),
      ],
      closed: true,
    };
    pieces.push({
      id: 'hip-belt',
      name: 'Hip Belt (Padded)',
      mirror: true,
      quantity: 2,
      paths: [path],
      annotations: [{ kind: 'label', label: `Hip Belt Padded\n${PADDED_WIDTH}×${PADDED_LENGTH} mm` }],
    });
  }

  return { pieces, steps };
}
