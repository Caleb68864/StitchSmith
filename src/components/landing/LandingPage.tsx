import { useEffect, useMemo, useState } from 'react';
import { PATTERNS, patternsByCategory, matchesPatternQuery, patternSummary, patternCategory } from '../../app/patternRegistry.js';
import type { PatternEntry } from '../../app/patternRegistry.js';
import { CategoryGlyph } from './CategoryGlyph.js';
import { readRecent } from './recent.js';

interface LandingPageProps {
  onSelectPattern: (route: PatternEntry['route']) => void;
}

function PatternCard({ pattern, onOpen, compact = false }: { pattern: PatternEntry; onOpen: () => void; compact?: boolean }) {
  const category = patternCategory(pattern);
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!pattern.available}
      aria-label={pattern.available ? `Open ${pattern.title}` : `${pattern.title} (coming soon)`}
      title={pattern.description}
      className={`group text-left rounded-lg border border-border bg-card flex gap-3 transition-all hover:border-primary/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${compact ? 'p-3 items-center min-w-[12rem]' : 'p-4 items-start'}`}
    >
      <span className="shrink-0 rounded-md bg-muted p-2 text-muted-foreground group-hover:text-foreground"><CategoryGlyph category={category} className={compact ? 'h-4 w-4' : 'h-5 w-5'} /></span>
      <span className="min-w-0 space-y-1">
        <span className="block text-sm font-semibold leading-tight">{pattern.title}</span>
        {!compact && <span className="block text-xs text-muted-foreground leading-snug">{patternSummary(pattern)}</span>}
      </span>
    </button>
  );
}

export function LandingPage({ onSelectPattern }: LandingPageProps) {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { setRecent(readRecent()); }, []);

  const filtered = useMemo(() => PATTERNS.filter((p) => matchesPatternQuery(p, query)), [query]);
  const groups = useMemo(() => patternsByCategory(filtered), [filtered]);
  const recentEntries = useMemo(() => recent.map((id) => PATTERNS.find((p) => p.id === id)).filter((p): p is PatternEntry => !!p), [recent]);
  const showRecent = recentEntries.length > 0 && query.trim() === '';

  return (
    <div className="flex flex-col items-center py-10 px-4 gap-8 w-full">
      <div className="text-center space-y-3 max-w-xl">
        <h1 className="text-4xl font-bold tracking-tight">StitchSmith</h1>
        <p className="text-muted-foreground text-sm">
          Parametric sewing patterns in your browser. Pick a project, dial in the dimensions,
          check it in 3D, and export to SVG, PDF or DXF — every cut line, seam and hem to scale.
        </p>
        <p className="text-xs text-muted-foreground">
          Each generator keeps its own project, saved in this browser as you type. Export downloads a
          file you can share or back up. Nothing is uploaded anywhere.
        </p>
      </div>

      <div className="w-full max-w-4xl space-y-6">
        <div className="space-y-1">
          <label htmlFor="pattern-search" className="sr-only">Find a generator</label>
          <input
            id="pattern-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Find a generator — try "PALS", "zipper" or "sling" (${PATTERNS.length} available)`}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="sr-only" role="status" aria-live="polite">
            {query.trim() === ''
              ? `${PATTERNS.length} generators`
              : `${filtered.length} of ${PATTERNS.length} generators match ${query}`}
          </p>
        </div>

        {showRecent && (
          <section aria-labelledby="recent-heading" className="space-y-2">
            <h2 id="recent-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recently opened</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentEntries.map((p) => <PatternCard key={p.id} pattern={p} compact onOpen={() => onSelectPattern(p.route)} />)}
            </div>
          </section>
        )}

        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nothing matches “{query}”. Try a platform (5.56, AK), a feature (PALS, zipper, foam) or a product name.</p>
        )}

        {groups.map(({ category, patterns }) => (
          <section key={category.id} aria-labelledby={`cat-${category.id}`} className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
              <h2 id={`cat-${category.id}`} className="text-base font-semibold">{category.title}</h2>
              <p className="text-xs text-muted-foreground">{category.blurb}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {patterns.map((p) => <PatternCard key={p.id} pattern={p} onOpen={() => onSelectPattern(p.route)} />)}
            </div>
          </section>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-md">
        Every pattern is derived from a measured build, not a stock template. Where a dimension was never
        stated, the field says <span className="font-medium">measure</span> — mock it before you cut.
      </p>
    </div>
  );
}
