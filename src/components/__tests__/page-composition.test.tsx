/**
 * Sidebar composition after the shared-component migration: the same panels
 * in the same order on every page, reference material out of the way, and the
 * two pages with a richer bill of materials still showing it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import type { ComponentType } from 'react';

vi.mock('../../utils/download.js', () => ({ downloadTextFile: vi.fn(), downloadBlob: vi.fn() }));
import { PROJECT_HOOKS, type ProjectHookApi } from '../../state/index.js';
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

function Host({ useHook, Page }: { useHook: () => ProjectHookApi; Page: ComponentType<Record<string, unknown>> }) {
  const state = useHook();
  return <Page {...(state as unknown as Record<string, unknown>)} />;
}

function renderPage(id: string) {
  const entry = PROJECT_HOOKS.find((h) => h.generatorId === id)!;
  return render(<Host useHook={entry.useHook} Page={PAGES[id]} />);
}

describe('sidebar composition', () => {
  beforeEach(() => { localStorage.clear(); for (const h of PROJECT_HOOKS) h.reset(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  for (const entry of PROJECT_HOOKS) {
    if (!PAGES[entry.generatorId]) continue;
    it(`${entry.generatorId}: legend and steps start out of the way, export is above them`, () => {
      renderPage(entry.generatorId);

      // The legend is reference material: closed until asked for.
      const legend = screen.getByText(/^Legend/).closest('details') as HTMLDetailsElement;
      expect(legend.open, `${entry.generatorId}: the legend opens by default`).toBe(false);

      // The export panel comes before the steps in reading order.
      const panel = screen.getByTestId('export-panel');
      const steps = screen.queryByText(/Assembly Instructions|Construction steps/);
      if (steps) {
        expect(panel.compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    });
  }

  it('a long step list starts collapsed and a short one does not', () => {
    renderPage('lbv');
    const long = screen.getByText(/Assembly Instructions|Construction steps/).closest('details') as HTMLDetailsElement;
    expect(long.open).toBe(false);
    cleanup();
    localStorage.clear();

    renderPage('sling');
    const sling = screen.getByText(/Assembly Instructions|Construction steps/).closest('details') as HTMLDetailsElement;
    const count = Number(/\((\d+) step/.exec(sling.textContent ?? '')?.[1] ?? '0');
    expect(sling.open).toBe(count <= 6);
  });

  it('remembers a panel the user opened', () => {
    renderPage('organizer');
    const legend = screen.getByText(/^Legend/).closest('details') as HTMLDetailsElement;
    legend.open = true;
    fireEvent(legend, new Event('toggle'));
    cleanup();

    renderPage('organizer');
    expect((screen.getByText(/^Legend/).closest('details') as HTMLDetailsElement).open).toBe(true);
  });
});

describe('the pattern preview keeps a light surface in either theme', () => {
  beforeEach(() => { localStorage.clear(); for (const h of PROJECT_HOOKS) h.reset(); });
  afterEach(() => { document.documentElement.classList.remove('dark'); cleanup(); vi.restoreAllMocks(); });

  it('paints paper white and never flips the canvas with the theme', () => {
    document.documentElement.classList.add('dark');
    renderPage('organizer');
    const canvas = screen.getByTestId('pattern-preview-region').closest('div.rounded.border') as HTMLElement;
    expect(canvas.className).toContain('bg-white');
    // A `dark:` override here is what puts black cut lines on a black ground.
    const themed = [canvas, ...Array.from(canvas.querySelectorAll<HTMLElement>('*'))]
      .filter((el) => /dark:bg-/.test(el.className ?? ''))
      .map((el) => el.className);
    expect(themed, 'the preview surface follows the theme').toEqual([]);
  });
});

describe('the richer bills of materials survived the migration', () => {
  beforeEach(() => { localStorage.clear(); for (const h of PROJECT_HOOKS) h.reset(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('the Tri-Zip cut list lists its zipper and buckle hardware', () => {
    renderPage('tri-zip-backpack');
    fireEvent.click(screen.getByRole('button', { name: /^Cut List$/i }));
    const table = screen.getByTestId('engine-cut-list');
    expect(within(table).getByText(/zipper-coil/)).toBeTruthy();
    expect(within(table).getByText(/zipper-slider-locking/)).toBeTruthy();
  });

  it('the Mag Pouch keeps its own BOM with cut tags', () => {
    renderPage('mag-pouch');
    fireEvent.click(screen.getByRole('button', { name: /^Cut List$/i }));
    const panel = screen.getByTestId('export-panel');
    expect(within(panel).getAllByText(/trim after sew|cut to net|mock derived/i).length).toBeGreaterThan(0);
  });
});
