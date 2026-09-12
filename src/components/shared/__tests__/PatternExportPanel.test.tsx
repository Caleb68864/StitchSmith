import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const pdfLoader = vi.fn();
const dxfLoader = vi.fn();
const tiledLoader = vi.fn();
vi.mock('../../../lib/pattern-engine/exports/lazy.js', () => ({
  loadPdfExporter: () => pdfLoader(),
  loadDxfExporter: () => dxfLoader(),
  loadTiledHtmlExporter: () => tiledLoader(),
}));
vi.mock('../../../utils/download.js', () => ({
  downloadTextFile: vi.fn(),
  downloadBlob: vi.fn(),
}));
import { downloadTextFile } from '../../../utils/download.js';
import { subscribe } from '../../../lib/toast/toast.js';
import { PatternExportPanel } from '../export/PatternExportPanel.js';
import type { ExportAdapter } from '../export/exportAdapter.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';

const download = downloadTextFile as unknown as ReturnType<typeof vi.fn>;

function rect(id: string, w: number, h: number, materialId: string, quantity = 1): Piece {
  return { id, name: id, mirror: false, quantity, materialId, paths: [{ id: `${id}-o`, closed: true, edges: [
    { kind: 'straight', id: `${id}-0`, role: 'cut', start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
    { kind: 'straight', id: `${id}-1`, role: 'cut', start: { x: w, y: 0 }, end: { x: w, y: h } },
    { kind: 'straight', id: `${id}-2`, role: 'cut', start: { x: w, y: h }, end: { x: 0, y: h } },
    { kind: 'straight', id: `${id}-3`, role: 'cut', start: { x: 0, y: h }, end: { x: 0, y: 0 } },
  ] }], seamAllowances: { [`${id}-0`]: 0, [`${id}-1`]: 0, [`${id}-2`]: 0, [`${id}-3`]: 0 } };
}

function adapter(over: Partial<ExportAdapter> = {}): ExportAdapter {
  return {
    generatorId: 'test',
    projectName: 'Proj',
    hasErrors: false,
    defaultSeamAllowance: 0,
    buildPattern: () => ({ id: 'test', name: 'Proj', pieces: [rect('body', 200, 150, 'cordura-500'), rect('row', 6.5 * 25.4, 25.4, 'webbing-25', 3)] }),
    steps: () => [{ id: 's1', title: 'Cut it', body: 'Cut the body.', dependsOn: [], refsPieces: ['body'], group: 'Cut' }],
    bom: () => [{ id: 'b1', description: 'Cordura', quantity: 1, unit: 'pc' }],
    hardware: () => [{ id: 'buckle-25', name: '25 mm buckle', type: 'buckle', quantity: 2 }],
    ...over,
  };
}

describe('PatternExportPanel', () => {
  beforeEach(() => { download.mockReset(); pdfLoader.mockReset(); dxfLoader.mockReset(); tiledLoader.mockReset(); });

  it('renders one button per export with the shared labels and disables them on errors', () => {
    const { unmount } = render(<PatternExportPanel adapter={adapter()} />);
    for (const name of [/^SVG$/i, /Cut sheets by material/i, /Tiled printable HTML/i, /^PDF$/i, /^DXF$/i, /^Cut List$/i, /^CSV$/i, /^Instructions$/i]) {
      expect(screen.getByRole('button', { name })).toHaveProperty('disabled', false);
    }
    unmount();
    render(<PatternExportPanel adapter={adapter({ hasErrors: true })} />);
    expect(screen.getByRole('button', { name: /^SVG$/i })).toHaveProperty('disabled', true);
    expect(screen.getByText(/Fix validation errors/i)).toBeTruthy();
  });

  it('SVG honours the label and annotation toggles', () => {
    render(<PatternExportPanel adapter={adapter({ buildPattern: () => ({ id: 't', name: 'Proj', pieces: [{ ...rect('body', 200, 150, 'cordura-500'), annotations: [{ kind: 'grain', label: 'grain', point: { x: 100, y: 75 }, angle: 90 }] }] }) })} />);
    fireEvent.click(screen.getByRole('button', { name: /^SVG$/i }));
    expect(download.mock.calls[0][1]).toContain('class="grain"');
    fireEvent.click(screen.getByLabelText(/Notes and grain arrows/i));
    fireEvent.click(screen.getByRole('button', { name: /^SVG$/i }));
    expect(download.mock.calls[1][1]).not.toContain('class="grain"');
    expect(download.mock.calls[1][0]).toBe('Proj.svg');
  });

  it('cut sheets by material download one HTML page with a section per material', () => {
    render(<PatternExportPanel adapter={adapter()} />);
    fireEvent.click(screen.getByRole('button', { name: /Cut sheets by material/i }));
    const [filename, html, mime] = download.mock.calls[0];
    expect(filename).toBe('Proj-cut-sheets.html');
    expect(mime).toBe('text/html');
    expect(html).toContain('<h2>cordura-500</h2>');
    expect(html).toContain('<h2>webbing-25</h2>');
    expect((html.match(/<svg/g) ?? []).length).toBe(2);
  });

  it('cut list shows the engine tables (fabric, strips, hardware) and the generator BOM; CSV downloads', () => {
    render(<PatternExportPanel adapter={adapter()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Cut List$/i }));
    expect(screen.getByText(/Fabric by material/i)).toBeTruthy();
    expect(screen.getByText(/Strip stock/i)).toBeTruthy();
    expect(screen.getByText(/6.5" pre-cut/)).toBeTruthy();
    expect(screen.getByText('buckle-25')).toBeTruthy();
    expect(screen.getByTestId('bom-table')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Hide Cut List/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^CSV$/i }));
    expect(download.mock.calls[0][0]).toBe('Proj-cut-list.csv');
    expect(download.mock.calls[0][1]).toContain('Strip Material');
  });

  it('a custom BOM renderer replaces the generic table and the Instructions button follows the steps', () => {
    render(<PatternExportPanel adapter={adapter({ renderBom: () => <p>custom bom</p> })} />);
    fireEvent.click(screen.getByRole('button', { name: /^Cut List$/i }));
    expect(screen.getByText('custom bom')).toBeTruthy();
    expect(screen.queryByTestId('bom-table')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Instructions$/i }));
    expect(download.mock.calls[0][0]).toBe('Proj-instructions.html');
    expect(download.mock.calls[0][1]).toContain('Cut it');
  });

  it('hides Instructions when the adapter has no steps', () => {
    render(<PatternExportPanel adapter={adapter({ steps: undefined })} />);
    expect(screen.queryByRole('button', { name: /^Instructions$/i })).toBeNull();
  });

  it('surfaces a failed PDF chunk as a toast and re-enables the button', async () => {
    pdfLoader.mockRejectedValue(new Error('Failed to fetch dynamically imported module'));
    const got: string[] = [];
    const unsub = subscribe((m) => { if (m.tone === 'error') got.push(m.title); });
    render(<PatternExportPanel adapter={adapter()} />);
    const btn = screen.getByRole('button', { name: /^PDF$/i });
    fireEvent.click(btn);
    await waitFor(() => expect(got.length).toBe(1));
    unsub();
    expect(got[0]).toMatch(/PDF/);
    await waitFor(() => expect(btn).toHaveProperty('disabled', false));
  });
});
