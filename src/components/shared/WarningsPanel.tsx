import { useState } from 'react';

export type WarningSeverity = 'error' | 'warning' | 'info';

export interface UiWarning {
  id: string;
  severity: WarningSeverity;
  message: string;
  /** Input field the message refers to; clickable when the panel is given `onFocusField`. */
  field?: string;
  /** `mock-derived`: the number is a placeholder to mock up, not a vault figure. */
  tag?: string;
}

/** Accepts plain strings (rendered as warnings) or structured warnings. */
export type WarningInput = string | UiWarning;

interface Props {
  warnings: WarningInput[];
  /** Focus the settings control for a warning's field (scrolls to `[data-field]` / `#field` / `[name=field]` by default). */
  onFocusField?: (field: string) => void;
  /** Collapse the list behind a summary when there are more than this many. Default 6. */
  collapseAbove?: number;
  title?: string;
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

const TAG_LABEL: Record<string, string> = { 'mock-derived': 'mock first' };

/** Normalise strings and generator warnings into UiWarning; a `[mock-derived]` prefix becomes the tag. */
export function normalizeWarnings(warnings: WarningInput[], idPrefix = 'warning'): UiWarning[] {
  return warnings.filter(Boolean).map((w, i) => {
    if (typeof w === 'string') {
      const m = /^\[([a-z-]+)\]\s*/i.exec(w);
      return { id: `${idPrefix}-${i}`, severity: 'warning', message: m ? w.slice(m[0].length) : w, tag: m?.[1] };
    }
    return w;
  });
}

function defaultFocusField(field: string) {
  if (typeof document === 'undefined') return;
  const el = document.querySelector<HTMLElement>(`[data-field="${field}"], #${CSS.escape(field)}, [name="${field}"], #${CSS.escape(field.replace(/_/g, '-'))}`);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.focus();
}

export function WarningsPanel({ warnings, onFocusField, collapseAbove = 6, title = 'Warnings' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const items = normalizeWarnings(warnings);
  if (items.length === 0) {
    return (
      <div className="rounded border border-border p-3" data-testid="warnings-panel">
        <h3 className="text-xs font-semibold mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground">No issues detected.</p>
      </div>
    );
  }

  const grouped: Record<WarningSeverity, UiWarning[]> = { error: [], warning: [], info: [] };
  for (const w of items) grouped[w.severity]?.push(w);
  const severityOrder: WarningSeverity[] = ['error', 'warning', 'info'];
  const collapsed = items.length > collapseAbove && !expanded;
  const focus = onFocusField ?? defaultFocusField;
  const counts = severityOrder.filter((s) => grouped[s].length > 0).map((s) => `${grouped[s].length} ${s === 'error' ? 'error' : s}${grouped[s].length === 1 ? '' : 's'}`).join(', ');

  return (
    <div className="rounded border border-border p-3 space-y-2" data-testid="warnings-panel">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold">
          {title} <span className="text-muted-foreground font-normal">({items.length})</span>
        </h3>
        {items.length > collapseAbove && (
          <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground underline" onClick={() => setExpanded((v) => !v)} aria-expanded={!collapsed}>
            {collapsed ? 'Show all' : 'Collapse'}
          </button>
        )}
      </div>
      {collapsed ? (
        <p className="text-xs text-muted-foreground">{counts}. {grouped.error[0]?.message ?? grouped.warning[0]?.message ?? grouped.info[0]?.message}</p>
      ) : (
        severityOrder.map((severity) => {
          const list = grouped[severity];
          if (list.length === 0) return null;
          const cfg = SEVERITY_CONFIG[severity];
          return (
            <div key={severity} className={`rounded border p-2 ${cfg.containerClass}`}>
              <div className="flex items-center gap-1 mb-1">
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.textClass}`}>{cfg.icon} {cfg.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cfg.badgeClass}`}>{list.length}</span>
              </div>
              <ul className="space-y-0.5">
                {list.map((w) => (
                  <li key={w.id} className={`text-xs ${cfg.textClass}`}>
                    {w.tag && <span className="mr-1 rounded bg-muted px-1 py-0.5 text-[10px] text-foreground/80" title={w.tag}>{TAG_LABEL[w.tag] ?? w.tag}</span>}
                    {w.message}
                    {w.field && (
                      <button type="button" className="ml-1 opacity-60 hover:opacity-100 underline" onClick={() => focus(w.field!)} title={`Go to ${w.field}`}>
                        [{w.field}]
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}
