import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TriZipInputs, LaptopSleeveAttachment } from '../../../generators/tri-zip-backpack/types.js';

interface Props {
  inputs: TriZipInputs;
  onChange: (changes: Partial<TriZipInputs>) => void;
}

export function LaptopSleeveSection({ inputs, onChange }: Props) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <Label htmlFor="tz-laptop-sleeve">Laptop sleeve attachment</Label>
        <Select
          value={inputs.laptop_sleeve_attachment ?? 'webbing-loop'}
          onValueChange={v => onChange({ laptop_sleeve_attachment: v as LaptopSleeveAttachment })}
        >
          <SelectTrigger id="tz-laptop-sleeve">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="webbing-loop">Webbing loop (removable)</SelectItem>
            <SelectItem value="seam-sewn">Seam sewn (permanent)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          How the laptop sleeve is attached inside the back panel.
        </p>
      </div>
    </div>
  );
}
