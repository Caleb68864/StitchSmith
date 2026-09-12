import { useMemo } from 'react';
import type { ZipPouchInputs } from '../../generators/zip-pouch/types.js';
import { buildPattern } from '../../generators/zip-pouch/buildPattern.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import { PatternPreview as SharedPatternPreview } from '../shared/export/index.js';

interface Props {
  inputs: ZipPouchInputs;
  hasErrors: boolean;
}

export function PatternPreview({ inputs, hasErrors }: Props) {
  const built = useMemo<{ pattern: Pattern | null; error: string | null }>(() => {
    if (hasErrors) return { pattern: null, error: null };
    try {
      const r = buildPattern(inputs);
      if (!r.ok) return { pattern: null, error: r.errors[0]?.message ?? 'Build failed' };
      return { pattern: { id: 'zip-pouch', name: 'Zip Pouch', pieces: r.value.pieces }, error: null };
    } catch (e) {
      return { pattern: null, error: (e as Error).message };
    }
  }, [inputs, hasErrors]);
  // seam_allowance is in the display unit (resolveInputs converts it); the
  // exporter wants millimetres, so an inch project must not hand it 0.375.
  const units = inputs.units ?? 'mm';
  const sa = inputs.seam_allowance ?? (units === 'in' ? 0.375 : 10);
  const saMm = units === 'in' ? sa * 25.4 : sa;
  return <SharedPatternPreview pattern={built.pattern} buildError={built.error} hasErrors={hasErrors} defaultSeamAllowance={saMm} saLabel={`${sa} ${units}`} />;
}
