import { useMemo } from 'react';
import type { RollTopSackInputs } from '../../generators/roll-top-sack/types.js';
import { buildPattern } from '../../generators/roll-top-sack/index.js';
import { patternToSvg } from '../../lib/pattern-engine/exports/svg.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import { PatternViewport } from '../shared/PatternViewport.js';

interface Props {
  inputs: RollTopSackInputs;
  hasErrors: boolean;
}

export function PatternPreview({ inputs, hasErrors }: Props) {
  const result = useMemo<{ svg: string; pieceCount: number; buildError: string | null } | null>(() => {
    if (hasErrors) return null;
    try {
      const r = buildPattern(inputs);
      if (!r.ok) return { svg: '', pieceCount: 0, buildError: r.error.message };
      const pattern: Pattern = { id: 'roll-top-sack', name: 'Roll-Top Stuff Sack', pieces: r.value.pieces };
      const svg = patternToSvg(pattern, {
        defaultSeamAllowance: inputs.seam_allowance ?? 9.5,
        showLabels: true,
      });
      return { svg, pieceCount: r.value.pieces.length, buildError: null };
    } catch (e) {
      return { svg: '', pieceCount: 0, buildError: (e as Error).message };
    }
  }, [inputs, hasErrors]);

  if (!result) {
    return (
      <div className="rounded border border-dashed border-border p-6 flex items-center justify-center bg-muted/20 min-h-48">
        <p className="text-xs text-muted-foreground">Fix the validation errors to preview the pattern.</p>
      </div>
    );
  }
  if (result.buildError) {
    return (
      <div className="rounded border border-destructive/50 bg-destructive/5 p-4 space-y-1">
        <p className="text-xs font-semibold text-destructive">Pattern build failed</p>
        <p className="text-xs text-destructive">{result.buildError}</p>
      </div>
    );
  }

  const header = (
    <span>
      <span className="font-medium text-foreground">{result.pieceCount}</span> piece type{result.pieceCount === 1 ? '' : 's'}
      <span className="ml-2">SA: {inputs.seam_allowance ?? 9.5} mm</span>
    </span>
  );
  return <PatternViewport svg={result.svg} header={header} fitKey={result.svg.length} />;
}
