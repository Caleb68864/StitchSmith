import type { ToolRollLayout } from '../../generators/tool-roll/types.js';

interface PatternSummaryProps {
  layout: ToolRollLayout | null;
  toolCount: number;
  units: 'mm' | 'in';
}

function fmt(val: number, units: 'mm' | 'in', decimals = 1): string {
  const v = units === 'in' ? val / 25.4 : val;
  return `${v.toFixed(units === 'in' ? 3 : decimals)} ${units}`;
}

interface SummaryRowProps {
  label: string;
  value: string;
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex justify-between items-baseline gap-2 py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function PatternSummary({ layout, toolCount, units }: PatternSummaryProps) {
  if (!layout) {
    return (
      <div className="rounded border border-border p-3">
        <h3 className="text-xs font-semibold mb-2">Pattern Summary</h3>
        <p className="text-xs text-muted-foreground">Add tools to see pattern dimensions.</p>
      </div>
    );
  }

  const pockets = layout.pockets;
  const maxDepth = pockets.length > 0 ? Math.max(...pockets.map(p => p.pocketDepth)) : 0;
  const maxWidth = pockets.length > 0 ? Math.max(...pockets.map(p => p.pocketWidth)) : 0;

  const fabricCutW = layout.patternWidth + (layout.units === 'mm' ? 19 : 19);
  const fabricCutH = layout.patternHeight + 25.4;

  return (
    <div className="rounded border border-border p-3">
      <h3 className="text-xs font-semibold mb-2">Pattern Summary</h3>
      <div className="divide-y divide-border/50">
        <div className="pb-1.5">
          <SummaryRow
            label="Pattern size"
            value={`${fmt(layout.patternWidth, units)} × ${fmt(layout.patternHeight, units)}`}
          />
          <SummaryRow
            label="Fabric cut size (approx.)"
            value={`${fmt(fabricCutW, units)} × ${fmt(fabricCutH, units)}`}
          />
        </div>
        <div className="py-1.5">
          <SummaryRow label="Tool count" value={`${toolCount}`} />
          <SummaryRow label="Pocket count" value={`${pockets.length}`} />
        </div>
        <div className="py-1.5">
          <SummaryRow label="Max pocket depth" value={maxDepth > 0 ? fmt(maxDepth, units) : '—'} />
          <SummaryRow label="Widest pocket" value={maxWidth > 0 ? fmt(maxWidth, units) : '—'} />
        </div>
        <div className="pt-1.5">
          <SummaryRow
            label="Print pages"
            value={`${layout.printLayout.totalPages} page${layout.printLayout.totalPages !== 1 ? 's' : ''}`}
          />
          <SummaryRow
            label="Grid"
            value={`${layout.printLayout.columns}×${layout.printLayout.rows}`}
          />
        </div>
      </div>
    </div>
  );
}
