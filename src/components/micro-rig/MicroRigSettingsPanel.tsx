import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { MicroRigInputs, PanelWidthPreset, PocketSet, Suspension } from '../../generators/micro-rig/types.js';
import { MAGAZINE_IDS, getMagazine, PLATFORM_LABELS } from '../../generators/mag-pouch/magazines.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

const DISPLAY_UNIT_FIELDS = ['panel_width', 'panel_height', 'cell_span', 'face_per_cell', 'cell_height', 'gap_width', 'buckle_setback', 'edge_margin', 'stack_ease', 'wrap_allowance', 'cradle_width', 'cradle_drop', 'pull_tab_length'] as const;

interface Props {
  inputs: MicroRigInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<MicroRigInputs>) => void;
}

function NumericField({ id, label, value, error, min, step, placeholder, onChange }: {
  id: string; label: string; value: number | undefined; error?: string; min?: number; step?: number; placeholder?: string; onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} type="number" min={min ?? 0} step={step ?? 1} value={value ?? ''} placeholder={placeholder}
        onChange={e => onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
        className={`h-8 text-xs ${error ? 'border-destructive' : ''}`} aria-describedby={error ? `${id}-error` : undefined} />
      {error && <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex flex-wrap gap-1">
        {options.map(o => (
          <Button key={o.value} variant={value === o.value ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-2" onClick={() => onChange(o.value)}>{o.label}</Button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

const WIDTHS: { value: PanelWidthPreset; label: string }[] = [
  { value: 'stacked_10_5', label: '10.5" (Stacked)' },
  { value: 'standard_13', label: '13" (standard)' },
  { value: 'r308_14', label: '14" (.308)' },
  { value: 'pals_16', label: '16" (PALS 10-col)' },
  { value: 'pals_19', label: '19" (PALS 12-col)' },
  { value: 'custom', label: 'Custom' },
];
const POCKETS: { value: PocketSet; label: string }[] = [
  { value: 'mag_cells', label: 'Mag cells + utility pocket' },
  { value: 'stacked_cells', label: 'Stacked cells (Stacked / .308 Micro)' },
  { value: 'blank_pals', label: 'Blank panel' },
];
const SUSPENSIONS: { value: Suspension; label: string }[] = [
  { value: 'webbing_straps', label: 'Webbing straps' },
  { value: 'h_harness', label: 'Padded H-harness' },
];

export function MicroRigSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';
  const step = units === 'in' ? 0.125 : 1;
  const preset = inputs.panel_width_preset ?? 'standard_13';
  const pocket = inputs.pocket_set ?? 'mag_cells';
  function handleUnitsChange(next: UnitSystem) {
    if (next === units) return;
    onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, units, next) });
  }
  return (
    <div className="rounded border border-border p-3 space-y-4">
      <Choice label="Panel width" value={preset} options={WIDTHS} onChange={v => onChange({ panel_width_preset: v })} />
      <div className="grid grid-cols-2 gap-3">
        {preset === 'custom' && <NumericField id="panel-width" label={`Panel width (${units})`} value={inputs.panel_width} error={errors['panel_width']} step={step} onChange={v => onChange({ panel_width: v })} />}
        <NumericField id="panel-height" label={`Panel height (${units})`} value={inputs.panel_height} error={errors['panel_height']} step={step} placeholder={units === 'in' ? '7' : '178'} onChange={v => onChange({ panel_height: v })} />
        <NumericField id="seam-allowance" label="Seam allowance (mm)" value={inputs.seam_allowance} error={errors['seam_allowance']} step={0.5} placeholder="9.5" onChange={v => onChange({ seam_allowance: v })} />
        <NumericField id="edge-margin" label={`Edge margin (${units})`} value={inputs.edge_margin} error={errors['edge_margin']} step={step} placeholder={units === 'in' ? '0.5' : '12.7'} onChange={v => onChange({ edge_margin: v })} />
      </div>

      <Choice label="Front" value={pocket} options={POCKETS} onChange={v => onChange({ pocket_set: v })} />
      {pocket === 'mag_cells' && (
        <>
          <div className="space-y-1">
            <Label htmlFor="magazine" className="text-xs">Magazine</Label>
            <select id="magazine" className="h-8 w-full rounded border border-border bg-background px-2 text-xs" value={inputs.magazine_preset_id ?? 'ar15_30_round'} onChange={e => onChange({ magazine_preset_id: e.target.value })}>
              {MAGAZINE_IDS.map(id => { const m = getMagazine(id)!; return <option key={id} value={id}>{m.description} — {PLATFORM_LABELS[m.platform]}</option>; })}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumericField id="cell-count" label="Cells" value={inputs.cell_count} error={errors['cell_count']} step={1} placeholder="4" onChange={v => onChange({ cell_count: v })} />
            <NumericField id="cell-span" label={`Cell span override (${units})`} value={inputs.cell_span} error={errors['cell_span']} step={step} placeholder="PALS grid" onChange={v => onChange({ cell_span: v })} />
            <NumericField id="face-per-cell" label={`Face per cell override (${units})`} value={inputs.face_per_cell} error={errors['face_per_cell']} step={step} placeholder="mag_w + 2·mag_t + 5/16" onChange={v => onChange({ face_per_cell: v })} />
            <NumericField id="cell-height" label={`Cell height (${units})`} value={inputs.cell_height} error={errors['cell_height']} step={step} placeholder="panel − 1″" onChange={v => onChange({ cell_height: v })} />
          </div>
          <Toggle label='Utility pocket (6 × 6 × 3")' value={inputs.utility_pocket ?? true} onChange={v => onChange({ utility_pocket: v })} />
        </>
      )}
      {pocket === 'stacked_cells' && (
        <>
          <div className="space-y-1">
            <Label htmlFor="magazine" className="text-xs">Magazine (stands flat side out)</Label>
            <select id="magazine" className="h-8 w-full rounded border border-border bg-background px-2 text-xs" value={inputs.magazine_preset_id ?? 'ar15_30_round'} onChange={e => onChange({ magazine_preset_id: e.target.value })}>
              {MAGAZINE_IDS.map(id => { const m = getMagazine(id)!; return <option key={id} value={id}>{m.description} — {PLATFORM_LABELS[m.platform]}</option>; })}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumericField id="cell-count" label="Columns" value={inputs.cell_count} error={errors['cell_count']} step={1} placeholder="2" onChange={v => onChange({ cell_count: v })} />
            <NumericField id="cells-deep" label="Mags deep (1 or 2)" value={inputs.cells_deep} error={errors['cells_deep']} step={1} placeholder="2" onChange={v => onChange({ cells_deep: v })} />
            <NumericField id="stack-ease" label={`Cell ease (${units})`} value={inputs.stack_ease} error={errors['stack_ease']} step={step} placeholder={units === 'in' ? '0.5' : '12.7'} onChange={v => onChange({ stack_ease: v })} />
            <NumericField id="wrap-allowance" label={`Wrap allowance (${units})`} value={inputs.wrap_allowance} error={errors['wrap_allowance']} step={step} placeholder="pin scrap" onChange={v => onChange({ wrap_allowance: v })} />
            <NumericField id="coverage" label="Coverage (fraction of mag)" value={inputs.coverage} error={errors['coverage']} step={0.05} placeholder="0.65" onChange={v => onChange({ coverage: v })} />
            <NumericField id="cradle-width" label={`Cradle width (${units})`} value={inputs.cradle_width} error={errors['cradle_width']} step={step} placeholder={units === 'in' ? '2' : '51'} onChange={v => onChange({ cradle_width: v })} />
            <NumericField id="cradle-drop" label={`Cradle drop (${units})`} value={inputs.cradle_drop} error={errors['cradle_drop']} step={step} placeholder="0" onChange={v => onChange({ cradle_drop: v })} />
            <NumericField id="pull-tab" label={`Pull tab length (${units})`} value={inputs.pull_tab_length} error={errors['pull_tab_length']} step={step} placeholder={units === 'in' ? '3.5' : '89'} onChange={v => onChange({ pull_tab_length: v })} />
          </div>
          <Toggle label='Med-pouch zone with face PALS (3")' value={inputs.med_zone ?? true} onChange={v => onChange({ med_zone: v })} />
        </>
      )}

      <h2 className="text-xs font-semibold">Accessory real estate</h2>
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="side-pals" label="Side PALS columns per end" value={inputs.side_pals_columns} error={errors['side_pals_columns']} step={1} placeholder="1" onChange={v => onChange({ side_pals_columns: v })} />
        <NumericField id="bottom-loops" label="Bottom elastic loops" value={inputs.bottom_loop_count} error={errors['bottom_loop_count']} step={1} placeholder="2" onChange={v => onChange({ bottom_loop_count: v })} />
      </div>
      <Toggle label='Dangler hook field on the back (11 × 6")' value={inputs.dangler_field ?? true} onChange={v => onChange({ dangler_field: v })} />

      <h2 className="text-xs font-semibold">Split front</h2>
      <Toggle label="Two halves joined at the sternum" value={inputs.split_front ?? false} onChange={v => onChange({ split_front: v })} />
      {inputs.split_front && (
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="gap-width" label={`Sternum gap (${units})`} value={inputs.gap_width} error={errors['gap_width']} step={step} placeholder={units === 'in' ? '2.25' : '57'} onChange={v => onChange({ gap_width: v })} />
          <NumericField id="buckle-setback" label={`Join buckle setback (${units})`} value={inputs.buckle_setback} error={errors['buckle_setback']} step={step} placeholder={units === 'in' ? '3' : '76'} onChange={v => onChange({ buckle_setback: v })} />
        </div>
      )}

      <Choice label="Suspension" value={inputs.suspension ?? 'webbing_straps'} options={SUSPENSIONS} onChange={v => onChange({ suspension: v })} />

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
