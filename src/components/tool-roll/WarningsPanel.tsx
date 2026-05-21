import type { PatternWarning } from '../../generators/tool-roll/types.js';

interface WarningsPanelProps {
  warnings: PatternWarning[];
}

const SEVERITY_CONFIG = {
  error: {
    label: 'Errors',
    containerClass: 'bg-destructive/10 border-destructive/30',
    textClass: 'text-destructive',
    badgeClass: 'bg-destructive text-destructive-foreground',
    icon: '✕',
  },
  warning: {
    label: 'Warnings',
    containerClass: 'bg-yellow-500/10 border-yellow-500/30',
    textClass: 'text-yellow-700 dark:text-yellow-400',
    badgeClass: 'bg-yellow-500 text-white',
    icon: '⚠',
  },
  info: {
    label: 'Info',
    containerClass: 'bg-blue-500/10 border-blue-500/30',
    textClass: 'text-blue-700 dark:text-blue-400',
    badgeClass: 'bg-blue-500 text-white',
    icon: 'ℹ',
  },
} as const;

type Severity = PatternWarning['severity'];

export function WarningsPanel({ warnings }: WarningsPanelProps) {
  if (warnings.length === 0) {
    return (
      <div className="rounded border border-border p-3">
        <h3 className="text-xs font-semibold mb-1">Warnings</h3>
        <p className="text-xs text-muted-foreground">No issues detected.</p>
      </div>
    );
  }

  const grouped: Record<Severity, PatternWarning[]> = {
    error: [],
    warning: [],
    info: [],
  };

  for (const w of warnings) {
    grouped[w.severity].push(w);
  }

  const severityOrder: Severity[] = ['error', 'warning', 'info'];

  return (
    <div className="rounded border border-border p-3 space-y-2">
      <h3 className="text-xs font-semibold">
        Warnings{' '}
        <span className="text-muted-foreground font-normal">({warnings.length})</span>
      </h3>
      {severityOrder.map(severity => {
        const items = grouped[severity];
        if (items.length === 0) return null;
        const cfg = SEVERITY_CONFIG[severity];
        return (
          <div key={severity} className={`rounded border p-2 ${cfg.containerClass}`}>
            <div className="flex items-center gap-1 mb-1">
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.textClass}`}>
                {cfg.icon} {cfg.label}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cfg.badgeClass}`}>
                {items.length}
              </span>
            </div>
            <ul className="space-y-0.5">
              {items.map(w => (
                <li key={w.id} className={`text-xs ${cfg.textClass}`}>
                  {w.message}
                  {w.field && (
                    <span className="ml-1 opacity-60">[{w.field}]</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
