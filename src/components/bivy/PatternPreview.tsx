import { useMemo } from 'react';
import type { BivyInputs } from '../../generators/bivy/types.js';
import { buildPattern } from '../../generators/bivy/index.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import { PatternPreview as SharedPatternPreview } from '../shared/export/index.js';

interface Props {
  inputs: BivyInputs;
  hasErrors: boolean;
}

/** Builds the pattern for the shared preview. */
export function PatternPreview({ inputs, hasErrors }: Props) {
  const built = useMemo<{ pattern: Pattern | null; error: string | null }>(() => {
    if (hasErrors) return { pattern: null, error: null };
    try {
      const r = buildPattern(inputs);
      if (!r.ok) return { pattern: null, error: r.errors.map((e) => e.message).join('; ') };
      return { pattern: { id: 'bivy', name: 'Bivy', pieces: r.value.pieces }, error: null };
    } catch (e) {
      return { pattern: null, error: (e as Error).message };
    }
  }, [inputs, hasErrors]);
  return <SharedPatternPreview pattern={built.pattern} buildError={built.error} hasErrors={hasErrors} defaultSeamAllowance={0} />;
}
