import { useMemo } from 'react';
import type { UseToolRollProjectReturn } from '../../state/useToolRollProject.js';
import { calculateToolRollLayout } from '../../generators/tool-roll/calculateToolRollLayout.js';
import type { ToolRollLayout } from '../../generators/tool-roll/types.js';
import { ToolTable, makeDefaultTool } from './ToolTable.js';
import { ToolRollSettingsPanel } from './ToolRollSettingsPanel.js';
import { PatternSummary } from './PatternSummary.js';
import { WarningsPanel } from './WarningsPanel.js';
import { ConstructionNotes } from './ConstructionNotes.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { exportFullSvg } from '../../export/exportSvg.js';
import { exportProjectJson } from '../../export/exportProjectJson.js';

type ToolRollPageProps = Pick<
  UseToolRollProjectReturn,
  | 'project'
  | 'addTool'
  | 'updateTool'
  | 'duplicateTool'
  | 'deleteTool'
  | 'moveToolUp'
  | 'moveToolDown'
  | 'updateSettings'
  | 'setProject'
  | 'storageWarning'
>;

export function ToolRollPage({
  project,
  addTool,
  updateTool,
  duplicateTool,
  deleteTool,
  moveToolUp,
  moveToolDown,
  updateSettings,
  setProject,
  storageWarning,
}: ToolRollPageProps) {
  const layout: ToolRollLayout | null = useMemo(() => {
    if (project.tools.length === 0) return null;
    try {
      return calculateToolRollLayout(project.tools, project.settings, project.units);
    } catch {
      return null;
    }
  }, [project.tools, project.settings, project.units]);

  const warnings = useMemo(() => {
    const ws = layout?.warnings ?? [];
    return storageWarning ? [storageWarning, ...ws] : ws;
  }, [layout, storageWarning]);

  function handleUnitsChange(u: 'mm' | 'in') {
    setProject({ ...project, units: u });
  }

  function handleAddTool() {
    addTool(makeDefaultTool());
  }

  function handleExportSvg() {
    if (layout) exportFullSvg(layout, project);
  }

  function handleExportJson() {
    exportProjectJson(project);
  }

  function handleToggleTileGrid() {
    updateSettings({ showTileGrid: !project.settings.showTileGrid });
  }

  return (
    <div className="flex flex-col gap-4 max-w-full">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{project.projectName}</h1>
          <p className="text-xs text-muted-foreground">Tool Roll Generator</p>
        </div>
      </div>

      {/* Responsive two-column layout: stacked on mobile, side-by-side on md+ */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Left column: settings (full-width mobile, fixed-width desktop) */}
        <div className="w-full md:w-72 md:shrink-0 space-y-3">
          <div className="rounded border border-border p-3">
            <h2 className="text-xs font-semibold mb-2">Settings</h2>
            <ToolRollSettingsPanel
              settings={project.settings}
              units={project.units}
              onUpdate={updateSettings}
              onUnitsChange={handleUnitsChange}
            />
          </div>
        </div>

        {/* Center column: tool table + pattern preview */}
        <div className="w-full md:flex-1 md:min-w-0 space-y-3">
          <ToolTable
            tools={project.tools}
            settings={project.settings}
            units={project.units}
            onAddTool={handleAddTool}
            onUpdateTool={updateTool}
            onDuplicateTool={duplicateTool}
            onDeleteTool={deleteTool}
            onMoveToolUp={moveToolUp}
            onMoveToolDown={moveToolDown}
          />

          {layout ? (
            <PatternPreview
              layout={layout}
              settings={project.settings}
              onToggleTileGrid={handleToggleTileGrid}
            />
          ) : (
            <div className="rounded border border-dashed border-border p-6 flex items-center justify-center bg-muted/20">
              <p className="text-xs text-muted-foreground">Add tools to see pattern preview.</p>
            </div>
          )}
        </div>

        {/* Right column: summary + warnings + notes + export */}
        <div className="w-full md:w-64 md:shrink-0 space-y-3">
          <PatternSummary
            layout={layout}
            toolCount={project.tools.length}
            units={project.units}
          />
          <WarningsPanel warnings={warnings} />
          <ConstructionNotes notes={layout?.constructionNotes ?? []} />
          <ExportPanel
            layout={layout}
            project={project}
            onExportSvg={handleExportSvg}
            onExportJson={handleExportJson}
          />
        </div>
      </div>
    </div>
  );
}
