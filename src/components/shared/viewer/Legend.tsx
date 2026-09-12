interface Entry { id: string; name: string; color: number }

/** Swatch → piece name key for the 3D scene; collapsed by default when the scene is busy. */
export function ViewerLegend({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return null;
  return (
    <details className="text-xs" open={entries.length <= 8} data-testid="viewer-legend">
      <summary className="cursor-pointer select-none text-muted-foreground">Pieces ({entries.length})</summary>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center gap-1">
            <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm border border-border" style={{ backgroundColor: `#${e.color.toString(16).padStart(6, '0')}` }} />
            <span>{e.name}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
