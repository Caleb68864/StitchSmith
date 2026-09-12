import { useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'stitchsmith.preview-tab';
type Tab = 'pattern' | 'assembly';

interface Props {
  /** The flat pattern preview (SVG). */
  pattern: ReactNode;
  /** The 3D assembled view, or null when the generator has nothing to assemble. */
  assembly: ReactNode | null;
  /** Shown under the 3D view only (fit reports). */
  assemblyExtra?: ReactNode;
  /** Why there is no assembly (shown on the disabled tab and in the pane). */
  unavailableReason?: string;
}

function loadTab(): Tab {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'assembly' ? 'assembly' : 'pattern';
  } catch {
    return 'pattern';
  }
}

/**
 * Two tabs over the preview column: the flat pattern, and the pattern
 * assembled in 3D (the cloth simulation, started as sewn). The choice is
 * remembered across pages and sessions.
 */
export function PreviewTabs({ pattern, assembly, assemblyExtra, unavailableReason }: Props) {
  const [tab, setTab] = useState<Tab>(loadTab);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, tab); } catch { /* storage unavailable */ }
  }, [tab]);
  const showAssembly = tab === 'assembly' && assembly !== null;
  const tabClass = (t: Tab) =>
    `px-3 py-1.5 text-xs rounded-t border border-b-0 ${tab === t ? 'bg-card border-border font-semibold' : 'bg-muted/40 border-transparent text-muted-foreground hover:text-foreground'}`;
  return (
    <div className="space-y-0" data-testid="preview-tabs">
      <div className="flex gap-1 items-end" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'pattern'} className={tabClass('pattern')} onClick={() => setTab('pattern')}>Pattern</button>
        <button type="button" role="tab" aria-selected={tab === 'assembly'} className={tabClass('assembly')} onClick={() => setTab('assembly')} disabled={assembly === null} title={assembly === null ? (unavailableReason ?? 'Nothing to assemble for the current inputs') : 'See the pattern sewn up in 3D'}>3D assembly</button>
      </div>
      <div className="rounded-b rounded-tr border border-border bg-card p-3 space-y-3">
        {!showAssembly && pattern}
        {showAssembly && assembly}
        {showAssembly && assemblyExtra}
        {tab === 'assembly' && assembly === null && (
          <p className="text-xs text-muted-foreground">{unavailableReason ?? 'Nothing to assemble for the current inputs; fix the validation errors or pick a construction the 3D check supports.'}</p>
        )}
      </div>
    </div>
  );
}
