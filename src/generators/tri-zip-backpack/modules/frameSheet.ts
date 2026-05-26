import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult } from '../types.js';
import { frameSheetSteps } from '../steps.js';

function pt(x: number, y: number) { return { x, y }; }
function seg(sx: number, sy: number, ex: number, ey: number): Edge {
  return { kind: 'straight', role: 'cut', start: pt(sx, sy), end: pt(ex, ey) };
}

export function buildFrameSheet(r: ResolvedInputs): ModuleResult {
  const { frame_sheet, frame_sheet_margin, width, height } = r;

  if (frame_sheet === 'none') {
    return { pieces: [], steps: [] };
  }

  const fw = width - 2 * frame_sheet_margin;
  const fh = height - 2 * frame_sheet_margin;

  const path: Path = {
    id: 'frame-sheet-outline',
    edges: [
      seg(0, 0, fw, 0),
      seg(fw, 0, fw, fh),
      seg(fw, fh, 0, fh),
      seg(0, fh, 0, 0),
    ],
    closed: true,
  };

  const material = frame_sheet === 'hdpe' ? 'HDPE Sheet' : 'Foam Sheet';

  const piece: Piece = {
    id: 'frame-sheet',
    name: `Frame Sheet (${material})`,
    mirror: false,
    quantity: 1,
    paths: [path],
    annotations: [
      {
        kind: 'label',
        label: `Frame Sheet (${material})\n${Math.round(fw)}×${Math.round(fh)} mm\nMargin: ${frame_sheet_margin} mm`,
      },
    ],
  };

  return { pieces: [piece], steps: frameSheetSteps() };
}
