import type { ReactNode } from 'react';

/** Section title inside a settings panel; optional one-line lead under it. */
export function SectionHeader({ children, lead, as: Tag = 'h3' }: { children: ReactNode; lead?: ReactNode; as?: 'h2' | 'h3' | 'h4' }) {
  return (
    <div className="space-y-0.5 pt-1">
      <Tag className="text-xs font-semibold tracking-wide">{children}</Tag>
      {lead && <p className="text-[11px] leading-snug text-muted-foreground">{lead}</p>}
    </div>
  );
}
