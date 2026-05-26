import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TriZipInputs, CompressionStraps } from '../../../generators/tri-zip-backpack/types.js';

interface Props {
  inputs: TriZipInputs;
  onChange: (changes: Partial<TriZipInputs>) => void;
}

export function CompressionSection({ inputs, onChange }: Props) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <Label htmlFor="tz-compression-straps">Compression straps</Label>
        <Select
          value={inputs.compression_straps ?? 'side'}
          onValueChange={v => onChange({ compression_straps: v as CompressionStraps })}
        >
          <SelectTrigger id="tz-compression-straps">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="side">Side only</SelectItem>
            <SelectItem value="side_and_bottom">Side and bottom</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Side straps compress the bag for a lighter load. Side-and-bottom straps add extra stability.
        </p>
      </div>
    </div>
  );
}
