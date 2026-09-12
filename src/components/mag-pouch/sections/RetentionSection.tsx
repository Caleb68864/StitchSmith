import type { MagPouchInputs, RetentionStyle } from '../../../generators/mag-pouch/types.js';
import {
  DEFAULT_HOOK_LENGTH_IN,
  DEFAULT_LOOP_LENGTH_IN,
  DEFAULT_CLOSURE_OVERLAP_IN,
} from '../../../generators/mag-pouch/defaults.js';

interface Props {
  inputs: MagPouchInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<MagPouchInputs>) => void;
}

const RETENTION_OPTIONS: { value: RetentionStyle; label: string; description: string }[] = [
  { value: 'flap_velcro', label: 'Lid + Velcro', description: 'Lid cut integral with the back folds over the mag; hook on the lid, loop on the face.' },
  { value: 'flap_snap', label: 'Lid + snap', description: 'Integral lid with a Line 24 snap per cell.' },
  { value: 'flap_fastex', label: 'Lid + side-release buckle', description: 'Integral lid with a 1" buckle per cell.' },
  { value: 'open_top_bungee', label: 'Open top + bungee', description: 'Bungee over the mag top with a pull tab. Caliber-committed.' },
  { value: 'velcro_dot', label: 'Open top + Velcro dot', description: 'Loop on both interior walls; 1" hook square on one face of the mag.' },
  { value: 'kydex_wedge', label: 'Open top + Kydex wedge', description: 'Loop on both interior walls; bought wedge keyed to the platform.' },
  { value: 'none', label: 'Open top, friction only', description: 'Cell depth does the holding.' },
];

export function RetentionSection({ inputs, errors, onChange }: Props) {
  const hasFlapClosure = inputs.retention.startsWith('flap_');
  const hasVelcro = inputs.retention === 'flap_velcro';
  const current = RETENTION_OPTIONS.find((o) => o.value === inputs.retention);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="retention-style" className="text-xs font-medium">
          Retention style
        </label>
        <select
          id="retention-style"
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={inputs.retention}
          onChange={e => onChange({ retention: e.target.value as RetentionStyle })}
        >
          {RETENTION_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {current && <p className="text-xs text-muted-foreground">{current.description}</p>}
        {errors['retention'] && <p className="text-xs text-destructive">{errors['retention']}</p>}
      </div>

      {hasFlapClosure && (
        <>
          <div className="space-y-1">
            <label htmlFor="closure-overlap" className="text-xs font-medium">
              Closure reach down the face (in)
            </label>
            <input
              id="closure-overlap"
              type="number"
              step="0.25"
              min="0"
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={inputs.closure_overlap ?? DEFAULT_CLOSURE_OVERLAP_IN}
              onChange={e => onChange({ closure_overlap: parseFloat(e.target.value) })}
              aria-invalid={errors['closure_overlap'] ? true : undefined}
              aria-describedby={`${errors['closure_overlap'] ? 'closure-overlap-error ' : ''}closure-overlap-help`}
            />
            <p id="closure-overlap-help" className="text-xs text-muted-foreground">
              How far the lid comes down the face after wrapping the mag top. Lid length = exposed mag + cell depth + this.
            </p>
            {errors['closure_overlap'] && (
              <p id="closure-overlap-error" className="text-xs text-destructive">{errors['closure_overlap']}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="flap-length" className="text-xs font-medium">
              Lid length (in) — optional override
            </label>
            <input
              id="flap-length"
              type="number"
              step="0.25"
              min="0.1"
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={inputs.flap_length ?? ''}
              placeholder="Derived from coverage + reach"
              onChange={e => {
                const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                onChange({ flap_length: v });
              }}
              aria-invalid={errors['flap_length'] ? true : undefined}
              aria-describedby={errors['flap_length'] ? 'flap-length-error' : undefined}
            />
            {errors['flap_length'] && (
              <p id="flap-length-error" className="text-xs text-destructive">{errors['flap_length']}</p>
            )}
          </div>
        </>
      )}

      {hasVelcro && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="hook-length" className="text-xs font-medium">
              Hook length (in)
            </label>
            <input
              id="hook-length"
              type="number"
              step="0.25"
              min="0"
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={inputs.hook_length ?? DEFAULT_HOOK_LENGTH_IN}
              onChange={e => onChange({ hook_length: parseFloat(e.target.value) })}
              aria-invalid={errors['hook_length'] ? true : undefined}
              aria-describedby={errors['hook_length'] ? 'hook-length-error' : undefined}
            />
            {errors['hook_length'] && (
              <p id="hook-length-error" className="text-xs text-destructive">{errors['hook_length']}</p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="loop-length" className="text-xs font-medium">
              Loop length (in)
            </label>
            <input
              id="loop-length"
              type="number"
              step="0.25"
              min="0"
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={inputs.loop_length ?? DEFAULT_LOOP_LENGTH_IN}
              onChange={e => onChange({ loop_length: parseFloat(e.target.value) })}
              aria-invalid={errors['loop_length'] ? true : undefined}
              aria-describedby={`${errors['loop_length'] ? 'loop-length-error ' : ''}loop-length-help`}
            />
            <p id="loop-length-help" className="text-xs text-muted-foreground">Loop = hook + travel.</p>
            {errors['loop_length'] && (
              <p id="loop-length-error" className="text-xs text-destructive">{errors['loop_length']}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
