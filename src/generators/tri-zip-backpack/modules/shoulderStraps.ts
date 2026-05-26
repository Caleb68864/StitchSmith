import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult } from '../types.js';
import { shoulderStrapSteps } from '../steps.js';

function pt(x: number, y: number) { return { x, y }; }
function seg(sx: number, sy: number, ex: number, ey: number): Edge {
  return { kind: 'straight', role: 'cut', start: pt(sx, sy), end: pt(ex, ey) };
}
function bezier(sx: number, sy: number, ex: number, ey: number,
  cp1x: number, cp1y: number, cp2x: number, cp2y: number): Edge {
  return {
    kind: 'bezier', role: 'cut',
    start: pt(sx, sy), end: pt(ex, ey),
    cp1: pt(cp1x, cp1y), cp2: pt(cp2x, cp2y),
  };
}

export function buildShoulderStraps(r: ResolvedInputs): ModuleResult {
  const { strap_width, height, curve_style } = r;
  // Shoulder strap approximate length = 0.75 * bag height + 350 mm for loop/adjustment
  const strapLength = height * 0.75 + 350;

  let path: Path;
  if (curve_style === 's_curve') {
    // S-curve: bezier on long sides
    const midY = strapLength / 2;
    const inset = strap_width * 0.15;
    path = {
      id: 'shoulder-strap-outline',
      edges: [
        bezier(0, 0, 0, strapLength, inset, midY * 0.3, -inset, midY * 0.7),
        seg(0, strapLength, strap_width, strapLength),
        bezier(strap_width, strapLength, strap_width, 0, strap_width - inset, midY * 0.7, strap_width + inset, midY * 0.3),
        seg(strap_width, 0, 0, 0),
      ],
      closed: true,
    };
  } else if (curve_style === 'ergonomic') {
    const inset = strap_width * 0.1;
    path = {
      id: 'shoulder-strap-outline',
      edges: [
        bezier(0, 0, 0, strapLength, -inset, strapLength * 0.4, -inset, strapLength * 0.6),
        seg(0, strapLength, strap_width, strapLength),
        bezier(strap_width, strapLength, strap_width, 0, strap_width + inset, strapLength * 0.6, strap_width + inset, strapLength * 0.4),
        seg(strap_width, 0, 0, 0),
      ],
      closed: true,
    };
  } else {
    // straight
    path = {
      id: 'shoulder-strap-outline',
      edges: [
        seg(0, 0, strap_width, 0),
        seg(strap_width, 0, strap_width, strapLength),
        seg(strap_width, strapLength, 0, strapLength),
        seg(0, strapLength, 0, 0),
      ],
      closed: true,
    };
  }

  const piece: Piece = {
    id: 'shoulder-strap',
    name: 'Shoulder Strap',
    mirror: true,
    quantity: 2,
    paths: [path],
    annotations: [
      { kind: 'grain', label: 'Grain', point: pt(strap_width / 2, strapLength / 2), angle: 90 },
      { kind: 'label', label: `Shoulder Strap (×2)\n${strap_width}×${Math.round(strapLength)} mm` },
    ],
  };

  return { pieces: [piece], steps: shoulderStrapSteps() };
}
