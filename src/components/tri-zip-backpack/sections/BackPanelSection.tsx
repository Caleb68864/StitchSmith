import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TriZipInputs, BackPanelShape } from '../../../generators/tri-zip-backpack/types.js';

interface Props {
  inputs: TriZipInputs;
  onChange: (changes: Partial<TriZipInputs>) => void;
}

export function BackPanelSection({ inputs, onChange }: Props) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <Label htmlFor="tz-back-panel-shape">Back panel shape</Label>
        <Select
          value={inputs.back_panel_shape ?? 'rounded'}
          onValueChange={v => onChange({ back_panel_shape: v as BackPanelShape })}
        >
          <SelectTrigger id="tz-back-panel-shape">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rounded">Rounded</SelectItem>
            <SelectItem value="tactical">Tactical (MOLLE-compatible)</SelectItem>
            <SelectItem value="square">Square</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Shape of the main back panel that contacts your back.
        </p>
      </div>
    </div>
  );
}
