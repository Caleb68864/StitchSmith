import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult } from '../types.js';
import { compressionStrapSteps } from '../steps.js';

function pt(x: number, y: number) { return { x, y }; }
function seg(sx: number, sy: number, ex: number, ey: number): Edge {
  return { kind: 'straight', role: 'cut', start: pt(sx, sy), end: pt(ex, ey) };
}

const STRAP_WIDTH = 25;
const SIDE_STRAP_LENGTH = 250;
const BOTTOM_STRAP_LENGTH = 300;

function makeStrap(id: string, name: string, w: number, l: number): Piece {
  const path: Path = {
    id: `${id}-outline`,
    edges: [
      seg(0, 0, w, 0),
      seg(w, 0, w, l),
      seg(w, l, 0, l),
      seg(0, l, 0, 0),
    ],
    closed: true,
  };
  return {
    id,
    name,
    mirror: false,
    quantity: 1,
    paths: [path],
    annotations: [{ kind: 'label', label: `${name}\n${w}×${l} mm` }],
  };
}

export function buildCompressionStraps(r: ResolvedInputs): ModuleResult {
  const { compression_straps } = r;

  if (compression_straps === 'none') {
    return { pieces: [], steps: [] };
  }

  const pieces: Piece[] = [];
  const steps = compressionStrapSteps();

  // side: two side straps
  pieces.push(makeStrap('compression-strap-left', 'Compression Strap Left', STRAP_WIDTH, SIDE_STRAP_LENGTH));
  pieces.push(makeStrap('compression-strap-right', 'Compression Strap Right', STRAP_WIDTH, SIDE_STRAP_LENGTH));

  if (compression_straps === 'side_and_bottom') {
    pieces.push(makeStrap('compression-strap-bottom-left', 'Compression Strap Bottom Left', STRAP_WIDTH, BOTTOM_STRAP_LENGTH));
    pieces.push(makeStrap('compression-strap-bottom-right', 'Compression Strap Bottom Right', STRAP_WIDTH, BOTTOM_STRAP_LENGTH));
  }

  return { pieces, steps };
}
