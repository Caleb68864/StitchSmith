import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { PaddedStrapInputs, StrapMode, StrapCurve, PadArchitecture, EdgeFinish, StrapHardware, RoutingSide } from '../../generators/padded-strap/types.js';
import { convertLengthValues, type UnitSystem } from '../../utils/units.js';

// Fields entered in the display unit; foam, webbing, allowance, adjustment and slot pitch are always mm.
const DISPLAY_UNIT_FIELDS = ['pad_length', 'pad_width', 'torso_length', 'gusset_depth', 'tail_length', 'cross_strap_height', 'pad_spread', 'drop_leg_length'] as const;

interface Props {
  inputs: PaddedStrapInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<PaddedStrapInputs>) => void;
}

function NumericField({ id, label, value, error, min, step, placeholder, onChange }: {
  id: string; label: string; value: number | undefined; error?: string; min?: number; step?: number; placeholder?: string; onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input
        id={id}
        type="number"
        min={min ?? 0}
        step={step ?? 1}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
        className={`h-8 text-xs ${error ? 'border-destructive' : ''}`}
        aria-describedby={error ? `${id}-error` : undefined}
      />
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
          <Button key={o.value} variant={value === o.value ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-2" onClick={() => onChange(o.value)}>
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

const MODES: { value: StrapMode; label: string }[] = [
  { value: 'pack_pair', label: 'Pack strap pair' },
  { value: 'h_harness', label: 'H-harness (chest rig)' },
];
const CURVES: { value: StrapCurve; label: string }[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'j_curve', label: 'J-curve' },
  { value: 's_curve', label: 'S-curve' },
];
const ARCHITECTURES: { value: PadArchitecture; label: string }[] = [
  { value: 'foam_sandwich_mesh', label: 'Foam + mesh, bound' },
  { value: 'webbing_tacked_ends', label: 'Webbing tacked into ends' },
  { value: 'webbing_through_quilted', label: 'Webbing full length, quilted' },
  { value: 'crushable_sleeve', label: 'Crushable sleeve' },
  { value: 'none', label: 'Slick webbing' },
];
const FINISHES: { value: EdgeFinish; label: string }[] = [
  { value: 'bound', label: 'Bound' },
  { value: 'turned', label: 'Turned' },
];
const HARDWARE: { value: StrapHardware; label: string }[] = [
  { value: 'ladderlock', label: 'Ladderlock' },
  { value: 'side_release', label: 'Side-release' },
  { value: 'tri_glide', label: 'Tri-glide' },
];
const SIDES: { value: RoutingSide; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Both' },
  { value: 'none', label: 'None' },
];

export function PaddedStrapSettingsPanel({ inputs, errors, onChange }: Props) {
  const units = inputs.units ?? 'in';
  const mode = inputs.mode ?? 'pack_pair';
  const h = mode === 'h_harness';
  const step = units === 'in' ? 0.125 : 1;

  function handleUnitsChange(next: UnitSystem) {
    if (next === units) return;
    onChange({ units: next, ...convertLengthValues(inputs, DISPLAY_UNIT_FIELDS, units, next) });
  }

  return (
    <div className="rounded border border-border p-3 space-y-4">
      <Choice label="Build" value={mode} options={MODES} onChange={v => onChange({ mode: v, curve: undefined, architecture: undefined, webbing_width: undefined, hardware: undefined })} />

      <h2 className="text-xs font-semibold">Pad</h2>
      <div className="grid grid-cols-2 gap-3">
        <NumericField id="pad-length" label={`Pad length (${units})`} value={inputs.pad_length} error={errors['pad_length']} step={step} placeholder={h ? 'mock it' : undefined} onChange={v => onChange({ pad_length: v })} />
        <NumericField id="pad-width" label={`Pad width (${units})`} value={inputs.pad_width} error={errors['pad_width']} step={step} placeholder={h ? 'mock it' : undefined} onChange={v => onChange({ pad_width: v })} />
        <NumericField id="foam-thickness" label="Foam thickness (mm)" value={inputs.foam_thickness} error={errors['foam_thickness']} step={1} placeholder={h ? '10' : '8'} onChange={v => onChange({ foam_thickness: v })} />
        <NumericField id="webbing-width" label="Webbing width (mm)" value={inputs.webbing_width} error={errors['webbing_width']} step={1} placeholder={h ? '38' : '25'} onChange={v => onChange({ webbing_width: v })} />
        <NumericField id="seam-allowance" label="Seam allowance (mm, turned)" value={inputs.seam_allowance} error={errors['seam_allowance']} step={1} placeholder="10" onChange={v => onChange({ seam_allowance: v })} />
      </div>
      <Choice label="Curve" value={inputs.curve ?? (h ? 'straight' : 'j_curve')} options={CURVES} onChange={v => onChange({ curve: v })} />
      <Choice label="Construction" value={inputs.architecture ?? (h ? 'webbing_through_quilted' : 'foam_sandwich_mesh')} options={ARCHITECTURES} onChange={v => onChange({ architecture: v })} />
      <Choice label="Edge finish" value={inputs.edge_finish ?? 'bound'} options={FINISHES} onChange={v => onChange({ edge_finish: v })} />
      <Choice label="Hardware" value={inputs.hardware ?? (h ? 'side_release' : 'ladderlock')} options={HARDWARE} onChange={v => onChange({ hardware: v })} />

      {!h ? (
        <>
          <h2 className="text-xs font-semibold">Tail (derived from torso and gusset)</h2>
          <div className="grid grid-cols-2 gap-3">
            <NumericField id="torso-length" label={`Bag height / torso (${units})`} value={inputs.torso_length} error={errors['torso_length']} step={step} onChange={v => onChange({ torso_length: v })} />
            <NumericField id="gusset-depth" label={`Gusset depth (${units})`} value={inputs.gusset_depth} error={errors['gusset_depth']} step={step} onChange={v => onChange({ gusset_depth: v })} />
            <NumericField id="tail-length" label={`Tail override (${units})`} value={inputs.tail_length} error={errors['tail_length']} step={step} placeholder="derived" onChange={v => onChange({ tail_length: v })} />
          </div>
        </>
      ) : (
        <>
          <h2 className="text-xs font-semibold">H geometry</h2>
          <div className="grid grid-cols-2 gap-3">
            <NumericField id="cross-strap-height" label={`Cross strap from pad top (${units})`} value={inputs.cross_strap_height} error={errors['cross_strap_height']} step={step} placeholder="mock it" onChange={v => onChange({ cross_strap_height: v })} />
            <NumericField id="pad-spread" label={`Pad spread at cross strap (${units})`} value={inputs.pad_spread} error={errors['pad_spread']} step={step} placeholder="mock it" onChange={v => onChange({ pad_spread: v })} />
            <NumericField id="drop-leg-length" label={`Corner drop legs (${units})`} value={inputs.drop_leg_length} error={errors['drop_leg_length']} step={step} placeholder="mock it" onChange={v => onChange({ drop_leg_length: v })} />
            <NumericField id="chest-adjust" label="Chest adjustment (mm)" value={inputs.chest_adjust_range} error={errors['chest_adjust_range']} step={1} placeholder="203 (8″)" onChange={v => onChange({ chest_adjust_range: v })} />
            <NumericField id="slot-pitch" label="Slot pitch (mm)" value={inputs.slot_pitch} error={errors['slot_pitch']} step={1} placeholder="25.4" onChange={v => onChange({ slot_pitch: v })} />
            <NumericField id="hydration-channels" label="Hydration channels (unsewn)" value={inputs.hydration_channels} error={errors['hydration_channels']} step={1} placeholder="2" onChange={v => onChange({ hydration_channels: v })} />
            <NumericField id="front-pals-rows" label="Front PALS rows" value={inputs.front_pals_rows} error={errors['front_pals_rows']} step={1} placeholder="2" onChange={v => onChange({ front_pals_rows: v })} />
          </div>
          <Choice label="Routing shoulder" value={inputs.routing_side ?? 'left'} options={SIDES} onChange={v => onChange({ routing_side: v })} />
        </>
      )}

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
