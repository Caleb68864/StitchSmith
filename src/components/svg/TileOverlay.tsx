import type { FC } from 'react';
import type { PrintTile, PrintLayout, UnitSystem } from '../../generators/tool-roll/types.js';

interface TileOverlayProps {
  tile: PrintTile;
  printLayout: PrintLayout;
  units: UnitSystem;
  printMargin: number;
  overlap: number;
}

export const TileOverlay: FC<TileOverlayProps> = ({
  tile,
  printLayout,
  units,
  printMargin,
  overlap,
}) => {
  const { paperWidth, paperHeight, columns, rows, totalPages } = printLayout;
  const scaleBoxSize = units === 'in' ? 25.4 : 50;

  const px = printMargin;
  const py = printMargin;
  const pw = paperWidth - 2 * printMargin;
  const ph = paperHeight - 2 * printMargin;
  const armLen = 5;

  const overlapMm = overlap.toFixed(1);
  const overlapIn = (overlap / 25.4).toFixed(2);

  const corners = [
    { x: px, y: py },
    { x: px + pw, y: py },
    { x: px, y: py + ph },
    { x: px + pw, y: py + ph },
  ];

  const neighbors: Array<{ dir: string; page: number }> = [];
  if (tile.row > 0) neighbors.push({ dir: 'above', page: (tile.row - 1) * columns + tile.column + 1 });
  if (tile.row < rows - 1) neighbors.push({ dir: 'below', page: (tile.row + 1) * columns + tile.column + 1 });
  if (tile.column > 0) neighbors.push({ dir: 'left', page: tile.row * columns + (tile.column - 1) + 1 });
  if (tile.column < columns - 1) neighbors.push({ dir: 'right', page: tile.row * columns + (tile.column + 1) + 1 });

  return (
    <g className="tile-overlay" fontFamily="sans-serif">
      {/* Registration crosshairs at printable-area corners */}
      {corners.map((c, i) => (
        <g key={i} stroke="#888" strokeWidth={0.3} fill="none">
          <line x1={c.x - armLen} y1={c.y} x2={c.x + armLen} y2={c.y} />
          <line x1={c.x} y1={c.y - armLen} x2={c.x} y2={c.y + armLen} />
        </g>
      ))}

      {/* Scale-check square (bottom-left of printable area) */}
      <rect
        x={px + 5}
        y={py + ph - scaleBoxSize - 6}
        width={scaleBoxSize}
        height={scaleBoxSize}
        fill="none"
        stroke="#333"
        strokeWidth={0.5}
      />
      <text
        x={px + 5 + scaleBoxSize / 2}
        y={py + ph - 2}
        textAnchor="middle"
        fontSize={3}
        fill="#333"
      >
        {units === 'in' ? '1 in (25.4 mm)' : '50 mm (2 in)'}
      </text>

      {/* Page label */}
      <text
        x={paperWidth / 2}
        y={py + 7}
        textAnchor="middle"
        fontSize={4}
        fill="#333"
      >
        {`Tool Roll — Page ${tile.pageNumber} of ${totalPages} — Row ${tile.row + 1} Col ${tile.column + 1}`}
      </text>

      {/* Overlap text */}
      <text
        x={paperWidth / 2}
        y={py + 12}
        textAnchor="middle"
        fontSize={3}
        fill="#666"
      >
        {`Overlap: ${overlapMm} mm / ${overlapIn} in`}
      </text>

      {/* Neighbor hints */}
      {neighbors.map((n, i) => {
        let x = paperWidth / 2;
        let y = paperHeight / 2;
        let anchor = 'middle';
        let arrow = '';
        if (n.dir === 'above') { y = py + 17; arrow = '↑'; }
        else if (n.dir === 'below') { y = py + ph - scaleBoxSize - 15; arrow = '↓'; }
        else if (n.dir === 'left') { x = px + 8; y = paperHeight / 2; anchor = 'start'; arrow = '←'; }
        else if (n.dir === 'right') { x = px + pw - 8; y = paperHeight / 2; anchor = 'end'; arrow = '→'; }
        return (
          <text key={i} x={x} y={y} textAnchor={anchor as 'start' | 'middle' | 'end'} fontSize={3} fill="#666">
            {`${arrow} Tape to page ${n.page} ${n.dir}`}
          </text>
        );
      })}
    </g>
  );
};
