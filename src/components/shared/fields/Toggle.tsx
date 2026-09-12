import { useId } from 'react';
import { HelpText } from './HelpText.js';

export interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  id?: string;
  help?: string;
  disabled?: boolean;
}

/** Labelled checkbox with optional help; the label is the accessible name. */
export function Toggle({ label, value, onChange, id, help, disabled }: ToggleProps) {
  const autoId = useId();
  const inputId = id ?? `toggle-${autoId}`;
  return (
    <div className="space-y-0.5">
      <label htmlFor={inputId} className={`flex items-center gap-2 text-xs ${disabled ? 'text-muted-foreground' : ''}`}>
        <input id={inputId} type="checkbox" checked={value} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-describedby={help ? `${inputId}-help` : undefined} />
        {label}
      </label>
      {help && <HelpText id={`${inputId}-help`} className="pl-6">{help}</HelpText>}
    </div>
  );
}
