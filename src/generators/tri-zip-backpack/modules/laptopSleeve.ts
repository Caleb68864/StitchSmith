import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult } from '../types.js';
import { laptopSleeveSteps } from '../steps.js';

function pt(x: number, y: number) { return { x, y }; }

// Standard laptop sleeve dimensions: fits up to 15" laptops
const SLEEVE_WIDTH = 280;
const SLEEVE_HEIGHT = 370;
const SLEEVE_DEPTH = 20;

export function buildLaptopSleeve(r: ResolvedInputs): ModuleResult {
  const { laptop_sleeve_attachment } = r;

  if (laptop_sleeve_attachment === 'none') {
    return { pieces: [], steps: [] };
  }

  const steps = laptopSleeveSteps();
  const pieces: Piece[] = [];

  const panelEid = makeEdgeIdGen('laptop-sleeve-panel-outline');
  const segPanel = (sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: panelEid(), role: 'cut', start: pt(sx, sy), end: pt(ex, ey) });
  const panelPath: Path = {
    id: 'laptop-sleeve-panel-outline',
    edges: [
      segPanel(0, 0, SLEEVE_WIDTH, 0),
      segPanel(SLEEVE_WIDTH, 0, SLEEVE_WIDTH, SLEEVE_HEIGHT),
      segPanel(SLEEVE_WIDTH, SLEEVE_HEIGHT, 0, SLEEVE_HEIGHT),
      segPanel(0, SLEEVE_HEIGHT, 0, 0),
    ],
    closed: true,
  };

  const gussetEid = makeEdgeIdGen('laptop-sleeve-gusset-outline');
  const segGusset = (sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: gussetEid(), role: 'cut', start: pt(sx, sy), end: pt(ex, ey) });
  const gussetPath: Path = {
    id: 'laptop-sleeve-gusset-outline',
    edges: [
      segGusset(0, 0, SLEEVE_DEPTH, 0),
      segGusset(SLEEVE_DEPTH, 0, SLEEVE_DEPTH, SLEEVE_HEIGHT * 2 + SLEEVE_WIDTH),
      segGusset(SLEEVE_DEPTH, SLEEVE_HEIGHT * 2 + SLEEVE_WIDTH, 0, SLEEVE_HEIGHT * 2 + SLEEVE_WIDTH),
      segGusset(0, SLEEVE_HEIGHT * 2 + SLEEVE_WIDTH, 0, 0),
    ],
    closed: true,
  };

  const attachLabel = laptop_sleeve_attachment === 'seam-sewn'
    ? 'seam-sewn (internal)'
    : 'webbing-loop (removable)';

  pieces.push({
    id: 'laptop-sleeve-front',
    name: 'Laptop Sleeve Front',
    mirror: false,
    quantity: 1,
    paths: [panelPath],
    annotations: [
      { kind: 'label', label: `Laptop Sleeve Front\n${SLEEVE_WIDTH}×${SLEEVE_HEIGHT} mm\n${attachLabel}` },
    ],
  });

  pieces.push({
    id: 'laptop-sleeve-back',
    name: 'Laptop Sleeve Back',
    mirror: false,
    quantity: 1,
    paths: [
      (() => {
        const backEid = makeEdgeIdGen('laptop-sleeve-back-outline');
        return {
          id: 'laptop-sleeve-back-outline',
          edges: panelPath.edges.map(e => ({ ...e, id: backEid() })),
          closed: true,
        };
      })(),
    ],
    annotations: [{ kind: 'label', label: `Laptop Sleeve Back\n${SLEEVE_WIDTH}×${SLEEVE_HEIGHT} mm` }],
  });

  pieces.push({
    id: 'laptop-sleeve-gusset',
    name: 'Laptop Sleeve Gusset',
    mirror: false,
    quantity: 1,
    paths: [gussetPath],
    annotations: [{ kind: 'label', label: `Laptop Sleeve Gusset\n${SLEEVE_DEPTH}×${SLEEVE_HEIGHT * 2 + SLEEVE_WIDTH} mm` }],
  });

  return { pieces, steps };
}
