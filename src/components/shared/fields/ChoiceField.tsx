import { Button } from '@/components/ui/button';
import { HelpText } from './HelpText.js';
import { useId } from 'react';

export interface ChoiceOption<T extends string> { value: T; label: string; description?: string }

export interface ChoiceFieldProps<T extends string> {
  label: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (v: T) => void;
  help?: string;
  id?: string;
}

/** A small set of mutually exclusive options as a labelled button group (buttons with aria-pressed, so tests and users find them by name). */
export function ChoiceField<T extends string>({ label, value, options, onChange, help, id }: ChoiceFieldProps<T>) {
  const autoId = useId();
  const groupId = id ?? `choice-${autoId}`;
  const current = options.find((o) => o.value === value);
  return (
    <div className="space-y-1">
      <span id={`${groupId}-label`} className="block text-xs font-semibold">{label}</span>
      <div role="group" aria-labelledby={`${groupId}-label`} className="flex flex-wrap gap-1">
        {options.map((o) => (
          <Button key={o.value} aria-pressed={value === o.value} variant={value === o.value ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-2" onClick={() => onChange(o.value)} title={o.description}>
            {o.label}
          </Button>
        ))}
      </div>
      {(help ?? current?.description) && <HelpText>{help ?? current?.description}</HelpText>}
    </div>
  );
}
