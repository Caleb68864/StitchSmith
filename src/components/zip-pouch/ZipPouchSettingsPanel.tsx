import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ZipPouchInputs, ZipPouchPreset, ConstructionStyle } from '../../generators/zip-pouch/types.js';
import { PRESET_DEFAULTS } from '../../generators/zip-pouch/defaults.js';

// ─── Unit conversion helpers ─────────────────────────────────────────────────

const NUMERIC_FIELDS = [
  'finished_length',
  'finished_width',
  'finished_depth',
  'seam_allowance',
  'grosgrain_width',
] as const;

/**
 * Convert all numeric dimension fields to `newUnits`.
 * mm→in: divide by 25.4, round to 2 dp. in→mm: multiply by 25.4, round to integer.
 * Sets preset='custom' in the returned partial.
 */
export function convertInputsUnits(
  inputs: ZipPouchInputs,
  newUnits: 'mm' | 'in',
): Partial<ZipPouchInputs> {
  const changes: Partial<ZipPouchInputs> = { units: newUnits, preset: 'custom' };
  for (const field of NUMERIC_FIELDS) {
    const v = inputs[field];
    if (typeof v === 'number' && Number.isFinite(v)) {
      if (newUnits === 'in') {
        (changes as Record<string, unknown>)[field] = Math.round((v / 25.4) * 100) / 100;
      } else {
        (changes as Record<string, unknown>)[field] = Math.round(v * 25.4);
      }
    }
  }
  return changes;
}

/**
 * Convert preset dimension values (always in mm) to the display units.
 * Returns the original object unchanged when `units === 'mm'`.
 */
export function convertPresetDimsToUnits(
  dims: { finished_length: number; finished_width: number; finished_depth: number },
  units: 'mm' | 'in',
): { finished_length: number; finished_width: number; finished_depth: number } {
  if (units !== 'in') return dims;
  return {
    finished_length: Math.round((dims.finished_length / 25.4) * 100) / 100,
    finished_width: Math.round((dims.finished_width / 25.4) * 100) / 100,
    finished_depth: Math.round((dims.finished_depth / 25.4) * 100) / 100,
  };
}

interface Props {
  inputs: ZipPouchInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<ZipPouchInputs>) => void;
}

function NumericField({
  id,
  label,
  value,
  error,
  min,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number | undefined;
  error?: string;
  min?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={min ?? 0}
        step={step ?? 1}
        value={value ?? ''}
        onChange={e => onChange(parseFloat(e.target.value))}
        className={`h-8 text-xs ${error ? 'border-destructive' : ''}`}
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

const CONSTRUCTION_STYLE_LABELS: Record<ConstructionStyle, string> = {
  boxed: 'Boxed corners (classic)',
  'cross-bottom': 'Cross-bottom (one-piece)',
  'gusset-strip': 'Gusset strip',
  'multi-panel': 'Multi-panel (5-piece)',
};

const PRESET_LABELS: Record<ZipPouchPreset, string> = {
  pencil: 'Pencil Pouch (220 × 120 × 30 mm)',
  edc: 'EDC Pouch (180 × 100 × 40 mm)',
  toiletry: 'Toiletry Bag (280 × 150 × 60 mm)',
  custom: 'Custom',
};

export function ZipPouchSettingsPanel({ inputs, errors, onChange }: Props) {
  const preset = inputs.preset ?? 'pencil';
  const units = inputs.units ?? 'mm';

  function handlePresetChange(value: string) {
    const p = value as ZipPouchPreset;
    if (p === 'custom') {
      onChange({ preset: 'custom' });
    } else {
      const dims = convertPresetDimsToUnits(PRESET_DEFAULTS[p], units);
      onChange({
        preset: p,
        finished_length: dims.finished_length,
        finished_width: dims.finished_width,
        finished_depth: dims.finished_depth,
      });
    }
  }

  function handleUnitsChange(newUnits: 'mm' | 'in') {
    if (newUnits === units) return;
    onChange(convertInputsUnits(inputs, newUnits));
  }

  return (
    <div className="space-y-2">
      <Accordion type="multiple" defaultValue={['preset', 'dimensions', 'construction', 'options']} className="rounded border border-border px-3">
        <AccordionItem value="preset">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Preset
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pb-2">
              <div className="space-y-1">
                <Label className="text-xs">Size Preset</Label>
                <Select value={preset} onValueChange={handlePresetChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pencil" className="text-xs">{PRESET_LABELS.pencil}</SelectItem>
                    <SelectItem value="edc" className="text-xs">{PRESET_LABELS.edc}</SelectItem>
                    <SelectItem value="toiletry" className="text-xs">{PRESET_LABELS.toiletry}</SelectItem>
                    <SelectItem value="custom" className="text-xs">{PRESET_LABELS.custom}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Units</Label>
                <div className="flex gap-2">
                  <Button
                    variant={units === 'mm' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => handleUnitsChange('mm')}
                  >
                    mm
                  </Button>
                  <Button
                    variant={units === 'in' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => handleUnitsChange('in')}
                  >
                    in
                  </Button>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="dimensions">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Dimensions
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-3 pb-2">
              <NumericField
                id="finished-length"
                label={`Length (${units})`}
                value={inputs.finished_length}
                error={errors['finished_length']}
                onChange={v => onChange({ finished_length: v, preset: 'custom' })}
              />
              <NumericField
                id="finished-width"
                label={`Width (${units})`}
                value={inputs.finished_width}
                error={errors['finished_width']}
                onChange={v => onChange({ finished_width: v, preset: 'custom' })}
              />
              <NumericField
                id="finished-depth"
                label={`Depth (${units})`}
                value={inputs.finished_depth}
                error={errors['finished_depth']}
                onChange={v => onChange({ finished_depth: v, preset: 'custom' })}
              />
              <NumericField
                id="seam-allowance"
                label="Seam Allowance (mm)"
                value={inputs.seam_allowance}
                error={errors['seam_allowance']}
                min={0}
                step={0.5}
                onChange={v => onChange({ seam_allowance: v })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="construction">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Construction
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pb-2">
              <div className="space-y-1">
                <Label className="text-xs">Construction Style</Label>
                <Select
                  value={inputs.construction_style ?? 'boxed'}
                  onValueChange={(v) => onChange({ construction_style: v as ConstructionStyle })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boxed" className="text-xs">{CONSTRUCTION_STYLE_LABELS.boxed}</SelectItem>
                    <SelectItem value="cross-bottom" className="text-xs">{CONSTRUCTION_STYLE_LABELS['cross-bottom']}</SelectItem>
                    <SelectItem value="gusset-strip" className="text-xs">{CONSTRUCTION_STYLE_LABELS['gusset-strip']}</SelectItem>
                    <SelectItem value="multi-panel" className="text-xs">{CONSTRUCTION_STYLE_LABELS['multi-panel']}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="options">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Hardware
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pb-2">
              <div className="space-y-1">
                <Label className="text-xs">Zipper Gauge</Label>
                <div className="flex gap-2">
                  <Button
                    variant={inputs.zip_gauge === '#3' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => onChange({ zip_gauge: '#3' })}
                  >
                    #3
                  </Button>
                  <Button
                    variant={inputs.zip_gauge === '#5' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => onChange({ zip_gauge: '#5' })}
                  >
                    #5
                  </Button>
                </div>
              </div>

              <NumericField
                id="grosgrain-width"
                label="Grosgrain Width (mm)"
                value={inputs.grosgrain_width}
                error={errors['grosgrain_width']}
                min={0}
                step={0.5}
                onChange={v => onChange({ grosgrain_width: v })}
              />

              <div className="space-y-1">
                <Label className="text-xs">Pull Loops</Label>
                <div className="flex gap-2">
                  <Button
                    variant={inputs.pull_loops !== false ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => onChange({ pull_loops: true })}
                  >
                    Yes
                  </Button>
                  <Button
                    variant={inputs.pull_loops === false ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => onChange({ pull_loops: false })}
                  >
                    No
                  </Button>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
