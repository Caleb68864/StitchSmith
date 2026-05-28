import { useState } from 'react';
import { AppHeader } from '../components/layout/AppHeader.js';
import { PageShell } from '../components/layout/PageShell.js';
import { ToolRollPage } from '../components/tool-roll/ToolRollPage.js';
import { TriZipPage } from '../components/tri-zip-backpack/TriZipPage.js';
import { RollTopSackPage } from '../components/roll-top-sack/RollTopSackPage.js';
import { MagPouchPage } from '../components/mag-pouch/MagPouchPage.js';
import { BookCoverPage } from '../components/book-cover/BookCoverPage.js';
import { LandingPage } from '../components/landing/LandingPage.js';
import { useToolRollProject } from '../state/useToolRollProject.js';
import { useTriZipProject } from '../state/useTriZipProject.js';
import { useRollTopSackProject } from '../state/useRollTopSackProject.js';
import { useMagPouchProject } from '../state/useMagPouchProject.js';
import { useBookCoverProject } from '../state/useBookCoverProject.js';
import { Toaster } from '../components/shared/Toaster.js';
import type { PatternEntry } from './patternRegistry.js';

type View = 'landing' | PatternEntry['route'];

export function App() {
  const [view, setView] = useState<View>('landing');
  const toolRollState = useToolRollProject();
  const triZipState = useTriZipProject();
  const rollTopState = useRollTopSackProject();
  const magPouchState = useMagPouchProject();
  const bookCoverState = useBookCoverProject();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {view === 'landing' ? (
        <header className="border-b bg-background px-4 py-3">
          <span className="text-lg font-semibold tracking-tight">StitchSmith</span>
        </header>
      ) : view === 'tool-roll' ? (
        <AppHeader
          project={toolRollState.project}
          layout={null}
          onImport={toolRollState.importProject}
          onReset={toolRollState.resetProject}
          onHome={() => setView('landing')}
        />
      ) : view === 'tri-zip' ? (
        <header className="border-b bg-background px-4 py-3 flex items-center justify-between">
          <button
            className="text-lg font-semibold tracking-tight hover:opacity-75 transition-opacity"
            onClick={() => setView('landing')}
            aria-label="Back to home"
          >
            StitchSmith
          </button>
          <span className="text-xs text-muted-foreground">Tri-Zip Backpack Generator</span>
        </header>
      ) : view === 'roll-top' ? (
        <header className="border-b bg-background px-4 py-3 flex items-center justify-between">
          <button
            className="text-lg font-semibold tracking-tight hover:opacity-75 transition-opacity"
            onClick={() => setView('landing')}
            aria-label="Back to home"
          >
            StitchSmith
          </button>
          <span className="text-xs text-muted-foreground">Roll-Top Stuff Sack Generator</span>
        </header>
      ) : view === 'mag-pouch' ? (
        <header className="border-b bg-background px-4 py-3 flex items-center justify-between">
          <button
            className="text-lg font-semibold tracking-tight hover:opacity-75 transition-opacity"
            onClick={() => setView('landing')}
            aria-label="Back to home"
          >
            StitchSmith
          </button>
          <span className="text-xs text-muted-foreground">Mag Pouch Generator</span>
        </header>
      ) : (
        <header className="border-b bg-background px-4 py-3 flex items-center justify-between">
          <button
            className="text-lg font-semibold tracking-tight hover:opacity-75 transition-opacity"
            onClick={() => setView('landing')}
            aria-label="Back to home"
          >
            StitchSmith
          </button>
          <span className="text-xs text-muted-foreground">Book Cover Generator</span>
        </header>
      )}
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
        {view === 'roll-top' && (
          <RollTopSackPage
            project={rollTopState.project}
            updateInputs={rollTopState.updateInputs}
            resetProject={rollTopState.resetProject}
            importProject={rollTopState.importProject}
          />
        )}
        {view === 'mag-pouch' && (
          <MagPouchPage
            project={magPouchState.project}
            updateInputs={magPouchState.updateInputs}
            resetProject={magPouchState.resetProject}
            importProject={magPouchState.importProject}
          />
        )}
        {view === 'book-cover' && (
          <BookCoverPage
            project={bookCoverState.project}
            updateInputs={bookCoverState.updateInputs}
            resetProject={bookCoverState.resetProject}
            importProject={bookCoverState.importProject}
            toggleOuterPocket={bookCoverState.toggleOuterPocket}
            toggleInnerPocket={bookCoverState.toggleInnerPocket}
            togglePenHolder={bookCoverState.togglePenHolder}
            toggleLining={bookCoverState.toggleLining}
            toggleCardSlots={bookCoverState.toggleCardSlots}
            toggleBookmarkRibbon={bookCoverState.toggleBookmarkRibbon}
            toggleInternalZipPocket={bookCoverState.toggleInternalZipPocket}
            toggleMeshPocket={bookCoverState.toggleMeshPocket}
            toggleTactical={bookCoverState.toggleTactical}
          />
        )}
      </PageShell>
      <Toaster />
    </div>
  );
}
