import type { FC } from 'react';

interface SvgGridProps {
  width: number;
  height: number;
  /** Grid spacing in mm (default 10) */
  spacing?: number;
}

export const SvgGrid: FC<SvgGridProps> = ({ width, height, spacing = 10 }) => {
  const cols = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);

  const verticals: JSX.Element[] = [];
  const horizontals: JSX.Element[] = [];

  for (let c = 0; c <= cols; c++) {
    const x = c * spacing;
    verticals.push(
      <line key={`v-${c}`} x1={x} y1={0} x2={x} y2={height} />,
    );
  }
  for (let r = 0; r <= rows; r++) {
    const y = r * spacing;
    horizontals.push(
      <line key={`h-${r}`} x1={0} y1={y} x2={width} y2={y} />,
    );
  }

  return (
    <g
      className="svg-grid"
      stroke="#d0d0d0"
      strokeWidth={0.25}
      strokeDasharray="none"
    >
      {verticals}
      {horizontals}
    </g>
  );
};
