import { NumericField, ChoiceField, Toggle, UnitToggle, CollapsibleSection, VaultOpenNote, displayNumber } from '../shared/fields/index.js';
import type { LbvInputs, MaleSide } from '../../generators/lbv/types.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

const DISPLAY_UNIT_FIELDS = ['panel_width', 'panel_height', 'back_panel_width', 'back_panel_height', 'back_bellow', 'edge_tape_width', 'edge_tape_conceal', 'row_width', 'row_pitch', 'vertical_mark', 'vertical_width', 'vertical_strap_len', 'tab_foldover', 'hardware_wrap', 'drop_adjust', 'pad_length', 'pad_width', 'pad_tab_foldover', 'cross_piece_width', 'pad_spread', 'drag_handle_len', 'adjust_per_location', 'base_chest', 'belt_width', 'belt_length', 'hydration_webbing', 'pouch_width'] as const;

interface Props { inputs: LbvInputs; errors: Record<string, string>; onChange: (changes: Partial<LbvInputs>) => void }


export function LbvSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';
  const step = units === 'in' ? 0.125 : 1;
  const k = units === 'in' ? 1 : 25.4;
  const mock = 'mock it';
  const straps = inputs.front_straps ?? 3;
  const positions = inputs.front_strap_positions ?? [1 * k, 5 * k, 9 * k];
  function setPosition(i: number, v: number | undefined) {
    const next = [...positions];
    while (next.length < straps) next.push(next.length ? next[next.length - 1] + 4 * k : 1 * k);
    if (v !== undefined) next[i] = v;
    onChange({ front_strap_positions: next.slice(0, straps) });
  }
  function handleUnitsChange(next: UnitSystem) {
    if (next === units) return;
    const f = next === 'mm' ? 25.4 : 1 / 25.4;
    onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, units, next), front_strap_positions: positions.map((p) => Math.round(p * f * 1e4) / 1e4) });
  }
  return (
    <div className="space-y-2">
      <div className="rounded border border-border p-3 space-y-3">
        <UnitToggle value={units} onChange={handleUnitsChange} />
        <VaultOpenNote>
          The vault gives the interface, the straps and the build order. It never states a panel size, the pad, or the
          cross piece angle, so fields marked <span className="font-medium">measure</span> are starting points — check them against a real rig.
        </VaultOpenNote>
      </div>

      <CollapsibleSection
        title="Panels (every panel is a foam pocket)"
        defaultOpen
        summary={inputs.panel_width && inputs.panel_height ? `${displayNumber(inputs.panel_width)} × ${displayNumber(inputs.panel_height)} ${units}` : undefined}
      >
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="panel-width" label={`Front panel width (${units})`} value={inputs.panel_width} error={errors['panel_width']} step={step} placeholder={mock} mockDerived onChange={v => onChange({ panel_width: v })} />
        <NumericField id="panel-height" label={`Front panel height (${units})`} value={inputs.panel_height} error={errors['panel_height']} step={step} placeholder={mock} mockDerived onChange={v => onChange({ panel_height: v })} />
        <NumericField id="back-width" label={`Back panel width (${units})`} value={inputs.back_panel_width} error={errors['back_panel_width']} step={step} placeholder={mock} mockDerived onChange={v => onChange({ back_panel_width: v })} />
        <NumericField id="back-height" label={`Back panel height (${units})`} value={inputs.back_panel_height} error={errors['back_panel_height']} step={step} placeholder={mock} mockDerived onChange={v => onChange({ back_panel_height: v })} />
        <NumericField id="back-bellow" label={`Back bellows oversize (${units})`} value={inputs.back_bellow} error={errors['back_bellow']} step={step} placeholder={mock} mockDerived onChange={v => onChange({ back_bellow: v })} />
        <NumericField id="foam-thickness" label="Foam thickness (mm)" value={inputs.foam_thickness} error={errors['foam_thickness']} step={0.5} placeholder="9.5" onChange={v => onChange({ foam_thickness: v })} />
        <NumericField id="seam-allowance" label="Zipper seam allowance (mm)" value={inputs.seam_allowance} error={errors['seam_allowance']} step={0.5} placeholder="12.7" onChange={v => onChange({ seam_allowance: v })} />
        <NumericField id="edge-tape" label={`Edge tape width (${units})`} value={inputs.edge_tape_width} error={errors['edge_tape_width']} step={step} placeholder={units === 'in' ? '1' : '25.4'} onChange={v => onChange({ edge_tape_width: v })} />
      </div>
      <Toggle label="Foam insert in every panel (rigidity, belt-line load transfer, flotation)" value={inputs.foam_insert ?? true} onChange={v => onChange({ foam_insert: v })} />
      </CollapsibleSection>

      <CollapsibleSection title="Modular interface (Velcro-faced PALS rows)" summary={`${inputs.back_cols ?? 4} back columns`}>
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="row-width" label={`Row webbing width (${units})`} value={inputs.row_width} error={errors['row_width']} step={step} placeholder={units === 'in' ? '1.5' : '38'} onChange={v => onChange({ row_width: v })} />
        <NumericField id="row-pitch" label={`Row pitch (${units})`} value={inputs.row_pitch} error={errors['row_pitch']} step={step} placeholder={mock} mockDerived onChange={v => onChange({ row_pitch: v })} />
        <NumericField id="front-cols" label="Front columns (unresolved in the vault)" value={inputs.front_cols} error={errors['front_cols']} step={1} placeholder="4" onChange={v => onChange({ front_cols: v })} />
        <NumericField id="back-cols" label="Back columns" value={inputs.back_cols} error={errors['back_cols']} step={1} placeholder="4" onChange={v => onChange({ back_cols: v })} />
        <NumericField id="rows-per-panel" label="Rows per panel (blank = as many as fit)" value={inputs.rows_per_panel} error={errors['rows_per_panel']} step={1} placeholder="fit" onChange={v => onChange({ rows_per_panel: v })} />
        <NumericField id="pouch-width" label={`Pouch width for capacity (${units})`} value={inputs.pouch_width} error={errors['pouch_width']} step={step} placeholder={units === 'in' ? '3' : '76'} onChange={v => onChange({ pouch_width: v })} />
      </div>
      <Toggle label="Loop Velcro on the row faces (lids stage up, patches)" value={inputs.loop_velcro_face ?? true} onChange={v => onChange({ loop_velcro_face: v })} />
      </CollapsibleSection>

      <CollapsibleSection title="Verticals and drop" summary={inputs.vertical_strap_len ? `${displayNumber(inputs.vertical_strap_len)} ${units} straps` : undefined}>
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="vertical-mark" label={`Vertical mark from the outer edge (${units})`} value={inputs.vertical_mark} error={errors['vertical_mark']} step={step} placeholder={units === 'in' ? '4' : '101.6'} onChange={v => onChange({ vertical_mark: v })} />
        <NumericField id="vertical-width" label={`Vertical webbing width (${units})`} value={inputs.vertical_width} error={errors['vertical_width']} step={step} placeholder={mock} mockDerived onChange={v => onChange({ vertical_width: v })} />
        <NumericField id="vertical-len" label={`Vertical strap pieces (${units})`} value={inputs.vertical_strap_len} error={errors['vertical_strap_len']} step={step} placeholder={units === 'in' ? '24' : '610'} onChange={v => onChange({ vertical_strap_len: v })} />
        <NumericField id="tab-foldover" label={`Pull tab fold-over (${units})`} value={inputs.tab_foldover} error={errors['tab_foldover']} step={step} placeholder={units === 'in' ? '1' : '25.4'} onChange={v => onChange({ tab_foldover: v })} />
        <NumericField id="hardware-wrap" label={`Lost in the tension lock (${units})`} value={inputs.hardware_wrap} error={errors['hardware_wrap']} step={step} placeholder="0" onChange={v => onChange({ hardware_wrap: v })} />
        <NumericField id="drop-adjust" label={`Drop the verticals must fund (${units})`} value={inputs.drop_adjust} error={errors['drop_adjust']} step={step} placeholder={units === 'in' ? '12' : '305'} onChange={v => onChange({ drop_adjust: v })} />
      </div>
      </CollapsibleSection>

      <CollapsibleSection title="Shoulder set" summary={inputs.pad_length ? `${displayNumber(inputs.pad_length)} ${units} pads` : undefined}>
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="pad-length" label={`Pad length (${units})`} value={inputs.pad_length} error={errors['pad_length']} step={step} placeholder={mock} mockDerived onChange={v => onChange({ pad_length: v })} />
        <NumericField id="pad-width" label={`Pad width (${units})`} value={inputs.pad_width} error={errors['pad_width']} step={step} placeholder={mock} mockDerived onChange={v => onChange({ pad_width: v })} />
        <NumericField id="pad-tab" label={`Pad tab fold-over marked (${units})`} value={inputs.pad_tab_foldover} error={errors['pad_tab_foldover']} step={step} placeholder={units === 'in' ? '1.5' : '38'} onChange={v => onChange({ pad_tab_foldover: v })} />
        <NumericField id="pad-spread" label={`Pad spread at the cross piece (${units})`} value={inputs.pad_spread} error={errors['pad_spread']} step={step} placeholder={mock} mockDerived onChange={v => onChange({ pad_spread: v })} />
        <NumericField id="cross-width" label={`Cross piece width (${units})`} value={inputs.cross_piece_width} error={errors['cross_piece_width']} step={step} placeholder={units === 'in' ? '1.5' : '38'} onChange={v => onChange({ cross_piece_width: v })} />
        <NumericField id="cross-angle" label="Cross piece angle (°)" value={inputs.cross_piece_angle} error={errors['cross_piece_angle']} step={1} placeholder={mock} mockDerived onChange={v => onChange({ cross_piece_angle: v })} />
        <NumericField id="drag-len" label={`Drag handle cut (${units})`} value={inputs.drag_handle_len} error={errors['drag_handle_len']} step={step} placeholder={mock} mockDerived onChange={v => onChange({ drag_handle_len: v })} />
      </div>
      <Toggle label='Drag handle — 2" webbing, staggered fold, four-point dispersion stitch' value={inputs.drag_handle ?? true} onChange={v => onChange({ drag_handle: v })} />
      </CollapsibleSection>

      <CollapsibleSection title="Closure and sizing" summary={`${straps} front straps`}>
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="front-straps" label="Front straps" value={inputs.front_straps} error={errors['front_straps']} step={1} placeholder="3" onChange={v => onChange({ front_straps: v })} />
        <NumericField id="adjust-per" label={`Adjustment per location (${units})`} value={inputs.adjust_per_location} error={errors['adjust_per_location']} step={step} placeholder={units === 'in' ? '12' : '305'} onChange={v => onChange({ adjust_per_location: v })} />
        <NumericField id="base-chest" label={`Chest at minimum (${units})`} value={inputs.base_chest} error={errors['base_chest']} step={step} placeholder={mock} mockDerived onChange={v => onChange({ base_chest: v })} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: straps }, (_, i) => (
          <NumericField key={i} id={`strap-pos-${i}`} label={`Strap ${i + 1} from the bottom (${units})`} value={positions[i]} error={i === 0 ? errors['front_strap_positions'] : undefined} step={step} placeholder={mock} mockDerived onChange={v => setPosition(i, v)} />
        ))}
      </div>
      <ChoiceField<MaleSide> label="Male buckles from the wearer's" value={inputs.male_side ?? 'right'} options={[{ value: 'right', label: 'right (97% right-handed)' }, { value: 'left', label: 'left' }]} onChange={v => onChange({ male_side: v })} />
      <Toggle label='Tension locks outboard (+3" for big torsos)' value={inputs.tension_lock_outboard ?? false} onChange={v => onChange({ tension_lock_outboard: v })} />
      </CollapsibleSection>

      <CollapsibleSection title="Belt and hydration" summary={inputs.belt_width ? `${displayNumber(inputs.belt_width)} ${units} belt` : undefined}>
      <div className="grid grid-cols-3 gap-3">
        <NumericField id="belt-width" label={`Belt width (${units})`} value={inputs.belt_width} error={errors['belt_width']} step={step} placeholder={units === 'in' ? '2' : '51'} onChange={v => onChange({ belt_width: v })} />
        <NumericField id="loops" label="Loops per panel" value={inputs.loops_per_panel} error={errors['loops_per_panel']} step={1} placeholder="2" onChange={v => onChange({ loops_per_panel: v })} />
        <NumericField id="belt-length" label={`Belt length (${units})`} value={inputs.belt_length} error={errors['belt_length']} step={step} placeholder={mock} mockDerived onChange={v => onChange({ belt_length: v })} />
      </div>
      <NumericField id="hydration" label={`Hydration webbing across the back top (${units})`} value={inputs.hydration_webbing} error={errors['hydration_webbing']} step={step} placeholder={units === 'in' ? '10' : '254'} onChange={v => onChange({ hydration_webbing: v })} />
      </CollapsibleSection>
    </div>
  );
}
