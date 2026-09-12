import type { ReactNode } from 'react';

export interface DerivedRow {
  label: string;
  value: ReactNode;
}

interface Props {
  rows: DerivedRow[];
  title?: string;
  /** Kept stable for tests and e2e; default `derived-numbers`. */
  testId?: string;
}

const IN = 25.4;
/** mm → inches with up to two decimals and no trailing zeros. */
export function inch(mm: number): string {
  return (mm / IN).toFixed(2).replace(/\.?0+$/, '');
}
/** mm → `N"` or `N mm` in the display unit. */
export function fmtLength(mm: number, units: 'mm' | 'in' = 'in'): string {
  return units === 'in' ? `${inch(mm)}"` : `${Math.round(mm * 10) / 10} mm`;
}

/** The numbers a generator derived, as label / value rows so every page reads the same. */
export function DerivedNumbers({ rows, title = 'Derived numbers', testId = 'derived-numbers' }: Props) {
  const shown = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== false);
  if (shown.length === 0) return null;
  return (
    <div className="rounded border border-border p-3 space-y-1 text-xs" data-testid={testId}>
      <h2 className="font-semibold">{title}</h2>
      <div className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3 gap-y-1">
        {shown.map((r) => (
          <div key={r.label} className="contents">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="break-words">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
