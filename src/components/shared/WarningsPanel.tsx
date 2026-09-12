import { useEffect, useState } from 'react';

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

const escapeId = (s: string) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(s) : s.replace(/[^\w-]/g, '\\$&'));

/**
 * Find the settings control a warning's `field` refers to.
 *
 * Generators name fields in snake_case (`side_seam_allowance`) while the
 * panels give inputs short kebab ids (`side-seam`), so an id lookup alone
 * misses most of them. The last resort matches the field's words against the
 * visible label text, which is what the user is hunting for anyway.
 */
export function resolveFieldControl(field: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const kebab = field.replace(/_/g, '-');
  const direct = document.querySelector<HTMLElement>(
    `[data-field="${escapeId(field)}"], #${escapeId(field)}, [name="${escapeId(field)}"], #${escapeId(kebab)}`,
  );
  if (direct) return direct;

  const words = field.replace(/_/g, ' ').toLowerCase();
  for (const label of Array.from(document.querySelectorAll('label[for]'))) {
    const text = (label.textContent ?? '').trim().toLowerCase();
    if (!text.startsWith(words)) continue;
    const control = document.getElementById((label as HTMLLabelElement).htmlFor);
    if (control) return control;
  }
  return null;
}

function defaultFocusField(field: string) {
  const el = resolveFieldControl(field);
  if (!el) return;
  // Focus first: scrollIntoView is missing in some environments, and losing
  // the scroll must not cost the user the focus as well.
  el.focus({ preventScroll: true });
  try {
    el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  } catch {
    // Non-fatal: the control is focused either way.
  }
}

export function WarningsPanel({ warnings, onFocusField, collapseAbove = 6, title = 'Warnings' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const items = normalizeWarnings(warnings);
  // Offer the "[field]" jump only where a control actually answers to the
  // name; an affordance that does nothing when clicked is worse than none.
  // A page that supplies its own handler owns that decision instead.
  const fieldKey = items.map((w) => w.field ?? '').join('|');
  const [linkable, setLinkable] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    if (onFocusField) return;
    const found = new Set<string>();
    for (const w of items) if (w.field && resolveFieldControl(w.field)) found.add(w.field);
    setLinkable(found);
    // items is rebuilt each render; the field list is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey, onFocusField]);
  const canLink = (field: string) => Boolean(onFocusField) || linkable.has(field);
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
                    {w.field && canLink(w.field) && (
                      <button type="button" className="ml-1 opacity-60 hover:opacity-100 underline" onClick={() => focus(w.field!)} title={`Go to the ${w.field.replace(/_/g, ' ')} setting`}>
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
