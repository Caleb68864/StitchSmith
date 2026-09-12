import { useMemo } from 'react';
import type { BookCoverProjectInputs } from '../../state/useBookCoverProject.js';
import { buildPattern } from '../../generators/book-cover/index.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import { PatternPreview as SharedPatternPreview } from '../shared/export/index.js';

interface Props {
  inputs: BookCoverProjectInputs;
  hasErrors: boolean;
}

export function PatternPreview({ inputs, hasErrors }: Props) {
  const built = useMemo<{ pattern: Pattern | null; error: string | null }>(() => {
    if (hasErrors) return { pattern: null, error: null };
    try {
      const r = buildPattern(inputs);
      if (!r.ok) return { pattern: null, error: r.error.message };
      return { pattern: { id: 'book-cover', name: 'Book Cover', pieces: r.value.pieces }, error: null };
    } catch (e) {
      return { pattern: null, error: (e as Error).message };
    }
  }, [inputs, hasErrors]);
  const sa = inputs.seam_allowance ?? 9.5;
  return <SharedPatternPreview pattern={built.pattern} buildError={built.error} hasErrors={hasErrors} defaultSeamAllowance={sa} saLabel={`${sa} mm`} margin={8} pieceGap={8} />;
}
