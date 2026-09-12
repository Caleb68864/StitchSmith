import type { MagPouchInputs, RetentionStyle } from '../../../generators/mag-pouch/types.js';

interface Props {
  inputs: MagPouchInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<MagPouchInputs>) => void;
}

const CLOSURE_LABELS: Record<RetentionStyle, string> = {
  flap_velcro: 'Lid + Velcro (hook & loop)',
  flap_snap: 'Lid + snap',
  flap_fastex: 'Lid + side-release buckle',
  open_top_bungee: 'Open top + bungee pull',
  velcro_dot: 'Open top + Velcro dot',
  kydex_wedge: 'Open top + Kydex wedge',
  none: 'Open top, friction only',
};

export function ClosureSection({ inputs, errors, onChange }: Props) {
  const hasLid = inputs.retention === 'flap_velcro' || inputs.retention === 'flap_snap' || inputs.retention === 'flap_fastex';
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Current closure:{' '}
          <span className="font-medium text-foreground">
            {CLOSURE_LABELS[inputs.retention]}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Closure style is configured in the <strong>Retention</strong> section above.
          Hardware notes for the selected style appear below.
        </p>
      </div>

      {inputs.retention === 'flap_fastex' && (
        <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Use a 1&quot; side-release buckle (male + female). The buckle slot width must match
          the webbing. Female half on the lid tab, male half on the adjustable face tail, centred on each cell.
        </div>
      )}

      {inputs.retention === 'flap_snap' && (
        <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
          Line 24 (15 mm) snaps, one per cell: stud on the lid underside, socket on the face.
          Set with a press or snap-setting tool, not a hammer alone.
        </div>
      )}

      {inputs.retention === 'flap_velcro' && (
        <div className="rounded border border-muted p-2 text-xs text-muted-foreground">
          Hook on the underside of the lid, loop on the face. The loop field is longer than the hook
          by the adjustment you want — the loop is the parametric piece. Hook goes on last in the build.
        </div>
      )}

      {hasLid && (
        <div className="space-y-1">
          <label htmlFor="pull-channel-depth" className="text-xs font-medium">Pull channel depth (in)</label>
          <input
            id="pull-channel-depth"
            type="number"
            min={0}
            step={0.25}
            value={inputs.pull_channel_depth ?? (inputs.retention === 'flap_velcro' ? 1.5 : 0)}
            onChange={(e) => onChange({ pull_channel_depth: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
            className={`h-8 w-full rounded border bg-background px-2 text-xs ${errors['pull_channel_depth'] ? 'border-destructive' : 'border-input'}`}
          />
          <p className="text-xs text-muted-foreground">
            One-piece lid: the tip folds back on itself into a finger channel. SOE marks 1.5&quot;; the 1&quot; sample was too small for a gloved hand. 0 = no channel.
          </p>
          {errors['pull_channel_depth'] && <p className="text-xs text-destructive">{errors['pull_channel_depth']}</p>}
        </div>
      )}

      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={inputs.hourglass_aesthetic ?? false} onChange={(e) => onChange({ hourglass_aesthetic: e.target.checked })} />
        Hourglass aesthetic — side seams inset 1/4&quot; per side (cosmetic, slower to sew)
      </label>

      {inputs.retention === 'open_top_bungee' && (
        <div className="rounded border border-muted p-2 text-xs text-muted-foreground">
          1/8&quot; shock cord anchored through the top face bar, front-routed so it stays adjustable,
          with a 1&quot; webbing pull tab over the mag. SOE cuts 16&quot; per cell; fat cord needs ~18&quot;.
          Bungee commits the pouch to one magazine platform.
        </div>
      )}

      {inputs.retention === 'velcro_dot' && (
        <div className="rounded border border-muted p-2 text-xs text-muted-foreground">
          Loop lines both interior walls; a 1&quot; hook square sticks to ONE face of each magazine.
          Cheapest option, tunable per mag, nothing sewn after the loop.
        </div>
      )}

      {inputs.retention === 'kydex_wedge' && (
        <div className="rounded border border-muted p-2 text-xs text-muted-foreground">
          Loop lines both interior walls; a platform-specific Kydex wedge drops in and grips the mag.
          Near impossible to remove once seated — a .308 wedge is a different part from an M4 wedge.
        </div>
      )}

      {inputs.retention === 'none' && (
        <div className="rounded border border-muted p-2 text-xs text-muted-foreground">
          Cell depth is the only retention. Keep coverage at 70–80% of the magazine height.
        </div>
      )}
    </div>
  );
}
