import type { FC } from 'react';
import type { PrintLayout } from '../../generators/tool-roll/types.js';

interface SvgTileGridProps {
  printLayout: PrintLayout;
}

export const SvgTileGrid: FC<SvgTileGridProps> = ({ printLayout }) => {
  return (
    <g className="svg-tile-grid" stroke="#3b82f6" strokeWidth={0.5} strokeDasharray="4 2" fill="none">
      {printLayout.pages.map(tile => (
        <g key={tile.id}>
          <rect x={tile.x} y={tile.y} width={tile.width} height={tile.height} />
          <text
            x={tile.x + 2}
            y={tile.y + 6}
            fontSize={4}
            fill="#3b82f6"
            stroke="none"
          >
            {tile.label}
          </text>
        </g>
      ))}
    </g>
  );
};
