import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { CircleSkirtInputs, CircleSkirtPreset, ClosureType, WaistbandType } from '../../generators/circle-skirt/types.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

// The fields the panel labels `(${units})`. Everything else (ease, seam/hem
// allowance, band height, elastic width, fabric width) is always mm — see
// resolveInputs in generators/circle-skirt/inputs.ts.
const DISPLAY_UNIT_FIELDS = ['waist_circumference', 'skirt_length', 'hip_circumference'] as const;

interface Props {
  inputs: CircleSkirtInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<CircleSkirtInputs>) => void;
}

function NumericField({
  id,
  label,
  value,
  error,
  min,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number | undefined;
  error?: string;
  min?: number;
  step?: number;
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
        min={min ?? 0}
        step={step ?? 1}
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

const PRESETS: { value: CircleSkirtPreset; label: string }[] = [
  { value: 'quarter', label: 'Quarter Circle' },
  { value: 'half', label: 'Half Circle' },
  { value: 'full', label: 'Full Circle' },
  { value: 'double', label: 'Double Circle' },
  { value: 'custom', label: 'Custom' },
];

const CLOSURES: { value: ClosureType; label: string }[] = [
  { value: 'side-zip', label: 'Side Zip' },
  { value: 'back-zip', label: 'Back Zip' },
  { value: 'elastic', label: 'Elastic' },
];

const WAISTBAND_TYPES: { value: WaistbandType; label: string }[] = [
  { value: 'straight', label: 'Straight Band' },
  { value: 'elastic-casing', label: 'Elastic Casing' },
];

export function CircleSkirtSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';

  function handleUnitsChange(next: UnitSystem) {
    if (next === units) return;
    onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, units, next) });
  }

  return (
    <div className="rounded border border-border p-3 space-y-4">
      {/* Preset selector — at top per P4 */}
      <div className="space-y-1">
        <Label className="text-xs font-semibold">Fullness Preset</Label>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map(p => (
            <Button
              key={p.value}
              variant={inputs.preset === p.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => {
                const updates: Partial<CircleSkirtInputs> = { preset: p.value };
                if (p.value !== 'custom') {
                  const angles: Record<string, number> = { quarter: 90, half: 180, full: 360, double: 720 };
                  updates.sweep_angle_deg = angles[p.value];
                }
                onChange(updates);
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <h2 className="text-xs font-semibold">Dimensions</h2>

      <div className="grid grid-cols-2 gap-3">
        <NumericField
          id="waist-circumference"
          label={`Waist Circumference (${units})`}
          value={inputs.waist_circumference}
          error={errors['waist_circumference']}
          min={0}
          step={0.5}
          onChange={v => onChange({ waist_circumference: v })}
        />
        <NumericField
          id="skirt-length"
          label={`Skirt Length (${units})`}
          value={inputs.skirt_length}
          error={errors['skirt_length']}
          min={0}
          step={0.5}
          onChange={v => onChange({ skirt_length: v })}
        />
        {inputs.preset === 'custom' && (
          <NumericField
            id="sweep-angle"
            label="Sweep Angle (°)"
            value={inputs.sweep_angle_deg}
            error={errors['sweep_angle_deg']}
            min={45}
            step={1}
            onChange={v => onChange({ sweep_angle_deg: v })}
          />
        )}
        <NumericField
          id="seam-allowance"
          label="Seam Allowance (mm)"
          value={inputs.seam_allowance}
          error={errors['seam_allowance']}
          min={0}
          step={1}
          onChange={v => onChange({ seam_allowance: v })}
        />
        <NumericField
          id="hem-allowance"
          label="Hem Allowance (mm)"
          value={inputs.hem_allowance}
          error={errors['hem_allowance']}
          min={0}
          step={1}
          onChange={v => onChange({ hem_allowance: v })}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-semibold">Units</Label>
        <div className="flex gap-2">
          <Button
            variant={units === 'in' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => handleUnitsChange('in')}
          >
            in
          </Button>
          <Button
            variant={units === 'mm' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => handleUnitsChange('mm')}
          >
            mm
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-semibold">Closure</Label>
        <div className="flex flex-wrap gap-1">
          {CLOSURES.map(c => (
            <Button
              key={c.value}
              variant={inputs.closure === c.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => onChange({ closure: c.value })}
            >
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-semibold">Waistband Type</Label>
        <div className="flex flex-wrap gap-1">
          {WAISTBAND_TYPES.map(w => (
            <Button
              key={w.value}
              variant={inputs.waistband_type === w.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => onChange({ waistband_type: w.value })}
            >
              {w.label}
            </Button>
          ))}
        </div>
      </div>

      {inputs.waistband_type !== 'elastic-casing' ? (
        <NumericField
          id="band-height"
          label="Band Height (mm)"
          value={inputs.band_height}
          error={errors['band_height']}
          min={0}
          step={1}
          onChange={v => onChange({ band_height: v })}
        />
      ) : (
        <NumericField
          id="elastic-width"
          label="Elastic Width (mm)"
          value={inputs.elastic_width}
          error={errors['elastic_width']}
          min={0}
          step={1}
          onChange={v => onChange({ elastic_width: v })}
        />
      )}
    </div>
  );
}
