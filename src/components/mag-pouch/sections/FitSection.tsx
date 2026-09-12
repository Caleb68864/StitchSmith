import type { MagPouchInputs } from '../../../generators/mag-pouch/types.js';
import {
  DEFAULT_EASE_WIDTH_IN,
  DEFAULT_EASE_DEPTH_IN,
  DEFAULT_EXPOSED_PERCENTAGE,
  DEFAULT_SEAM_ALLOWANCE_IN,
} from '../../../generators/mag-pouch/defaults.js';

interface Props {
  inputs: MagPouchInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<MagPouchInputs>) => void;
}

export function FitSection({ inputs, errors, onChange }: Props) {
  const isCard = inputs.construction === 'pleated_card';
  const coverage = inputs.exposed_percentage ?? DEFAULT_EXPOSED_PERCENTAGE;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="ease-width" className="text-xs font-medium">
            Width ease (in)
          </label>
          <input
            id="ease-width"
            type="number"
            step="0.0625"
            min="0"
            max="1"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={inputs.ease_width ?? DEFAULT_EASE_WIDTH_IN}
            onChange={e => onChange({ ease_width: parseFloat(e.target.value) })}
            aria-invalid={errors['ease_width'] ? true : undefined}
            aria-describedby={`${errors['ease_width'] ? 'ease-width-error ' : ''}ease-width-help`}
          />
          <p id="ease-width-help" className="text-xs text-muted-foreground">
            Added to the mag width for a non-PALS cell. PALS cells snap to the 1.5" grid instead.
          </p>
          {errors['ease_width'] && (
            <p id="ease-width-error" className="text-xs text-destructive">{errors['ease_width']}</p>
          )}
        </div>
        <div className="space-y-1">
          <label htmlFor="ease-depth" className="text-xs font-medium">
            Depth ease (in)
          </label>
          <input
            id="ease-depth"
            type="number"
            step="0.0625"
            min="0"
            max="1"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={inputs.ease_depth ?? DEFAULT_EASE_DEPTH_IN}
            onChange={e => onChange({ ease_depth: parseFloat(e.target.value) })}
            aria-invalid={errors['ease_depth'] ? true : undefined}
            aria-describedby={errors['ease_depth'] ? 'ease-depth-error' : undefined}
          />
          {errors['ease_depth'] && (
            <p id="ease-depth-error" className="text-xs text-destructive">{errors['ease_depth']}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="exposed-pct" className="text-xs font-medium">
          Coverage — mag height inside the pouch (40–100%)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="exposed-pct"
            type="range"
            min="0.40"
            max="1.0"
            step="0.05"
            className="flex-1 h-2 rounded accent-primary"
            value={coverage}
            onChange={e => onChange({ exposed_percentage: parseFloat(e.target.value) })}
          />
          <span className="text-xs w-12 text-right tabular-nums">
            {(coverage * 100).toFixed(0)}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          The pouch is this fraction of the magazine height; the rest stands proud for the grab. 70–80% is the usual range.
        </p>
        {errors['exposed_percentage'] && (
          <p className="text-xs text-destructive">{errors['exposed_percentage']}</p>
        )}
      </div>

      {!isCard && (
        <div className="space-y-1">
          <label htmlFor="seam-allowance" className="text-xs font-medium">
            Seam allowance
          </label>
          <select
            id="seam-allowance"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={inputs.seamAllowance ?? DEFAULT_SEAM_ALLOWANCE_IN}
            onChange={e => onChange({ seamAllowance: parseFloat(e.target.value) as 0.25 | 0.375 | 0.5 })}
          >
            <option value={0.25}>¼" (6.4 mm)</option>
            <option value={0.375}>⅜" (9.5 mm)</option>
            <option value={0.5}>½" (12.7 mm)</option>
          </select>
          {errors['seamAllowance'] && (
            <p className="text-xs text-destructive">{errors['seamAllowance']}</p>
          )}
        </div>
      )}
      {isCard && (
        <p className="text-xs text-muted-foreground">
          The pleated card is hemmed, not seam-allowanced — set the hems in the Construction section.
        </p>
      )}
    </div>
  );
}
