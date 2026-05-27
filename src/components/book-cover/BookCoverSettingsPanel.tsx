import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { BookCoverProjectInputs } from '../../state/useBookCoverProject.js';

interface Props {
  inputs: BookCoverProjectInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<BookCoverProjectInputs>) => void;
  onToggleOuterPocket: (enabled: boolean) => void;
  onToggleInnerPocket: (enabled: boolean) => void;
  onTogglePenHolder: (enabled: boolean) => void;
}

function NumericField({
  id,
  label,
  value,
  error,
  disabled,
  min,
  onChange,
}: {
  id: string;
  label: string;
  value: number | undefined;
  error?: string;
  disabled?: boolean;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className={`text-xs ${disabled ? 'text-muted-foreground' : ''}`}>
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={min ?? 0}
        step={1}
        value={value ?? ''}
        disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value))}
        className={`h-8 text-xs ${error ? 'border-destructive' : ''} ${disabled ? 'opacity-50' : ''}`}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded border border-border">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1 text-xs font-medium flex-1 text-left"
          aria-expanded={open}
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {title}
        </button>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => {
              onToggle(e.target.checked);
              if (e.target.checked) setOpen(true);
            }}
            className="h-3.5 w-3.5"
          />
          <span className="text-muted-foreground">Enable</span>
        </label>
      </div>
      {open && (
        <div className={`px-3 pb-3 space-y-3 border-t border-border pt-3 ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
}

export function BookCoverSettingsPanel({
  inputs,
  errors,
  onChange,
  onToggleOuterPocket,
  onToggleInnerPocket,
  onTogglePenHolder,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded border border-border p-3 space-y-4">
        <h2 className="text-xs font-semibold">Book Dimensions</h2>
        <div className="grid grid-cols-2 gap-3">
          <NumericField
            id="book-height"
            label={`Height (${inputs.units})`}
            value={inputs.book_height}
            error={errors['book_height']}
            onChange={v => onChange({ book_height: v })}
          />
          <NumericField
            id="book-width"
            label={`Width (${inputs.units})`}
            value={inputs.book_width}
            error={errors['book_width']}
            onChange={v => onChange({ book_width: v })}
          />
          <NumericField
            id="spine-width"
            label={`Spine (${inputs.units})`}
            value={inputs.spine_width}
            error={errors['spine_width']}
            onChange={v => onChange({ spine_width: v })}
          />
          <NumericField
            id="flap-depth"
            label={`Flap Depth (${inputs.units})`}
            value={inputs.flap_depth}
            error={errors['flap_depth']}
            onChange={v => onChange({ flap_depth: v })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Units</Label>
          <div className="flex gap-2">
            <Button
              variant={inputs.units === 'mm' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => onChange({ units: 'mm' })}
            >
              mm
            </Button>
            <Button
              variant={inputs.units === 'in' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => onChange({ units: 'in' })}
            >
              in
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded border border-border p-3 space-y-3">
        <h2 className="text-xs font-semibold">Seam & Hem</h2>
        <div className="grid grid-cols-2 gap-3">
          <NumericField
            id="seam-allowance"
            label="Seam Allowance (mm)"
            value={inputs.seam_allowance}
            error={errors['seam_allowance']}
            min={0}
            onChange={v => onChange({ seam_allowance: v })}
          />
          <NumericField
            id="top-bottom-hem"
            label="Top/Bottom Hem (mm)"
            value={inputs.top_bottom_hem}
            error={errors['top_bottom_hem']}
            min={0}
            onChange={v => onChange({ top_bottom_hem: v })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold px-0.5">Accessories</p>

        <CollapsibleSection
          title="Outer Pocket"
          enabled={inputs.outer_pocket !== undefined}
          onToggle={onToggleOuterPocket}
        >
          <div className="grid grid-cols-2 gap-3">
            <NumericField
              id="outer-pocket-width"
              label={`Width (${inputs.units})`}
              value={inputs.outer_pocket?.width}
              disabled={!inputs.outer_pocket}
              onChange={v => onChange({ outer_pocket: { ...inputs.outer_pocket!, width: v } })}
            />
            <NumericField
              id="outer-pocket-height"
              label={`Height (${inputs.units})`}
              value={inputs.outer_pocket?.height}
              disabled={!inputs.outer_pocket}
              onChange={v => onChange({ outer_pocket: { ...inputs.outer_pocket!, height: v } })}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Inner Pocket"
          enabled={inputs.inner_pocket !== undefined}
          onToggle={onToggleInnerPocket}
        >
          <div className="grid grid-cols-2 gap-3">
            <NumericField
              id="inner-pocket-width"
              label={`Width (${inputs.units})`}
              value={inputs.inner_pocket?.width}
              disabled={!inputs.inner_pocket}
              onChange={v => onChange({ inner_pocket: { ...inputs.inner_pocket!, width: v } })}
            />
            <NumericField
              id="inner-pocket-height"
              label={`Height (${inputs.units})`}
              value={inputs.inner_pocket?.height}
              disabled={!inputs.inner_pocket}
              onChange={v => onChange({ inner_pocket: { ...inputs.inner_pocket!, height: v } })}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Pen Holder"
          enabled={inputs.pen_holder !== undefined}
          onToggle={onTogglePenHolder}
        >
          <div className="grid grid-cols-2 gap-3">
            <NumericField
              id="pen-holder-count"
              label="Count"
              value={inputs.pen_holder?.count}
              disabled={!inputs.pen_holder}
              min={1}
              onChange={v => onChange({ pen_holder: { ...inputs.pen_holder!, count: Math.max(1, Math.round(v)) } })}
            />
            <NumericField
              id="pen-holder-slot-width"
              label={`Slot Width (${inputs.units})`}
              value={inputs.pen_holder?.slot_width}
              disabled={!inputs.pen_holder}
              onChange={v => onChange({ pen_holder: { ...inputs.pen_holder!, slot_width: v } })}
            />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
