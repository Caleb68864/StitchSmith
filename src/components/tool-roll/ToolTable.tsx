import { useMemo } from 'react';
import type { ToolItem, ToolRollSettings } from '../../generators/tool-roll/types.js';
import { ToolEditorRow } from './ToolEditorRow.js';
import { sortTools } from '../../generators/tool-roll/geometry.js';

interface ToolTableProps {
  tools: ToolItem[];
  settings: ToolRollSettings;
  units: 'mm' | 'in';
  onAddTool: () => void;
  onUpdateTool: (id: string, changes: Partial<Omit<ToolItem, 'id'>>) => void;
  onDuplicateTool: (id: string) => void;
  onDeleteTool: (id: string) => void;
  onMoveToolUp: (id: string) => void;
  onMoveToolDown: (id: string) => void;
}

const COLUMN_HEADERS = [
  { key: 'order', label: 'Order', tip: 'Row number in the current sort order.' },
  { key: 'name', label: 'Name', tip: 'Tool name. Shown on the pocket label in the preview and exports.' },
  { key: 'width', label: `Width`, tip: 'Tool width at the point where it sits in the pocket (e.g. wrench-head width). Pocket width = this + side gap × 2 + thickness × ease factor.' },
  { key: 'thickness', label: 'Thickness', tip: 'Tool thickness. Used to add ease to the pocket width so a thicker tool isn’t pinched.' },
  { key: 'height', label: 'Height', tip: 'Total tool height. Pocket depth (% mode) is a fraction of this.' },
  { key: 'visibleAmount', label: 'Visible Amount', tip: 'How much of the tool sticks up out of the pocket (only used when Pocket depth mode = Visible amount).' },
  { key: 'pocketWidth', label: 'Pocket Width (calc.)', tip: 'Calculated pocket width (read-only). Updates as you change settings.' },
  { key: 'pocketDepth', label: 'Pocket Depth (calc.)', tip: 'Calculated pocket depth (read-only). Updates as you change settings.' },
  { key: 'actions', label: 'Actions', tip: 'Move up / move down (manual sort only), duplicate, delete.' },
];

function makeDefaultTool(): Omit<ToolItem, 'id'> {
  return {
    name: 'New Tool',
    width: 20,
    thickness: 5,
    height: 150,
    visibleAmount: 40,
  };
}

export function ToolTable({
  tools,
  settings,
  units,
  onAddTool,
  onUpdateTool,
  onDuplicateTool,
  onDeleteTool,
  onMoveToolUp,
  onMoveToolDown,
}: ToolTableProps) {
  const unitLabel = units === 'mm' ? '(mm)' : '(in)';
  // Display tools in the active sort order. Manual mode preserves user-assigned order.
  const displayTools = useMemo(
    () => (settings.sortMode === 'manual' ? tools : sortTools(tools, settings)),
    [tools, settings],
  );
  const arrowsActive = settings.sortMode === 'manual';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Tools</h2>
        <button
          className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={onAddTool}
        >
          + Add Tool
        </button>
      </div>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              {COLUMN_HEADERS.map(col => (
                <th
                  key={col.key}
                  className={
                    'text-left text-xs font-medium text-muted-foreground px-2 py-1.5 whitespace-nowrap ' +
                    (col.tip ? 'cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2' : '')
                  }
                  title={col.tip}
                >
                  {col.key !== 'order' && col.key !== 'name' && col.key !== 'actions'
                    ? `${col.label} ${unitLabel}`
                    : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayTools.length === 0 ? (
              <tr>
                <td colSpan={COLUMN_HEADERS.length} className="text-center py-6 text-muted-foreground text-xs">
                  No tools added yet. Click "Add Tool" to get started.
                </td>
              </tr>
            ) : (
              displayTools.map((tool, index) => (
                <ToolEditorRow
                  key={tool.id}
                  tool={tool}
                  index={index}
                  isFirst={index === 0 || !arrowsActive}
                  isLast={index === displayTools.length - 1 || !arrowsActive}
                  units={units}
                  onUpdate={onUpdateTool}
                  onDuplicate={onDuplicateTool}
                  onDelete={onDeleteTool}
                  onMoveUp={onMoveToolUp}
                  onMoveDown={onMoveToolDown}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      {tools.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {tools.length} tool{tools.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

export { makeDefaultTool };
