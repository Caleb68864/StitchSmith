import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BookCoverProjectInputs } from '../../state/useBookCoverProject.js';
import { BOOK_PRESETS, FOLDOVER_PRESETS, ZIPPER_GAUGE_DEFAULTS } from '../../generators/book-cover/defaults.js';
import type { ZipperGauge } from '../../generators/book-cover/types.js';

interface Props {
  inputs: BookCoverProjectInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<BookCoverProjectInputs>) => void;
  onToggleOuterPocket: (enabled: boolean) => void;
  onToggleInnerPocket: (enabled: boolean) => void;
  onTogglePenHolder: (enabled: boolean) => void;
}

const IN_TO_MM = 25.4;

function toMm(value: number, units: 'mm' | 'in'): number {
  return units === 'in' ? value * IN_TO_MM : value;
}

function fromMm(value: number, units: 'mm' | 'in'): number {
  return units === 'in' ? value / IN_TO_MM : value;
}

function getSpineWidthMm(inputs: BookCoverProjectInputs): number {
  if (inputs.spine_width !== undefined) return toMm(inputs.spine_width, inputs.units);
  const preset = inputs.book_preset ? BOOK_PRESETS.find(p => p.id === inputs.book_preset) : undefined;
  return preset?.spine_width_mm ?? 0;
}

function getWidthEaseAuto(inputs: BookCoverProjectInputs): number {
  return Math.max(6.35, getSpineWidthMm(inputs) * 0.5);
}

function getSpineBulgeAuto(inputs: BookCoverProjectInputs): boolean {
  const preset = inputs.book_preset ? BOOK_PRESETS.find(p => p.id === inputs.book_preset) : undefined;
  return inputs.is_hardcover ?? preset?.is_hardcover ?? false;
}

function NumericField({
  id,
  label,
  value,
  error,
  disabled,
  min,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: number | undefined;
  error?: string;
  disabled?: boolean;
  min?: number;
  placeholder?: string;
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
        placeholder={placeholder}
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

const CLOSURE_KIND_LABELS: Record<string, string> = {
  none: 'None (wrap)',
  zipper: 'Zipper',
  elastic: 'Elastic',
  snap: 'Snap',
  'flap-buckle': 'Flap & Buckle',
};

const ZIPPER_GAUGES: ZipperGauge[] = ['#3', '#5', '#10'];

function getClosureKind(inputs: BookCoverProjectInputs): string {
  return inputs.closure?.kind ?? 'none';
}

function getZipperCornerRadiusPlaceholder(gauge: ZipperGauge, units: 'mm' | 'in'): string {
  const mm = ZIPPER_GAUGE_DEFAULTS[gauge].corner_radius_mm;
  if (units === 'in') return `${(mm / 25.4).toFixed(2)} in`;
  return `${Math.round(mm)} mm`;
}

function ClosureSection({
  inputs,
  onChange,
}: {
  inputs: BookCoverProjectInputs;
  onChange: (changes: Partial<BookCoverProjectInputs>) => void;
}) {
  const kind = getClosureKind(inputs);

  function handleKindChange(newKind: string) {
    if (newKind === 'none') {
      onChange({ closure: { kind: 'none' } });
    } else if (newKind === 'zipper') {
      onChange({ closure: { kind: 'zipper', gauge: '#5' } });
    } else if (newKind === 'elastic') {
      onChange({ closure: { kind: 'elastic' } });
    } else if (newKind === 'snap') {
      onChange({ closure: { kind: 'snap' } });
    } else if (newKind === 'flap-buckle') {
      onChange({ closure: { kind: 'flap-buckle' } });
    }
  }

  const closure = inputs.closure;
  const zipperClosure = closure?.kind === 'zipper' ? closure : undefined;
  const elasticClosure = closure?.kind === 'elastic' ? closure : undefined;
  const snapClosure = closure?.kind === 'snap' ? closure : undefined;
  const flapBuckleClosure = closure?.kind === 'flap-buckle' ? closure : undefined;

  return (
    <div className="rounded border border-border p-3 space-y-3">
      <h2 className="text-xs font-semibold">Closure</h2>
      <div className="space-y-1">
        <Label htmlFor="closure-kind" className="text-xs">Type</Label>
        <div data-testid="closure-select">
          <Select
            value={kind}
            onValueChange={handleKindChange}
          >
            <SelectTrigger id="closure-kind" className="h-8 text-xs">
              <SelectValue placeholder="None (wrap)" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CLOSURE_KIND_LABELS).map(([v, label]) => (
                <SelectItem key={v} value={v}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {zipperClosure && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="zipper-gauge" className="text-xs">Gauge</Label>
            <div data-testid="zipper-gauge-select">
              <Select
                value={zipperClosure.gauge}
                onValueChange={(g) =>
                  onChange({ closure: { kind: 'zipper', gauge: g as ZipperGauge, corner_radius: zipperClosure.corner_radius } })
                }
              >
                <SelectTrigger id="zipper-gauge" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZIPPER_GAUGES.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <NumericField
            id="zipper-corner-radius"
            label={`Corner Radius (${inputs.units})`}
            value={zipperClosure.corner_radius !== undefined
              ? (inputs.units === 'in' ? zipperClosure.corner_radius / 25.4 : zipperClosure.corner_radius)
              : undefined}
            placeholder={getZipperCornerRadiusPlaceholder(zipperClosure.gauge, inputs.units)}
            onChange={v =>
              onChange({
                closure: {
                  kind: 'zipper',
                  gauge: zipperClosure.gauge,
                  corner_radius: inputs.units === 'in' ? v * 25.4 : v,
                },
              })
            }
          />
        </div>
      )}

      {elasticClosure && (
        <NumericField
          id="elastic-width"
          label="Elastic Width (mm)"
          value={elasticClosure.width_mm}
          placeholder="25 mm"
          onChange={v => onChange({ closure: { kind: 'elastic', width_mm: v, tension: elasticClosure.tension } })}
        />
      )}

      {snapClosure && (
        <NumericField
          id="snap-count"
          label="Snap Count"
          value={snapClosure.count}
          min={1}
          placeholder="2"
          onChange={v =>
            onChange({ closure: { kind: 'snap', count: Math.max(1, Math.round(v)) } })
          }
        />
      )}

      {flapBuckleClosure && (
        <div className="space-y-3">
          <NumericField
            id="strap-width"
            label="Strap Width (mm)"
            value={flapBuckleClosure.strap_width}
            placeholder="25 mm"
            onChange={v =>
              onChange({ closure: { kind: 'flap-buckle', strap_width: v, buckle_size: flapBuckleClosure.buckle_size } })
            }
          />
          <NumericField
            id="buckle-size"
            label="Buckle Size (mm)"
            value={flapBuckleClosure.buckle_size}
            placeholder="25 mm"
            onChange={v =>
              onChange({ closure: { kind: 'flap-buckle', strap_width: flapBuckleClosure.strap_width, buckle_size: v } })
            }
          />
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
  const widthEaseAuto = getWidthEaseAuto(inputs);
  const isHardcover = getSpineBulgeAuto(inputs);
  const spineBulgeAuto = isHardcover ? 6.35 : 0;

  function handleBookPreset(presetId: string) {
    if (!presetId) {
      onChange({ book_preset: undefined });
      return;
    }
    const preset = BOOK_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    onChange({
      book_preset: presetId,
      book_height: fromMm(preset.book_height_mm, inputs.units),
      book_width: fromMm(preset.book_width_mm, inputs.units),
      spine_width: fromMm(preset.spine_width_mm, inputs.units),
      flap_depth: fromMm(preset.flap_depth_mm, inputs.units),
      is_hardcover: preset.is_hardcover,
    });
  }

  function handleFoldoverPreset(presetId: string) {
    if (!presetId) {
      onChange({ foldover_preset: undefined });
      return;
    }
    const preset = FOLDOVER_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    onChange({
      foldover_preset: presetId as 'tactical' | 'civilian',
      flap_depth: fromMm(preset.flap_depth_mm, inputs.units),
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded border border-border p-3 space-y-4">
        <h2 className="text-xs font-semibold">Book Dimensions</h2>

        <div className="space-y-1">
          <Label htmlFor="book-preset" className="text-xs">Book preset</Label>
          <Select value={inputs.book_preset ?? ''} onValueChange={handleBookPreset}>
            <SelectTrigger id="book-preset" className="h-8 text-xs">
              <SelectValue placeholder="Custom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Custom</SelectItem>
              {BOOK_PRESETS.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumericField
            id="book-height"
            label={`Height (${inputs.units})`}
            value={inputs.book_height}
            error={errors['book_height']}
            onChange={v => onChange({ book_height: v, book_preset: undefined })}
          />
          <NumericField
            id="book-width"
            label={`Width (${inputs.units})`}
            value={inputs.book_width}
            error={errors['book_width']}
            onChange={v => onChange({ book_width: v, book_preset: undefined })}
          />
          <NumericField
            id="spine-width"
            label={`Spine (${inputs.units})`}
            value={inputs.spine_width}
            error={errors['spine_width']}
            onChange={v => onChange({ spine_width: v, book_preset: undefined })}
          />
          <div className="space-y-1">
            <NumericField
              id="flap-depth"
              label={`Flap Depth (${inputs.units})`}
              value={inputs.flap_depth}
              error={errors['flap_depth']}
              onChange={v => onChange({ flap_depth: v, book_preset: undefined, foldover_preset: undefined })}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="foldover-preset" className="text-xs">Foldover preset</Label>
          <Select value={inputs.foldover_preset ?? ''} onValueChange={handleFoldoverPreset}>
            <SelectTrigger id="foldover-preset" className="h-8 text-xs">
              <SelectValue placeholder="Custom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Custom</SelectItem>
              {FOLDOVER_PRESETS.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <NumericField
            id="width-ease"
            label="Width Ease (mm)"
            value={inputs.width_ease}
            error={errors['width_ease']}
            min={0}
            placeholder={`auto: ${widthEaseAuto.toFixed(1)} mm`}
            onChange={v => onChange({ width_ease: v })}
          />
          <NumericField
            id="spine-bulge"
            label="Spine Bulge (mm)"
            value={inputs.spine_bulge}
            error={errors['spine_bulge']}
            min={0}
            placeholder={`auto: ${spineBulgeAuto.toFixed(1)} mm`}
            onChange={v => onChange({ spine_bulge: v })}
          />
        </div>
      </div>

      <ClosureSection inputs={inputs} onChange={onChange} />

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
