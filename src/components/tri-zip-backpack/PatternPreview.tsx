import { useMemo } from 'react';
import type { TriZipInputs } from '../../generators/tri-zip-backpack/types.js';
import { buildPattern } from '../../generators/tri-zip-backpack/buildPattern.js';
import { getPreset } from '../../generators/tri-zip-backpack/stylePresets.js';
import { patternToSvg } from '../../lib/pattern-engine/exports/svg.js';

interface Props {
  inputs: TriZipInputs;
  hasErrors: boolean;
}

interface PatternResult {
  svg: string;
  pieceCount: number;
  totalQuantity: number;
  buildError: string | null;
}

export function PatternPreview({ inputs, hasErrors }: Props) {
  const result = useMemo<PatternResult | null>(() => {
    if (hasErrors) return null;
    try {
      const preset = getPreset(inputs.stylePreset);
      const r = buildPattern(inputs, preset);
      if (!r.ok) return { svg: '', pieceCount: 0, totalQuantity: 0, buildError: r.error.message };
      const svg = patternToSvg(r.value, { defaultSeamAllowance: inputs.seam_allowance ?? 10 });
      const pieceCount = r.value.pieces.length;
      const totalQuantity = r.value.pieces.reduce((s, p) => s + p.quantity, 0);
      return { svg, pieceCount, totalQuantity, buildError: null };
    } catch (e) {
      return { svg: '', pieceCount: 0, totalQuantity: 0, buildError: (e as Error).message };
    }
  }, [inputs, hasErrors]);

  if (!result) {
    return (
      <div className="rounded border border-dashed border-border p-6 flex items-center justify-center bg-muted/20 min-h-48">
        <p className="text-xs text-muted-foreground">
          Fix the validation errors below to preview the pattern.
        </p>
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          <span className="font-medium text-foreground">{result.pieceCount}</span> piece type
          {result.pieceCount === 1 ? '' : 's'} ·{' '}
          <span className="font-medium text-foreground">{result.totalQuantity}</span> total piece
          {result.totalQuantity === 1 ? '' : 's'} to cut
        </span>
        <span>SA: {inputs.seam_allowance ?? 10} mm · Hem: {inputs.hem_allowance ?? 25} mm</span>
      </div>
      <div className="rounded border border-border overflow-auto bg-white">
        <div
          className="pattern-preview-svg"
          dangerouslySetInnerHTML={{ __html: result.svg }}
          style={{ maxWidth: '100%' }}
        />
      </div>
    </div>
  );
}
