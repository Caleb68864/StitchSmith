import { useMemo } from 'react';
import type { TriZipInputs } from '../../generators/tri-zip-backpack/types.js';
import { buildPattern } from '../../generators/tri-zip-backpack/buildPattern.js';
import { getPreset } from '../../generators/tri-zip-backpack/stylePresets.js';
import { patternToSvg } from '../../lib/pattern-engine/exports/svg.js';

interface Props {
  inputs: TriZipInputs;
  hasErrors: boolean;
}

export function PatternPreview({ inputs, hasErrors }: Props) {
  const svgMarkup = useMemo(() => {
    if (hasErrors) return null;
    try {
      const preset = getPreset(inputs.stylePreset);
      const result = buildPattern(inputs, preset);
      if (!result.ok) return null;
      return patternToSvg(result.value);
    } catch {
      return null;
    }
  }, [inputs, hasErrors]);

  if (!svgMarkup) {
    return (
      <div className="rounded border border-dashed border-border p-6 flex items-center justify-center bg-muted/20 min-h-48">
        <p className="text-xs text-muted-foreground">
          {hasErrors
            ? 'Fix validation errors to see pattern preview.'
            : 'Pattern preview unavailable.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded border border-border overflow-auto bg-white">
      <div
        className="pattern-preview-svg"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
}
