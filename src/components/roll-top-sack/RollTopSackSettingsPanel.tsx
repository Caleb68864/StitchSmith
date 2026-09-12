import { NumericField as SharedNumericField, type NumericFieldProps, UnitToggle } from '../shared/fields/index.js';
import type { RollTopSackInputs } from '../../generators/roll-top-sack/types.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

/** Panel-local alias: a cleared box reports NaN so validation flags it rather than restoring the default. */
const NumericField = ({ onChange, ...p }: Omit<NumericFieldProps, 'allowEmpty' | 'onChange'> & { onChange: (v: number) => void }) => <SharedNumericField allowEmpty={false} {...p} onChange={(v) => onChange(v as number)} />;


// The fields the panel labels `(${inputs.units})`; seam_allowance is always mm.
const DISPLAY_UNIT_FIELDS = ['bottom_length', 'bottom_width', 'height_when_rolled', 'collar_height'] as const;

interface Props {
  inputs: RollTopSackInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<RollTopSackInputs>) => void;
}


export function RollTopSackSettingsPanel({ inputs, errors, onChange }: Props) {
  function handleUnitsChange(next: UnitSystem) {
    if (next === inputs.units) return;
    onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, inputs.units, next) });
  }

  return (
    <div className="rounded border border-border p-3 space-y-4">
      <h2 className="text-xs font-semibold">Dimensions</h2>

      <div className="grid grid-cols-2 gap-3">
        <NumericField
          id="bottom-length"
          label={`Bottom Length (${inputs.units})`}
          value={inputs.bottom_length}
          error={errors['bottom_length']}
          onChange={v => onChange({ bottom_length: v })}
        />
        <NumericField
          id="bottom-width"
          label={`Bottom Width (${inputs.units})`}
          value={inputs.bottom_width}
          error={errors['bottom_width']}
          onChange={v => onChange({ bottom_width: v })}
        />
        <NumericField
          id="height-when-rolled"
          label={`Body Height (${inputs.units})`}
          value={inputs.height_when_rolled}
          error={errors['height_when_rolled']}
          onChange={v => onChange({ height_when_rolled: v })}
        />
        <NumericField
          id="collar-height"
          label={`Collar Height (${inputs.units})`}
          value={inputs.collar_height}
          error={errors['collar_height']}
          onChange={v => onChange({ collar_height: v })}
        />
      </div>

      <UnitToggle value={inputs.units} onChange={handleUnitsChange} />
    </div>
  );
}
