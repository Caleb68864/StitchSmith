import type { FC } from 'react';
import type { PatternLabel } from '../../generators/tool-roll/types.js';

interface SvgLabelsProps {
  labels: PatternLabel[];
}

export const SvgLabels: FC<SvgLabelsProps> = ({ labels }) => {
  if (labels.length === 0) return null;

  return (
    <g className="svg-labels" fill="#1a1a1a" stroke="none">
      {labels.map(label => (
        <text
          key={label.id}
          x={label.x}
          y={label.y}
          fontSize={label.fontSize ?? 5}
          textAnchor={label.anchor ?? 'start'}
          dominantBaseline="auto"
          transform={label.rotate ? `rotate(${label.rotate} ${label.x} ${label.y})` : undefined}
        >
          {label.text}
        </text>
      ))}
    </g>
  );
};
