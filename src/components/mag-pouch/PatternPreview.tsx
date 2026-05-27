import type { MagPouchBuildResult } from '../../generators/mag-pouch/types.js';
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';

interface Props {
  result: MagPouchBuildResult | null;
  errors: Record<string, string>;
}

export function PatternPreview({ result, errors }: Props) {
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="space-y-3">
      <div className="rounded border border-border bg-card p-3 space-y-3">
        <h3 className="text-xs font-semibold">Pattern Preview</h3>

        {hasErrors ? (
          <div className="rounded bg-muted/30 flex items-center justify-center h-48 text-xs text-muted-foreground">
            Fix validation errors to see preview
          </div>
        ) : result ? (
          <div
            className="overflow-auto rounded bg-white dark:bg-gray-900"
            aria-label="Pattern preview SVG"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: buildPreviewSvg(result),
            }}
          />
        ) : (
          <div className="rounded bg-muted/30 flex items-center justify-center h-48 text-xs text-muted-foreground">
            Generating preview…
          </div>
        )}
      </div>

      <PatternEngineLegend />
    </div>
  );
}

/**
 * Extracts all Point coordinates from a Piece's paths (straight edges only).
 */
function getPiecePoints(piece: Piece): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (const path of piece.paths) {
    for (const edge of path.edges) {
      pts.push({ x: edge.start.x, y: edge.start.y });
      pts.push({ x: edge.end.x, y: edge.end.y });
    }
  }
  return pts;
}

/**
 * Builds a compact inline SVG string from the pattern pieces for preview.
 */
function buildPreviewSvg(result: MagPouchBuildResult): string {
  const pieces = result.pattern.pieces;
  if (!pieces || pieces.length === 0) {
    return '<svg width="200" height="120" xmlns="http://www.w3.org/2000/svg"><text x="10" y="20" font-size="12" fill="#888">No pieces</text></svg>';
  }

  // Compute overall bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const piece of pieces) {
    for (const pt of getPiecePoints(piece)) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
  }

  const W = maxX - minX;
  const H = maxY - minY;
  if (!Number.isFinite(W) || !Number.isFinite(H) || W <= 0 || H <= 0) {
    return '<svg width="200" height="120" xmlns="http://www.w3.org/2000/svg"><text x="10" y="20" font-size="12" fill="#888">Empty pattern</text></svg>';
  }

  const PAD = 10;
  const VIEW_W = 360;
  const VIEW_H = Math.max(120, Math.round((VIEW_W * H) / W));
  const SCALE = (VIEW_W - PAD * 2) / W;

  function toCoord(x: number, y: number) {
    return `${((x - minX) * SCALE + PAD).toFixed(1)},${((y - minY) * SCALE + PAD).toFixed(1)}`;
  }

  const ROLE_COLORS: Record<string, string> = {
    cut: '#000000',
    seam: '#2e7d32',
    fold: '#0066cc',
    stitch: '#cc0000',
    notch: '#ff6600',
  };

  const piecesSvg = pieces.map(piece =>
    piece.paths.map(path => {
      const d = path.edges.map((edge, i) => {
        const startCoord = toCoord(edge.start.x, edge.start.y);
        if (i === 0) {
          return `M${startCoord} L${toCoord(edge.end.x, edge.end.y)}`;
        }
        return `L${toCoord(edge.end.x, edge.end.y)}`;
      }).join(' ') + (path.closed ? ' Z' : '');

      const role = path.edges[0]?.role ?? 'cut';
      const stroke = ROLE_COLORS[role] ?? '#000';
      const dash = role === 'fold' ? 'stroke-dasharray="8 3"' : role === 'seam' ? 'stroke-dasharray="6 3"' : '';
      return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.5" ${dash}/>`;
    }).join('\n'),
  ).join('\n');

  return `<svg width="${VIEW_W}" height="${VIEW_H}" viewBox="0 0 ${VIEW_W} ${VIEW_H}" xmlns="http://www.w3.org/2000/svg">${piecesSvg}</svg>`;
}
