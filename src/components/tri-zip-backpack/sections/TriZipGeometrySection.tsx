import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TriZipInputs, CurveStyle } from '../../../generators/tri-zip-backpack/types.js';
import { NumericField } from '../../shared/fields/index.js';

interface Props {
  inputs: TriZipInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<TriZipInputs>) => void;
}

export function TriZipGeometrySection({ inputs, errors, onChange }: Props) {
  // Cleared boxes report undefined so the preset default applies again; they
  // used to snap back to the hard-coded number on every keystroke, which made
  // the field impossible to retype.
  const set = (field: keyof TriZipInputs) => (v: number | undefined) => onChange({ [field]: v });

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <Label htmlFor="tz-curve-style">Curve style</Label>
        <Select
          value={inputs.curve_style ?? 'ergonomic'}
          onValueChange={v => onChange({ curve_style: v as CurveStyle })}
        >
          <SelectTrigger id="tz-curve-style">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="straight">Straight</SelectItem>
            <SelectItem value="ergonomic">Ergonomic</SelectItem>
            <SelectItem value="s_curve">S-Curve</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <NumericField
        id="tz-y-split"
        label="Y-split height"
        units="%"
        value={inputs.y_split_height_percent ?? 60}
        onChange={set('y_split_height_percent')}
        error={errors['y_split_height_percent']}
        min={1}
        max={99}
        help="Where the tri-zip split sits up the bag. Default 60%."
      />

      <NumericField
        id="tz-center-panel"
        label="Centre panel width"
        units="%"
        value={inputs.center_panel_width_percent ?? 35}
        onChange={set('center_panel_width_percent')}
        error={errors['center_panel_width_percent']}
        min={1}
        max={99}
        help="Width of the centre zip panel as a share of the bag width. Default 35%."
      />

      <NumericField
        id="tz-seam-allowance"
        label="Seam allowance"
        units="mm"
        value={inputs.seam_allowance ?? 10}
        onChange={set('seam_allowance')}
        error={errors['seam_allowance']}
        min={0}
        step={1}
        help="Added to every sewn edge. Default 10 mm; always millimetres, whatever the body dimensions use."
      />

      <NumericField
        id="tz-hem-allowance"
        label="Hem allowance"
        units="mm"
        value={inputs.hem_allowance ?? 25}
        onChange={set('hem_allowance')}
        error={errors['hem_allowance']}
        min={0}
        step={1}
        help="Free edges that fold under: the laptop sleeve opening and the gusset zipper tape edges. Default 25 mm."
      />
    </div>
  );
}
