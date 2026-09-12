import type { ReactNode } from 'react';

/** One short sentence under a field or section: the default, and the vault rule where one exists. */
export function HelpText({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return <p id={id} className={`text-[11px] leading-snug text-muted-foreground ${className ?? ''}`}>{children}</p>;
}
