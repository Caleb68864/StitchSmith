import { PATTERNS, patternsByCategory } from '../../app/patternRegistry.js';
import type { PatternEntry } from '../../app/patternRegistry.js';

/** Compact header control: jump straight to another generator without going home. */
export function GeneratorSwitcher({ current, onSelect }: { current: PatternEntry['route']; onSelect: (route: PatternEntry['route']) => void }) {
  const groups = patternsByCategory(PATTERNS.filter((p) => p.available));
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="sr-only sm:not-sr-only">Switch generator</span>
      <select
        aria-label="Switch generator"
        value={current}
        onChange={(e) => { const route = e.target.value as PatternEntry['route']; if (route !== current) onSelect(route); }}
        className="h-7 max-w-[11rem] rounded-md border border-input bg-background px-2 text-xs text-foreground"
      >
        {groups.map(({ category, patterns }) => (
          <optgroup key={category.id} label={category.title}>
            {patterns.map((p) => <option key={p.id} value={p.route}>{p.title}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
