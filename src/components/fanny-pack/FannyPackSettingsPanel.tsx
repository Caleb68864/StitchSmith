import { NumericField, ChoiceField, Toggle, UnitToggle } from '../shared/fields/index.js';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FannyPackInputs, LidDropTarget, ZipperEdgeFinish } from '../../generators/fanny-pack/types.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

const DISPLAY_UNIT_FIELDS = ['width', 'height', 'depth', 'seam_allowance', 'lid_extension', 'zipper_lip', 'belt_min', 'belt_max'] as const;

interface Props { inputs: FannyPackInputs; errors: Record<string, string>; onChange: (changes: Partial<FannyPackInputs>) => void }


const LID: { value: LidDropTarget; label: string }[] = [
  { value: 'fully_open', label: 'Falls fully open' },
  { value: 'partial', label: 'Stops at an angle' },
  { value: 'closed', label: 'Does not open (v1)' },
];
const FINISH: { value: ZipperEdgeFinish; label: string }[] = [
  { value: 'fold', label: 'Fold the lip (+1")' },
  { value: 'tape', label: 'Edge tape' },
];
const GROMMETS: { value: '0' | '2' | '4'; label: string }[] = [{ value: '0', label: 'None' }, { value: '2', label: 'Two' }, { value: '4', label: 'Four' }];
const BELT: { value: '1' | '1.5'; label: string }[] = [{ value: '1', label: '1" webbing' }, { value: '1.5', label: '1.5" webbing' }];

export function FannyPackSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';
  const step = units === 'in' ? 0.125 : 1;
  const p = (inch: string, mm: string) => (units === 'in' ? inch : mm);
  function handleUnitsChange(next: UnitSystem) { if (next !== units) onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, units, next) }); }
  const lid = inputs.lid_drop_target ?? 'fully_open';
  return (
    <div className="rounded border border-border p-3 space-y-4">
      <p className="text-xs text-muted-foreground">The SOE fanny pack notes give the rules (lid drop, zipper edge, grommets, cord limiter) but no cut list: the body sizes below are starting points. Mock it in paper.</p>
      <h2 className="text-xs font-semibold">Body (finished)</h2>
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="width" label={`Width (${units})`} value={inputs.width} error={errors['width']} step={step} placeholder={p('10', '254')} onChange={v => onChange({ width: v })} />
        <NumericField id="height" label={`Height (${units})`} value={inputs.height} error={errors['height']} step={step} placeholder={p('6', '152')} onChange={v => onChange({ height: v })} />
        <NumericField id="depth" label={`Depth (${units})`} value={inputs.depth} error={errors['depth']} step={step} placeholder={p('3', '76')} onChange={v => onChange({ depth: v })} />
        <NumericField id="seam-allowance" label={`Seam allowance (${units})`} value={inputs.seam_allowance} error={errors['seam_allowance']} step={step} placeholder={p('0.5', '12.7')} onChange={v => onChange({ seam_allowance: v })} />
      </div>
      <ChoiceField label="Lid drop" value={lid} options={LID} onChange={v => onChange({ lid_drop_target: v })} />
      <div className="grid grid-cols-2 gap-3">
        {lid === 'partial' && <NumericField id="lid-angle" label="Lid angle (°)" value={inputs.lid_angle_deg} error={errors['lid_angle_deg']} step={5} placeholder="90" onChange={v => onChange({ lid_angle_deg: v })} />}
        {lid !== 'closed' && <NumericField id="lid-extension" label={`Zipper panel down each side (${units})`} value={inputs.lid_extension} error={errors['lid_extension']} step={step} placeholder="heuristic ≈ depth" onChange={v => onChange({ lid_extension: v })} />}
      </div>
      <ChoiceField label="Raw edge behind the zipper" value={inputs.zipper_edge_finish ?? 'fold'} options={FINISH} onChange={v => onChange({ zipper_edge_finish: v })} />
      <div className="grid grid-cols-2 gap-3">
        {(inputs.zipper_edge_finish ?? 'fold') === 'fold'
          ? <NumericField id="zipper-lip" label={`Zipper lip fold (${units})`} value={inputs.zipper_lip} error={errors['zipper_lip']} step={step} placeholder={p('1', '25.4')} onChange={v => onChange({ zipper_lip: v })} />
          : <div className="space-y-1"><Label htmlFor="tape-color" className="text-xs">Edge tape colour</Label><Input id="tape-color" value={inputs.edge_tape_color ?? ''} placeholder="black" onChange={e => onChange({ edge_tape_color: e.target.value || undefined })} className="h-8 text-xs" /></div>}
      </div>
      <h2 className="text-xs font-semibold">Options</h2>
      <Toggle label="Drawbridge cord limiter (550 loops stop the lid at the target angle)" value={inputs.drawbridge_limiter ?? false} onChange={v => onChange({ drawbridge_limiter: v })} />
      <ChoiceField label="Bottom drainage grommets" value={String(inputs.bottom_grommets ?? 0) as '0' | '2' | '4'} options={GROMMETS} onChange={v => onChange({ bottom_grommets: Number(v) as 0 | 2 | 4 })} />
      <h2 className="text-xs font-semibold">Belt (waist or sling)</h2>
      <ChoiceField label="Webbing" value={String(inputs.belt_webbing ?? 1.5) as '1' | '1.5'} options={BELT} onChange={v => onChange({ belt_webbing: Number(v) as 1 | 1.5 })} />
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="belt-min" label={`Shortest setting (${units})`} value={inputs.belt_min} error={errors['belt_min']} step={step} placeholder={p('28', '711')} onChange={v => onChange({ belt_min: v })} />
        <NumericField id="belt-max" label={`Longest setting (${units})`} value={inputs.belt_max} error={errors['belt_max']} step={step} placeholder={p('52', '1321')} onChange={v => onChange({ belt_max: v })} />
      </div>
      <UnitToggle value={units} onChange={handleUnitsChange} />
    </div>
  );
}
