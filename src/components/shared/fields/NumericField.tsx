import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpText } from './HelpText.js';

export interface NumericFieldProps {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  /** Unit suffix shown once, after the label (e.g. "in", "mm"). Do not also put it in the label. */
  units?: string;
  error?: string;
  /** One short sentence: the default and the rule behind it. */
  help?: string;
  /** Mark a vault-Open number: adds the "measure and confirm" hint. */
  mockDerived?: boolean;
  min?: number;
  max?: number;
  step?: number | 'any';
  placeholder?: string;
  disabled?: boolean;
  /**
   * When true (default) a cleared box reports `undefined` so the generator
   * falls back to its default. When false it reports NaN, so validation flags
   * the empty box instead of silently restoring the default.
   */
  allowEmpty?: boolean;
  className?: string;
}

/** The one numeric input every settings panel uses: label bound by id, units once, help and error under the box. */
export function NumericField({ id, label, value, onChange, units, error, help, mockDerived, min, max, step, placeholder, disabled, allowEmpty = true, className }: NumericFieldProps) {
  const helpText = mockDerived ? `${help ? help + ' ' : ''}Vault-open number — measure and confirm.` : help;
  const describedBy = [error ? `${id}-error` : null, helpText ? `${id}-help` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <Label htmlFor={id} className={`text-xs ${disabled ? 'text-muted-foreground' : ''}`}>
        {label}
        {units && <span className="text-muted-foreground font-normal"> ({units})</span>}
      </Label>
      <Input
        id={id}
        type="number"
        min={min ?? 0}
        max={max}
        step={step ?? 1}
        value={value === undefined || Number.isNaN(value) ? '' : value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') { onChange(allowEmpty ? undefined : NaN); return; }
          onChange(parseFloat(raw));
        }}
        className={`h-8 text-xs ${error ? 'border-destructive' : ''} ${disabled ? 'opacity-50' : ''}`}
      />
      {error && <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>}
      {helpText && <HelpText id={`${id}-help`}>{helpText}</HelpText>}
    </div>
  );
}
