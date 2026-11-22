import { NumericField, SelectField, Toggle, UnitToggle, CollapsibleSection, VaultOpenNote } from '../shared/fields/index.js';
import type { BivyInputs, BivyHeadGusset, BivyZipSide, BivyZipStyle } from '../../generators/bivy/types.js';
import { LENGTH_MM, FLOOR_WIDTH_MM, TUB_HEIGHT_MM, TOP_WIDTH_MM, ZIP_LENGTH_MM, FABRIC_WIDTH_MM, SEAM_ALLOWANCE_MM, J_FROM_HEAD_MM, BRIM_FROM_HEAD_MM, BRIM_CHANNEL_MM } from '../../generators/bivy/defaults.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

const DISPLAY_UNIT_FIELDS = ['length', 'floor_width', 'tub_height', 'top_width', 'zip_length', 'fabric_width', 'j_from_head', 'brim_from_head', 'brim_channel'] as const;

interface Props { inputs: BivyInputs; errors: Record<string, string>; onChange: (changes: Partial<BivyInputs>) => void }

export function BivySettingsPanel({ inputs, errors, onChange }: Props) {
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
          The vault's shelter and sleep notes were not available when this pattern was built, so every number marked{' '}
          <span className="font-medium">measure</span> is a common starting point, not a checked measurement. Check each
          against the vault or a mock-up before cutting. Sewn fabrics only.
        </VaultOpenNote>
      </div>

      <CollapsibleSection title="Floor" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="length" label={`Floor length (${units})`} value={inputs.length} error={errors['length']} step={step} placeholder={ph(LENGTH_MM)} mockDerived onChange={(v) => onChange({ length: v })} />
          <NumericField id="floor-width" label={`Floor width (${units})`} value={inputs.floor_width} error={errors['floor_width']} step={step} placeholder={ph(FLOOR_WIDTH_MM)} mockDerived onChange={(v) => onChange({ floor_width: v })} />
          <NumericField id="tub-height" label={`Tub height (${units})`} value={inputs.tub_height} error={errors['tub_height']} step={step} placeholder={ph(TUB_HEIGHT_MM)} mockDerived help="The floor's sides rise this far; corners fold, no seam." onChange={(v) => onChange({ tub_height: v })} />
          <NumericField id="fabric-width" label={`Usable fabric width (${units})`} value={inputs.fabric_width} error={errors['fabric_width']} step={step} placeholder={ph(FABRIC_WIDTH_MM)} mockDerived onChange={(v) => onChange({ fabric_width: v })} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Top and ends" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="top-width" label={`Top width laid flat (${units})`} value={inputs.top_width} error={errors['top_width']} step={step} placeholder={ph(TOP_WIDTH_MM)} mockDerived help="Wider than the floor; the difference arches over you." onChange={(v) => onChange({ top_width: v })} />
          <SelectField<BivyHeadGusset> id="top-material" label="Top" value={inputs.top_material ?? 'fabric'} error={errors['top_material']}
            options={[{ value: 'fabric', label: 'Top fabric' }, { value: 'mesh', label: 'All mesh (bug bivy)' }]}
            onChange={(v) => onChange({ top_material: v })} />
          <SelectField<BivyHeadGusset> id="head-gusset" label="Head gusset" value={inputs.head_gusset ?? 'mesh'} error={errors['head_gusset']}
            options={[{ value: 'mesh', label: 'No-see-um mesh' }, { value: 'fabric', label: 'Top fabric' }]}
            onChange={(v) => onChange({ head_gusset: v })} />
          <NumericField id="zip-length" label={`Side zipper (${units})`} value={inputs.zip_length} error={errors['zip_length']} step={step} placeholder={ph(ZIP_LENGTH_MM)} mockDerived onChange={(v) => onChange({ zip_length: v })} />
          <SelectField<BivyZipSide> id="zip-side" label="Zipper side" value={inputs.zip_side ?? 'left'} error={errors['zip_side']}
            options={[{ value: 'left', label: 'Left (lying on your back)' }, { value: 'right', label: 'Right' }]}
            onChange={(v) => onChange({ zip_side: v })} />
          <SelectField<BivyZipStyle> id="zip-style" label="Zipper" value={inputs.zip_style ?? 'side'} error={errors['zip_style']}
            options={[{ value: 'side', label: 'Side, from the head' }, { value: 'j', label: 'J: across the top, then down the side' }]}
            onChange={(v) => onChange({ zip_style: v })} />
          {(inputs.zip_style ?? 'side') === 'j' && (
            <NumericField id="j-from-head" label={`J crosses the top, from the head (${units})`} value={inputs.j_from_head} error={errors['j_from_head']} step={step} placeholder={ph(J_FROM_HEAD_MM)} mockDerived onChange={(v) => onChange({ j_from_head: v })} />
          )}
          <NumericField id="seam-allowance" label="Seam allowance (mm)" value={inputs.seam_allowance} error={errors['seam_allowance']} step={0.5} placeholder={String(SEAM_ALLOWANCE_MM)} mockDerived help="Baked into every cut piece." onChange={(v) => onChange({ seam_allowance: v })} />
        </div>
        <Toggle id="brim" label="Brim channel at the head (wire or short pole)" value={inputs.brim ?? false} onChange={(v) => onChange({ brim: v })} />
        {(inputs.brim ?? false) && (
          <div className="grid grid-cols-2 gap-3">
            <NumericField id="brim-from-head" label={`Brim from the head edge (${units})`} value={inputs.brim_from_head} error={errors['brim_from_head']} step={step} placeholder={ph(BRIM_FROM_HEAD_MM)} mockDerived onChange={(v) => onChange({ brim_from_head: v })} />
            <NumericField id="brim-channel" label={`Brim channel width (${units})`} value={inputs.brim_channel} error={errors['brim_channel']} step={step} placeholder={ph(BRIM_CHANNEL_MM)} mockDerived onChange={(v) => onChange({ brim_channel: v })} />
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
