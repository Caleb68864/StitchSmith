import { PATTERNS } from '../../app/patternRegistry.js';
import type { PatternEntry } from '../../app/patternRegistry.js';
import { Button } from '@/components/ui/button';

interface LandingPageProps {
  onSelectPattern: (route: PatternEntry['route']) => void;
}

export function LandingPage({ onSelectPattern }: LandingPageProps) {
  return (
    <div className="flex flex-col items-center py-16 px-4 gap-10">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">StitchSmith</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Parametric sewing patterns in your browser. Pick a project, dial in the dimensions,
          and export to SVG, PDF, or DXF — every cut line, seam, and hem to scale.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {PATTERNS.map(pattern => (
          <div
            key={pattern.id}
            className="rounded-lg border border-border bg-card p-6 flex flex-col gap-4 transition-all hover:border-primary/50 hover:shadow-sm hover:-translate-y-0.5"
          >
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{pattern.title}</h2>
              <p className="text-sm text-muted-foreground">{pattern.description}</p>
            </div>
            <Button
              onClick={() => onSelectPattern(pattern.route)}
              disabled={!pattern.available}
              className="mt-auto"
            >
              {pattern.available ? `Open ${pattern.title}` : 'Coming Soon'}
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center max-w-md">
        Patterns are saved to your browser automatically. Use Export to download a project file
        you can share or back up.
      </p>
    </div>
  );
}
