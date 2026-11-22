import { NumericField, SelectField, UnitToggle, CollapsibleSection, VaultOpenNote } from '../shared/fields/index.js';
import type { WindShirtInputs, ShirtBody } from '../../generators/wind-shirt/types.js';
import {
  EXAMPLE_BODY_MM, EASE_MM, SHOULDER_DROP_MM, CAP_EASE_MM, HEM_DEPTH_MM, CUFF_CHANNEL_MM, ELASTIC_PCT, ZIP_LENGTH_MM,
  BINDING_WIDTH_MM, FABRIC_WIDTH_MM, SEAM_ALLOWANCE_MM,
} from '../../generators/wind-shirt/defaults.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

const DISPLAY_UNIT_FIELDS = ['chest', 'waist', 'hip', 'neck', 'bicep', 'wrist', 'nape_to_waist', 'scye_depth', 'waist_to_hip', 'shoulder_width', 'arm_length',
  'ease_chest', 'ease_waist', 'ease_hip', 'ease_neck', 'ease_bicep', 'ease_wrist', 'shoulder_drop', 'cap_ease', 'hem_depth', 'cuff_channel', 'zip_length', 'binding_width', 'fabric_width'] as const;

interface Props { inputs: WindShirtInputs; errors: Record<string, string>; onChange: (changes: Partial<WindShirtInputs>) => void }

export function WindShirtSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';
  const step = units === 'in' ? 0.125 : 1;
  const ph = (mm: number) => (units === 'in' ? String(Math.round((mm / 25.4) * 1000) / 1000) : String(Math.round(mm * 10) / 10));
  function handleUnitsChange(next: UnitSystem) {
    if (next === units) return;
    onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, units, next) });
  }
  return (
    <div className="space-y-2">
      <div className="rounded border border-border p-3 space-y-3">
        <UnitToggle value={units} onChange={handleUnitsChange} />
        <VaultOpenNote>
          The measurements shown are an <span className="font-medium">example body</span> (one person), not a size chart:
          measure the wearer and enter every one. The construction numbers are starting points too.
        </VaultOpenNote>
      </div>
      <CollapsibleSection title="Measurements" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="chest" label={`Chest (${units})`} value={inputs.chest} error={errors['chest']} step={step} placeholder={ph(EXAMPLE_BODY_MM.chest)} mockDerived onChange={(v) => onChange({ chest: v })} />
          <NumericField id="waist" label={`Waist (${units})`} value={inputs.waist} error={errors['waist']} step={step} placeholder={ph(EXAMPLE_BODY_MM.waist)} mockDerived onChange={(v) => onChange({ waist: v })} />
          <NumericField id="hip" label={`Hip (${units})`} value={inputs.hip} error={errors['hip']} step={step} placeholder={ph(EXAMPLE_BODY_MM.hip)} mockDerived onChange={(v) => onChange({ hip: v })} />
          <NumericField id="neck" label={`Neck (${units})`} value={inputs.neck} error={errors['neck']} step={step} placeholder={ph(EXAMPLE_BODY_MM.neck)} mockDerived onChange={(v) => onChange({ neck: v })} />
          <NumericField id="bicep" label={`Bicep (${units})`} value={inputs.bicep} error={errors['bicep']} step={step} placeholder={ph(EXAMPLE_BODY_MM.bicep)} mockDerived onChange={(v) => onChange({ bicep: v })} />
          <NumericField id="wrist" label={`Wrist (${units})`} value={inputs.wrist} error={errors['wrist']} step={step} placeholder={ph(EXAMPLE_BODY_MM.wrist)} mockDerived onChange={(v) => onChange({ wrist: v })} />
          <NumericField id="nape-to-waist" label={`Nape to waist (${units})`} value={inputs.nape_to_waist} error={errors['nape_to_waist']} step={step} placeholder={ph(EXAMPLE_BODY_MM.nape_to_waist)} mockDerived onChange={(v) => onChange({ nape_to_waist: v })} />
          <NumericField id="scye-depth" label={`Scye depth (nape to armpit level) (${units})`} value={inputs.scye_depth} error={errors['scye_depth']} step={step} placeholder={ph(EXAMPLE_BODY_MM.scye_depth)} mockDerived onChange={(v) => onChange({ scye_depth: v })} />
          <NumericField id="waist-to-hip" label={`Waist to hip (${units})`} value={inputs.waist_to_hip} error={errors['waist_to_hip']} step={step} placeholder={ph(EXAMPLE_BODY_MM.waist_to_hip)} mockDerived onChange={(v) => onChange({ waist_to_hip: v })} />
          <NumericField id="shoulder-width" label={`Shoulder width (across the back) (${units})`} value={inputs.shoulder_width} error={errors['shoulder_width']} step={step} placeholder={ph(EXAMPLE_BODY_MM.shoulder_width)} mockDerived onChange={(v) => onChange({ shoulder_width: v })} />
          <NumericField id="arm-length" label={`Arm length (shoulder to wrist) (${units})`} value={inputs.arm_length} error={errors['arm_length']} step={step} placeholder={ph(EXAMPLE_BODY_MM.arm_length)} mockDerived onChange={(v) => onChange({ arm_length: v })} />
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Fit and ease" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <SelectField<ShirtBody> id="body" label="Body" value={inputs.body ?? 'straight'} error={errors['body']}
            options={[{ value: 'straight', label: 'Straight (side seam straight down)' }, { value: 'shaped', label: 'Shaped to the waist and hip' }]}
            onChange={(v) => onChange({ body: v })} />
          <NumericField id="ease-chest" label={`Chest ease (${units})`} value={inputs.ease_chest} error={errors['ease_chest']} step={step} placeholder={ph(EASE_MM.chest)} mockDerived onChange={(v) => onChange({ ease_chest: v })} />
          <NumericField id="ease-waist" label={`Waist ease (${units})`} value={inputs.ease_waist} error={errors['ease_waist']} step={step} placeholder={ph(EASE_MM.waist)} mockDerived onChange={(v) => onChange({ ease_waist: v })} />
          <NumericField id="ease-hip" label={`Hip ease (${units})`} value={inputs.ease_hip} error={errors['ease_hip']} step={step} placeholder={ph(EASE_MM.hip)} mockDerived onChange={(v) => onChange({ ease_hip: v })} />
          <NumericField id="ease-neck" label={`Neck ease (${units})`} value={inputs.ease_neck} error={errors['ease_neck']} step={step} placeholder={ph(EASE_MM.neck)} mockDerived onChange={(v) => onChange({ ease_neck: v })} />
          <NumericField id="ease-bicep" label={`Bicep ease (${units})`} value={inputs.ease_bicep} error={errors['ease_bicep']} step={step} placeholder={ph(EASE_MM.bicep)} mockDerived onChange={(v) => onChange({ ease_bicep: v })} />
          <NumericField id="ease-wrist" label={`Wrist ease (${units})`} value={inputs.ease_wrist} error={errors['ease_wrist']} step={step} placeholder={ph(EASE_MM.wrist)} mockDerived onChange={(v) => onChange({ ease_wrist: v })} />
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Construction" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="shoulder-drop" label={`Shoulder drop (${units})`} value={inputs.shoulder_drop} error={errors['shoulder_drop']} step={step} placeholder={ph(SHOULDER_DROP_MM)} mockDerived onChange={(v) => onChange({ shoulder_drop: v })} />
          <NumericField id="cap-ease" label={`Sleeve cap ease (${units})`} value={inputs.cap_ease} error={errors['cap_ease']} step={step} placeholder={ph(CAP_EASE_MM)} mockDerived onChange={(v) => onChange({ cap_ease: v })} />
          <NumericField id="hem-depth" label={`Hem depth (${units})`} value={inputs.hem_depth} error={errors['hem_depth']} step={step} placeholder={ph(HEM_DEPTH_MM)} mockDerived onChange={(v) => onChange({ hem_depth: v })} />
          <NumericField id="cuff-channel" label={`Cuff elastic channel (${units})`} value={inputs.cuff_channel} error={errors['cuff_channel']} step={step} placeholder={ph(CUFF_CHANNEL_MM)} mockDerived onChange={(v) => onChange({ cuff_channel: v })} />
          <NumericField id="zip-length" label={`Neck zipper (${units})`} value={inputs.zip_length} error={errors['zip_length']} step={step} placeholder={ph(ZIP_LENGTH_MM)} mockDerived onChange={(v) => onChange({ zip_length: v })} />
          <NumericField id="binding-width" label={`Neck binding strip (${units})`} value={inputs.binding_width} error={errors['binding_width']} step={step} placeholder={ph(BINDING_WIDTH_MM)} mockDerived onChange={(v) => onChange({ binding_width: v })} />
          <NumericField id="fabric-width" label={`Usable fabric width (${units})`} value={inputs.fabric_width} error={errors['fabric_width']} step={step} placeholder={ph(FABRIC_WIDTH_MM)} mockDerived onChange={(v) => onChange({ fabric_width: v })} />
          <NumericField id="elastic-pct" label="Cuff elastic (% of the wrist)" value={inputs.elastic_pct} error={errors['elastic_pct']} step={1} placeholder={String(ELASTIC_PCT)} mockDerived onChange={(v) => onChange({ elastic_pct: v })} />
          <NumericField id="seam-allowance" label="Seam allowance (mm)" value={inputs.seam_allowance} error={errors['seam_allowance']} step={0.5} placeholder={String(SEAM_ALLOWANCE_MM)} mockDerived onChange={(v) => onChange({ seam_allowance: v })} />
        </div>
      </CollapsibleSection>
    </div>
  );
}
