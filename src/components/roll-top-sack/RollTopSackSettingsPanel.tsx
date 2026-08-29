import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { RollTopSackInputs } from '../../generators/roll-top-sack/types.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

// The fields the panel labels `(${inputs.units})`; seam_allowance is always mm.
const DISPLAY_UNIT_FIELDS = ['bottom_length', 'bottom_width', 'height_when_rolled', 'collar_height'] as const;

interface Props {
  inputs: RollTopSackInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<RollTopSackInputs>) => void;
}

function NumericField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: number | undefined;
  error?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={0}
        step="any"
        value={value ?? ''}
        onChange={e => onChange(parseFloat(e.target.value))}
        className={`h-8 text-xs ${error ? 'border-destructive' : ''}`}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
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

      <div className="space-y-1">
        <Label className="text-xs">Units</Label>
        <div className="flex gap-2">
          <Button
            variant={inputs.units === 'mm' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => handleUnitsChange('mm')}
          >
            mm
          </Button>
          <Button
            variant={inputs.units === 'in' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => handleUnitsChange('in')}
          >
            in
          </Button>
        </div>
      </div>
    </div>
  );
}
