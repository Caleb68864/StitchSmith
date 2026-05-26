import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { TriZipInputs, HipBelt } from '../../../generators/tri-zip-backpack/types.js';

interface Props {
  inputs: TriZipInputs;
  onChange: (changes: Partial<TriZipInputs>) => void;
}

export function SternumHipSection({ inputs, onChange }: Props) {
  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-3">
        <Switch
          id="tz-sternum-strap"
          checked={inputs.sternum_strap ?? true}
          onCheckedChange={v => onChange({ sternum_strap: v })}
        />
        <Label htmlFor="tz-sternum-strap">Include sternum strap</Label>
      </div>

      <div className="space-y-1">
        <Label htmlFor="tz-hip-belt">Hip belt type</Label>
        <Select
          value={inputs.hip_belt ?? 'webbing'}
          onValueChange={v => onChange({ hip_belt: v as HipBelt })}
        >
          <SelectTrigger id="tz-hip-belt">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="webbing">Webbing (thin)</SelectItem>
            <SelectItem value="padded">Padded hip belt</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
