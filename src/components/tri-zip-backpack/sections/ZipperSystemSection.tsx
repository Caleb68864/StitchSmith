import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { TriZipInputs, ZipperMethod } from '../../../generators/tri-zip-backpack/types.js';
import { NumericField } from '../../shared/fields/index.js';

interface Props {
  inputs: TriZipInputs;
  onChange: (changes: Partial<TriZipInputs>) => void;
}

export function ZipperSystemSection({ inputs, onChange }: Props) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <Label htmlFor="tz-zipper-method">Zipper attachment method</Label>
        <Select
          value={inputs.zipper_method ?? 'gusseted'}
          onValueChange={v => onChange({ zipper_method: v as ZipperMethod })}
        >
          <SelectTrigger id="tz-zipper-method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="direct">Direct (no gusset)</SelectItem>
            <SelectItem value="gusseted">Gusseted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(inputs.zipper_method ?? 'gusseted') === 'gusseted' && (
        <NumericField
          id="tz-zipper-gusset"
          label="Zipper gusset width"
          units="mm"
          value={inputs.zipper_gusset_width ?? 25}
          onChange={(v) => onChange({ zipper_gusset_width: v })}
          min={5}
          step={1}
          help="The strip the zipper sits on. Default 25 mm; the wings give up this width so the front still matches the back."
        />
      )}

      <div className="flex items-center gap-3">
        <Switch
          id="tz-split-gusset"
          checked={inputs.split_gusset ?? false}
          onCheckedChange={v => onChange({ split_gusset: v })}
        />
        <Label htmlFor="tz-split-gusset">Split gusset (separate top/bottom sections)</Label>
      </div>
    </div>
  );
}
