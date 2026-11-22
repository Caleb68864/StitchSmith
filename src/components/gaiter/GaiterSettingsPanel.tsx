import { NumericField, SelectField, UnitToggle, CollapsibleSection, VaultOpenNote } from '../shared/fields/index.js';
import type { GaiterInputs, GaiterClosure } from '../../generators/gaiter/types.js';
import type { HemFold } from '../../lib/pattern-engine/primitives/hem.js';
import {
  HEIGHT_MM, TOP_CIRCUMFERENCE_MM, BOTTOM_CIRCUMFERENCE_MM, FRONT_DROP_MM, OVERLAP_MM, HEM_DEPTH_MM, CHANNEL_DEPTH_MM,
  ELASTIC_PCT, INSTEP_STRAP_MM, FABRIC_WIDTH_MM, SEAM_ALLOWANCE_MM,
} from '../../generators/gaiter/defaults.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

const DISPLAY_UNIT_FIELDS = ['height', 'top_circumference', 'bottom_circumference', 'front_drop', 'overlap', 'hem_depth', 'channel_depth', 'instep_strap_length', 'fabric_width'] as const;

interface Props { inputs: GaiterInputs; errors: Record<string, string>; onChange: (changes: Partial<GaiterInputs>) => void }

export function GaiterSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';
  const step = units === 'in' ? 0.125 : 1;
  const ph = (mm: number) => (units === 'in' ? String(Math.round((mm / 25.4) * 1000) / 1000) : String(Math.round(mm * 10) / 10));
  const closure = inputs.closure ?? 'velcro';
  function handleUnitsChange(next: UnitSystem) {
    if (next === units) return;
    onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, units, next) });
  }
  return (
    <div className="space-y-2">
      <div className="rounded border border-border p-3 space-y-3">
        <UnitToggle value={units} onChange={handleUnitsChange} />
        <VaultOpenNote>
          Every number marked <span className="font-medium">measure</span> is a common starting point for a mid-height
          gaiter, not a measurement. Measure round the calf at the top and round the boot at the bottom, over what you
          will wear, before cutting. Sewn fabrics only.
        </VaultOpenNote>
      </div>

      <CollapsibleSection title="Leg and boot" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="height" label={`Height at the back (${units})`} value={inputs.height} error={errors['height']} step={step} placeholder={ph(HEIGHT_MM)} mockDerived onChange={(v) => onChange({ height: v })} />
          <NumericField id="top-circumference" label={`Round the calf, top (${units})`} value={inputs.top_circumference} error={errors['top_circumference']} step={step} placeholder={ph(TOP_CIRCUMFERENCE_MM)} mockDerived onChange={(v) => onChange({ top_circumference: v })} />
          <NumericField id="bottom-circumference" label={`Round the boot, bottom (${units})`} value={inputs.bottom_circumference} error={errors['bottom_circumference']} step={step} placeholder={ph(BOTTOM_CIRCUMFERENCE_MM)} mockDerived onChange={(v) => onChange({ bottom_circumference: v })} />
          <NumericField id="front-drop" label={`Front drop over the laces (${units})`} value={inputs.front_drop} error={errors['front_drop']} step={step} placeholder={ph(FRONT_DROP_MM)} mockDerived onChange={(v) => onChange({ front_drop: v })} />
          <NumericField id="fabric-width" label={`Usable fabric width (${units})`} value={inputs.fabric_width} error={errors['fabric_width']} step={step} placeholder={ph(FABRIC_WIDTH_MM)} mockDerived onChange={(v) => onChange({ fabric_width: v })} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Closure and edges" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <SelectField<GaiterClosure> id="closure" label="Front closure" value={closure} error={errors['closure']}
            options={[{ value: 'velcro', label: 'Hook-and-loop overlap' }, { value: 'zipper', label: 'Zipper' }]}
            onChange={(v) => onChange({ closure: v })} />
          {closure === 'velcro' ? (
            <NumericField id="overlap" label={`Overlap (${units})`} value={inputs.overlap} error={errors['overlap']} step={step} placeholder={ph(OVERLAP_MM)} mockDerived onChange={(v) => onChange({ overlap: v })} />
          ) : (
            <NumericField id="seam-allowance" label="Zipper seam allowance (mm)" value={inputs.seam_allowance} error={errors['seam_allowance']} step={0.5} placeholder={String(SEAM_ALLOWANCE_MM)} mockDerived onChange={(v) => onChange({ seam_allowance: v })} />
          )}
          <NumericField id="hem-depth" label={`Hem depth (${units})`} value={inputs.hem_depth} error={errors['hem_depth']} step={step} placeholder={ph(HEM_DEPTH_MM)} mockDerived onChange={(v) => onChange({ hem_depth: v })} />
          <NumericField id="channel-depth" label={`Top elastic channel (${units})`} value={inputs.channel_depth} error={errors['channel_depth']} step={step} placeholder={ph(CHANNEL_DEPTH_MM)} mockDerived onChange={(v) => onChange({ channel_depth: v })} />
          <SelectField<HemFold> id="hem-fold" label="Hem" value={inputs.hem_fold ?? 'double'} error={errors['hem_fold']}
            options={[{ value: 'double', label: 'Double fold (rolled)' }, { value: 'single', label: 'Single fold, marked at double' }]}
            onChange={(v) => onChange({ hem_fold: v })} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Elastic and strap" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="elastic-pct" label="Top elastic (% of the circumference)" value={inputs.elastic_pct} error={errors['elastic_pct']} step={1} placeholder={String(ELASTIC_PCT)} mockDerived onChange={(v) => onChange({ elastic_pct: v })} />
          <NumericField id="instep-strap-length" label={`Instep strap (${units})`} value={inputs.instep_strap_length} error={errors['instep_strap_length']} step={step} placeholder={ph(INSTEP_STRAP_MM)} mockDerived onChange={(v) => onChange({ instep_strap_length: v })} />
        </div>
      </CollapsibleSection>
    </div>
  );
}
