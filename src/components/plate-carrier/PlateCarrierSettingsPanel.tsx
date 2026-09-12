import { NumericField, ChoiceField, UnitToggle , CollapsibleSection } from '../shared/fields/index.js';
import type { PlateCarrierInputs, PlatePreset, PlateCut, FrontField, BackField, CummerbundStyle, SidePlate, QrBuckle, ShoulderStyle, EdgeFinish, ShellMaterial, BackComfort, PocketOpening } from '../../generators/plate-carrier/types.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

const DISPLAY_UNIT_FIELDS = ['plate_width', 'plate_height', 'top_clip_length', 'pocket_ease', 'shell_oversize', 'binding_width', 'seam_allowance', 'pocket_flap_length', 'loop_field_width', 'loop_field_height', 'loop_field_y_offset', 'strap_width', 'pad_length', 'shoulder_strap_length', 'strap_adjust_range', 'cummerbund_width', 'torso_circumference', 'cummerbund_overlap', 'torso_length'] as const;

interface Props { inputs: PlateCarrierInputs; errors: Record<string, string>; onChange: (changes: Partial<PlateCarrierInputs>) => void }


const PRESETS: { value: PlatePreset; label: string }[] = [{ value: '8x10', label: '8 × 10' }, { value: '10x12', label: '10 × 12' }, { value: '11x14', label: '11 × 14' }, { value: 'custom', label: 'Custom' }];
const CUTS: { value: PlateCut; label: string }[] = [{ value: 'sapi', label: 'SAPI' }, { value: 'shooter', label: "Shooter's" }, { value: 'swimmer', label: "Swimmer's" }];
const SHELLS: { value: ShellMaterial; label: string }[] = [{ value: '500d', label: '500D Cordura' }, { value: '1000d', label: '1000D Cordura' }, { value: 'laminate', label: 'Laminate (Squadron / B52)' }];
const FINISH: { value: EdgeFinish; label: string }[] = [{ value: 'bound', label: 'Bound edges' }, { value: 'turned', label: 'Turned and topstitched' }];
const COMFORT: { value: BackComfort; label: string }[] = [{ value: 'mesh', label: 'Spacer mesh' }, { value: 'foam_mesh', label: 'Foam + mesh pad' }, { value: 'none', label: 'None' }];
const OPENING: { value: PocketOpening; label: string }[] = [{ value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' }];
const FRONT: { value: FrontField; label: string }[] = [{ value: 'loop', label: 'Loop field (placards)' }, { value: 'pals_sewn', label: 'Sewn PALS' }, { value: 'pals_laser', label: 'Laser-cut PALS' }, { value: 'split', label: 'Loop over PALS' }];
const BACK: { value: BackField; label: string }[] = [{ value: 'pals_sewn', label: 'Sewn PALS' }, { value: 'pals_laser', label: 'Laser-cut PALS' }, { value: 'loop', label: 'Loop field' }, { value: 'none', label: 'Slick' }];
const SHOULDER: { value: ShoulderStyle; label: string }[] = [{ value: 'padded', label: 'Padded (strap engine)' }, { value: 'webbing', label: 'Slick webbing' }];
const CUMMERBUND: { value: CummerbundStyle; label: string }[] = [{ value: 'elastic', label: 'Elastic band' }, { value: 'skeletal', label: 'Skeletal laminate' }, { value: 'none', label: 'None' }];
const SIDE: { value: SidePlate; label: string }[] = [{ value: 'none', label: 'None' }, { value: '6x6', label: '6 × 6' }, { value: '6x8', label: '6 × 8' }];
const QR: { value: QrBuckle; label: string }[] = [{ value: 'none', label: 'Hook + loop' }, { value: 'roc', label: 'ROC 40 mm' }, { value: 'tubes', label: 'Tubes' }, { value: 'g_hook', label: 'G-hook' }];

export function PlateCarrierSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';
  const step = units === 'in' ? 0.125 : 1;
  const ph = (inch: string, mm: string) => (units === 'in' ? inch : mm);
  function handleUnitsChange(next: UnitSystem) { if (next !== units) onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, units, next) }); }
  const front = inputs.front_field ?? 'loop';
  const cummerbund = inputs.cummerbund_style ?? 'elastic';
  return (
    <div className="space-y-2">
      <div className="rounded border border-border p-3 space-y-3">
        <UnitToggle value={units} onChange={handleUnitsChange} />
        <p className="text-[11px] leading-snug text-muted-foreground">Plate sizes and PALS spacing are firm; the rest of the vault's carrier notes are reference material. Blank fields are placeholders to mock on the wearer.</p>
      </div>

      <CollapsibleSection
        title="Plate"
        defaultOpen
        summary={`${inputs.plate_preset ?? '10x12'} ${inputs.plate_cut ?? 'sapi'}`}
      >
      <ChoiceField label="Plate size" value={inputs.plate_preset ?? '10x12'} options={PRESETS} onChange={v => onChange({ plate_preset: v })} />
      {(inputs.plate_preset ?? '10x12') === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <NumericField id="plate-width" label={`Plate width (${units})`} value={inputs.plate_width} error={errors['plate_width']} step={step} placeholder={ph('10', '254')} onChange={v => onChange({ plate_width: v })} />
          <NumericField id="plate-height" label={`Plate height (${units})`} value={inputs.plate_height} error={errors['plate_height']} step={step} placeholder={ph('12', '305')} onChange={v => onChange({ plate_height: v })} />
        </div>
      )}
      <ChoiceField label="Cut" value={inputs.plate_cut ?? 'sapi'} options={CUTS} onChange={v => onChange({ plate_cut: v, top_clip_length: undefined, top_clip_angle: undefined })} />
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="clip-length" label={(inputs.plate_cut ?? 'sapi') === 'swimmer' ? `Taper start down the side (${units})` : `Corner clip chord (${units})`} value={inputs.top_clip_length} error={errors['top_clip_length']} step={step} placeholder={(inputs.plate_cut ?? 'sapi') === 'swimmer' ? ph('3', '76') : (inputs.plate_cut === 'shooter' ? ph('2.75', '70') : ph('2', '51'))} onChange={v => onChange({ top_clip_length: v })} />
        <NumericField id="clip-angle" label={(inputs.plate_cut ?? 'sapi') === 'swimmer' ? 'Taper angle from vertical (°)' : 'Clip angle from horizontal (°)'} value={inputs.top_clip_angle} error={errors['top_clip_angle']} step={1} placeholder={(inputs.plate_cut ?? 'sapi') === 'swimmer' ? '25' : (inputs.plate_cut === 'shooter' ? '50' : '45')} onChange={v => onChange({ top_clip_angle: v })} />
        <NumericField id="pocket-ease" label={`Pocket ease per side (${units})`} value={inputs.pocket_ease} error={errors['pocket_ease']} step={step} placeholder={ph('0.375', '9.5')} onChange={v => onChange({ pocket_ease: v })} />
        <NumericField id="torso-length" label={`Wearer torso length (${units})`} value={inputs.torso_length} error={errors['torso_length']} step={step} placeholder="mock it" onChange={v => onChange({ torso_length: v })} />
      </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Panels"
        summary={undefined}
      >
      <ChoiceField label="Shell" value={inputs.shell_material ?? '500d'} options={SHELLS} onChange={v => onChange({ shell_material: v })} />
      <ChoiceField label="Edge finish" value={inputs.edge_finish ?? 'bound'} options={FINISH} onChange={v => onChange({ edge_finish: v })} />
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="shell-oversize" label={`Shell past the pocket (${units})`} value={inputs.shell_oversize} error={errors['shell_oversize']} step={step} placeholder={ph('0.5', '12.7')} onChange={v => onChange({ shell_oversize: v })} />
        <NumericField id="binding-width" label={`Binding tape width (${units})`} value={inputs.binding_width} error={errors['binding_width']} step={step} placeholder={ph('1', '25.4')} onChange={v => onChange({ binding_width: v })} />
        <NumericField id="seam-allowance" label={`Seam allowance, turned (${units})`} value={inputs.seam_allowance} error={errors['seam_allowance']} step={step} placeholder={ph('0.375', '9.5')} onChange={v => onChange({ seam_allowance: v })} />
        <NumericField id="flap-length" label={`Pocket flap length (${units})`} value={inputs.pocket_flap_length} error={errors['pocket_flap_length']} step={step} placeholder={ph('3', '76')} onChange={v => onChange({ pocket_flap_length: v })} />
      </div>
      <ChoiceField label="Pocket opening" value={inputs.pocket_opening ?? 'top'} options={OPENING} onChange={v => onChange({ pocket_opening: v })} />
      <ChoiceField label="Back comfort layer" value={inputs.back_comfort ?? 'mesh'} options={COMFORT} onChange={v => onChange({ back_comfort: v })} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Fields"
        summary={front === 'loop' ? 'loop field' : 'PALS'}
      >
      <ChoiceField label="Front" value={front} options={FRONT} onChange={v => onChange({ front_field: v })} />
      {(front === 'loop' || front === 'split') && (
        <div className="grid grid-cols-3 gap-3">
          <NumericField id="loop-w" label={`Loop width (${units})`} value={inputs.loop_field_width} error={errors['loop_field_width']} step={step} placeholder={ph('6', '152')} onChange={v => onChange({ loop_field_width: v })} />
          <NumericField id="loop-h" label={`Loop height (${units})`} value={inputs.loop_field_height} error={errors['loop_field_height']} step={step} placeholder={ph('6', '152')} onChange={v => onChange({ loop_field_height: v })} />
          <NumericField id="loop-y" label={`Down from pocket top (${units})`} value={inputs.loop_field_y_offset} error={errors['loop_field_y_offset']} step={step} placeholder={ph('1', '25.4')} onChange={v => onChange({ loop_field_y_offset: v })} />
        </div>
      )}
      <ChoiceField label="Back" value={inputs.back_field ?? 'pals_sewn'} options={BACK} onChange={v => onChange({ back_field: v })} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Shoulder straps"
        summary={undefined}
      >
      <ChoiceField label="Style" value={inputs.shoulder_style ?? 'padded'} options={SHOULDER} onChange={v => onChange({ shoulder_style: v })} />
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="strap-width" label={`Strap width (${units})`} value={inputs.strap_width} error={errors['strap_width']} step={step} placeholder={ph('2', '51')} onChange={v => onChange({ strap_width: v })} />
        <NumericField id="strap-length" label={`Span, panel top to panel top (${units})`} value={inputs.shoulder_strap_length} error={errors['shoulder_strap_length']} step={step} placeholder="mock it" onChange={v => onChange({ shoulder_strap_length: v })} />
        <NumericField id="strap-adjust" label={`Velcro adjustment (${units})`} value={inputs.strap_adjust_range} error={errors['strap_adjust_range']} step={step} placeholder={ph('3', '76')} onChange={v => onChange({ strap_adjust_range: v })} />
        {(inputs.shoulder_style ?? 'padded') === 'padded' && <NumericField id="pad-length" label={`Pad length (${units})`} value={inputs.pad_length} error={errors['pad_length']} step={step} placeholder="mock it (6–10)" onChange={v => onChange({ pad_length: v })} />}
        {(inputs.shoulder_style ?? 'padded') === 'padded' && <NumericField id="pad-foam" label="Pad foam (mm)" value={inputs.pad_foam_thickness} error={errors['pad_foam_thickness']} step={1} placeholder="6" onChange={v => onChange({ pad_foam_thickness: v })} />}
      </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Cummerbund"
        summary={cummerbund}
      >
      <ChoiceField label="Style" value={cummerbund} options={CUMMERBUND} onChange={v => onChange({ cummerbund_style: v })} />
      {cummerbund !== 'none' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <NumericField id="cb-width" label={`Band width (${units})`} value={inputs.cummerbund_width} error={errors['cummerbund_width']} step={step} placeholder={ph('4', '102')} onChange={v => onChange({ cummerbund_width: v })} />
            <NumericField id="torso-circ" label={`Torso circumference (${units})`} value={inputs.torso_circumference} error={errors['torso_circumference']} step={step} placeholder="mock it" onChange={v => onChange({ torso_circumference: v })} />
            <NumericField id="cb-overlap" label={`Hook per end (${units})`} value={inputs.cummerbund_overlap} error={errors['cummerbund_overlap']} step={step} placeholder={ph('2', '51')} onChange={v => onChange({ cummerbund_overlap: v })} />
          </div>
          <ChoiceField label="Side plates" value={inputs.side_plate ?? 'none'} options={SIDE} onChange={v => onChange({ side_plate: v })} />
          <ChoiceField label="Front release" value={inputs.qr_buckle ?? 'none'} options={QR} onChange={v => onChange({ qr_buckle: v })} />
        </>
      )}
      </CollapsibleSection>

    </div>
  );
}
