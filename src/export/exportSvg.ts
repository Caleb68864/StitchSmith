// SS-05: SVG exporter operates on ToolRollLayout (produced by the engine-backed calculator).
// The exported SVG format is unchanged from pre-migration.
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { ToolRollLayout } from '../generators/tool-roll/types.js';
import type { ToolRollProject } from '../generators/tool-roll/types.js';
import { FullPatternSvg } from '../components/svg/FullPatternSvg.js';
import { downloadTextFile } from '../utils/download.js';

// §29 CSS embedded in exported SVG
const PATTERN_SVG_CSS = `
.layer-finished { fill: none; stroke: #aaaaaa; stroke-width: 0.3; stroke-dasharray: 3 1; }
.layer-cut { fill: none; stroke: #111111; stroke-width: 1; }
.back-panel-cut { }
.pocket-panel-cut { }
.flap-cut { }
.layer-stitch { stroke: #16a34a; stroke-width: 0.5; stroke-dasharray: 2 2; fill: none; }
.layer-fold { stroke: #2563eb; stroke-width: 0.5; stroke-dasharray: 8 3 2 3; fill: none; }
.layer-seam-hem { }
.layer-tie { fill: none; stroke: #dc2626; stroke-width: 0.5; }
.layer-notch { stroke: #111111; stroke-width: 0.8; }
.layer-label { font-family: sans-serif; }
.layer-dim { stroke: #555555; stroke-width: 0.4; fill: #555555; font-family: sans-serif; }
.grid-line { stroke: #e5e7eb; stroke-width: 0.2; }
.tile-grid-line { stroke: #3b82f6; stroke-width: 0.4; stroke-dasharray: 4 2; fill: none; }
`;

export function exportFullSvg(layout: ToolRollLayout, project: ToolRollProject): void {
  // Render the SVG element to static markup via react-dom/server
  const svgElement = createElement(FullPatternSvg, {
    layout,
    settings: project.settings,
  });

  let markup = renderToStaticMarkup(svgElement);

  // Inject the embedded <style> block after the opening <svg ...> tag
  const styleTag = `<style>${PATTERN_SVG_CSS}</style>`;
  markup = markup.replace(/^(<svg[^>]*>)/, `$1${styleTag}`);

  // Prepend XML declaration
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`;

  downloadTextFile('tool-roll-pattern-full.svg', svgContent, 'image/svg+xml');
}
