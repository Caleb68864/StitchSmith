import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { subscribe } from '../../../lib/toast/toast.js';

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
import { ExportPanel } from '../ExportPanel.js';
import { makeDefaultCircleSkirtProject } from '../../../state/useCircleSkirtProject.js';

function makeProps() {
  const project = makeDefaultCircleSkirtProject();
  return { inputs: project.inputs, project, hasErrors: false };
}

const download = downloadTextFile as unknown as ReturnType<typeof vi.fn>;

describe('ExportPanel (circle-skirt) — export failures are surfaced, not swallowed', () => {
  beforeEach(() => {
    pdfLoader.mockReset();
    dxfLoader.mockReset();
    tiledLoader.mockReset();
    download.mockReset();
  });

  it('shows an error toast and re-enables the button when the PDF chunk fails to load', async () => {
    pdfLoader.mockRejectedValue(new Error('Failed to fetch dynamically imported module'));
    const got: string[] = [];
    const unsub = subscribe(m => { if (m.tone === 'error') got.push(m.title); });
    render(<ExportPanel {...makeProps()} />);
    const btn = screen.getByRole('button', { name: /^PDF$/i });
    fireEvent.click(btn);
    await waitFor(() => expect(got.length).toBe(1));
    unsub();
    expect(got[0]).toMatch(/PDF/);
    await waitFor(() => expect(btn).toHaveProperty('disabled', false));
  });

  it('shows an error toast when the DXF exporter throws', async () => {
    dxfLoader.mockResolvedValue({ exportPatternToDxf: () => { throw new Error('dxf boom'); } });
    const got: string[] = [];
    const unsub = subscribe(m => { if (m.tone === 'error') got.push(m.title); });
    render(<ExportPanel {...makeProps()} />);
    fireEvent.click(screen.getByRole('button', { name: /^DXF$/i }));
    await waitFor(() => expect(got.length).toBe(1));
    unsub();
    expect(got[0]).toMatch(/DXF/);
  });

  it('downloads the tiled HTML file when the print popup is blocked', async () => {
    tiledLoader.mockResolvedValue({ patternToTiledHtml: () => '<html>tiled</html>' });
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<ExportPanel {...makeProps()} />);
    fireEvent.click(screen.getByRole('button', { name: /Tiled printable HTML/i }));
    await waitFor(() => expect(download).toHaveBeenCalled());
    const [filename, content, mime] = download.mock.calls[0];
    expect(filename).toMatch(/tiled\.html$/);
    expect(content).toBe('<html>tiled</html>');
    expect(mime).toBe('text/html');
    openSpy.mockRestore();
  });
});
