import { PATTERNS } from '../../app/patternRegistry.js';
import type { PatternEntry } from '../../app/patternRegistry.js';
import { Button } from '@/components/ui/button';

interface LandingPageProps {
  onSelectPattern: (route: PatternEntry['route']) => void;
}

export function LandingPage({ onSelectPattern }: LandingPageProps) {
  return (
    <div className="flex flex-col items-center py-16 px-4 gap-10">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">StitchSmith</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          Browser-based sewing pattern generators. Choose a project to get started.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {PATTERNS.map(pattern => (
          <div
            key={pattern.id}
            className="rounded-lg border border-border bg-card p-6 flex flex-col gap-4 hover:border-primary/50 transition-colors"
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
    </div>
  );
}
