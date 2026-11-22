import { NumericField, SelectField, UnitToggle, CollapsibleSection, VaultOpenNote } from '../shared/fields/index.js';
import type { BeanieInputs, BeanieFinish } from '../../generators/beanie/types.js';
import { HEAD_CIRCUMFERENCE_MM, EASE_MM, CROWN_HEIGHT_MM, GORES, CUFF_HEIGHT_MM, HEM_DEPTH_MM, SEAM_ALLOWANCE_MM, MIN_GORES, MAX_GORES } from '../../generators/beanie/defaults.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

const DISPLAY_UNIT_FIELDS = ['head_circumference', 'ease', 'crown_height', 'cuff_height', 'hem_depth'] as const;

interface Props { inputs: BeanieInputs; errors: Record<string, string>; onChange: (changes: Partial<BeanieInputs>) => void }

export function BeanieSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';
  const step = units === 'in' ? 0.125 : 1;
  const ph = (mm: number) => (units === 'in' ? String(Math.round((mm / 25.4) * 1000) / 1000) : String(Math.round(mm * 10) / 10));
  const finish = inputs.finish ?? 'cuff';
  function handleUnitsChange(next: UnitSystem) {
    if (next === units) return;
    onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, units, next) });
  }
  return (
    <div className="space-y-2">
      <div className="rounded border border-border p-3 space-y-3">
        <UnitToggle value={units} onChange={handleUnitsChange} />
        <VaultOpenNote>
          Every number marked <span className="font-medium">measure</span> is a starting point, not a size chart. Measure
          round the head at the brow and enter it; choose the ease for your fabric (negative for fleece or jersey).
        </VaultOpenNote>
      </div>
      <CollapsibleSection title="Head and crown" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="head-circumference" label={`Head circumference (${units})`} value={inputs.head_circumference} error={errors['head_circumference']} step={step} placeholder={ph(HEAD_CIRCUMFERENCE_MM)} mockDerived onChange={(v) => onChange({ head_circumference: v })} />
          <NumericField id="ease" label={`Ease (${units})`} value={inputs.ease} error={errors['ease']} step={step} placeholder={ph(EASE_MM)} mockDerived help="Negative for a stretch fabric." onChange={(v) => onChange({ ease: v })} />
          <NumericField id="crown-height" label={`Crown height (${units})`} value={inputs.crown_height} error={errors['crown_height']} step={step} placeholder={ph(CROWN_HEIGHT_MM)} mockDerived help="From the cuff seam to the top." onChange={(v) => onChange({ crown_height: v })} />
          <NumericField id="gores" label={`Gores (${MIN_GORES}–${MAX_GORES})`} value={inputs.gores} error={errors['gores']} step={1} placeholder={String(GORES)} mockDerived onChange={(v) => onChange({ gores: v })} />
          <NumericField id="seam-allowance" label="Seam allowance (mm)" value={inputs.seam_allowance} error={errors['seam_allowance']} step={0.5} placeholder={String(SEAM_ALLOWANCE_MM)} mockDerived onChange={(v) => onChange({ seam_allowance: v })} />
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Edge" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <SelectField<BeanieFinish> id="finish" label="Edge" value={finish} error={errors['finish']}
            options={[{ value: 'cuff', label: 'Folded cuff band' }, { value: 'hem', label: 'Hemmed edge' }]}
            onChange={(v) => onChange({ finish: v })} />
          {finish === 'cuff' ? (
            <NumericField id="cuff-height" label={`Cuff height, folded (${units})`} value={inputs.cuff_height} error={errors['cuff_height']} step={step} placeholder={ph(CUFF_HEIGHT_MM)} mockDerived onChange={(v) => onChange({ cuff_height: v })} />
          ) : (
            <NumericField id="hem-depth" label={`Hem depth (${units})`} value={inputs.hem_depth} error={errors['hem_depth']} step={step} placeholder={ph(HEM_DEPTH_MM)} mockDerived onChange={(v) => onChange({ hem_depth: v })} />
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
