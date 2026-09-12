import { useMemo } from 'react';
import type { CircleSkirtInputs } from '../../generators/circle-skirt/types.js';
import { buildPattern } from '../../generators/circle-skirt/index.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import { PatternPreview as SharedPatternPreview } from '../shared/export/index.js';

interface Props {
  inputs: CircleSkirtInputs;
  hasErrors: boolean;
}

export function PatternPreview({ inputs, hasErrors }: Props) {
  const built = useMemo<{ pattern: Pattern | null; error: string | null }>(() => {
    if (hasErrors) return { pattern: null, error: null };
    try {
      return { pattern: { id: 'circle-skirt', name: 'Circle Skirt', pieces: buildPattern(inputs).pieces }, error: null };
    } catch (e) {
      return { pattern: null, error: (e as Error).message };
    }
  }, [inputs, hasErrors]);
  const sa = inputs.seam_allowance ?? 15;
  const saLabel = inputs.units === 'in' ? `${(sa / 25.4).toFixed(2)}"` : `${sa} mm`;
  return <SharedPatternPreview pattern={built.pattern} buildError={built.error} hasErrors={hasErrors} defaultSeamAllowance={sa} saLabel={saLabel} />;
}
