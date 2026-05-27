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

const RETENTION_OPTIONS: { value: RetentionStyle; label: string }[] = [
  { value: 'flap_velcro', label: 'Flap + Velcro' },
  { value: 'flap_snap', label: 'Flap + Snap' },
  { value: 'flap_fastex', label: 'Flap + Fastex' },
  { value: 'open_top_bungee', label: 'Open Top + Bungee' },
];

export function RetentionSection({ inputs, errors, onChange }: Props) {
  const hasFlapClosure = inputs.retention !== 'open_top_bungee';
  const hasVelcro = inputs.retention === 'flap_velcro';

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
      </div>

      {hasFlapClosure && (
        <>
          <div className="space-y-1">
            <label htmlFor="closure-overlap" className="text-xs font-medium">
              Closure overlap (in)
            </label>
            <input
              id="closure-overlap"
              type="number"
              step="0.25"
              min="0"
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={inputs.closure_overlap ?? DEFAULT_CLOSURE_OVERLAP_IN}
              onChange={e => onChange({ closure_overlap: parseFloat(e.target.value) })}
            />
            {errors['closure_overlap'] && (
              <p className="text-xs text-destructive">{errors['closure_overlap']}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="flap-length" className="text-xs font-medium">
              Flap length (in) — optional override
            </label>
            <input
              id="flap-length"
              type="number"
              step="0.25"
              min="0.1"
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={inputs.flap_length ?? ''}
              placeholder="Computed from exposed %"
              onChange={e => {
                const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                onChange({ flap_length: v });
              }}
            />
            {errors['flap_length'] && (
              <p className="text-xs text-destructive">{errors['flap_length']}</p>
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
            />
            {errors['hook_length'] && (
              <p className="text-xs text-destructive">{errors['hook_length']}</p>
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
            />
            {errors['loop_length'] && (
              <p className="text-xs text-destructive">{errors['loop_length']}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
