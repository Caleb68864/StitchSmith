import { magazines, MAGAZINE_IDS } from '../../../generators/mag-pouch/magazines.js';
import type { MagazineSpec } from '../../../generators/mag-pouch/types.js';

interface Props {
  magazine: MagazineSpec;
  errors: Record<string, string>;
  onChange: (spec: MagazineSpec) => void;
}

export function MagazineSection({ magazine, errors, onChange }: Props) {
  const isCustom = magazine.mode === 'custom';

  function handlePresetChange(value: string) {
    if (value === '__custom__') {
      onChange({ mode: 'custom', units: 'in' });
    } else {
      onChange({ mode: 'predefined', presetId: value, units: 'in' });
    }
  }

  function handleDimensionChange(field: 'width' | 'thickness' | 'height', raw: string) {
    const num = parseFloat(raw);
    onChange({ ...magazine, mode: 'custom', [field]: Number.isFinite(num) ? num : undefined });
  }

  const selectValue = isCustom ? '__custom__' : (magazine.presetId ?? '');

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="mag-preset" className="text-xs font-medium">
          Predefined magazine
        </label>
        <select
          id="mag-preset"
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={selectValue}
          onChange={e => handlePresetChange(e.target.value)}
        >
          {MAGAZINE_IDS.map(id => (
            <option key={id} value={id}>
              {magazines[id].description}
            </option>
          ))}
          <option value="__custom__">Custom…</option>
        </select>
      </div>

      {isCustom && (
        <div className="space-y-2 border-l-2 border-muted pl-3">
          <p className="text-xs text-muted-foreground">Enter custom magazine dimensions (inches):</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label htmlFor="mag-width" className="text-xs font-medium">Width (in)</label>
              <input
                id="mag-width"
                type="number"
                step="0.01"
                min="0.01"
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={magazine.width ?? ''}
                onChange={e => handleDimensionChange('width', e.target.value)}
                placeholder="e.g. 2.55"
              />
              {errors['width'] && (
                <p className="text-xs text-destructive">{errors['width']}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="mag-thickness" className="text-xs font-medium">Thickness (in)</label>
              <input
                id="mag-thickness"
                type="number"
                step="0.01"
                min="0.01"
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={magazine.thickness ?? ''}
                onChange={e => handleDimensionChange('thickness', e.target.value)}
                placeholder="e.g. 1.05"
              />
              {errors['thickness'] && (
                <p className="text-xs text-destructive">{errors['thickness']}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="mag-height" className="text-xs font-medium">Height (in)</label>
              <input
                id="mag-height"
                type="number"
                step="0.01"
                min="0.01"
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={magazine.height ?? ''}
                onChange={e => handleDimensionChange('height', e.target.value)}
                placeholder="e.g. 9.0"
              />
              {errors['height'] && (
                <p className="text-xs text-destructive">{errors['height']}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {errors['presetId'] && (
        <p className="text-xs text-destructive">{errors['presetId']}</p>
      )}
    </div>
  );
}
