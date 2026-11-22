import { NumericField, SelectField, Toggle, UnitToggle, CollapsibleSection, VaultOpenNote } from '../shared/fields/index.js';
import type { QuiltInputs, QuiltConstruction, QuiltFootbox, QuiltKind } from '../../generators/quilt/types.js';
import {
  LENGTH_MM, SHOULDER_WIDTH_MM, FOOT_WIDTH_MM, FOOTBOX_LENGTH_MM, FABRIC_WIDTH_MM, LOFT_MM, BAFFLE_SPACING_MM,
  SHELL_DIFFERENTIAL_PCT, FILL_POWER, OVERSTUFF_PCT, SEAM_ALLOWANCE_MM, END_CHANNEL_MM, NECK_CHANNEL_MM, PAD_WIDTH_MM,
} from '../../generators/quilt/defaults.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

const DISPLAY_UNIT_FIELDS = ['length', 'shoulder_width', 'foot_width', 'footbox_length', 'fabric_width', 'loft', 'baffle_spacing', 'end_channel', 'neck_channel', 'pad_width'] as const;

interface Props { inputs: QuiltInputs; errors: Record<string, string>; onChange: (changes: Partial<QuiltInputs>) => void }

export function QuiltSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';
  const step = units === 'in' ? 0.125 : 1;
  const ph = (mm: number) => (units === 'in' ? String(Math.round((mm / 25.4) * 1000) / 1000) : String(Math.round(mm * 10) / 10));
  const construction = inputs.construction ?? 'baffled';
  const uq = (inputs.kind ?? 'top_quilt') === 'underquilt';
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
          <span className="font-medium">measure</span> is a placeholder, the fill figures included. Check each against the
          vault or a test sleep before cutting. Sewn fabrics only.
        </VaultOpenNote>
      </div>

      <CollapsibleSection title="Size and taper" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <SelectField<QuiltKind> id="kind" label="Quilt" value={inputs.kind ?? 'top_quilt'} error={errors['kind']}
            options={[{ value: 'top_quilt', label: 'Top quilt (tapered, footbox)' }, { value: 'underquilt', label: 'Underquilt (rectangle, hung under a hammock)' }]}
            onChange={(v) => onChange({ kind: v })} />
          <NumericField id="length" label={`Length head to foot (${units})`} value={inputs.length} error={errors['length']} step={step} placeholder={ph(LENGTH_MM)} mockDerived onChange={(v) => onChange({ length: v })} />
          <NumericField id="shoulder-width" label={`Shoulder width (${units})`} value={inputs.shoulder_width} error={errors['shoulder_width']} step={step} placeholder={ph(SHOULDER_WIDTH_MM)} mockDerived onChange={(v) => onChange({ shoulder_width: v })} />
          {uq ? (
            <NumericField id="end-channel" label={`End channel (${units})`} value={inputs.end_channel} error={errors['end_channel']} step={step} placeholder={ph(END_CHANNEL_MM)} mockDerived help="Each end rolls into a channel for the shock-cord suspension." onChange={(v) => onChange({ end_channel: v })} />
          ) : (
          <NumericField id="foot-width" label={`Foot width (${units})`} value={inputs.foot_width} error={errors['foot_width']} step={step} placeholder={ph(FOOT_WIDTH_MM)} mockDerived onChange={(v) => onChange({ foot_width: v })} />
          )}
          <NumericField id="fabric-width" label={`Usable fabric width (${units})`} value={inputs.fabric_width} error={errors['fabric_width']} step={step} placeholder={ph(FABRIC_WIDTH_MM)} mockDerived onChange={(v) => onChange({ fabric_width: v })} />
          <NumericField id="seam-allowance" label="Seam allowance (mm)" value={inputs.seam_allowance} error={errors['seam_allowance']} step={0.5} placeholder={String(SEAM_ALLOWANCE_MM)} mockDerived help="Perimeter seam and both baffle edges; baked into every cut piece." onChange={(v) => onChange({ seam_allowance: v })} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Chambers" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <SelectField<QuiltConstruction> id="construction" label="Chambers" value={construction} error={errors['construction']}
            options={[{ value: 'baffled', label: 'Baffled (mesh walls, full loft)' }, { value: 'sewn_through', label: 'Sewn through both layers' }]}
            onChange={(v) => onChange({ construction: v })} />
          <NumericField id="loft" label={`Loft (${units})`} value={inputs.loft} error={errors['loft']} step={step} placeholder={ph(LOFT_MM)} mockDerived help={construction === 'baffled' ? 'The baffle height.' : 'The peak between two stitch lines.'} onChange={(v) => onChange({ loft: v })} />
          <NumericField id="baffle-spacing" label={`Chamber spacing (${units})`} value={inputs.baffle_spacing} error={errors['baffle_spacing']} step={step} placeholder={ph(BAFFLE_SPACING_MM)} mockDerived help="The largest pitch; the length is divided evenly." onChange={(v) => onChange({ baffle_spacing: v })} />
          {construction === 'baffled' && (
            <NumericField id="shell-differential" label="Shell differential (%)" value={inputs.shell_differential} error={errors['shell_differential']} step={0.5} placeholder={String(SHELL_DIFFERENTIAL_PCT)} mockDerived help={uq ? 'The liner (toward the hammock) is cut this much wider than the shell.' : 'The shell is cut this much wider than the liner.'} onChange={(v) => onChange({ shell_differential: v })} />
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Fill" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="fill-power" label="Fill power (in³/oz)" value={inputs.fill_power} error={errors['fill_power']} step={25} placeholder={String(FILL_POWER)} mockDerived onChange={(v) => onChange({ fill_power: v })} />
          <NumericField id="overstuff" label="Overstuff (%)" value={inputs.overstuff} error={errors['overstuff']} step={1} placeholder={String(OVERSTUFF_PCT)} mockDerived onChange={(v) => onChange({ overstuff: v })} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Neck and pad" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-3">
          {!uq && (
            <SelectField<'none' | 'drawcord'> id="neck" label="Neck" value={inputs.neck ?? 'none'} error={errors['neck']}
              options={[{ value: 'none', label: 'Plain head edge' }, { value: 'drawcord', label: 'Drawcord channel and snap' }]}
              onChange={(v) => onChange({ neck: v })} />
          )}
          {!uq && (inputs.neck ?? 'none') === 'drawcord' && (
            <NumericField id="neck-channel" label={`Neck channel (${units})`} value={inputs.neck_channel} error={errors['neck_channel']} step={step} placeholder={ph(NECK_CHANNEL_MM)} mockDerived onChange={(v) => onChange({ neck_channel: v })} />
          )}
          {(inputs.pad_straps ?? false) && (
            <NumericField id="pad-width" label={`Pad width (${units})`} value={inputs.pad_width} error={errors['pad_width']} step={step} placeholder={ph(PAD_WIDTH_MM)} mockDerived onChange={(v) => onChange({ pad_width: v })} />
          )}
        </div>
        {construction === 'baffled' && <Toggle id="side-baffles" label="Side baffles (loft runs to the edge)" value={inputs.side_baffles ?? false} onChange={(v) => onChange({ side_baffles: v })} />}
        <Toggle id="pad-straps" label="Pad straps (loops in the side seams)" value={inputs.pad_straps ?? false} onChange={(v) => onChange({ pad_straps: v })} />
      </CollapsibleSection>

      {!uq && <CollapsibleSection title="Footbox" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <SelectField<QuiltFootbox> id="footbox" label="Footbox" value={inputs.footbox ?? 'sewn'} error={errors['footbox']}
            options={[{ value: 'sewn', label: 'Sewn closed' }, { value: 'zip', label: 'Zipper (opens flat)' }]}
            onChange={(v) => onChange({ footbox: v })} />
          <NumericField id="footbox-length" label={`Footbox length (${units})`} value={inputs.footbox_length} error={errors['footbox_length']} step={step} placeholder={ph(FOOTBOX_LENGTH_MM)} mockDerived onChange={(v) => onChange({ footbox_length: v })} />
        </div>
      </CollapsibleSection>}
    </div>
  );
}
