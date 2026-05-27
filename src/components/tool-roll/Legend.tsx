import type { ToolRollSettings } from '../../generators/tool-roll/types.js';

type LegendItem = {
  label: string;
  /** SVG-coordinate dash pattern; undefined = solid */
  dash?: string;
  stroke: string;
  strokeWidth: number;
  /** When false, the row is hidden because the matching layer is toggled off */
  enabled: boolean;
  description: string;
};

interface LegendProps {
  settings: ToolRollSettings;
}

export function Legend({ settings }: LegendProps) {
  const items: LegendItem[] = [
    {
      label: 'Cut line',
      stroke: '#111111',
      strokeWidth: 2,
      enabled: true,
      description: 'Outer fabric boundary — cut along this line.',
    },
    {
      label: 'Finished line',
      stroke: '#aaaaaa',
      strokeWidth: 1.5,
      dash: '6 2',
      enabled: true,
      description: 'Where the finished panel edge falls after folding hems.',
    },
    {
      label: 'Stitch line',
      stroke: '#16a34a',
      strokeWidth: 2,
      dash: '4 4',
      enabled: settings.showStitchLines,
      description: 'Where the needle sews — pocket dividers and assembly stitches.',
    },
    {
      label: 'Fold line',
      stroke: '#2563eb',
      strokeWidth: 2,
      dash: '10 3 2 3',
      enabled: settings.showFoldLines,
      description: 'Where the fabric folds — hems and the flap fold.',
    },
    {
      label: 'Hem line',
      stroke: '#8b5cf6',
      strokeWidth: 2,
      dash: '8 3',
      enabled: settings.showHemLines,
      description: 'Inner edge of folded hem allowance.',
    },
    {
      label: 'Seam allowance',
      stroke: '#f59e0b',
      strokeWidth: 2,
      dash: '8 3',
      enabled: settings.showSeamLines,
      description: 'Inner edge of fabric reserved for the seam.',
    },
    {
      label: 'Tie placement',
      stroke: '#dc2626',
      strokeWidth: 2,
      dash: '6 3',
      enabled: settings.tieEnabled,
      description: 'Rectangle showing where to attach the tie/strap.',
    },
    {
      label: 'Tile grid',
      stroke: '#cccccc',
      strokeWidth: 1.5,
      dash: '2 2',
      enabled: settings.showTileGrid,
      description: 'Boundaries between printed pages.',
    },
  ];

  return (
    <details className="rounded border border-border bg-muted/20 text-xs" open>
      <summary className="cursor-pointer select-none px-3 py-2 font-semibold">Legend</summary>
      <ul className="px-3 pb-3 space-y-1.5">
        {items
          .filter(i => i.enabled)
          .map(i => (
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
