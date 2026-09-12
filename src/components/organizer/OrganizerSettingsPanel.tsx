import { NumericField, Toggle, UnitToggle } from '../shared/fields/index.js';
import type { OrganizerInputs } from '../../generators/organizer/types.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

const DISPLAY_UNIT_FIELDS = ['pouch_width', 'pocket_height', 'body_hem', 'panel_hem', 'side_seam_allowance', 'side_fold', 'panel_extra_width', 'velcro_strip_width', 'velcro_strip_length', 'velcro_gap', 'contents_height'] as const;

interface Props { inputs: OrganizerInputs; errors: Record<string, string>; onChange: (changes: Partial<OrganizerInputs>) => void }


export function OrganizerSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';
  const step = units === 'in' ? 0.125 : 1;
  const k = units === 'in' ? 1 : 25.4;
  const slots = inputs.slot_widths ?? [1.25 * k, 1.25 * k];
  function setSlot(i: number, v: number | undefined) {
    const next = [...slots];
    if (v === undefined || v <= 0) next.splice(i, 1); else next[i] = v;
    onChange({ slot_widths: next });
  }
  function handleUnitsChange(next: UnitSystem) {
    if (next === units) return;
    const f = next === 'mm' ? 25.4 : 1 / 25.4;
    onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, units, next), slot_widths: slots.map((s) => Math.round(s * f * 1e4) / 1e4) });
  }
  return (
    <div className="rounded border border-border p-3 space-y-4">
      <h2 className="text-xs font-semibold">Pouch</h2>
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="pouch-width" label={`Pouch width (${units})`} value={inputs.pouch_width} error={errors['pouch_width']} step={step} placeholder={units === 'in' ? '5' : '127'} onChange={v => onChange({ pouch_width: v })} />
        <NumericField id="pocket-height" label={`Pocket height (${units})`} value={inputs.pocket_height} error={errors['pocket_height']} step={step} placeholder={units === 'in' ? '5' : '127'} onChange={v => onChange({ pocket_height: v })} />
        <NumericField id="contents-height" label={`Contents height (${units})`} value={inputs.contents_height} error={errors['contents_height']} step={step} placeholder={units === 'in' ? '5 (3 × 5 notebook)' : '127'} onChange={v => onChange({ contents_height: v })} />
        <NumericField id="side-seam" label={`Side seam allowance (${units})`} value={inputs.side_seam_allowance} error={errors['side_seam_allowance']} step={step} placeholder={units === 'in' ? '0.25' : '6.35'} onChange={v => onChange({ side_seam_allowance: v })} />
      </div>
      <h2 className="text-xs font-semibold">Hems (marked at double)</h2>
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="body-hem" label={`Body end hem (${units})`} value={inputs.body_hem} error={errors['body_hem']} step={step} placeholder={units === 'in' ? '1' : '25.4'} onChange={v => onChange({ body_hem: v })} />
        <NumericField id="panel-hem" label={`Front panel hem (${units})`} value={inputs.panel_hem} error={errors['panel_hem']} step={step} placeholder={units === 'in' ? '0.25' : '6.35'} onChange={v => onChange({ panel_hem: v })} />
      </div>
      <Toggle label='Production mode — every hand-folded hem at least 1/2"' value={inputs.production_mode ?? false} onChange={v => onChange({ production_mode: v })} />
      <h2 className="text-xs font-semibold">Front panel and bellows</h2>
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="panel-extra" label={`Panel wider than body by (${units})`} value={inputs.panel_extra_width} error={errors['panel_extra_width']} step={step} placeholder={units === 'in' ? '1.25' : '31.75'} onChange={v => onChange({ panel_extra_width: v })} />
        <NumericField id="side-fold" label={`Side fold in from edge (${units})`} value={inputs.side_fold} error={errors['side_fold']} step={step} placeholder={units === 'in' ? '1' : '25.4'} onChange={v => onChange({ side_fold: v })} />
      </div>
      <h2 className="text-xs font-semibold">Pen slots (from one side seam; the rest is the wide pocket)</h2>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <NumericField key={i} id={`slot-${i}`} label={`Slot ${i + 1} (${units})`} value={slots[i]} error={i === 0 ? errors['slot_widths'] : undefined} step={step} placeholder={i < slots.length ? undefined : 'none'} onChange={v => setSlot(i, v)} />
        ))}
      </div>
      <h2 className="text-xs font-semibold">Back</h2>
      <Toggle label="PALS webbing rows instead of Velcro" value={inputs.pals_back ?? false} onChange={v => onChange({ pals_back: v })} />
      {!inputs.pals_back && (
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="velcro-count" label="Hook strips" value={inputs.velcro_strip_count} error={errors['velcro_strip_count']} step={1} placeholder="2" onChange={v => onChange({ velcro_strip_count: v })} />
          <NumericField id="velcro-width" label={`Strip width (${units})`} value={inputs.velcro_strip_width} error={errors['velcro_strip_width']} step={step} placeholder={units === 'in' ? '1.5' : '38'} onChange={v => onChange({ velcro_strip_width: v })} />
          <NumericField id="velcro-length" label={`Strip length (${units})`} value={inputs.velcro_strip_length} error={errors['velcro_strip_length']} step={step} placeholder="clear width" onChange={v => onChange({ velcro_strip_length: v })} />
          <NumericField id="velcro-gap" label={`Gap between strips (${units})`} value={inputs.velcro_gap} error={errors['velcro_gap']} step={step} placeholder={units === 'in' ? '0.5' : '12.7'} onChange={v => onChange({ velcro_gap: v })} />
        </div>
      )}
      {!inputs.pals_back && <Toggle label="Opposing loop over part of the hook (no snag in a pocket)" value={inputs.loop_over_hook ?? false} onChange={v => onChange({ loop_over_hook: v })} />}
      <h2 className="text-xs font-semibold">Variations</h2>
      <Toggle label="Bifold — body twice as long, two front panels" value={inputs.bifold ?? false} onChange={v => onChange({ bifold: v })} />
      <Toggle label="Loop patch for name tape on the wide pocket" value={inputs.name_tape_loop ?? false} onChange={v => onChange({ name_tape_loop: v })} />
      <Toggle label="Grommets for 550 cord" value={inputs.grommets ?? false} onChange={v => onChange({ grommets: v })} />
      <UnitToggle value={units} onChange={handleUnitsChange} />
    </div>
  );
}
