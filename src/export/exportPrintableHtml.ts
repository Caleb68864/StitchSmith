import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { ToolRollLayout, ToolRollProject } from '../generators/tool-roll/types.js';
import { TileSvg } from '../components/svg/TileSvg.js';
import { downloadTextFile } from '../utils/download.js';
import { getPaperSize } from '../utils/units.js';

function buildCss(_layout: ToolRollLayout, project: ToolRollProject): string {
  const { printPaperSize, printOrientation } = project.settings;
  const paper = getPaperSize(printPaperSize, printOrientation);
  const w = paper.width;
  const h = paper.height;

  return `@page { size: ${printPaperSize} ${printOrientation}; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; background: #fff; }
.print-warning {
  background: #fef9c3;
  border: 2px solid #ca8a04;
  padding: 12px 16px;
  font-family: sans-serif;
  font-size: 14px;
  font-weight: bold;
  text-align: center;
  margin: 16px;
}
@media print {
  .print-warning { display: none; }
}
.page {
  width: ${w}mm;
  height: ${h}mm;
  page-break-after: always;
  overflow: hidden;
}`;
}

export function exportPrintableHtml(layout: ToolRollLayout, project: ToolRollProject): void {
  const { printLayout } = layout;
  const { printPaperSize, printOrientation, printMargin, tileOverlap } = project.settings;

  const css = buildCss(layout, project);

  const pageDivs = printLayout.pages
    .map(tile => {
      const svgMarkup = renderToStaticMarkup(
        createElement(TileSvg, {
          tile,
          layout,
          settings: project.settings,
          printMargin,
          overlap: tileOverlap,
        }),
      );
      return `<div class="page">${svgMarkup}</div>`;
    })
    .join('\n');

  const notesHtml =
    layout.constructionNotes.length > 0
      ? `<div class="construction-notes" style="font-family:sans-serif;padding:16px;margin:16px"><h2>Construction Notes</h2><ol>${layout.constructionNotes.map(n => `<li>${n}</li>`).join('')}</ol></div>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Tool Roll Pattern — ${project.projectName}</title>
<style>
${css}
</style>
</head>
<body>
<div class="print-warning">Print at 100% — do not scale to fit. Verify the scale-check square measures exactly 50 mm (or 1 in) on the printed page before cutting fabric.</div>
${pageDivs}
${notesHtml}
</body>
</html>`;

  downloadTextFile(
    `tool-roll-pattern-tiled-${printPaperSize}-${printOrientation}.html`,
    html,
    'text/html',
  );
}
