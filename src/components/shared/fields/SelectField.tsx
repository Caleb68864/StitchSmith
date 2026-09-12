import { Label } from '@/components/ui/label';
import { HelpText } from './HelpText.js';

export interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  help?: string;
  error?: string;
  disabled?: boolean;
}

/** Native select for longer option lists; label bound by id, help and error under it. */
export function SelectField<T extends string>({ id, label, value, options, onChange, help, error, disabled }: SelectFieldProps<T>) {
  const describedBy = [error ? `${id}-error` : null, help ? `${id}-help` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value as T)}
        className={`flex h-8 w-full rounded-md border bg-background px-2 text-xs ${error ? 'border-destructive' : 'border-input'}`}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>}
      {help && <HelpText id={`${id}-help`}>{help}</HelpText>}
    </div>
  );
}
