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

// Fields a preset controls. When the user picks a new preset, any of these
// that the user previously overrode are reset to undefined so the new preset
// values take effect.
const PRESET_CONTROLLED_FIELDS: (keyof TriZipInputs)[] = [
  'strap_width',
  'foam_thickness',
  'curve_style',
  'back_panel_shape',
  'compression_straps',
  'hip_belt',
  'laptop_sleeve_attachment',
  'sternum_strap',
  'y_split_height_percent',
  'center_panel_width_percent',
  'zipper_method',
  'zipper_gusset_width',
  'frame_sheet',
  'frame_sheet_margin',
];

function hasCustomEdits(inputs: TriZipInputs): boolean {
  return PRESET_CONTROLLED_FIELDS.some((f) => inputs[f] !== undefined);
}

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
          onValueChange={v => {
            const next = v as PresetName;
            if (next === inputs.stylePreset) return;
            if (hasCustomEdits(inputs)) {
              if (!window.confirm(
                `Switching to "${PRESETS.find(p => p.value === next)?.label ?? next}" will overwrite your customized settings (straps, panel shape, hip belt, etc.) with the preset defaults. Continue?`
              )) {
                return;
              }
            }
            // Clear all user overrides so the new preset's values take effect.
            const cleared: Partial<TriZipInputs> = { stylePreset: next };
            for (const f of PRESET_CONTROLLED_FIELDS) cleared[f] = undefined;
            onChange(cleared);
          }}
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
        {hasCustomEdits(inputs) && (
          <p className="text-xs text-muted-foreground">
            Some preset fields have been customized. Picking another preset will reset them.
          </p>
        )}
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
