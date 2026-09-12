import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpText } from './HelpText.js';

/**
 * Unit conversion leaves floating-point tails — a 0.75" bellows round-tripped
 * through millimetres comes back as 0.7499999999999999, and the box shows every
 * digit. Display is rounded well below any sewing tolerance (0.0001" is 2.5 µm);
 * what the user types is never touched.
 */
export function displayNumber(v: number | undefined): string {
  if (v === undefined || Number.isNaN(v)) return '';
  return String(Math.round(v * 1e4) / 1e4);
}

/** The full sentence behind the compact marker; screen readers get it, eyes get a chip. */
export const MOCK_DERIVED_SENTENCE =
  'The vault leaves this number open. Mock it in paper, cord or scrap and measure your own before cutting.';

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
  /**
   * Mark a vault-Open number. Renders a compact "measure" chip beside the label
   * with the full sentence as its tooltip and in the field's description, so a
   * column of open numbers does not repeat the same paragraph a dozen times.
   */
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
  // While the box has focus the raw keystrokes win, so rounding cannot fight the caret.
  const [draft, setDraft] = useState<string | null>(null);
  const describedBy = [
    error ? `${id}-error` : null,
    help ? `${id}-help` : null,
    mockDerived ? `${id}-mock` : null,
  ].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <Label htmlFor={id} className={`text-xs flex items-center gap-1.5 ${disabled ? 'text-muted-foreground' : ''}`}>
        <span>
          {label}
          {units && <span className="text-muted-foreground font-normal"> ({units})</span>}
        </span>
        {mockDerived && (
          <span
            title={MOCK_DERIVED_SENTENCE}
            aria-hidden="true"
            className="shrink-0 rounded-sm border border-amber-500/40 bg-amber-500/10 px-1 text-[10px] font-medium leading-4 text-amber-700 dark:text-amber-400"
          >
            measure
          </span>
        )}
      </Label>
      <Input
        id={id}
        type="number"
        min={min ?? 0}
        max={max}
        step={step ?? 1}
        value={draft ?? displayNumber(value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          if (raw === '') { onChange(allowEmpty ? undefined : NaN); return; }
          onChange(parseFloat(raw));
        }}
        onBlur={() => setDraft(null)}
        className={`h-8 text-xs ${error ? 'border-destructive' : ''} ${disabled ? 'opacity-50' : ''}`}
      />
      {error && <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>}
      {help && <HelpText id={`${id}-help`}>{help}</HelpText>}
      {mockDerived && <span id={`${id}-mock`} className="sr-only">{MOCK_DERIVED_SENTENCE}</span>}
    </div>
  );
}
