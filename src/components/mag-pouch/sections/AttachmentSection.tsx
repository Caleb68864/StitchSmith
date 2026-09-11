import type { MagPouchInputs, AttachmentStyle } from '../../../generators/mag-pouch/types.js';

interface Props {
  inputs: MagPouchInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<MagPouchInputs>) => void;
}

const ATTACHMENT_OPTIONS: { value: AttachmentStyle; label: string; description: string }[] = [
  {
    value: 'pals',
    label: 'PALS / MOLLE',
    description: 'Sewn 1" PALS rows on the back plus vertical mount straps. The cell span snaps to the 1.5" grid (3" per rifle mag) so it mounts in spec spacing.',
  },
  {
    value: 'molle',
    label: 'MOLLE',
    description: 'Same geometry as PALS — MOLLE is the platform name, PALS is the webbing spec.',
  },
  {
    value: 'belt_loop',
    label: 'Belt loop',
    description: 'Single horizontal belt loop — fits belts up to 1.75".',
  },
  {
    value: 'alice',
    label: 'ALICE clips',
    description: 'Traditional ALICE clip attachment — uses two standard ALICE clips.',
  },
  {
    value: 'velcro_panel',
    label: 'Velcro panel',
    description: 'Full-back hook panel for a loop-lined placard or carrier. No grid tax: the cell can run close to the magazine.',
  },
];

export function AttachmentSection({ inputs, errors: _errors, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="attachment-style" className="text-xs font-medium">
          Attachment method
        </label>
        <select
          id="attachment-style"
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={inputs.attachment}
          onChange={e => onChange({ attachment: e.target.value as AttachmentStyle })}
        >
          {ATTACHMENT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {ATTACHMENT_OPTIONS.filter(o => o.value === inputs.attachment).map(opt => (
        <p key={opt.value} className="text-xs text-muted-foreground">
          {opt.description}
        </p>
      ))}
    </div>
  );
}
