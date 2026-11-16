import { NumericField, SelectField, Toggle, UnitToggle, CollapsibleSection, VaultOpenNote } from '../shared/fields/index.js';
import type { HammockInputs, HammockEndStyle, HammockSideEdge } from '../../generators/hammock/types.js';
import type { HemFold } from '../../lib/pattern-engine/primitives/hem.js';
import { LENGTH_MM, WIDTH_MM, FABRIC_WIDTH_MM, SIDE_HEM_DEPTH_MM, CHANNEL_DEPTH_MM, WHIP_TAIL_MM, RIDGELINE_PCT } from '../../generators/hammock/defaults.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

const DISPLAY_UNIT_FIELDS = ['length', 'width', 'fabric_width', 'side_hem_depth', 'channel_depth', 'whip_tail'] as const;
const LB = 0.45359237;

interface Props { inputs: HammockInputs; errors: Record<string, string>; onChange: (changes: Partial<HammockInputs>) => void }

export function HammockSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';
  const step = units === 'in' ? 0.125 : 1;
  const ph = (mm: number) => (units === 'in' ? String(Math.round((mm / 25.4) * 1000) / 1000) : String(Math.round(mm * 10) / 10));
  const endStyle = inputs.end_style ?? 'channel';
  const sideEdge = inputs.side_edge ?? 'hem';
  const weightUnit = units === 'in' ? 'lb' : 'kg';
  function handleUnitsChange(next: UnitSystem) {
    if (next === units) return;
    // Weights follow the unit: lb with inches, kg with millimetres.
    const w = (v: number | undefined) => (typeof v === 'number' && Number.isFinite(v) ? Math.round((next === 'mm' ? v * LB : v / LB) * 10) / 10 : v);
    onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, units, next), occupant_weight: w(inputs.occupant_weight), fabric_rating: w(inputs.fabric_rating) });
  }
  return (
    <div className="space-y-2">
      <div className="rounded border border-border p-3 space-y-3">
        <UnitToggle value={units} onChange={handleUnitsChange} />
        <VaultOpenNote>
          The vault's shelter and sleep notes were not available when this pattern was built, so every number marked{' '}
          <span className="font-medium">measure</span> is a placeholder. Check each against the vault or a test hang before
          cutting. Sewn fabrics only.
        </VaultOpenNote>
      </div>

      <CollapsibleSection title="Body" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="length" label={`Length gather to gather (${units})`} value={inputs.length} error={errors['length']} step={step} placeholder={ph(LENGTH_MM)} mockDerived onChange={(v) => onChange({ length: v })} />
          <NumericField id="width" label={`Finished width (${units})`} value={inputs.width} error={errors['width']} step={step} placeholder={ph(WIDTH_MM)} mockDerived onChange={(v) => onChange({ width: v })} />
          <NumericField id="fabric-width" label={`Usable fabric width (${units})`} value={inputs.fabric_width} error={errors['fabric_width']} step={step} placeholder={ph(FABRIC_WIDTH_MM)} mockDerived onChange={(v) => onChange({ fabric_width: v })} />
          <SelectField<HammockSideEdge> id="side-edge" label="Long sides" value={sideEdge} error={errors['side_edge']}
            options={[{ value: 'hem', label: 'Hemmed' }, { value: 'selvedge', label: 'Selvedge (no hem)' }]}
            onChange={(v) => onChange({ side_edge: v })} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Ends and hems" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <SelectField<HammockEndStyle> id="end-style" label="Gathered ends" value={endStyle} error={errors['end_style']}
            options={[{ value: 'channel', label: 'Channel (cord through a sewn channel)' }, { value: 'whipping', label: 'Whipping (gathered and whipped)' }]}
            onChange={(v) => onChange({ end_style: v })} />
          {endStyle === 'channel' ? (
            <NumericField id="channel-depth" label={`Channel depth (${units})`} value={inputs.channel_depth} error={errors['channel_depth']} step={step} placeholder={ph(CHANNEL_DEPTH_MM)} mockDerived onChange={(v) => onChange({ channel_depth: v })} />
          ) : (
            <NumericField id="whip-tail" label={`Whip tail (${units})`} value={inputs.whip_tail} error={errors['whip_tail']} step={step} placeholder={ph(WHIP_TAIL_MM)} mockDerived onChange={(v) => onChange({ whip_tail: v })} />
          )}
          {(sideEdge === 'hem' || endStyle === 'whipping') && (
            <NumericField id="side-hem-depth" label={`Side hem depth (${units})`} value={inputs.side_hem_depth} error={errors['side_hem_depth']} step={step} placeholder={ph(SIDE_HEM_DEPTH_MM)} mockDerived onChange={(v) => onChange({ side_hem_depth: v })} />
          )}
          <SelectField<HemFold> id="hem-fold" label="Hem" value={inputs.hem_fold ?? 'double'} error={errors['hem_fold']}
            options={[{ value: 'double', label: 'Double fold (rolled) — encloses the raw edge' }, { value: 'single', label: 'Single fold, marked at double (raw edge exposed)' }]}
            onChange={(v) => onChange({ hem_fold: v })} />
        </div>
        <Toggle label='Production mode — every hem at least 1/2"' value={inputs.production_mode ?? false} onChange={(v) => onChange({ production_mode: v })} />
      </CollapsibleSection>

      <CollapsibleSection title="Ridgeline and load" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="ridgeline-pct" label="Structural ridgeline (% of length)" value={inputs.ridgeline_pct} error={errors['ridgeline_pct']} step={0.5} placeholder={String(RIDGELINE_PCT)} mockDerived onChange={(v) => onChange({ ridgeline_pct: v })} />
          <NumericField id="occupant-weight" label={`Occupant weight (${weightUnit})`} value={inputs.occupant_weight} error={errors['occupant_weight']} step={1} help="Optional. With the fabric rating, drives the load check." onChange={(v) => onChange({ occupant_weight: v })} />
          <NumericField id="fabric-rating" label={`Fabric rating (${weightUnit})`} value={inputs.fabric_rating} error={errors['fabric_rating']} step={1} help="The fabric maker's rated load for a hammock." onChange={(v) => onChange({ fabric_rating: v })} />
        </div>
      </CollapsibleSection>
    </div>
  );
}
