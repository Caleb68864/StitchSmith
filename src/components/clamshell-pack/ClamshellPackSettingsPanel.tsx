import { NumericField, Toggle, SelectField, UnitToggle , CollapsibleSection, displayNumber } from '../shared/fields/index.js';
import type { ClamshellPackInputs, PocketGrid, StrapProvision, PalsStyle } from '../../generators/clamshell-pack/types.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

const DISPLAY_UNIT_FIELDS = ['width', 'height', 'depth', 'lid_depth', 'zipper_lip', 'zipper_underwrap', 'hoop_overcut', 'seam_allowance', 'fold_in', 'zipper_clearance', 'edge_offset', 'handle_bow', 'handle_fold_under', 'compression_extra', 'loop_strip_width', 'loop_gap', 'strap_tab_spacing'] as const;

interface Props { inputs: ClamshellPackInputs; errors: Record<string, string>; onChange: (changes: Partial<ClamshellPackInputs>) => void }


export function ClamshellPackSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';
  const step = units === 'in' ? 0.125 : 1;
  const ph = (inch: string, mm: string) => (units === 'in' ? inch : mm);
  const grid = inputs.pocket_grid ?? 'custom';
  function handleUnitsChange(next: UnitSystem) { if (next !== units) onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, units, next) }); }
  return (
    <div className="space-y-2">
      <div className="rounded border border-border p-3 space-y-3">
        <UnitToggle value={units} onChange={handleUnitsChange} />
      </div>

      <CollapsibleSection
        title="Footprint"
        defaultOpen
        summary={inputs.width && inputs.height ? `${displayNumber(inputs.width)} × ${displayNumber(inputs.height)} × ${displayNumber(inputs.depth) || '?'} ${units}` : undefined}
      >
      <SelectField<PocketGrid> id="pocket-grid" label="Mesh pocket grid (drives the footprint)" value={grid} options={[{ value: 'custom', label: 'Custom width × height' }, { value: '2x2', label: '2 × 2 small pockets — 11 × 16"' }, { value: '3x3', label: '3 × 3 — 15 × 24" (the requested big variant)' }]} onChange={v => onChange({ pocket_grid: v })} />
      <div className="grid grid-cols-3 gap-3">
        <NumericField id="width" label={`Width (${units})`} value={inputs.width} error={errors['width']} step={step} placeholder={ph('11', '279')} disabled={grid !== 'custom'} onChange={v => onChange({ width: v })} />
        <NumericField id="height" label={`Height (${units})`} value={inputs.height} error={errors['height']} step={step} placeholder={ph('16', '406')} disabled={grid !== 'custom'} onChange={v => onChange({ height: v })} />
        <NumericField id="depth" label={`Depth (${units})`} value={inputs.depth} error={errors['depth']} step={step} placeholder={ph('6', '152')} onChange={v => onChange({ depth: v })} />
      </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Zipper frame"
        summary={inputs.zipper_lip ? `${displayNumber(inputs.zipper_lip)} ${units} lip` : undefined}
      >
      <Toggle label="Equal frame split (tool pod) — lid and base the same depth" value={inputs.equal_split ?? false} onChange={v => onChange({ equal_split: v })} />
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="lid-depth" label={`Lid side depth (${units})`} value={inputs.lid_depth} error={errors['lid_depth']} step={step} placeholder={ph('1.5', '38')} disabled={inputs.equal_split ?? false} onChange={v => onChange({ lid_depth: v })} />
        <NumericField id="zipper-lip" label={`Zipper lip fold-over (${units})`} value={inputs.zipper_lip} error={errors['zipper_lip']} step={step} placeholder={ph('1', '25.4')} onChange={v => onChange({ zipper_lip: v })} />
        <NumericField id="underwrap" label={`Zipper under the bottom corners (${units})`} value={inputs.zipper_underwrap} error={errors['zipper_underwrap']} step={step} placeholder={ph('1.75', '44')} onChange={v => onChange({ zipper_underwrap: v })} />
        <NumericField id="hoop-overcut" label={`Hoop overcut (${units})`} value={inputs.hoop_overcut} error={errors['hoop_overcut']} step={step} placeholder={ph('0.5', '12.7')} onChange={v => onChange({ hoop_overcut: v })} />
        <NumericField id="seam-allowance" label={`Seam allowance (${units})`} value={inputs.seam_allowance} error={errors['seam_allowance']} step={step} placeholder={ph('0.5', '12.7')} onChange={v => onChange({ seam_allowance: v })} />
        <NumericField id="fold-in" label={`Bottom fold-in (${units})`} value={inputs.fold_in} error={errors['fold_in']} step={step} placeholder={ph('0.5', '12.7')} onChange={v => onChange({ fold_in: v })} />
      </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="PALS"
        summary={`${inputs.pals_cols_side ?? 3} columns`}
      >
      <SelectField<PalsStyle> id="pals-style" label="PALS style" value={inputs.pals_style ?? 'sewn'} options={[{ value: 'sewn', label: 'Sewn 1" webbing' }, { value: 'fabricated', label: 'Fabricated from 2" Cordura (colour match)' }, { value: 'laser', label: 'Laser-cut laminate' }]} onChange={v => onChange({ pals_style: v })} />
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="rows-side" label="Rows per side" value={inputs.pals_rows_side} error={errors['pals_rows_side']} step={1} placeholder="7" onChange={v => onChange({ pals_rows_side: v })} />
        <NumericField id="cols-side" label="Columns across the side" value={inputs.pals_cols_side} error={errors['pals_cols_side']} step={1} placeholder="3" onChange={v => onChange({ pals_cols_side: v })} />
        <NumericField id="rows-face" label="Rows on the face" value={inputs.pals_rows_face} error={errors['pals_rows_face']} step={1} placeholder="5" onChange={v => onChange({ pals_rows_face: v })} />
        <NumericField id="rows-bottom" label="Rows on the bottom" value={inputs.pals_rows_bottom} error={errors['pals_rows_bottom']} step={1} placeholder="3" onChange={v => onChange({ pals_rows_bottom: v })} />
        <NumericField id="edge-offset" label={`PALS edge offset (${units})`} value={inputs.edge_offset} error={errors['edge_offset']} step={step} placeholder={ph('1', '25.4')} onChange={v => onChange({ edge_offset: v })} />
        <NumericField id="zipper-clearance" label={`Bartack clearance to the zipper (${units})`} value={inputs.zipper_clearance} error={errors['zipper_clearance']} step={step} placeholder={ph('0', '0')} onChange={v => onChange({ zipper_clearance: v })} />
      </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Externals"
        summary={undefined}
      >
      <Toggle label="Bowed rigid top handle" value={inputs.handle ?? true} onChange={v => onChange({ handle: v })} />
      {(inputs.handle ?? true) && (
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="handle-bow" label={`Handle bow rise (${units})`} value={inputs.handle_bow} error={errors['handle_bow']} step={step} placeholder={ph('2', '50.8')} onChange={v => onChange({ handle_bow: v })} />
          <NumericField id="handle-fold" label={`Handle fold-under each end (${units})`} value={inputs.handle_fold_under} error={errors['handle_fold_under']} step={step} placeholder={ph('2', '50.8')} onChange={v => onChange({ handle_fold_under: v })} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="comp-count" label="Compression straps per side" value={inputs.compression_straps_per_side} error={errors['compression_straps_per_side']} step={1} placeholder="2" onChange={v => onChange({ compression_straps_per_side: v })} />
        <NumericField id="comp-extra" label={`Strap adjustment + tail (${units})`} value={inputs.compression_extra} error={errors['compression_extra']} step={step} placeholder={ph('6', '152')} onChange={v => onChange({ compression_extra: v })} />
      </div>
      <SelectField<StrapProvision> id="strap-provision" label="Shoulder straps" value={inputs.strap_provision ?? 'tabs_and_stow'} options={[{ value: 'tabs_and_stow', label: 'Removable slick straps: tabs + stow pocket' }, { value: 'tabs', label: 'Provision only — tabs, trimmable' }, { value: 'none', label: 'None' }]} onChange={v => onChange({ strap_provision: v })} />
      {(inputs.strap_provision ?? 'tabs_and_stow') !== 'none' && <NumericField id="tab-spacing" label={`Top tab spread (${units})`} value={inputs.strap_tab_spacing} error={errors['strap_tab_spacing']} step={step} placeholder={ph('4', '101.6')} onChange={v => onChange({ strap_tab_spacing: v })} />}
      </CollapsibleSection>

      <CollapsibleSection
        title="Interior"
        summary={undefined}
      >
      <Toggle label="Loop Velcro walls inside (for mesh pocket modules)" value={inputs.interior_loop ?? true} onChange={v => onChange({ interior_loop: v })} />
      {(inputs.interior_loop ?? true) && (
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="loop-width" label={`Loop strip width (${units})`} value={inputs.loop_strip_width} error={errors['loop_strip_width']} step={step} placeholder={ph('2', '50.8')} onChange={v => onChange({ loop_strip_width: v })} />
          <NumericField id="loop-gap" label={`Gap between strips (${units})`} value={inputs.loop_gap} error={errors['loop_gap']} step={step} placeholder={ph('0.5', '12.7')} onChange={v => onChange({ loop_gap: v })} />
        </div>
      )}
      </CollapsibleSection>

    </div>
  );
}
