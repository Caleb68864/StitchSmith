import { useMemo } from 'react';
import type { PaddedStrapInputs } from '../../generators/padded-strap/types.js';
import { buildPattern } from '../../generators/padded-strap/index.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import { PatternPreview as SharedPatternPreview } from '../shared/export/index.js';

interface Props {
  inputs: PaddedStrapInputs;
  hasErrors: boolean;
}

/** Builds the pattern for the shared preview. */
export function PatternPreview({ inputs, hasErrors }: Props) {
  const built = useMemo<{ pattern: Pattern | null; error: string | null }>(() => {
    if (hasErrors) return { pattern: null, error: null };
    try {
      const r = buildPattern(inputs);
      if (!r.ok) return { pattern: null, error: r.errors.map((e) => e.message).join('; ') };
      return { pattern: { id: 'padded-strap', name: 'Padded Strap', pieces: r.value.pieces }, error: null };
    } catch (e) {
      return { pattern: null, error: (e as Error).message };
    }
  }, [inputs, hasErrors]);
  return <SharedPatternPreview pattern={built.pattern} buildError={built.error} hasErrors={hasErrors} defaultSeamAllowance={inputs.seam_allowance ?? 10} />;
}
