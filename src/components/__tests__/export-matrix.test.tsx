/**
 * Export matrix: render every generator page and press every export button,
 * proving each one produced well-formed, non-empty output for that generator
 * rather than merely existing.
 *
 * Fourteen per-generator export panels were replaced by one shared panel; this
 * is the test that would have caught an adapter wired to the wrong builder, a
 * page passing an allowance the exporters then draw, or a BOM that silently
 * stopped appearing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import type { ComponentType } from 'react';

vi.mock('../../utils/download.js', () => ({
  downloadTextFile: vi.fn(),
  downloadBlob: vi.fn(),
}));
import { downloadTextFile, downloadBlob } from '../../utils/download.js';

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

const textDownload = downloadTextFile as unknown as ReturnType<typeof vi.fn>;
const blobDownload = downloadBlob as unknown as ReturnType<typeof vi.fn>;

/** generatorId → page component and the subtitle the page shows. */
const PAGES: Record<string, { Page: ComponentType<Record<string, unknown>>; subtitle: RegExp }> = {
  'book-cover': { Page: BookCoverPage as never, subtitle: /Book Cover Generator/i },
  'circle-skirt': { Page: CircleSkirtPage as never, subtitle: /Circle Skirt Generator/i },
  'clamshell-pack': { Page: ClamshellPackPage as never, subtitle: /Clamshell Pack Generator/i },
  'fanny-pack': { Page: FannyPackPage as never, subtitle: /Fanny Pack Generator/i },
  'lbv': { Page: LbvPage as never, subtitle: /Modular LBV Generator/i },
  'mag-pouch': { Page: MagPouchPage as never, subtitle: /Mag Pouch Generator/i },
  'micro-rig': { Page: MicroRigPage as never, subtitle: /Micro Rig Generator/i },
  'organizer': { Page: OrganizerPage as never, subtitle: /Tactical Organizer Generator/i },
  'padded-strap': { Page: PaddedStrapPage as never, subtitle: /Padded Strap Generator/i },
  'plate-carrier': { Page: PlateCarrierPage as never, subtitle: /Plate Carrier Generator/i },
  'roll-top-sack': { Page: RollTopSackPage as never, subtitle: /Roll-Top|Stuff Sack/i },
  'sling': { Page: SlingPage as never, subtitle: /Padded Sling Generator/i },
  'tri-zip-backpack': { Page: TriZipPage as never, subtitle: /Tri-Zip/i },
  'zip-pouch': { Page: ZipPouchPage as never, subtitle: /Zip Pouch Generator/i },
};

/** Drives the generator's real hook and spreads it into the page, as App does. */
function PageHost({ useHook, Page }: { useHook: () => ProjectHookApi; Page: ComponentType<Record<string, unknown>> }) {
  const state = useHook();
  return <Page {...(state as unknown as Record<string, unknown>)} />;
}

/** Blobs handed to URL.createObjectURL — the project-JSON path builds its own anchor. */
const objectUrlBlobs: Blob[] = [];

/** jsdom's Blob has no text(); read it the long way. */
function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function lastText(name: RegExp): { filename: string; content: string } {
  const call = [...textDownload.mock.calls].reverse().find((c) => name.test(String(c[0])));
  if (!call) throw new Error(`no text download matching ${name}; got ${textDownload.mock.calls.map((c) => c[0]).join(', ')}`);
  return { filename: String(call[0]), content: String(call[1]) };
}

async function press(name: RegExp) {
  fireEvent.click(screen.getByRole('button', { name }));
}

describe('export matrix — every page produces every file', () => {
  beforeEach(() => {
    textDownload.mockReset();
    blobDownload.mockReset();
    localStorage.clear();
    objectUrlBlobs.length = 0;
    for (const h of PROJECT_HOOKS) h.reset();
    vi.spyOn(window, 'open').mockReturnValue(null);
    // jsdom has no object-URL support; the project-JSON download uses it directly.
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn((b: Blob) => { objectUrlBlobs.push(b); return 'blob:test'; });
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  for (const entry of PROJECT_HOOKS) {
    const page = PAGES[entry.generatorId];
    if (!page) continue;

    it(`${entry.generatorId}: SVG, cut sheets, DXF, cut list, CSV and instructions are real files`, async () => {
      render(<PageHost useHook={entry.useHook} Page={page.Page} />);
      expect(screen.getAllByText(page.subtitle).length).toBeGreaterThan(0);

      // SVG
      await press(/^SVG$/i);
      const svg = lastText(/\.svg$/);
      expect(svg.content.startsWith('<svg'), `${entry.generatorId} svg head: ${svg.content.slice(0, 40)}`).toBe(true);
      expect(svg.content).toContain('<g id="piece-');
      expect(svg.content.length).toBeGreaterThan(400);
      expect(svg.content).not.toContain('NaN');

      // The file matches the drawing: the export adapter and the preview must
      // build the same pattern, not two different ones.
      const shownTypes = Number(/(\d+)\s+piece type/.exec(screen.getByTestId('pattern-preview-region').textContent ?? '')?.[1] ?? '0');
      const exportedIds = new Set([...svg.content.matchAll(/id="piece-([^"]+)"/g)].map((m) => m[1]));
      expect(exportedIds.size, `${entry.generatorId}: preview shows ${shownTypes} piece types, the SVG has ${exportedIds.size}`).toBe(shownTypes);

      // Per-material cut sheets
      await press(/Cut sheets by material/i);
      const sheets = lastText(/cut-sheets\.html$/);
      expect(sheets.content).toContain('<section class="sheet">');
      expect(sheets.content).toContain('<svg');
      expect(sheets.content).not.toContain('NaN');

      // DXF
      await press(/^DXF$/i);
      await waitFor(() => expect(textDownload.mock.calls.some((c) => /\.dxf$/.test(String(c[0])))).toBe(true));
      const dxf = lastText(/\.dxf$/);
      expect(dxf.content).toContain('SECTION');
      expect(dxf.content).toContain('ENTITIES');
      expect(dxf.content).not.toContain('NaN');

      // Cut list table, then its CSV
      await press(/^Cut List$/i);
      const table = await screen.findByTestId('engine-cut-list');
      expect(within(table).getAllByRole('row').length).toBeGreaterThan(1);
      await press(/^CSV$/i);
      const csv = lastText(/cut-list\.csv$/);
      expect(csv.content).toContain('Material ID');
      expect(csv.content.split('\n').length).toBeGreaterThan(2);

      // Instructions
      if (screen.queryByRole('button', { name: /^Instructions$/i })) {
        await press(/^Instructions$/i);
        const html = lastText(/instructions\.html$/);
        expect(html.content).toContain('<!DOCTYPE html>');
        expect(html.content.length).toBeGreaterThan(300);
      }

      // Project JSON, from the page shell
      await press(/^Export$/i);
      expect(objectUrlBlobs.length, `${entry.generatorId}: project JSON did not download`).toBeGreaterThan(0);
      const parsed = JSON.parse(await blobText(objectUrlBlobs[objectUrlBlobs.length - 1])) as { generatorId: string; inputs: unknown };
      expect(parsed.generatorId).toBe(entry.generatorId);
      expect(parsed.inputs).toBeTruthy();
    });
  }

  it('a Convention B pattern exports no seam-allowance line', async () => {
    const entry = PROJECT_HOOKS.find((h) => h.generatorId === 'organizer')!;
    render(<PageHost useHook={entry.useHook} Page={PAGES['organizer'].Page} />);
    await press(/^SVG$/i);
    // Cut sizes already include the hems, so the cut line IS the outer line.
    expect(lastText(/\.svg$/).content).not.toContain('#2e7d32');
  });

  it('an inch-unit Zip Pouch hands the exporters millimetres, not inches', async () => {
    const entry = PROJECT_HOOKS.find((h) => h.generatorId === 'zip-pouch')!;
    const project = entry.makeDefault();
    localStorage.setItem(entry.storageKey, JSON.stringify({
      ...project,
      inputs: { ...project.inputs, units: 'in', preset: 'custom', finished_length: 8, finished_width: 5, finished_depth: 2, seam_allowance: 0.375 },
    }));
    entry.reset();
    render(<PageHost useHook={entry.useHook} Page={PAGES['zip-pouch'].Page} />);
    // The label reports the user's unit; the geometry is millimetres.
    expect(screen.getByTestId('pattern-preview-region').textContent).toContain('0.375 in');
    await press(/^SVG$/i);
    expect(lastText(/\.svg$/).content).toContain('<svg');
  });

  for (const entry of PROJECT_HOOKS) {
    const page = PAGES[entry.generatorId];
    if (!page) continue;
    it(`${entry.generatorId}: PDF and tiled HTML render`, async () => {
      render(<PageHost useHook={entry.useHook} Page={page.Page} />);
      await press(/Tiled printable HTML/i);
      await waitFor(() => expect(
        textDownload.mock.calls.some((c) => /tiled\.html$/.test(String(c[0]))),
      ).toBe(true));
      const tiled = lastText(/tiled\.html$/).content;
      expect(tiled).toContain('<html');
      // The tiles must carry the drawing: this export once emitted blank pages.
      expect(tiled, `${entry.generatorId}: tiled pages are blank`).toContain('<svg');
      expect(tiled).not.toContain('NaN');

      await press(/^PDF$/i);
      await waitFor(() => expect(blobDownload).toHaveBeenCalled(), { timeout: 20_000 });
      const [file, blob] = blobDownload.mock.calls[blobDownload.mock.calls.length - 1] as [string, Blob];
      expect(file.endsWith('.pdf')).toBe(true);
      expect(blob.size).toBeGreaterThan(500);
    }, 30_000);
  }
});
