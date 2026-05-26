import { useState } from 'react';
import { AppHeader } from '../components/layout/AppHeader.js';
import { PageShell } from '../components/layout/PageShell.js';
import { ToolRollPage } from '../components/tool-roll/ToolRollPage.js';
import { TriZipPage } from '../components/tri-zip-backpack/TriZipPage.js';
import { LandingPage } from '../components/landing/LandingPage.js';
import { useToolRollProject } from '../state/useToolRollProject.js';
import { useTriZipProject } from '../state/useTriZipProject.js';
import type { PatternEntry } from './patternRegistry.js';

type View = 'landing' | PatternEntry['route'];

export function App() {
  const [view, setView] = useState<View>('landing');
  const toolRollState = useToolRollProject();
  const triZipState = useTriZipProject();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b bg-background px-4 py-3 flex items-center justify-between">
        <button
          className="text-lg font-semibold tracking-tight hover:opacity-75 transition-opacity"
          onClick={() => setView('landing')}
        >
          StitchSmith
        </button>
        {view === 'tool-roll' && (
          <AppHeader
            project={toolRollState.project}
            layout={null}
            onImport={toolRollState.importProject}
            onReset={toolRollState.resetProject}
          />
        )}
      </header>
      <PageShell>
        {view === 'landing' && (
          <LandingPage onSelectPattern={(route: PatternEntry['route']) => setView(route)} />
        )}
        {view === 'tool-roll' && (
          <ToolRollPage
            project={toolRollState.project}
            addTool={toolRollState.addTool}
            updateTool={toolRollState.updateTool}
            duplicateTool={toolRollState.duplicateTool}
            deleteTool={toolRollState.deleteTool}
            moveToolUp={toolRollState.moveToolUp}
            moveToolDown={toolRollState.moveToolDown}
            updateSettings={toolRollState.updateSettings}
            setProject={toolRollState.setProject}
            storageWarning={toolRollState.storageWarning}
          />
        )}
        {view === 'tri-zip' && (
          <TriZipPage
            project={triZipState.project}
            updateInputs={triZipState.updateInputs}
            resetProject={triZipState.resetProject}
            importProject={triZipState.importProject}
          />
        )}
      </PageShell>
    </div>
  );
}
