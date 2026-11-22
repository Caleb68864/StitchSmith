import { NumericField, SelectField, Toggle, UnitToggle, CollapsibleSection, VaultOpenNote } from '../shared/fields/index.js';
import type { TarpInputs, TarpConstruction, TarpCutStyle } from '../../generators/tarp/types.js';
import type { HemFold } from '../../lib/pattern-engine/primitives/hem.js';
import {
  RIDGE_LENGTH_MM, WIDTH_MM, RIDGE_SAG_MM, EAVE_SAG_MM, FABRIC_WIDTH_MM, SEAM_ALLOWANCE_MM, HEM_DEPTH_MM, EAVE_TIEOUTS,
  PATCH_SIZE_MM, LOOP_LENGTH_MM, LOOP_WIDTH_MM, RIDGE_HEIGHT_MM, MAX_EAVE_TIEOUTS, GUYLINE_LENGTH_MM,
} from '../../generators/tarp/defaults.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

const DISPLAY_UNIT_FIELDS = ['ridge_length', 'width', 'ridge_sag', 'eave_sag', 'fabric_width', 'hem_depth', 'patch_size', 'loop_length', 'loop_width', 'ridge_height', 'guyline_length'] as const;

interface Props { inputs: TarpInputs; errors: Record<string, string>; onChange: (changes: Partial<TarpInputs>) => void }

export function TarpSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';
  const step = units === 'in' ? 0.125 : 1;
  // Placeholder text: the mock-derived starting value in the display unit.
  const ph = (mm: number) => (units === 'in' ? String(Math.round((mm / 25.4) * 1000) / 1000) : String(Math.round(mm * 10) / 10));
  const construction = inputs.construction ?? 'ridge_seam';
  const cutStyle = inputs.cut_style ?? 'cat_cut';
  const ridgeSeam = construction === 'ridge_seam';
  function handleUnitsChange(next: UnitSystem) {
    if (next === units) return;
    onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, units, next) });
  }
  return (
    <div className="space-y-2">
      <div className="rounded border border-border p-3 space-y-3">
        <UnitToggle value={units} onChange={handleUnitsChange} />
        <VaultOpenNote>
          The vault's shelter notes were not available when this pattern was built, so every number marked{' '}
          <span className="font-medium">measure</span> is a placeholder. Check each against the vault or a pitched mock-up before
          cutting. Sewn fabrics only (silnylon, silpoly); taped or bonded fabric such as DCF is not supported.
        </VaultOpenNote>
      </div>

      <CollapsibleSection title="Shape" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <SelectField<TarpConstruction> id="construction" label="Construction" value={construction} error={errors['construction']}
            options={[{ value: 'ridge_seam', label: 'Two panels, ridge seam' }, { value: 'single_panel', label: 'One panel, no seam' }]}
            onChange={(v) => onChange({ construction: v })} />
          <SelectField<TarpCutStyle> id="cut-style" label="Edges" value={cutStyle} error={errors['cut_style']}
            options={[{ value: 'cat_cut', label: 'Cat cut (catenary curves)' }, { value: 'flat', label: 'Straight' }]}
            onChange={(v) => onChange({ cut_style: v })} />
          <NumericField id="ridge-length" label={`Ridge length (${units})`} value={inputs.ridge_length} error={errors['ridge_length']} step={step} placeholder={ph(RIDGE_LENGTH_MM)} mockDerived onChange={(v) => onChange({ ridge_length: v })} />
          <NumericField id="width" label={`Width eave to eave (${units})`} value={inputs.width} error={errors['width']} step={step} placeholder={ph(WIDTH_MM)} mockDerived onChange={(v) => onChange({ width: v })} />
          {cutStyle === 'cat_cut' && ridgeSeam && (
            <NumericField id="ridge-sag" label={`Ridge cat-cut depth (${units})`} value={inputs.ridge_sag} error={errors['ridge_sag']} step={step} placeholder={ph(RIDGE_SAG_MM)} mockDerived onChange={(v) => onChange({ ridge_sag: v })} />
          )}
          {cutStyle === 'cat_cut' && (
            <NumericField id="eave-sag" label={`Eave cat-cut depth (${units})`} value={inputs.eave_sag} error={errors['eave_sag']} step={step} placeholder={ph(EAVE_SAG_MM)} mockDerived onChange={(v) => onChange({ eave_sag: v })} />
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Fabric, seam and hems" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="fabric-width" label={`Usable fabric width (${units})`} value={inputs.fabric_width} error={errors['fabric_width']} step={step} placeholder={ph(FABRIC_WIDTH_MM)} mockDerived onChange={(v) => onChange({ fabric_width: v })} />
          {ridgeSeam && (
            <NumericField id="seam-allowance" label="Ridge seam allowance (mm)" value={inputs.seam_allowance} error={errors['seam_allowance']} step={0.5} placeholder={String(Math.round(SEAM_ALLOWANCE_MM * 10) / 10)} mockDerived onChange={(v) => onChange({ seam_allowance: v })} />
          )}
          <NumericField id="hem-depth" label={`Hem depth (${units})`} value={inputs.hem_depth} error={errors['hem_depth']} step={step} placeholder={ph(HEM_DEPTH_MM)} mockDerived onChange={(v) => onChange({ hem_depth: v })} />
          <SelectField<HemFold> id="hem-fold" label="Hem" value={inputs.hem_fold ?? 'double'} error={errors['hem_fold']}
            options={[{ value: 'double', label: 'Double fold (rolled) — encloses the raw edge' }, { value: 'single', label: 'Single fold, marked at double (raw edge exposed)' }]}
            onChange={(v) => onChange({ hem_fold: v })} />
        </div>
        <Toggle label='Production mode — every hem at least 1/2"' value={inputs.production_mode ?? false} onChange={(v) => onChange({ production_mode: v })} />
      </CollapsibleSection>

      <CollapsibleSection title="Tie-outs" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="eave-tieouts" label={`Tie-outs per eave (0–${MAX_EAVE_TIEOUTS}, plus corners)`} value={inputs.eave_tieouts} error={errors['eave_tieouts']} step={1} placeholder={String(EAVE_TIEOUTS)} mockDerived onChange={(v) => onChange({ eave_tieouts: v })} />
          <NumericField id="patch-size" label={`Patch size (${units})`} value={inputs.patch_size} error={errors['patch_size']} step={step} placeholder={ph(PATCH_SIZE_MM)} mockDerived onChange={(v) => onChange({ patch_size: v })} />
          <NumericField id="loop-length" label={`Loop grosgrain cut (${units})`} value={inputs.loop_length} error={errors['loop_length']} step={step} placeholder={ph(LOOP_LENGTH_MM)} mockDerived onChange={(v) => onChange({ loop_length: v })} />
          <NumericField id="loop-width" label={`Grosgrain width (${units})`} value={inputs.loop_width} error={errors['loop_width']} step={step} placeholder={ph(LOOP_WIDTH_MM)} mockDerived onChange={(v) => onChange({ loop_width: v })} />
        </div>
        <Toggle label="Tie-outs at both ridge ends" value={inputs.ridge_tieouts ?? true} onChange={(v) => onChange({ ridge_tieouts: v })} />
        <Toggle label="Guylines on the BOM (one per tie-out)" value={inputs.guylines ?? true} onChange={(v) => onChange({ guylines: v })} />
        {(inputs.guylines ?? true) && (
          <div className="grid grid-cols-2 gap-3">
            <NumericField id="guyline-length" label={`Cord per guyline (${units})`} value={inputs.guyline_length} error={errors['guyline_length']} step={step} placeholder={ph(GUYLINE_LENGTH_MM)} mockDerived onChange={(v) => onChange({ guyline_length: v })} />
          </div>
        )}
        {(inputs.guylines ?? true) && <Toggle label="Line-lock on each guyline" value={inputs.line_locks ?? true} onChange={(v) => onChange({ line_locks: v })} />}
      </CollapsibleSection>

      <CollapsibleSection title="Pitch check" defaultOpen>
        <NumericField id="ridge-height" label={`Ridgeline height (${units})`} value={inputs.ridge_height} error={errors['ridge_height']} step={step} placeholder={ph(RIDGE_HEIGHT_MM)} mockDerived help="Eaves staked to the ground. Used for the footprint and the 3D check only." onChange={(v) => onChange({ ridge_height: v })} />
      </CollapsibleSection>
    </div>
  );
}
