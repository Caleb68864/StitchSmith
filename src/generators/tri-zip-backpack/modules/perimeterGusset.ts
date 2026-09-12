import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult } from '../types.js';
import { perimeterGussetSteps } from '../steps.js';

function pt(x: number, y: number) { return { x, y }; }

/**
 * Corner turn marks (the step says "notch at corners"): the gusset turns 90°
 * where the bottom meets each side. Emitted as fold lines so the 3D preview
 * bends the strip into its U; the angle is stated so the preview cannot guess.
 */
function cornerFolds(idPrefix: string, xs: number[], depth: number, length: number): Path[] {
  return xs
    .filter((x) => x > 0.5 && x < length - 0.5)
    .map((x, i) => {
      const eid = makeEdgeIdGen(`${idPrefix}-corner-${i}`);
      return {
        id: `${idPrefix}-corner-${i}`,
        edges: [{ kind: 'straight', id: eid(), role: 'fold', start: pt(x, 0), end: pt(x, depth) } as Edge],
        closed: false,
        label: 'Corner — notch and turn up the side (90°)',
      };
    });
}

function makeGussetPath(id: string, length: number, depth: number): Path {
  const eid = makeEdgeIdGen(id);
  const seg = (sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: eid(), role: 'cut', start: pt(sx, sy), end: pt(ex, ey) });
  return {
    id,
    edges: [
      seg(0, 0, length, 0),
      seg(length, 0, length, depth),
      seg(length, depth, 0, depth),
      seg(0, depth, 0, 0),
    ],
    closed: true,
  };
}

export function buildPerimeterGusset(r: ResolvedInputs): ModuleResult {
  const { width, height, depth, split_gusset } = r;
  // Perimeter = bottom + two sides + optional top across back
  const perimeterLength = width + 2 * height;

  const pieces: Piece[] = [];

  if (split_gusset) {
    const halfLen = perimeterLength / 2;
    const pathA = makeGussetPath('gusset-a-outline', halfLen, depth);
    const pathB = makeGussetPath('gusset-b-outline', halfLen, depth);
    pieces.push({
      id: 'perimeter-gusset-a',
      name: 'Perimeter Gusset A',
      mirror: false,
      quantity: 1,
      paths: [pathA, ...cornerFolds('gusset-a', [height], depth, halfLen)],
      annotations: [{ kind: 'label', label: `Gusset A\n${Math.round(halfLen)}×${depth} mm` }],
    });
    pieces.push({
      id: 'perimeter-gusset-b',
      name: 'Perimeter Gusset B',
      mirror: false,
      quantity: 1,
      paths: [pathB, ...cornerFolds('gusset-b', [halfLen - height], depth, halfLen)],
      annotations: [{ kind: 'label', label: `Gusset B\n${Math.round(halfLen)}×${depth} mm` }],
    });
  } else {
    const path = makeGussetPath('gusset-outline', perimeterLength, depth);
    pieces.push({
      id: 'perimeter-gusset',
      name: 'Perimeter Gusset',
      mirror: false,
      quantity: 1,
      paths: [path, ...cornerFolds('gusset', [height, height + width], depth, perimeterLength)],
      annotations: [{ kind: 'label', label: `Perimeter Gusset\n${Math.round(perimeterLength)}×${depth} mm` }],
    });
  }

  return { pieces, steps: perimeterGussetSteps() };
}
