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
import { Legend } from './Legend.js';
import { ExportPanel } from './ExportPanel.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { exportFullSvg } from '../../export/exportSvg.js';
import { exportProjectJson } from '../../export/exportProjectJson.js';
import { exportPrintableHtml } from '../../export/exportPrintableHtml.js';

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

  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Tool Roll Generator"
      settings={
        <div className="rounded border border-border p-3">
          <h2 className="text-xs font-semibold mb-2">Settings</h2>
          <ToolRollSettingsPanel
            settings={project.settings}
            units={project.units}
            onUpdate={updateSettings}
            onUnitsChange={(u) => setProject({ ...project, units: u })}
          />
        </div>
      }
      preview={
        <div className="space-y-3">
          <ToolTable
            tools={project.tools}
            settings={project.settings}
            units={project.units}
            onAddTool={() => addTool(makeDefaultTool())}
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
              onToggleTileGrid={() => updateSettings({ showTileGrid: !project.settings.showTileGrid })}
            />
          ) : (
            <div className="rounded border border-dashed border-border p-6 flex items-center justify-center bg-muted/20">
              <p className="text-xs text-muted-foreground">Add tools to see pattern preview.</p>
            </div>
          )}
        </div>
      }
      sidebar={
        <>
          <Legend settings={project.settings} />
          <ExportPanel
            layout={layout}
            project={project}
            onExportSvg={() => layout && exportFullSvg(layout, project)}
            onExportJson={() => exportProjectJson(project)}
            onExportPrintableHtml={() => layout && exportPrintableHtml(layout, project)}
          />
          <PatternSummary
            layout={layout}
            toolCount={project.tools.length}
            units={project.units}
          />
          <WarningsPanel warnings={warnings} />
          <ConstructionNotes notes={layout?.constructionNotes ?? []} />
        </>
      }
    />
  );
}
