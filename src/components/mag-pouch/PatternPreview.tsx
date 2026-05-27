import { useMemo } from 'react';
import type { MagPouchBuildResult } from '../../generators/mag-pouch/types.js';
import { patternToSvg } from '../../lib/pattern-engine/exports/svg.js';
import { PatternViewport } from '../shared/PatternViewport.js';

interface Props {
  result: MagPouchBuildResult | null;
  errors: Record<string, string>;
}

export function PatternPreview({ result, errors }: Props) {
  const hasErrors = Object.keys(errors).length > 0;

  const svg = useMemo(() => {
    if (!result) return '';
    return patternToSvg(result.pattern, { margin: 8, pieceGap: 8, showLabels: true });
  }, [result]);

  if (hasErrors) {
    return (
      <div className="rounded border border-border bg-card p-3">
        <div className="rounded bg-muted/30 flex items-center justify-center h-48 text-xs text-muted-foreground">
          Fix validation errors to see preview
        </div>
      </div>
    );
  }
  if (!result) {
    return (
      <div className="rounded border border-border bg-card p-3">
        <div className="rounded bg-muted/30 flex items-center justify-center h-48 text-xs text-muted-foreground">
          Generating preview…
        </div>
      </div>
    );
  }

  const pieceCount = result.pattern.pieces.length;
  const header = (
    <span>
      <span className="font-medium text-foreground">{pieceCount}</span> piece type{pieceCount === 1 ? '' : 's'}
    </span>
  );
  return <PatternViewport svg={svg} header={header} fitKey={svg.length} />;
}
