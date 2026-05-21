import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-dom/server', () => ({
  renderToStaticMarkup: vi.fn((_element) => {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="215.9mm" height="279.4mm" viewBox="0 0 215.9 279.4"></svg>';
  }),
}));

vi.mock('../utils/download.js', () => ({
  downloadTextFile: vi.fn(),
}));

import { exportPrintableHtml } from './exportPrintableHtml.js';
import { downloadTextFile } from '../utils/download.js';
import type { ToolRollLayout, ToolRollProject, PrintTile } from '../generators/tool-roll/types.js';
import { defaultToolRollSettings } from '../generators/tool-roll/defaults.js';

const PAPER_W = 215.9;
const PAPER_H = 279.4;
const PRINT_MARGIN = 12.7;
const OVERLAP = 12.7;
const PRINTABLE_W = PAPER_W - 2 * PRINT_MARGIN; // 190.5
const PRINTABLE_H = PAPER_H - 2 * PRINT_MARGIN; // 254.0
const STEP_X = PRINTABLE_W - OVERLAP; // 177.8
const STEP_Y = PRINTABLE_H - OVERLAP; // 241.3
const COLUMNS = Math.ceil(600 / STEP_X); // 4
const ROWS = Math.ceil(350 / STEP_Y);    // 2

function buildPages(): PrintTile[] {
  const pages: PrintTile[] = [];
  let pageNum = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLUMNS; c++) {
      pageNum++;
      pages.push({
        id: `tile-${r}-${c}`,
        row: r,
        column: c,
        pageNumber: pageNum,
        x: c * STEP_X,
        y: r * STEP_Y,
        width: PAPER_W,
        height: PAPER_H,
        viewBox: `${c * STEP_X} ${r * STEP_Y} ${PAPER_W} ${PAPER_H}`,
        label: `Page ${pageNum} (row ${r + 1}, col ${c + 1})`,
      });
    }
  }
  return pages;
}

function makeLayout(): ToolRollLayout {
  return {
    patternWidth: 600,
    patternHeight: 350,
    units: 'mm',
    pockets: [],
    backPanel: {
      cutPath: 'M 0 0 H 600 V 350 H 0 Z',
      boundingBox: { x: 0, y: 0, width: 600, height: 350 },
    },
    pocketPanel: {
      cutPath: 'M 0 0 H 600 V 100 H 0 Z',
      boundingBox: { x: 0, y: 0, width: 600, height: 100 },
    },
    stitchLines: [],
    foldLines: [],
    hemLines: [],
    seamAllowanceLines: [],
    notches: [],
    tieMarks: [],
    labels: [],
    dimensionLines: [],
    warnings: [],
    constructionNotes: ['Cut along solid lines.', 'Stitch along dashed lines.'],
    printLayout: {
      paperSize: 'letter',
      orientation: 'portrait',
      paperWidth: PAPER_W,
      paperHeight: PAPER_H,
      printableWidth: PRINTABLE_W,
      printableHeight: PRINTABLE_H,
      columns: COLUMNS,
      rows: ROWS,
      totalPages: COLUMNS * ROWS,
      pages: buildPages(),
    },
  };
}

function makeProject(): ToolRollProject {
  return {
    schemaVersion: 1,
    projectName: 'Test Project',
    generatorId: 'tool-roll',
    units: 'mm',
    settings: {
      ...defaultToolRollSettings,
      printPaperSize: 'letter',
      printOrientation: 'portrait',
      printMargin: PRINT_MARGIN,
      tileOverlap: OVERLAP,
    },
    tools: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getLastHtml(): string {
  const calls = (downloadTextFile as ReturnType<typeof vi.fn>).mock.calls;
  const last = calls.at(-1) as [string, string, string];
  return last[1];
}

beforeEach(() => {
  (downloadTextFile as ReturnType<typeof vi.fn>).mockClear();
});

describe('exportPrintableHtml', () => {
  it('layout with patternWidth=600 and patternHeight=350 on Letter portrait produces columns>=4 and rows>=2', () => {
    const layout = makeLayout();
    expect(layout.printLayout.columns).toBeGreaterThanOrEqual(4);
    expect(layout.printLayout.rows).toBeGreaterThanOrEqual(2);
  });

  it('exported HTML contains N .page divs equal to printLayout.pages.length', () => {
    const layout = makeLayout();
    exportPrintableHtml(layout, makeProject());
    const html = getLastHtml();
    const matches = html.match(/<div class="page">/g) ?? [];
    expect(matches.length).toBe(layout.printLayout.pages.length);
  });

  it('CSS contains @page { size: letter portrait; margin: 0; }', () => {
    exportPrintableHtml(makeLayout(), makeProject());
    const html = getLastHtml();
    expect(html).toContain('@page { size: letter portrait; margin: 0; }');
  });

  it('CSS contains .page with paperW/paperH dimensions and page-break-after', () => {
    exportPrintableHtml(makeLayout(), makeProject());
    const html = getLastHtml();
    expect(html).toContain(`width: ${PAPER_W}mm`);
    expect(html).toContain(`height: ${PAPER_H}mm`);
    expect(html).toContain('page-break-after: always');
  });

  it('HTML body contains the print-warning banner visible by default', () => {
    exportPrintableHtml(makeLayout(), makeProject());
    const html = getLastHtml();
    expect(html).toContain('class="print-warning"');
    expect(html).toContain('Print at 100%');
    expect(html).toContain('do not scale to fit');
  });

  it('CSS hides .print-warning inside @media print', () => {
    exportPrintableHtml(makeLayout(), makeProject());
    const html = getLastHtml();
    expect(html).toContain('@media print');
    expect(html).toMatch(/\.print-warning\s*\{\s*display\s*:\s*none\s*;?\s*\}/);
  });

  it('CSS does NOT hide .print-warning outside @media print', () => {
    exportPrintableHtml(makeLayout(), makeProject());
    const html = getLastHtml();
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    expect(styleMatch).toBeTruthy();
    const css = styleMatch![1];
    // Remove the @media print block to check normal styles
    const outsidePrint = css.replace(/@media\s+print\s*\{[^}]*\{[^}]*\}\s*\}/g, '');
    expect(outsidePrint).not.toMatch(/\.print-warning[^}]*display\s*:\s*none/);
  });

  it('SVG pages do not contain preserveAspectRatio="xMidYMid meet"', () => {
    exportPrintableHtml(makeLayout(), makeProject());
    const html = getLastHtml();
    expect(html).not.toContain('preserveAspectRatio="xMidYMid meet"');
  });

  it('exports HTML appends construction notes after last page', () => {
    exportPrintableHtml(makeLayout(), makeProject());
    const html = getLastHtml();
    expect(html).toContain('Construction Notes');
    expect(html).toContain('Cut along solid lines.');
    expect(html).toContain('Stitch along dashed lines.');
    // Notes section must appear after last .page div
    const lastPageIdx = html.lastIndexOf('<div class="page">');
    const notesIdx = html.indexOf('Construction Notes');
    expect(notesIdx).toBeGreaterThan(lastPageIdx);
  });

  it('calls downloadTextFile with .html extension', () => {
    exportPrintableHtml(makeLayout(), makeProject());
    const calls = (downloadTextFile as ReturnType<typeof vi.fn>).mock.calls;
    const [filename, , mime] = calls.at(-1) as [string, string, string];
    expect(filename).toMatch(/\.html$/);
    expect(mime).toBe('text/html');
  });
});
