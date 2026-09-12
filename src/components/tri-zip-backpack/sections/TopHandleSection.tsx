import { NumericField } from '../../shared/fields/index.js';

interface Props {
  topHandleLength: number;
  onChange: (length: number) => void;
}

export function TopHandleSection({ topHandleLength, onChange }: Props) {
  return (
    <div className="space-y-4 py-2">
      <NumericField
        id="tz-top-handle-length"
        label="Top handle length"
        units="mm"
        value={topHandleLength}
        onChange={(v) => onChange(v ?? 100)}
        min={50}
        max={300}
        step={5}
        help="The carrying handle across the top. Default 100 mm; 50 to 300 mm."
      />
    </div>
  );
}
