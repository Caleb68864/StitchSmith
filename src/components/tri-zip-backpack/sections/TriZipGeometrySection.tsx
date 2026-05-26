import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TriZipInputs, CurveStyle } from '../../../generators/tri-zip-backpack/types.js';

interface Props {
  inputs: TriZipInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<TriZipInputs>) => void;
}

export function TriZipGeometrySection({ inputs, errors, onChange }: Props) {
  function handlePercent(field: keyof TriZipInputs, raw: string) {
    const n = parseFloat(raw);
    onChange({ [field]: isNaN(n) ? raw as unknown as number : n });
  }

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

      <div className="space-y-1">
        <Label htmlFor="tz-y-split">Y-split height (%)</Label>
        <Input
          id="tz-y-split"
          type="number"
          min={1}
          max={99}
          value={inputs.y_split_height_percent ?? 60}
          onChange={e => handlePercent('y_split_height_percent', e.target.value)}
          className={errors['y_split_height_percent'] ? 'border-destructive' : ''}
        />
        {errors['y_split_height_percent'] && (
          <p className="text-xs text-destructive">{errors['y_split_height_percent']}</p>
        )}
        <p className="text-xs text-muted-foreground">Where the tri-zip split occurs (1–99%)</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="tz-center-panel">Center panel width (%)</Label>
        <Input
          id="tz-center-panel"
          type="number"
          min={1}
          max={99}
          value={inputs.center_panel_width_percent ?? 35}
          onChange={e => handlePercent('center_panel_width_percent', e.target.value)}
          className={errors['center_panel_width_percent'] ? 'border-destructive' : ''}
        />
        {errors['center_panel_width_percent'] && (
          <p className="text-xs text-destructive">{errors['center_panel_width_percent']}</p>
        )}
        <p className="text-xs text-muted-foreground">Width of center zip panel (1–99% of total width)</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="tz-seam-allowance">Seam allowance (mm)</Label>
        <Input
          id="tz-seam-allowance"
          type="number"
          min={0}
          value={inputs.seam_allowance ?? 10}
          onChange={e => {
            const n = parseFloat(e.target.value);
            onChange({ seam_allowance: isNaN(n) ? 10 : n });
          }}
        />
      </div>
    </div>
  );
}
