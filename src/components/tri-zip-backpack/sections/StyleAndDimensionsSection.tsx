import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TriZipInputs, PresetName } from '../../../generators/tri-zip-backpack/types.js';
import { computeVolumeLiters } from '../../../generators/tri-zip-backpack/inputs.js';

const PRESETS: { value: PresetName; label: string }[] = [
  { value: 'urban_assault', label: 'Urban Assault' },
  { value: 'tactical', label: 'Tactical' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'camera', label: 'Camera' },
  { value: 'medical', label: 'Medical' },
  { value: 'minimalist', label: 'Minimalist' },
];

interface Props {
  inputs: TriZipInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<TriZipInputs>) => void;
}

export function StyleAndDimensionsSection({ inputs, errors, onChange }: Props) {
  const volumeL = computeVolumeLiters(inputs);
  const validVolume = isFinite(volumeL) && volumeL > 0;

  function handleNumber(field: keyof TriZipInputs, raw: string) {
    const n = parseFloat(raw);
    onChange({ [field]: isNaN(n) ? raw as unknown as number : n });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="tz-preset">Style preset</Label>
        <Select
          value={inputs.stylePreset}
          onValueChange={v => onChange({ stylePreset: v as PresetName })}
        >
          <SelectTrigger id="tz-preset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="tz-units">Units</Label>
        <Select
          value={inputs.units}
          onValueChange={v => onChange({ units: v as 'mm' | 'in' })}
        >
          <SelectTrigger id="tz-units">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mm">Millimeters (mm)</SelectItem>
            <SelectItem value="in">Inches (in)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor="tz-height">Height</Label>
          <Input
            id="tz-height"
            type="number"
            min={1}
            value={inputs.height}
            onChange={e => handleNumber('height', e.target.value)}
            className={errors['height'] ? 'border-destructive' : ''}
          />
          {errors['height'] && (
            <p className="text-xs text-destructive">{errors['height']}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="tz-width">Width</Label>
          <Input
            id="tz-width"
            type="number"
            min={1}
            value={inputs.width}
            onChange={e => handleNumber('width', e.target.value)}
            className={errors['width'] ? 'border-destructive' : ''}
          />
          {errors['width'] && (
            <p className="text-xs text-destructive">{errors['width']}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="tz-depth">Depth</Label>
          <Input
            id="tz-depth"
            type="number"
            min={1}
            value={inputs.depth}
            onChange={e => handleNumber('depth', e.target.value)}
            className={errors['depth'] ? 'border-destructive' : ''}
          />
          {errors['depth'] && (
            <p className="text-xs text-destructive">{errors['depth']}</p>
          )}
        </div>
      </div>

      <div className="rounded bg-muted px-3 py-2 text-sm font-medium" aria-live="polite">
        {validVolume
          ? `Computed volume: ${volumeL.toFixed(1)} L`
          : 'Computed volume: — (invalid dimensions)'}
      </div>
    </div>
  );
}
