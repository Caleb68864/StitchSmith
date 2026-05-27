type LegendItem = {
  label: string;
  stroke: string;
  strokeWidth: number;
  dash?: string;
  description: string;
};

const ITEMS: LegendItem[] = [
  {
    label: 'Cut line',
    stroke: '#000000',
    strokeWidth: 2,
    description: 'Outer fabric boundary — cut along this line.',
  },
  {
    label: 'Seam allowance',
    stroke: '#2e7d32',
    strokeWidth: 1.5,
    dash: '6 3',
    description: 'Includes seam allowance — cut along this line if your machine needs it added.',
  },
  {
    label: 'Fold line',
    stroke: '#0066cc',
    strokeWidth: 2,
    dash: '8 3',
    description: 'Where the fabric folds — hems, collars, and handles.',
  },
  {
    label: 'Shared seam',
    stroke: '#cc0000',
    strokeWidth: 2,
    description: 'Two pieces meet here at the same length — verified by the engine.',
  },
];

/**
 * Legend for any pattern preview rendered by the engine's patternToSvg.
 * Shared across generators so a new pattern only has to drop it into its
 * page layout to get a consistent key.
 */
export function PatternEngineLegend() {
  return (
    <details className="rounded border border-border bg-muted/20 text-xs" open>
      <summary className="cursor-pointer select-none px-3 py-2 font-semibold">Legend</summary>
      <ul className="px-3 pb-3 space-y-1.5">
        {ITEMS.map(i => (
          <li key={i.label} className="flex items-center gap-3">
            <svg width={40} height={10} className="shrink-0" aria-hidden="true">
              <line
                x1={0}
                y1={5}
                x2={40}
                y2={5}
                stroke={i.stroke}
                strokeWidth={i.strokeWidth}
                strokeDasharray={i.dash}
              />
            </svg>
            <span className="font-medium w-28 shrink-0">{i.label}</span>
            <span className="text-muted-foreground">{i.description}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
