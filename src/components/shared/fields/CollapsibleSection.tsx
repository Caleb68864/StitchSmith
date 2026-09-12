import { useId, useState, type ReactNode } from 'react';

/**
 * A named group of settings that collapses. Long panels (the LBV's 37 fields,
 * the clamshell's 22) are unreadable as one column: everything is equally
 * prominent, so nothing is. Open the group a builder decides first and leave
 * the rest shut, with a one-line summary so a closed group still says
 * something.
 *
 * A plain button with `aria-expanded` (not `<details>`) so screen readers
 * announce the state and tests can find collapsed groups by role.
 */
export function CollapsibleSection({
  title,
  summary,
  lead,
  defaultOpen = false,
  children,
}: {
  title: string;
  /** Compact current state, shown while collapsed (e.g. "11 × 7 in"). */
  summary?: ReactNode;
  /** One line under the title when open. */
  lead?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="rounded border border-border">
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <span className="min-w-0 truncate">{title}</span>
          <span className="flex shrink-0 items-center gap-2">
            {!open && summary && <span className="font-normal text-muted-foreground truncate max-w-[9rem]">{summary}</span>}
            <span aria-hidden="true" className="text-muted-foreground">{open ? '−' : '+'}</span>
          </span>
        </button>
      </h3>
      <div id={`${id}-panel`} hidden={!open} className="space-y-3 px-3 pb-3">
        {lead && <p className="text-[11px] leading-snug text-muted-foreground">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
