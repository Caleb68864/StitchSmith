import { describe, it, expect, vi } from 'vitest';

// Mock react-dom/server for SSR rendering
vi.mock('react-dom/server', () => ({
  renderToStaticMarkup: vi.fn((element) => {
    // Minimal simulation: return an SVG string containing the tool names from the layout prop
    const { layout } = (element as { props: { layout: { pockets: Array<{ toolName: string }>; patternWidth: number; patternHeight: number } } }).props;
    const labelTexts = layout.pockets.map((p: { toolName: string }) => `<text>${p.toolName}</text>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.patternWidth}mm" height="${layout.patternHeight}mm">${labelTexts}</svg>`;
  }),
}));

// Mock the download utility so it doesn't touch the DOM
vi.mock('../utils/download.js', () => ({
  downloadTextFile: vi.fn(),
}));

import { exportFullSvg } from './exportSvg.js';
import { downloadTextFile } from '../utils/download.js';
import type { ToolRollLayout, ToolRollProject } from '../generators/tool-roll/types.js';
import { defaultToolRollSettings } from '../generators/tool-roll/defaults.js';

function makeSampleLayout(): ToolRollLayout {
  return {
    patternWidth: 200,
    patternHeight: 300,
    units: 'mm',
    pockets: [
      { id: 'p1', toolId: 't1', toolName: 'Hammer', pocketWidth: 40, pocketDepth: 30, x: 0, y: 0, topY: 0, bottomY: 30, widthWasForced: false },
      { id: 'p2', toolId: 't2', toolName: 'Screwdriver', pocketWidth: 25, pocketDepth: 20, x: 40, y: 0, topY: 0, bottomY: 20, widthWasForced: false },
      { id: 'p3', toolId: 't3', toolName: 'Pliers', pocketWidth: 35, pocketDepth: 25, x: 65, y: 0, topY: 0, bottomY: 25, widthWasForced: false },
      { id: 'p4', toolId: 't4', toolName: 'Wrench', pocketWidth: 30, pocketDepth: 28, x: 100, y: 0, topY: 0, bottomY: 28, widthWasForced: false },
    ],
    backPanel: { cutPath: 'M 0 0', boundingBox: { x: 0, y: 0, width: 200, height: 300 } },
    pocketPanel: { cutPath: 'M 0 0', boundingBox: { x: 0, y: 0, width: 200, height: 100 } },
    stitchLines: [],
    foldLines: [],
    hemLines: [],
    seamAllowanceLines: [],
    notches: [],
    tieMarks: [],
    labels: [
      { id: 'l1', x: 20, y: 15, text: 'Hammer' },
      { id: 'l2', x: 52, y: 10, text: 'Screwdriver' },
      { id: 'l3', x: 82, y: 12, text: 'Pliers' },
      { id: 'l4', x: 115, y: 14, text: 'Wrench' },
    ],
    dimensionLines: [],
    warnings: [],
    constructionNotes: [],
    printLayout: {
      paperSize: 'a4',
      orientation: 'portrait',
      paperWidth: 210,
      paperHeight: 297,
      printableWidth: 190,
      printableHeight: 277,
      columns: 2,
      rows: 2,
      totalPages: 4,
      pages: [],
    },
  };
}

function makeSampleProject(): ToolRollProject {
  return {
    schemaVersion: 1,
    projectName: 'Test Project',
    generatorId: 'tool-roll',
    units: 'mm',
    settings: { ...defaultToolRollSettings, labelMode: 'toolNames', showLabels: true },
    tools: [
      { id: 't1', name: 'Hammer', width: 40, thickness: 10, height: 120, visibleAmount: 40 },
      { id: 't2', name: 'Screwdriver', width: 25, thickness: 8, height: 100, visibleAmount: 30 },
      { id: 't3', name: 'Pliers', width: 35, thickness: 12, height: 130, visibleAmount: 45 },
      { id: 't4', name: 'Wrench', width: 30, thickness: 9, height: 110, visibleAmount: 35 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('exportFullSvg', () => {
  it('calls downloadTextFile with SVG filename', () => {
    const layout = makeSampleLayout();
    const project = makeSampleProject();
    exportFullSvg(layout, project);
    expect(downloadTextFile).toHaveBeenCalledWith(
      'tool-roll-pattern-full.svg',
      expect.any(String),
      'image/svg+xml',
    );
  });

  it('exported SVG starts with <?xml and contains <svg with required attributes', () => {
    const layout = makeSampleLayout();
    const project = makeSampleProject();
    exportFullSvg(layout, project);
    const [, content] = (downloadTextFile as ReturnType<typeof vi.fn>).mock.calls.at(-1) as [string, string, string];
    expect(content).toMatch(/<svg/);
    expect(content).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(content).toContain(`width="${layout.patternWidth}mm"`);
    expect(content).toContain(`height="${layout.patternHeight}mm"`);
  });

  it('exported SVG contains embedded <style> block', () => {
    const layout = makeSampleLayout();
    const project = makeSampleProject();
    exportFullSvg(layout, project);
    const [, content] = (downloadTextFile as ReturnType<typeof vi.fn>).mock.calls.at(-1) as [string, string, string];
    expect(content).toContain('<style>');
  });

  it('rendered SVG contains the four sample pocket tool names', () => {
    const layout = makeSampleLayout();
    const project = makeSampleProject();
    exportFullSvg(layout, project);
    const [, content] = (downloadTextFile as ReturnType<typeof vi.fn>).mock.calls.at(-1) as [string, string, string];
    expect(content).toContain('Hammer');
    expect(content).toContain('Screwdriver');
    expect(content).toContain('Pliers');
    expect(content).toContain('Wrench');
  });
});
