import type { MagPouchBuildResult, MagPouchInputs } from '../../generators/mag-pouch/types.js';
import { PatternPreview as SharedPatternPreview } from '../shared/export/index.js';

interface Props {
  inputs: MagPouchInputs;
  result: MagPouchBuildResult | null;
  errors: Record<string, string>;
}

export function PatternPreview({ inputs, result, errors }: Props) {
  const hasErrors = Object.keys(errors).length > 0;
  const sa = inputs.seamAllowance * 25.4;
  return (
    <SharedPatternPreview
      pattern={result?.pattern ?? null}
      buildError={!hasErrors && !result ? 'Generating preview…' : null}
      hasErrors={hasErrors}
      defaultSeamAllowance={sa}
      saLabel={`${inputs.seamAllowance}"`}
      margin={8}
      pieceGap={8}
    />
  );
}
