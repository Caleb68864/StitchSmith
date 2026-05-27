import type { FC } from 'react';
import type { DimensionLine } from '../../generators/tool-roll/types.js';

interface SvgDimensionLinesProps {
  dimensionLines: DimensionLine[];
}

const TICK_SIZE = 2;

export const SvgDimensionLines: FC<SvgDimensionLinesProps> = ({ dimensionLines }) => {
  if (dimensionLines.length === 0) return null;

  return (
    <g className="svg-dimension-lines" stroke="#e11d48" strokeWidth={0.4} fill="none">
      {dimensionLines.map(dim => {
        const isVertical = dim.x1 === dim.x2;
        const ox = isVertical ? dim.offset : 0;
        const oy = isVertical ? 0 : dim.offset;

        const lx1 = dim.x1 + ox;
        const ly1 = dim.y1 + oy;
        const lx2 = dim.x2 + ox;
        const ly2 = dim.y2 + oy;

        const midX = (lx1 + lx2) / 2;
        const midY = (ly1 + ly2) / 2;

        return (
          <g key={dim.id}>
            {/* Main dimension line */}
            <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} />
            {/* Tick at start */}
            {isVertical ? (
              <>
                <line x1={lx1 - TICK_SIZE} y1={ly1} x2={lx1 + TICK_SIZE} y2={ly1} />
                <line x1={lx2 - TICK_SIZE} y1={ly2} x2={lx2 + TICK_SIZE} y2={ly2} />
              </>
            ) : (
              <>
                <line x1={lx1} y1={ly1 - TICK_SIZE} x2={lx1} y2={ly1 + TICK_SIZE} />
                <line x1={lx2} y1={ly2 - TICK_SIZE} x2={lx2} y2={ly2 + TICK_SIZE} />
              </>
            )}
            {/* Extension lines from original points to dimension line */}
            <line
              x1={dim.x1}
              y1={dim.y1}
              x2={lx1}
              y2={ly1}
              strokeDasharray="1 1"
              strokeWidth={0.3}
            />
            <line
              x1={dim.x2}
              y1={dim.y2}
              x2={lx2}
              y2={ly2}
              strokeDasharray="1 1"
              strokeWidth={0.3}
            />
            {/* Label */}
            <text
              x={midX + (isVertical ? TICK_SIZE + 1 : 0)}
              y={midY + (isVertical ? 0 : -(TICK_SIZE + 1))}
              fontSize={4}
              fill="#e11d48"
              stroke="none"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {dim.labelText}
            </text>
          </g>
        );
      })}
    </g>
  );
};
