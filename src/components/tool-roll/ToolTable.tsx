import type { ToolItem, ToolRollSettings } from '../../generators/tool-roll/types.js';
import { ToolEditorRow } from './ToolEditorRow.js';

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
  { key: 'order', label: 'Order' },
  { key: 'name', label: 'Name' },
  { key: 'width', label: `Width` },
  { key: 'thickness', label: 'Thickness' },
  { key: 'height', label: 'Height' },
  { key: 'visibleAmount', label: 'Visible Amount' },
  { key: 'pocketWidth', label: 'Pocket Width (calc.)' },
  { key: 'pocketDepth', label: 'Pocket Depth (calc.)' },
  { key: 'actions', label: 'Actions' },
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
  settings: _settings,
  units,
  onAddTool,
  onUpdateTool,
  onDuplicateTool,
  onDeleteTool,
  onMoveToolUp,
  onMoveToolDown,
}: ToolTableProps) {
  const unitLabel = units === 'mm' ? '(mm)' : '(in)';

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
                  className="text-left text-xs font-medium text-muted-foreground px-2 py-1.5 whitespace-nowrap"
                >
                  {col.key !== 'order' && col.key !== 'name' && col.key !== 'actions'
                    ? `${col.label} ${unitLabel}`
                    : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tools.length === 0 ? (
              <tr>
                <td colSpan={COLUMN_HEADERS.length} className="text-center py-6 text-muted-foreground text-xs">
                  No tools added yet. Click "Add Tool" to get started.
                </td>
              </tr>
            ) : (
              tools.map((tool, index) => (
                <ToolEditorRow
                  key={tool.id}
                  tool={tool}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === tools.length - 1}
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
