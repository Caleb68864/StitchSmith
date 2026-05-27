import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TriZipInputs } from '../../../generators/tri-zip-backpack/types.js';

interface Props {
  inputs: TriZipInputs;
  onChange: (changes: Partial<TriZipInputs>) => void;
}

export function ShoulderStrapsSection({ inputs, onChange }: Props) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <Label htmlFor="tz-strap-width">Strap width (mm)</Label>
        <Input
          id="tz-strap-width"
          type="number"
          min={20}
          max={150}
          value={inputs.strap_width ?? 75}
          onChange={e => {
            const n = parseFloat(e.target.value);
            onChange({ strap_width: isNaN(n) ? 75 : n });
          }}
        />
        <p className="text-xs text-muted-foreground">Width of the shoulder strap webbing (20–150 mm)</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="tz-foam-thickness">Foam padding thickness (mm)</Label>
        <Input
          id="tz-foam-thickness"
          type="number"
          min={0}
          max={30}
          value={inputs.foam_thickness ?? 10}
          onChange={e => {
            const n = parseFloat(e.target.value);
            onChange({ foam_thickness: isNaN(n) ? 10 : n });
          }}
        />
        <p className="text-xs text-muted-foreground">Thickness of foam padding inside straps (0 = no foam)</p>
      </div>
    </div>
  );
}
