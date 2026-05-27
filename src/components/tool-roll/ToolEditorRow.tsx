import type { ToolItem } from '../../generators/tool-roll/types.js';
import { Input } from '../ui/input.js';

interface ToolEditorRowProps {
  tool: ToolItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  units: 'mm' | 'in';
  onUpdate: (id: string, changes: Partial<Omit<ToolItem, 'id'>>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

type NumericField = 'width' | 'thickness' | 'height' | 'visibleAmount';

function validateField(field: NumericField, value: number, tool: ToolItem): string | null {
  if (!isFinite(value) || value < 0) return 'Must be ≥ 0';
  if (field === 'height' && value <= 0) return 'Must be > 0';
  if (field === 'visibleAmount' && value >= tool.height) return 'Must be < height';
  return null;
}

function displayValue(val: number, units: 'mm' | 'in'): string {
  if (units === 'in') return (val / 25.4).toFixed(3);
  return val.toFixed(1);
}

function parseInput(raw: string, units: 'mm' | 'in'): number {
  const n = parseFloat(raw);
  if (!isFinite(n)) return NaN;
  return units === 'in' ? n * 25.4 : n;
}

function calculatePocketWidth(tool: ToolItem): number {
  return tool.width + tool.thickness * 0.5 + 3;
}

function calculatePocketDepth(tool: ToolItem): number {
  return tool.height - tool.visibleAmount;
}

export function ToolEditorRow({
  tool,
  index,
  isFirst,
  isLast,
  units,
  onUpdate,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ToolEditorRowProps) {
  const numericFields: NumericField[] = ['width', 'thickness', 'height', 'visibleAmount'];

  const errors: Partial<Record<NumericField, string>> = {};
  for (const f of numericFields) {
    const err = validateField(f, tool[f], tool);
    if (err) errors[f] = err;
  }

  function handleChange(field: NumericField, raw: string) {
    const val = parseInput(raw, units);
    if (isFinite(val)) onUpdate(tool.id, { [field]: val });
  }

  function handleNameChange(raw: string) {
    onUpdate(tool.id, { name: raw });
  }

  const pocketWidth = calculatePocketWidth(tool);
  const pocketDepth = calculatePocketDepth(tool);

  const cellClass = 'px-2 py-1 align-middle';
  const inputClass = 'h-7 text-xs w-20';

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className={cellClass}>
        <span className="text-xs text-muted-foreground">{index + 1}</span>
      </td>
      <td className={cellClass}>
        <Input
          className="h-7 text-xs w-28"
          value={tool.name}
          onChange={e => handleNameChange(e.target.value)}
          aria-label="Tool name"
        />
      </td>
      {numericFields.map(field => (
        <td key={field} className={cellClass}>
          <div>
            <Input
              className={`${inputClass}${errors[field] ? ' border-destructive' : ''}`}
              defaultValue={displayValue(tool[field], units)}
              key={`${tool.id}-${field}-${units}`}
              onBlur={e => handleChange(field, e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleChange(field, (e.target as HTMLInputElement).value); }}
              aria-label={field}
              inputMode="decimal"
            />
            {errors[field] && (
              <p className="text-destructive text-[10px] mt-0.5">{errors[field]}</p>
            )}
          </div>
        </td>
      ))}
      <td className={cellClass}>
        <span className="text-xs text-muted-foreground">
          {displayValue(pocketWidth, units)} {units}
        </span>
      </td>
      <td className={cellClass}>
        <span className="text-xs text-muted-foreground">
          {displayValue(pocketDepth, units)} {units}
        </span>
      </td>
      <td className={cellClass}>
        <div className="flex items-center gap-1">
          <button
            className="text-xs px-1.5 py-0.5 rounded hover:bg-muted disabled:opacity-30"
            disabled={isFirst}
            onClick={() => onMoveUp(tool.id)}
            aria-label="Move up"
            title="Move up"
          >▲</button>
          <button
            className="text-xs px-1.5 py-0.5 rounded hover:bg-muted disabled:opacity-30"
            disabled={isLast}
            onClick={() => onMoveDown(tool.id)}
            aria-label="Move down"
            title="Move down"
          >▼</button>
          <button
            className="text-xs px-1.5 py-0.5 rounded hover:bg-muted"
            onClick={() => onDuplicate(tool.id)}
            aria-label="Duplicate"
            title="Duplicate"
          >⧉</button>
          <button
            className="text-xs px-1.5 py-0.5 rounded hover:bg-destructive hover:text-destructive-foreground text-destructive"
            onClick={() => onDelete(tool.id)}
            aria-label="Delete"
            title="Delete"
          >✕</button>
        </div>
      </td>
    </tr>
  );
}
