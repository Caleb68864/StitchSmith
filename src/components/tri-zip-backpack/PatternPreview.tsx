import { useMemo } from 'react';
import type { TriZipInputs } from '../../generators/tri-zip-backpack/types.js';
import { buildPattern } from '../../generators/tri-zip-backpack/buildPattern.js';
import { getPreset } from '../../generators/tri-zip-backpack/stylePresets.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import { PatternPreview as SharedPatternPreview } from '../shared/export/index.js';

interface Props {
  inputs: TriZipInputs;
  hasErrors: boolean;
  showLabels: boolean;
  onShowLabelsChange: (v: boolean) => void;
}

export function PatternPreview({ inputs, hasErrors, showLabels, onShowLabelsChange }: Props) {
  const built = useMemo<{ pattern: Pattern | null; error: string | null }>(() => {
    if (hasErrors) return { pattern: null, error: null };
    try {
      const r = buildPattern(inputs, getPreset(inputs.stylePreset));
      if (!r.ok) return { pattern: null, error: r.error.message };
      return { pattern: r.value, error: null };
    } catch (e) {
      return { pattern: null, error: (e as Error).message };
    }
  }, [inputs, hasErrors]);
  const sa = inputs.seam_allowance ?? 10;
  return <SharedPatternPreview pattern={built.pattern} buildError={built.error} hasErrors={hasErrors} defaultSeamAllowance={sa} saLabel={`${sa} mm`} showLabels={showLabels} onShowLabelsChange={onShowLabelsChange} />;
}
