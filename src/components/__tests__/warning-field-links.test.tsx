/**
 * A warning that names an input offers a link to that input. The link is
 * generated from the field name, so it is only worth showing when a control
 * actually answers to it — a dead "[side_seam_allowance]" that does nothing
 * when clicked is worse than no link at all.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ComponentType } from 'react';

vi.mock('../../utils/download.js', () => ({ downloadTextFile: vi.fn(), downloadBlob: vi.fn() }));
import { PROJECT_HOOKS, type ProjectHookApi } from '../../state/index.js';
import { WarningsPanel } from '../shared/WarningsPanel.js';
import { ClamshellPackPage } from '../clamshell-pack/ClamshellPackPage.js';
import { FannyPackPage } from '../fanny-pack/FannyPackPage.js';
import { LbvPage } from '../lbv/LbvPage.js';
import { OrganizerPage } from '../organizer/OrganizerPage.js';
import { PlateCarrierPage } from '../plate-carrier/PlateCarrierPage.js';
import { SlingPage } from '../sling/SlingPage.js';

const PAGES: Record<string, ComponentType<Record<string, unknown>>> = {
  'clamshell-pack': ClamshellPackPage as never,
  'fanny-pack': FannyPackPage as never,
  'lbv': LbvPage as never,
  'organizer': OrganizerPage as never,
  'plate-carrier': PlateCarrierPage as never,
  'sling': SlingPage as never,
};

function Host({ useHook, Page }: { useHook: () => ProjectHookApi; Page: ComponentType<Record<string, unknown>> }) {
  const state = useHook();
  return <Page {...(state as unknown as Record<string, unknown>)} />;
}

describe('the field link is only offered when it works', () => {
  afterEach(cleanup);

  it('hides the link for a field with no control and keeps it for one that has', () => {
    render(
      <>
        <label htmlFor="pouch-width">Pouch width (in)</label>
        <input id="pouch-width" />
        <WarningsPanel
          warnings={[
            { id: 'a', severity: 'warning', message: 'too narrow', field: 'pouch_width' },
            { id: 'b', severity: 'warning', message: 'nothing to click', field: 'imaginary_field' },
          ]}
        />
      </>,
    );
    expect(screen.getByRole('button', { name: '[pouch_width]' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '[imaginary_field]' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '[pouch_width]' }));
    expect(document.activeElement).toBe(document.getElementById('pouch-width'));
  });

  it('matches a snake_case field to a kebab id via its label text', () => {
    render(
      <>
        <label htmlFor="side-seam">Side seam allowance (in)</label>
        <input id="side-seam" />
        <WarningsPanel warnings={[{ id: 'a', severity: 'info', message: 'trades against depth', field: 'side_seam_allowance' }]} />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: '[side_seam_allowance]' }));
    expect(document.activeElement).toBe(document.getElementById('side-seam'));
  });
});

describe('warning field links point at a real control', () => {
  beforeEach(() => { localStorage.clear(); for (const h of PROJECT_HOOKS) h.reset(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  for (const entry of PROJECT_HOOKS) {
    const Page = PAGES[entry.generatorId];
    if (!Page) continue;

    it(`${entry.generatorId}: every offered field link focuses its input`, () => {
      render(<Host useHook={entry.useHook} Page={Page} />);
      const panel = screen.getByTestId('warnings-panel');
      const links = [...panel.querySelectorAll('button')].filter((b) => /^\[.+\]$/.test(b.textContent ?? ''));
      // Nothing to assert when this generator's default warnings name no fields.
      for (const link of links) {
        const field = (link.textContent ?? '').replace(/^\[|\]$/g, '');
        fireEvent.click(link);
        const active = document.activeElement as HTMLElement | null;
        expect(
          active && active !== document.body,
          `${entry.generatorId}: the [${field}] link moved focus nowhere`,
        ).toBe(true);
        (active as HTMLElement | null)?.blur?.();
      }
    });
  }
});
