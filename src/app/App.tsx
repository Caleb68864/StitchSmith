import { useMemo } from 'react';
import { AppHeader } from '../components/layout/AppHeader.js';
import { PageShell } from '../components/layout/PageShell.js';
import { ToolRollPage } from '../components/tool-roll/ToolRollPage.js';
import { useToolRollProject } from '../state/useToolRollProject.js';
import { calculateToolRollLayout } from '../generators/tool-roll/calculateToolRollLayout.js';
import type { ToolRollLayout } from '../generators/tool-roll/types.js';

export function App() {
  const state = useToolRollProject();
  const { project, resetProject, importProject } = state;

  const layout: ToolRollLayout | null = useMemo(() => {
    if (project.tools.length === 0) return null;
    try {
      return calculateToolRollLayout(project.tools, project.settings, project.units);
    } catch {
      return null;
    }
  }, [project.tools, project.settings, project.units]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader
        project={project}
        layout={layout}
        onImport={importProject}
        onReset={resetProject}
      />
      <PageShell>
        <ToolRollPage
          project={state.project}
          addTool={state.addTool}
          updateTool={state.updateTool}
          duplicateTool={state.duplicateTool}
          deleteTool={state.deleteTool}
          moveToolUp={state.moveToolUp}
          moveToolDown={state.moveToolDown}
          updateSettings={state.updateSettings}
          setProject={state.setProject}
          storageWarning={state.storageWarning}
        />
      </PageShell>
    </div>
  );
}
