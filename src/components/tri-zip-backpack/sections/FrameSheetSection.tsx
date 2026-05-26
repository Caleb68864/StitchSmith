import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TriZipInputs, FrameSheet } from '../../../generators/tri-zip-backpack/types.js';

interface Props {
  inputs: TriZipInputs;
  onChange: (changes: Partial<TriZipInputs>) => void;
}

export function FrameSheetSection({ inputs, onChange }: Props) {
  const frameSheet = inputs.frame_sheet ?? 'none';

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <Label htmlFor="tz-frame-sheet">Frame sheet material</Label>
        <Select
          value={frameSheet}
          onValueChange={v => onChange({ frame_sheet: v as FrameSheet })}
        >
          <SelectTrigger id="tz-frame-sheet">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="hdpe">HDPE (rigid)</SelectItem>
            <SelectItem value="foam">Foam (flexible)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {frameSheet !== 'none' && (
        <div className="space-y-1">
          <Label htmlFor="tz-frame-sheet-margin">Frame sheet margin (mm)</Label>
          <Input
            id="tz-frame-sheet-margin"
            type="number"
            min={0}
            max={50}
            value={inputs.frame_sheet_margin ?? 10}
            onChange={e => {
              const n = parseFloat(e.target.value);
              onChange({ frame_sheet_margin: isNaN(n) ? 10 : n });
            }}
          />
          <p className="text-xs text-muted-foreground">Gap between frame sheet edge and panel seam.</p>
        </div>
      )}
    </div>
  );
}
