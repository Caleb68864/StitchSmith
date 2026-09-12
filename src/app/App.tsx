import { useState, useEffect, lazy, Suspense } from 'react';
import { AppHeader } from '../components/layout/AppHeader.js';
import { PageShell } from '../components/layout/PageShell.js';
import { LandingPage } from '../components/landing/LandingPage.js';
import { GeneratorSwitcher } from '../components/landing/GeneratorSwitcher.js';
import { pushRecent } from '../components/landing/recent.js';
import { PATTERNS } from './patternRegistry.js';
import { useToolRollProject } from '../state/useToolRollProject.js';
import { useTriZipProject } from '../state/useTriZipProject.js';
import { useRollTopSackProject } from '../state/useRollTopSackProject.js';
import { useMagPouchProject } from '../state/useMagPouchProject.js';
import { useBookCoverProject } from '../state/useBookCoverProject.js';
import { useZipPouchProject } from '../state/useZipPouchProject.js';
import { useCircleSkirtProject } from '../state/useCircleSkirtProject.js';
import { usePaddedStrapProject } from '../state/usePaddedStrapProject.js';
import { useMicroRigProject } from '../state/useMicroRigProject.js';
import { useSlingProject } from '../state/useSlingProject.js';
import { useOrganizerProject } from '../state/useOrganizerProject.js';
import { useLbvProject } from '../state/useLbvProject.js';
import { usePlateCarrierProject } from '../state/usePlateCarrierProject.js';
import { useClamshellPackProject } from '../state/useClamshellPackProject.js';
import { useFannyPackProject } from '../state/useFannyPackProject.js';
import { Toaster } from '../components/shared/Toaster.js';
import { ErrorBoundary } from '../components/shared/ErrorBoundary.js';
import type { PatternEntry } from './patternRegistry.js';

// Lazy-load each generator page so its heavy deps (buildPattern, SettingsPanel,
// ExportPanel, PatternPreview) are split into separate chunks and not parsed on
// initial load for users who never visit that generator.
const ToolRollPage = lazy(() =>
  import('../components/tool-roll/ToolRollPage.js').then(m => ({ default: m.ToolRollPage }))
);
const TriZipPage = lazy(() =>
  import('../components/tri-zip-backpack/TriZipPage.js').then(m => ({ default: m.TriZipPage }))
);
const RollTopSackPage = lazy(() =>
  import('../components/roll-top-sack/RollTopSackPage.js').then(m => ({ default: m.RollTopSackPage }))
);
const MagPouchPage = lazy(() =>
  import('../components/mag-pouch/MagPouchPage.js').then(m => ({ default: m.MagPouchPage }))
);
const BookCoverPage = lazy(() =>
  import('../components/book-cover/BookCoverPage.js').then(m => ({ default: m.BookCoverPage }))
);
const ZipPouchPage = lazy(() =>
  import('../components/zip-pouch/ZipPouchPage.js').then(m => ({ default: m.ZipPouchPage }))
);
const CircleSkirtPage = lazy(() =>
  import('../components/circle-skirt/CircleSkirtPage.js').then(m => ({ default: m.CircleSkirtPage }))
);
const PaddedStrapPage = lazy(() =>
  import('../components/padded-strap/PaddedStrapPage.js').then(m => ({ default: m.PaddedStrapPage }))
);
const MicroRigPage = lazy(() =>
  import('../components/micro-rig/MicroRigPage.js').then(m => ({ default: m.MicroRigPage }))
);
const SlingPage = lazy(() =>
  import('../components/sling/SlingPage.js').then(m => ({ default: m.SlingPage }))
);
const OrganizerPage = lazy(() =>
  import('../components/organizer/OrganizerPage.js').then(m => ({ default: m.OrganizerPage }))
);
const LbvPage = lazy(() =>
  import('../components/lbv/LbvPage.js').then(m => ({ default: m.LbvPage }))
);
const PlateCarrierPage = lazy(() =>
  import('../components/plate-carrier/PlateCarrierPage.js').then(m => ({ default: m.PlateCarrierPage }))
);
const ClamshellPackPage = lazy(() =>
  import('../components/clamshell-pack/ClamshellPackPage.js').then(m => ({ default: m.ClamshellPackPage }))
);
const FannyPackPage = lazy(() =>
  import('../components/fanny-pack/FannyPackPage.js').then(m => ({ default: m.FannyPackPage }))
);

// Tab title per view so users with multiple tabs can tell them apart.
/** Header chrome subtitle for the generator pages that share the plain header. */
const HEADER_SUBTITLES: Partial<Record<View, string>> = {
  'tri-zip': 'Tri-Zip Backpack Generator',
  'roll-top': 'Roll-Top Stuff Sack Generator',
  'mag-pouch': 'Mag Pouch Generator',
  'book-cover': 'Book Cover Generator',
  'zip-pouch': 'Zip Pouch Generator',
  'circle-skirt': 'Circle Skirt Generator',
  'padded-strap': 'Padded Strap Generator',
  'micro-rig': 'Micro Rig Generator',
  'sling': 'Padded Sling Generator',
  'organizer': 'Tactical Organizer Generator',
  'fanny-pack': 'Fanny Pack Generator',
  'clamshell-pack': 'Clamshell Pack Generator',
  'plate-carrier': 'Plate Carrier Generator',
  'lbv': 'Modular LBV Generator',
};

const VIEW_TITLES: Record<View, string> = {
  landing: 'StitchSmith',
  'tool-roll': 'StitchSmith — Tool Roll',
  'tri-zip': 'StitchSmith — Tri-Zip Backpack',
  'roll-top': 'StitchSmith — Roll-Top Stuff Sack',
  'mag-pouch': 'StitchSmith — Mag Pouch',
  'book-cover': 'StitchSmith — Book Cover',
  'zip-pouch': 'StitchSmith — Zip Pouch',
  'circle-skirt': 'StitchSmith — Circle Skirt',
  'padded-strap': 'StitchSmith — Padded Strap',
  'micro-rig': 'StitchSmith — Micro Rig',
  'sling': 'StitchSmith — Padded Sling',
  'organizer': 'StitchSmith — Tactical Organizer',
  'lbv': 'StitchSmith — Modular LBV',
  'plate-carrier': 'StitchSmith — Plate Carrier',
  'clamshell-pack': 'StitchSmith — Clamshell Pack',
  'fanny-pack': 'StitchSmith — Fanny Pack',
};

type View = 'landing' | PatternEntry['route'];

/**
 * The open generator lives in the URL hash (#/mag-pouch), so refreshing keeps
 * your place, Back goes to the previous generator instead of leaving the site,
 * and a link to a generator can be shared. Unknown hashes fall back to the
 * landing page rather than a blank screen.
 */
function routeFromHash(hash: string): View {
  const slug = hash.replace(/^#\/?/, '');
  if (!slug) return 'landing';
  return PATTERNS.some((p) => p.route === slug) ? (slug as View) : 'landing';
}

function hashFromRoute(view: View): string {
  return view === 'landing' ? '#/' : `#/${view}`;
}

export function App() {
  const [view, setView] = useState<View>(() =>
    typeof window === 'undefined' ? 'landing' : routeFromHash(window.location.hash),
  );
  const toolRollState = useToolRollProject();
  const triZipState = useTriZipProject();
  const rollTopState = useRollTopSackProject();
  const magPouchState = useMagPouchProject();
  const bookCoverState = useBookCoverProject();
  const zipPouchState = useZipPouchProject();
  const circleSkirtState = useCircleSkirtProject();
  const paddedStrapState = usePaddedStrapProject();
  const microRigState = useMicroRigProject();
  const slingState = useSlingProject();
  const organizerState = useOrganizerProject();
  const lbvState = useLbvProject();
  const plate_carrierState = usePlateCarrierProject();
  const clamshell_packState = useClamshellPackProject();
  const fanny_packState = useFannyPackProject();

  useEffect(() => {
    document.title = VIEW_TITLES[view] ?? 'StitchSmith';
  }, [view]);

  // Back and Forward move between generators.
  useEffect(() => {
    const onHashChange = () => setView(routeFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Keep the hash in step with the view without adding a history entry for the
  // initial render (a plain assignment on mount would push one).
  useEffect(() => {
    const want = hashFromRoute(view);
    if (window.location.hash === want) return;
    if (routeFromHash(window.location.hash) === view) return;
    window.history.pushState(null, '', want);
  }, [view]);

  function openPattern(route: PatternEntry['route']) {
    const entry = PATTERNS.find((p) => p.route === route);
    if (entry) pushRecent(entry.id);
    setView(route);
  }

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
      ) : (
        <header className="border-b bg-background px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="text-lg font-semibold tracking-tight hover:opacity-75 transition-opacity shrink-0"
              onClick={() => setView('landing')}
              aria-label="Back to home"
            >
              StitchSmith
            </button>
            {/* The switcher already names the generator, so the subtitle is the
                first thing to go when the header runs out of room. */}
            <span className="hidden md:inline text-xs text-muted-foreground truncate">{HEADER_SUBTITLES[view] ?? 'Pattern Generator'}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <GeneratorSwitcher current={view} onSelect={openPattern} />
            <button
              type="button"
              onClick={() => setView('landing')}
              className="hidden sm:block h-7 rounded-md border border-input px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              All generators
            </button>
          </div>
        </header>
      )}
      <PageShell>
        {/* Keying on `view` resets the boundary's error state when the user
            navigates away from a crashed page — otherwise the error sticks
            until full reload. */}
        <ErrorBoundary key={view}>
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        }>
        {view === 'landing' && (
          <LandingPage onSelectPattern={openPattern} />
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
        {view === 'zip-pouch' && (
          <ZipPouchPage
            project={zipPouchState.project}
            updateInputs={zipPouchState.updateInputs}
            resetProject={zipPouchState.resetProject}
            importProject={zipPouchState.importProject}
          />
        )}
        {view === 'circle-skirt' && (
          <CircleSkirtPage
            project={circleSkirtState.project}
            updateInputs={circleSkirtState.updateInputs}
            resetProject={circleSkirtState.resetProject}
            importProject={circleSkirtState.importProject}
          />
        )}
        {view === 'padded-strap' && (
          <PaddedStrapPage
            project={paddedStrapState.project}
            updateInputs={paddedStrapState.updateInputs}
            resetProject={paddedStrapState.resetProject}
            importProject={paddedStrapState.importProject}
          />
        )}
        {view === 'micro-rig' && (
          <MicroRigPage
            project={microRigState.project}
            updateInputs={microRigState.updateInputs}
            resetProject={microRigState.resetProject}
            importProject={microRigState.importProject}
          />
        )}
        {view === 'sling' && (
          <SlingPage
            project={slingState.project}
            updateInputs={slingState.updateInputs}
            resetProject={slingState.resetProject}
            importProject={slingState.importProject}
          />
        )}
        {view === 'organizer' && (
          <OrganizerPage
            project={organizerState.project}
            updateInputs={organizerState.updateInputs}
            resetProject={organizerState.resetProject}
            importProject={organizerState.importProject}
          />
        )}
        {view === 'lbv' && (
          <LbvPage
            project={lbvState.project}
            updateInputs={lbvState.updateInputs}
            resetProject={lbvState.resetProject}
            importProject={lbvState.importProject}
          />
        )}
        {view === 'plate-carrier' && (
          <PlateCarrierPage
            project={plate_carrierState.project}
            updateInputs={plate_carrierState.updateInputs}
            resetProject={plate_carrierState.resetProject}
            importProject={plate_carrierState.importProject}
          />
        )}
        {view === 'clamshell-pack' && (
          <ClamshellPackPage
            project={clamshell_packState.project}
            updateInputs={clamshell_packState.updateInputs}
            resetProject={clamshell_packState.resetProject}
            importProject={clamshell_packState.importProject}
          />
        )}
        {view === 'fanny-pack' && (
          <FannyPackPage
            project={fanny_packState.project}
            updateInputs={fanny_packState.updateInputs}
            resetProject={fanny_packState.resetProject}
            importProject={fanny_packState.importProject}
          />
        )}
        </Suspense>
        </ErrorBoundary>
      </PageShell>
      <Toaster />
    </div>
  );
}
