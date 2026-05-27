import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  topHandleLength: number;
  onChange: (length: number) => void;
}

export function TopHandleSection({ topHandleLength, onChange }: Props) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <Label htmlFor="tz-top-handle-length">Top handle length (mm)</Label>
        <Input
          id="tz-top-handle-length"
          type="number"
          min={50}
          max={300}
          value={topHandleLength}
          onChange={e => {
            const n = parseFloat(e.target.value);
            onChange(isNaN(n) ? 100 : n);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Length of the carrying handle at the top of the backpack (50–300 mm).
        </p>
      </div>
    </div>
  );
}
