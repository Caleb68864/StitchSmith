import { useMemo } from 'react';
import { Tag, TagsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TriZipInputs } from '../../generators/tri-zip-backpack/types.js';
import { buildPattern } from '../../generators/tri-zip-backpack/buildPattern.js';
import { getPreset } from '../../generators/tri-zip-backpack/stylePresets.js';
import { patternToSvg } from '../../lib/pattern-engine/exports/svg.js';
import { PatternViewport } from '../shared/PatternViewport.js';

interface Props {
  inputs: TriZipInputs;
  hasErrors: boolean;
  showLabels: boolean;
  onShowLabelsChange: (v: boolean) => void;
}

interface PatternResult {
  svg: string;
  pieceCount: number;
  totalQuantity: number;
  buildError: string | null;
}

export function PatternPreview({ inputs, hasErrors, showLabels, onShowLabelsChange }: Props) {
  const result = useMemo<PatternResult | null>(() => {
    if (hasErrors) return null;
    try {
      const preset = getPreset(inputs.stylePreset);
      const r = buildPattern(inputs, preset);
      if (!r.ok) return { svg: '', pieceCount: 0, totalQuantity: 0, buildError: r.error.message };
      const svg = patternToSvg(r.value, {
        defaultSeamAllowance: inputs.seam_allowance ?? 10,
        showLabels,
      });
      const pieceCount = r.value.pieces.length;
      const totalQuantity = r.value.pieces.reduce((s, p) => s + p.quantity, 0);
      return { svg, pieceCount, totalQuantity, buildError: null };
    } catch (e) {
      return { svg: '', pieceCount: 0, totalQuantity: 0, buildError: (e as Error).message };
    }
  }, [inputs, hasErrors, showLabels]);

  if (!result) {
    return (
      <div className="rounded border border-dashed border-border p-6 flex items-center justify-center bg-muted/20 min-h-48">
        <p className="text-xs text-muted-foreground">Fix the validation errors below to preview the pattern.</p>
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
      <span className="font-medium text-foreground">{result.pieceCount}</span> piece type{result.pieceCount === 1 ? '' : 's'} ·{' '}
      <span className="font-medium text-foreground">{result.totalQuantity}</span> total · SA: {inputs.seam_allowance ?? 10} mm
    </span>
  );
  const toolbarExtras = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onShowLabelsChange(!showLabels)}
      className={`h-7 w-7 p-0 ${showLabels ? 'text-foreground' : 'text-muted-foreground'}`}
      title={showLabels ? 'Hide piece labels' : 'Show piece labels'}
      aria-pressed={showLabels}
    >
      {showLabels ? <Tag className="h-3.5 w-3.5" /> : <TagsIcon className="h-3.5 w-3.5 opacity-40" />}
    </Button>
  );

  return (
    <PatternViewport svg={result.svg} header={header} toolbarExtras={toolbarExtras} fitKey={result.svg.length} />
  );
}
