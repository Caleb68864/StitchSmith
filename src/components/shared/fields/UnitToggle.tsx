import { Button } from '@/components/ui/button';
import type { UnitSystem } from '../../../utils/units.js';

/** in / mm switch; the panel converts its length inputs with `convertLengthValues` in `onChange`. */
export function UnitToggle({ value, onChange, label = 'Units' }: { value: UnitSystem; onChange: (next: UnitSystem) => void; label?: string }) {
  return (
    <div className="space-y-1">
      <span className="block text-xs font-semibold">{label}</span>
      <div role="group" aria-label={label} className="flex gap-2">
        {(['in', 'mm'] as const).map((u) => (
          <Button key={u} aria-pressed={value === u} variant={value === u ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-3" onClick={() => onChange(u)}>
            {u}
          </Button>
        ))}
      </div>
    </div>
  );
}
