import type { MagPouchInputs, DrainageStyle } from '../../../generators/mag-pouch/types.js';
import { DEFAULT_GROMMET_SIZE } from '../../../generators/mag-pouch/defaults.js';

interface Props {
  inputs: MagPouchInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<MagPouchInputs>) => void;
}

const DRAINAGE_OPTIONS: { value: DrainageStyle; label: string; description: string }[] = [
  {
    value: 'open_corner',
    label: 'Open corner',
    description: 'Bottom corners left open 3/8" for water drainage — simplest option.',
  },
  {
    value: 'sewn_closed',
    label: 'Sewn closed',
    description: 'Bottom is fully sewn closed — best for dry environments.',
  },
  {
    value: 'grommet',
    label: 'Grommet',
    description: 'Brass or aluminum grommet at center bottom — requires grommet-setting tool.',
  },
];

const GROMMET_SIZES = ['#0', '#1', '#2', '#4'];

export function DrainageSection({ inputs, errors: _errors, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="drainage-style" className="text-xs font-medium">
          Drainage style
        </label>
        <select
          id="drainage-style"
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={inputs.drainage}
          onChange={e => onChange({ drainage: e.target.value as DrainageStyle })}
        >
          {DRAINAGE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {DRAINAGE_OPTIONS.filter(o => o.value === inputs.drainage).map(opt => (
        <p key={opt.value} className="text-xs text-muted-foreground">
          {opt.description}
        </p>
      ))}

      {inputs.drainage === 'grommet' && (
        <div className="space-y-1">
          <label htmlFor="grommet-size" className="text-xs font-medium">
            Grommet size
          </label>
          <select
            id="grommet-size"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={inputs.grommet_size ?? DEFAULT_GROMMET_SIZE}
            onChange={e => onChange({ grommet_size: e.target.value })}
          >
            {GROMMET_SIZES.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
