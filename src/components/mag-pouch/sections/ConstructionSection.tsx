import type { MagPouchInputs, MagPouchConstruction, BottomStyle } from '../../../generators/mag-pouch/types.js';
import type { MagPouchDerived } from '../../../generators/mag-pouch/types.js';
import {
  DEFAULT_CELL_COUNT,
  DEFAULT_BACK_HEM_IN,
  DEFAULT_FACE_END_HEM_IN,
  DEFAULT_BOTTOM_STYLE,
} from '../../../generators/mag-pouch/defaults.js';
import { MAX_CELL_COUNT } from '../../../generators/mag-pouch/inputs.js';

interface Props {
  inputs: MagPouchInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<MagPouchInputs>) => void;
  /** Derived numbers from the last successful build, for the hint text. */
  derived?: MagPouchDerived | null;
}

const CONSTRUCTION_OPTIONS: { value: MagPouchConstruction; label: string; description: string }[] = [
  {
    value: 'folded_t',
    label: 'Folded-T single pouch',
    description: 'One piece: front, bottom, back and lid in a folded cross; wings wrap the sides. Seam-allowance construction.',
  },
  {
    value: 'pleated_card',
    label: 'Pleated card (SOE)',
    description: 'Hemmed back panel + folded double face pleated into cells, loop on both walls, cradles under each mag. 1 to 8 cells.',
  },
];

const BOTTOM_OPTIONS: { value: BottomStyle; label: string; description: string }[] = [
  { value: 'cradle', label: 'Webbing cradle', description: '1" strip under each mag. Lowest ride, primers covered. What SOE ships.' },
  { value: 'pleat', label: 'Pinched pleat', description: 'Sealed bottom. Costs 1"–1.5" of ride height and 12–14 layers at the pleat.' },
  { value: 'open', label: 'Open', description: 'No bottom. Needs a wedge or Velcro dot; primers exposed.' },
];

function numberOrUndefined(raw: string): number | undefined {
  if (raw === '') return undefined;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function ConstructionSection({ inputs, errors, onChange, derived }: Props) {
  const construction = inputs.construction ?? 'folded_t';
  const isCard = construction === 'pleated_card';
  const isPals = inputs.attachment === 'pals' || inputs.attachment === 'molle';
  const currentConstruction = CONSTRUCTION_OPTIONS.find(o => o.value === construction);
  const bottom = inputs.bottom_style ?? DEFAULT_BOTTOM_STYLE;
  const currentBottom = BOTTOM_OPTIONS.find(o => o.value === bottom);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="construction" className="text-xs font-medium">Construction</label>
        <select
          id="construction"
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={construction}
          onChange={e => {
            const next = e.target.value as MagPouchConstruction;
            const changes: Partial<MagPouchInputs> = { construction: next };
            if (next === 'folded_t') changes.cell_count = 1;
            onChange(changes);
          }}
        >
          {CONSTRUCTION_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {currentConstruction && <p className="text-xs text-muted-foreground">{currentConstruction.description}</p>}
        {errors['construction'] && <p className="text-xs text-destructive">{errors['construction']}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="cell-count" className="text-xs font-medium">Cells</label>
          <input
            id="cell-count"
            type="number"
            step="1"
            min="1"
            max={MAX_CELL_COUNT}
            disabled={!isCard}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            value={inputs.cell_count ?? DEFAULT_CELL_COUNT}
            onChange={e => onChange({ cell_count: parseInt(e.target.value, 10) })}
            aria-invalid={errors['cell_count'] ? true : undefined}
            aria-describedby={`${errors['cell_count'] ? 'cell-count-error ' : ''}cell-count-help`}
          />
          {!isCard && <p id="cell-count-help" className="text-xs text-muted-foreground">Folded-T is a single cell.</p>}
          {errors['cell_count'] && <p id="cell-count-error" className="text-xs text-destructive">{errors['cell_count']}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="cell-span" className="text-xs font-medium">Cell span (in) — override</label>
          <input
            id="cell-span"
            type="number"
            step="0.25"
            min="1"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={inputs.cell_span ?? ''}
            placeholder={derived ? `${derived.cellSpanIn.toFixed(2)} derived` : 'derived'}
            onChange={e => onChange({ cell_span: numberOrUndefined(e.target.value) })}
            aria-invalid={errors['cell_span'] ? true : undefined}
            aria-describedby={`${errors['cell_span'] ? 'cell-span-error ' : ''}cell-span-help`}
          />
          <p id="cell-span-help" className="text-xs text-muted-foreground">
            {isPals
              ? 'PALS mounts snap to the 1.5" grid: 3" for a rifle mag (two columns). The grid, not the mag, sizes the cell.'
              : 'Non-PALS mounts can run close to the mag: width + ease.'}
          </p>
          {errors['cell_span'] && <p id="cell-span-error" className="text-xs text-destructive">{errors['cell_span']}</p>}
        </div>
      </div>

      {isCard && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="face-per-cell" className="text-xs font-medium">Face per cell (in) — override</label>
              <input
                id="face-per-cell"
                type="number"
                step="0.125"
                min="1"
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={inputs.face_per_cell ?? ''}
                placeholder={derived?.facePerCellIn ? `${derived.facePerCellIn.toFixed(3)} derived` : 'derived'}
                onChange={e => onChange({ face_per_cell: numberOrUndefined(e.target.value) })}
                aria-invalid={errors['face_per_cell'] ? true : undefined}
                aria-describedby={`${errors['face_per_cell'] ? 'face-per-cell-error ' : ''}face-per-cell-help`}
              />
              <p id="face-per-cell-help" className="text-xs text-muted-foreground">
                Derived as mag width + 2 × thickness + 5/16". Pucker per side must stay above ~0.9".
                {derived?.puckerPerSideIn !== undefined && ` Currently ${derived.puckerPerSideIn.toFixed(2)}".`}
              </p>
              {errors['face_per_cell'] && <p id="face-per-cell-error" className="text-xs text-destructive">{errors['face_per_cell']}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="bottom-style" className="text-xs font-medium">Cell bottom</label>
              <select
                id="bottom-style"
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={bottom}
                onChange={e => onChange({ bottom_style: e.target.value as BottomStyle })}
              >
                {BOTTOM_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {currentBottom && <p className="text-xs text-muted-foreground">{currentBottom.description}</p>}
              {errors['bottom_style'] && <p className="text-xs text-destructive">{errors['bottom_style']}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="back-hem" className="text-xs font-medium">Back hem (in)</label>
              <input
                id="back-hem"
                type="number"
                step="0.25"
                min="0.25"
                max="2"
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={inputs.back_hem ?? DEFAULT_BACK_HEM_IN}
                onChange={e => onChange({ back_hem: parseFloat(e.target.value) })}
                aria-invalid={errors['back_hem'] ? true : undefined}
                aria-describedby={`${errors['back_hem'] ? 'back-hem-error ' : ''}back-hem-help`}
              />
              <p id="back-hem-help" className="text-xs text-muted-foreground">1" is the production floor spec; ½" saves fabric on a one-off.</p>
              {errors['back_hem'] && <p id="back-hem-error" className="text-xs text-destructive">{errors['back_hem']}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="face-end-hem" className="text-xs font-medium">Face end hem (in)</label>
              <input
                id="face-end-hem"
                type="number"
                step="0.25"
                min="0.25"
                max="2"
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={inputs.face_end_hem ?? DEFAULT_FACE_END_HEM_IN}
                onChange={e => onChange({ face_end_hem: parseFloat(e.target.value) })}
                aria-invalid={errors['face_end_hem'] ? true : undefined}
                aria-describedby={errors['face_end_hem'] ? 'face-end-hem-error' : undefined}
              />
              {errors['face_end_hem'] && <p id="face-end-hem-error" className="text-xs text-destructive">{errors['face_end_hem']}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={inputs.face_pals ?? true}
                disabled={inputs.retention === 'open_top_bungee'}
                onChange={e => onChange({ face_pals: e.target.checked })}
              />
              <span>Face PALS bars (3 per cell) — required for bungee retention</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={inputs.interior_loop ?? true}
                disabled={inputs.retention === 'velcro_dot' || inputs.retention === 'kydex_wedge'}
                onChange={e => onChange({ interior_loop: e.target.checked })}
              />
              <span>Loop on both interior walls of every cell (accepts any retention later)</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={inputs.ak_face_hem ?? (derived?.platform === 'ak')}
                onChange={e => onChange({ ak_face_hem: e.target.checked })}
              />
              <span>Hem the face raw-edge meeting (+¾") — AK lug glide; cheap insurance on any platform</span>
            </label>
          </div>
        </>
      )}
    </div>
  );
}
