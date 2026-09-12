import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { SlingInputs, ThirdPiece, EndInterface } from '../../generators/sling/types.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

const DISPLAY_UNIT_FIELDS = ['pad_finished_length', 'pad_girth', 'foam_width', 'foam_setback', 'tuck_depth', 'turning_ease', 'rear_tail_length', 'adjustment_webbing_length', 'anchor_strap_length'] as const;

interface Props { inputs: SlingInputs; errors: Record<string, string>; onChange: (changes: Partial<SlingInputs>) => void }

function NumericField({ id, label, value, error, min, step, placeholder, onChange }: { id: string; label: string; value: number | undefined; error?: string; min?: number; step?: number; placeholder?: string; onChange: (v: number | undefined) => void }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} type="number" min={min ?? 0} step={step ?? 1} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} className={`h-8 text-xs ${error ? 'border-destructive' : ''}`} aria-describedby={error ? `${id}-error` : undefined} />
      {error && <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex flex-wrap gap-1">{options.map(o => <Button key={o.value} variant={value === o.value ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-2" onClick={() => onChange(o.value)}>{o.label}</Button>)}</div>
    </div>
  );
}

const THIRD: { value: ThirdPiece; label: string }[] = [
  { value: 'anchor_strap', label: 'Short anchor strap for the adapter' },
  { value: 'separate_adjust', label: 'Separate adjustment tail' },
];
const ENDS: { value: EndInterface; label: string }[] = [
  { value: 'bare_triglide', label: 'Bare tri-glides' },
  { value: 'buckle_qd', label: 'Side-squeeze QD buckles' },
  { value: 'direct_sewn', label: 'Sewn to the mounts' },
];

export function SlingSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';
  const step = units === 'in' ? 0.125 : 1;
  function handleUnitsChange(next: UnitSystem) { if (next !== units) onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, units, next) }); }
  const mock = 'mock it';
  return (
    <div className="rounded border border-border p-3 space-y-4">
      <p className="text-xs text-muted-foreground">The vault gives this build its construction but no lengths. Rig it in cord on the rifle first and enter what you measure; every blank field is a placeholder.</p>
      <h2 className="text-xs font-semibold">Pad</h2>
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="pad-length" label={`Pad length (${units})`} value={inputs.pad_finished_length} error={errors['pad_finished_length']} step={step} placeholder={mock} onChange={v => onChange({ pad_finished_length: v })} />
        <NumericField id="pad-girth" label={`Pad girth, finished (${units})`} value={inputs.pad_girth} error={errors['pad_girth']} step={step} placeholder={mock} onChange={v => onChange({ pad_girth: v })} />
        <NumericField id="foam-thickness" label="Foam thickness (mm)" value={inputs.foam_thickness} error={errors['foam_thickness']} step={1} placeholder="6" onChange={v => onChange({ foam_thickness: v })} />
        <NumericField id="foam-width" label={`Foam width (${units})`} value={inputs.foam_width} error={errors['foam_width']} step={step} placeholder={mock} onChange={v => onChange({ foam_width: v })} />
        <NumericField id="foam-setback" label={`Foam setback (${units})`} value={inputs.foam_setback} error={errors['foam_setback']} step={step} placeholder={units === 'in' ? '0.5' : '12.7'} onChange={v => onChange({ foam_setback: v })} />
        <NumericField id="tuck-depth" label={`Webbing tuck (${units})`} value={inputs.tuck_depth} error={errors['tuck_depth']} step={step} placeholder={units === 'in' ? '1' : '25.4'} onChange={v => onChange({ tuck_depth: v })} />
        <NumericField id="turning-ease" label={`Turning ease (${units})`} value={inputs.turning_ease} error={errors['turning_ease']} step={step} placeholder={units === 'in' ? '0.5' : '12.7'} onChange={v => onChange({ turning_ease: v })} />
        <NumericField id="seam-allowance" label="Seam allowance (mm)" value={inputs.seam_allowance} error={errors['seam_allowance']} step={0.5} placeholder="9.5" onChange={v => onChange({ seam_allowance: v })} />
      </div>
      <h2 className="text-xs font-semibold">Webbing and hardware</h2>
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="webbing-width" label="Webbing width (mm)" value={inputs.webbing_width} error={errors['webbing_width']} step={1} placeholder="32" onChange={v => onChange({ webbing_width: v })} />
        <NumericField id="rear-tail" label={`Rear tail (${units})`} value={inputs.rear_tail_length} error={errors['rear_tail_length']} step={step} placeholder={mock} onChange={v => onChange({ rear_tail_length: v })} />
        <NumericField id="adjust-webbing" label={`Adjustment webbing (${units})`} value={inputs.adjustment_webbing_length} error={errors['adjustment_webbing_length']} step={step} placeholder={mock} onChange={v => onChange({ adjustment_webbing_length: v })} />
        {(inputs.third_piece ?? 'anchor_strap') === 'anchor_strap' && <NumericField id="anchor-strap" label={`Anchor strap (${units})`} value={inputs.anchor_strap_length} error={errors['anchor_strap_length']} step={step} placeholder={mock} onChange={v => onChange({ anchor_strap_length: v })} />}
      </div>
      <Choice label="Third webbing piece" value={inputs.third_piece ?? 'anchor_strap'} options={THIRD} onChange={v => onChange({ third_piece: v })} />
      <Choice label="End interface" value={inputs.end_interface ?? 'bare_triglide'} options={ENDS} onChange={v => onChange({ end_interface: v })} />
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={inputs.route_through_both_slots ?? false} onChange={e => onChange({ route_through_both_slots: e.target.checked })} /> Route through both adapter slots (more drag)</label>
      <div className="space-y-1">
        <Label className="text-xs font-semibold">Units</Label>
        <div className="flex gap-2">
          <Button variant={units === 'in' ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-3" onClick={() => handleUnitsChange('in')}>in</Button>
          <Button variant={units === 'mm' ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-3" onClick={() => handleUnitsChange('mm')}>mm</Button>
        </div>
      </div>
    </div>
  );
}
