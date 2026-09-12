/**
 * Every page must degrade honestly when the inputs stop being valid: an
 * explanation in place of the drawing, exports that cannot write a broken
 * file, and no stale pattern left over from before the error.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useState, type ComponentType } from 'react';

vi.mock('../../utils/download.js', () => ({
  downloadTextFile: vi.fn(),
  downloadBlob: vi.fn(),
}));
import { downloadTextFile } from '../../utils/download.js';
import { PROJECT_HOOKS, type ProjectEnvelope } from '../../state/index.js';
import { BookCoverPage } from '../book-cover/BookCoverPage.js';
import { CircleSkirtPage } from '../circle-skirt/CircleSkirtPage.js';
import { ClamshellPackPage } from '../clamshell-pack/ClamshellPackPage.js';
import { FannyPackPage } from '../fanny-pack/FannyPackPage.js';
import { LbvPage } from '../lbv/LbvPage.js';
import { MagPouchPage } from '../mag-pouch/MagPouchPage.js';
import { MicroRigPage } from '../micro-rig/MicroRigPage.js';
import { OrganizerPage } from '../organizer/OrganizerPage.js';
import { PaddedStrapPage } from '../padded-strap/PaddedStrapPage.js';
import { PlateCarrierPage } from '../plate-carrier/PlateCarrierPage.js';
import { RollTopSackPage } from '../roll-top-sack/RollTopSackPage.js';
import { SlingPage } from '../sling/SlingPage.js';
import { TriZipPage } from '../tri-zip-backpack/TriZipPage.js';
import { ZipPouchPage } from '../zip-pouch/ZipPouchPage.js';

const textDownload = downloadTextFile as unknown as ReturnType<typeof vi.fn>;

const PAGES: Record<string, ComponentType<Record<string, unknown>>> = {
  'book-cover': BookCoverPage as never,
  'circle-skirt': CircleSkirtPage as never,
  'clamshell-pack': ClamshellPackPage as never,
  'fanny-pack': FannyPackPage as never,
  'lbv': LbvPage as never,
  'mag-pouch': MagPouchPage as never,
  'micro-rig': MicroRigPage as never,
  'organizer': OrganizerPage as never,
  'padded-strap': PaddedStrapPage as never,
  'plate-carrier': PlateCarrierPage as never,
  'roll-top-sack': RollTopSackPage as never,
  'sling': SlingPage as never,
  'tri-zip-backpack': TriZipPage as never,
  'zip-pouch': ZipPouchPage as never,
};

/** A page driven from a project the test controls, so it can be broken on demand. */
function Host({ Page, initial, breakInputs }: { Page: ComponentType<Record<string, unknown>>; initial: ProjectEnvelope; breakInputs: Record<string, unknown> }) {
  const [project, setProject] = useState(initial);
  const props = {
    project,
    updateInputs: (changes: Record<string, unknown>) => setProject((p) => ({ ...p, inputs: { ...p.inputs, ...changes } })),
    resetProject: () => setProject(initial),
    importProject: (p: ProjectEnvelope) => setProject(p),
    toggleOuterPocket: () => {}, toggleInnerPocket: () => {}, togglePenHolder: () => {}, toggleLining: () => {},
    toggleCardSlots: () => {}, toggleBookmarkRibbon: () => {}, toggleInternalZipPocket: () => {}, toggleMeshPocket: () => {}, toggleTactical: () => {},
  };
  return (
    <>
      <button onClick={() => setProject((p) => ({ ...p, inputs: { ...p.inputs, ...breakInputs } }))}>break-inputs</button>
      <Page {...(props as unknown as Record<string, unknown>)} />
    </>
  );
}

/** First numeric input in the defaults — set to NaN it must fail every generator's validation. */
function firstNumericKey(inputs: Record<string, unknown>): string {
  const key = Object.keys(inputs).find((k) => typeof inputs[k] === 'number');
  if (!key) throw new Error('no numeric input to break');
  return key;
}

describe('pages degrade when the inputs go invalid', () => {
  beforeEach(() => { textDownload.mockReset(); localStorage.clear(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  for (const entry of PROJECT_HOOKS) {
    const Page = PAGES[entry.generatorId];
    if (!Page) continue;

    it(`${entry.generatorId}: shows an explanation, hides the stale drawing and blocks exports`, () => {
      const initial = entry.makeDefault();
      const key = firstNumericKey(initial.inputs);
      render(<Host Page={Page} initial={initial} breakInputs={{ [key]: NaN }} />);

      // Healthy first: the drawing is on screen.
      expect(screen.getByTestId('pattern-preview-region')).toBeTruthy();
      const before = textDownload.mock.calls.length;

      fireEvent.click(screen.getByRole('button', { name: 'break-inputs' }));

      // The drawing is replaced by an explanation, not left stale or blank.
      expect(screen.queryByTestId('pattern-preview-region'), `${entry.generatorId} (${key}) still shows the old drawing`).toBeNull();
      const placeholder = screen.queryByTestId('pattern-preview-placeholder');
      expect(placeholder ?? screen.queryByText(/Pattern build failed/i), `${entry.generatorId} shows nothing in place of the pattern`).toBeTruthy();

      // Every export is disabled, and pressing one writes nothing.
      for (const name of [/^SVG$/i, /Cut sheets by material/i, /^PDF$/i, /^DXF$/i, /^Cut List$/i, /^CSV$/i]) {
        const button = screen.getByRole('button', { name });
        expect((button as HTMLButtonElement).disabled, `${entry.generatorId}: ${name} still enabled`).toBe(true);
        fireEvent.click(button);
      }
      expect(textDownload.mock.calls.length, `${entry.generatorId} wrote a file while invalid`).toBe(before);
      expect(screen.getByText(/Fix validation errors to enable exports/i)).toBeTruthy();
    });
  }
});
