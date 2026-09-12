import type { PatternCategory } from '../../app/patternRegistry.js';

/** One small line-art glyph per category, inline SVG so the landing page ships no assets. */
export function CategoryGlyph({ category, className }: { category: PatternCategory; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const cls = className ?? 'h-6 w-6';
  switch (category) {
    case 'pouches':
      return (<svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}><path d="M5 9h14v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" /><path d="M5 9l1.5-4h11L19 9" /><path d="M9 13h6" /></svg>);
    case 'packs':
      return (<svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}><rect x="5" y="7" width="14" height="14" rx="3" /><path d="M9 7V5a3 3 0 0 1 6 0v2" /><path d="M5 14h14" /><path d="M10 14v4h4v-4" /></svg>);
    case 'rigs':
      return (<svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}><path d="M8 3l4 3 4-3" /><path d="M8 3v7a4 4 0 0 0 8 0V3" /><rect x="4" y="12" width="16" height="9" rx="2" /><path d="M8 12v9M12 12v9M16 12v9" /></svg>);
    case 'straps':
      return (<svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}><path d="M4 18c4-8 6-12 10-14" /><path d="M8 20c4-8 6-12 10-14" /><path d="M4 18l4 2M14 4l4 2" /></svg>);
    case 'apparel':
      return (<svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}><path d="M8 4h8l1 4H7z" /><path d="M7 8L3 20h18L17 8" /></svg>);
  }
}
