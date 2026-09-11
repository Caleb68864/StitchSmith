import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TriZipInputs, StrapArchitecture, StrapEdgeFinish, StrapHardware } from '../../../generators/tri-zip-backpack/types.js';
import { defaultStrapPadLength, strapTailLength, toMm } from '../../../generators/tri-zip-backpack/inputs.js';

interface Props {
  inputs: TriZipInputs;
  onChange: (changes: Partial<TriZipInputs>) => void;
}

const ARCHITECTURES: { value: StrapArchitecture; label: string; description: string }[] = [
  { value: 'foam_sandwich_mesh', label: 'Foam + spacer mesh (standard)', description: 'Shell, closed-cell foam, 3D mesh against the body; webbing tacked 1" into the pad ends.' },
  { value: 'webbing_tacked_ends', label: 'Cordura-wrapped foam, tacked ends (SOE)', description: 'No mesh, no binding fuss; webbing inserted 1" and tacked — no needle ever passes through foam.' },
  { value: 'webbing_through_quilted', label: 'Webbing full length, quilted (SOE H-harness)', description: 'Load webbing runs over the whole pad, quilted through the foam. Needs a heavy walking-foot machine.' },
  { value: 'crushable_sleeve', label: 'Crushable sleeve (Vietnam duffel)', description: 'Thin shell tube over soft fill; settles to shape in use.' },
  { value: 'none', label: 'Slick webbing only', description: 'No padding; armour-compatible and stowable. Make them detachable.' },
];

const EDGE_FINISHES: { value: StrapEdgeFinish; label: string }[] = [
  { value: 'bound', label: 'Bound (grosgrain tape, no seam allowance)' },
  { value: 'turned', label: 'Turned and topstitched (seam allowance added)' },
];

const HARDWARE: { value: StrapHardware; label: string }[] = [
  { value: 'ladderlock', label: 'Ladderlock at the lower anchor' },
  { value: 'side_release', label: 'Side-release buckle + tri-glide (removable strap)' },
  { value: 'tri_glide', label: 'Tri-glide only' },
];

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ShoulderStrapsSection({ inputs, onChange }: Props) {
  const heightMm = toMm(inputs.height, inputs.units);
  const depthMm = toMm(inputs.depth, inputs.units);
  const padDefault = Number.isFinite(heightMm) ? defaultStrapPadLength(heightMm) : 0;
  const padLength = inputs.strap_pad_length ?? padDefault;
  const tail = Number.isFinite(heightMm) && Number.isFinite(depthMm) ? strapTailLength(heightMm, padLength, depthMm) : 0;
  const arch = inputs.strap_architecture ?? 'foam_sandwich_mesh';
  const current = ARCHITECTURES.find(a => a.value === arch);

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <Label htmlFor="tz-strap-arch">Pad construction</Label>
        <select
          id="tz-strap-arch"
          className={SELECT_CLASS}
          value={arch}
          onChange={e => onChange({ strap_architecture: e.target.value as StrapArchitecture })}
        >
          {ARCHITECTURES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        {current && <p className="text-xs text-muted-foreground">{current.description}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="tz-strap-width">Pad width (mm)</Label>
        <Input
          id="tz-strap-width"
          type="number"
          min={20}
          max={150}
          value={inputs.strap_width ?? 75}
          onChange={e => {
            const n = parseFloat(e.target.value);
            onChange({ strap_width: isNaN(n) ? 75 : n });
          }}
        />
        <p className="text-xs text-muted-foreground">38 mm ultralight, 50 mm general packs, up to 76 mm for heavy loads.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="tz-foam-thickness">Foam padding thickness (mm)</Label>
        <Input
          id="tz-foam-thickness"
          type="number"
          min={0}
          max={30}
          value={inputs.foam_thickness ?? 10}
          onChange={e => {
            const n = parseFloat(e.target.value);
            onChange({ foam_thickness: isNaN(n) ? 10 : n });
          }}
        />
        <p className="text-xs text-muted-foreground">Closed-cell EVA; 6–10 mm is the sweet spot (0 = no foam).</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="tz-strap-pad-length">Padded length (mm)</Label>
          <Input
            id="tz-strap-pad-length"
            type="number"
            min={100}
            max={800}
            value={inputs.strap_pad_length ?? ''}
            placeholder={padDefault ? `${padDefault} derived` : 'derived'}
            onChange={e => {
              const n = parseFloat(e.target.value);
              onChange({ strap_pad_length: isNaN(n) ? undefined : n });
            }}
          />
          <p className="text-xs text-muted-foreground">Default ¾ of the bag height.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="tz-strap-webbing">Webbing width (mm)</Label>
          <Input
            id="tz-strap-webbing"
            type="number"
            min={20}
            max={50}
            value={inputs.strap_webbing_width ?? 25}
            onChange={e => {
              const n = parseFloat(e.target.value);
              onChange({ strap_webbing_width: isNaN(n) ? 25 : n });
            }}
          />
          <p className="text-xs text-muted-foreground">Sets every hardware slot width.</p>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="tz-strap-edge">Edge finish</Label>
        <select
          id="tz-strap-edge"
          className={SELECT_CLASS}
          value={inputs.strap_edge_finish ?? 'bound'}
          onChange={e => onChange({ strap_edge_finish: e.target.value as StrapEdgeFinish })}
        >
          {EDGE_FINISHES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="tz-strap-hardware">Lower anchor hardware</Label>
        <select
          id="tz-strap-hardware"
          className={SELECT_CLASS}
          value={inputs.strap_hardware ?? 'ladderlock'}
          onChange={e => onChange({ strap_hardware: e.target.value as StrapHardware })}
        >
          {HARDWARE.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
        </select>
      </div>

      {tail > 0 && (
        <p className="text-xs text-muted-foreground" data-testid="tz-strap-tail">
          Tail webbing: {tail} mm free below the pad — derived from bag height, pad length and the {Math.round(depthMm)} mm gusset depth plus 200 mm of adjustment. Mock it on the loaded bag before cutting.
        </p>
      )}
    </div>
  );
}
