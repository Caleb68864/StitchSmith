import type { MagPouchInputs, RetentionStyle } from '../../../generators/mag-pouch/types.js';

interface Props {
  inputs: MagPouchInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<MagPouchInputs>) => void;
}

const CLOSURE_LABELS: Record<RetentionStyle, string> = {
  flap_velcro: 'Velcro (hook & loop)',
  flap_snap: 'Snap',
  flap_fastex: 'Fastex buckle',
  open_top_bungee: 'Bungee / cord retention',
};

export function ClosureSection({ inputs, errors: _errors, onChange: _onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Current closure hardware:{' '}
          <span className="font-medium text-foreground">
            {CLOSURE_LABELS[inputs.retention]}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Closure style is configured in the <strong>Retention</strong> section above.
          This panel will show hardware-specific options when applicable.
        </p>
      </div>

      {inputs.retention === 'flap_fastex' && (
        <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Fastex hardware: use 1&quot; side-release buckle (male + female). Webbing width must
          match buckle slot (typically 1&quot;). Center the buckle on the flap centerline.
        </div>
      )}

      {inputs.retention === 'flap_snap' && (
        <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
          Snap hardware: Line 24 T-post snaps recommended (4 snaps per pouch). Set snaps
          with a snap-setting tool; do not use a hammer alone.
        </div>
      )}

      {inputs.retention === 'open_top_bungee' && (
        <div className="rounded border border-muted p-2 text-xs text-muted-foreground">
          Bungee retention: #550 paracord or 3mm shock cord with a cord lock at each end.
          Route through 3/8&quot; bartacked channels on the side panels.
        </div>
      )}
    </div>
  );
}
