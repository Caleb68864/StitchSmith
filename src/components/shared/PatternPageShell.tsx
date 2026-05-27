import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  onReset?: () => void;
  resetLabel?: string;
  banner?: ReactNode;
  settings: ReactNode;
  preview: ReactNode;
  sidebar: ReactNode;
}

/**
 * Universal three-column page layout used by every pattern generator.
 *
 *   ┌──────────┬──────────────────────────┬──────────┐
 *   │ Settings │      Pattern SVG         │  Legend  │
 *   │          │      (dominant)          │  Steps   │
 *   │          │                          │  Export  │
 *   └──────────┴──────────────────────────┴──────────┘
 *
 * On narrow viewports the three columns stack vertically (settings → preview →
 * sidebar). `banner` slot sits above the grid for validation/AK warnings.
 */
export function PatternPageShell({
  title,
  subtitle,
  onReset,
  resetLabel = 'Reset to defaults',
  banner,
  settings,
  preview,
  sidebar,
}: Props) {
  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto px-4 py-4 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            {resetLabel}
          </button>
        )}
      </div>

      {banner}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_320px] gap-4 items-start">
        <aside className="space-y-2 min-w-0">{settings}</aside>
        <section className="min-w-0">{preview}</section>
        <aside className="space-y-3 min-w-0">{sidebar}</aside>
      </div>
    </div>
  );
}
