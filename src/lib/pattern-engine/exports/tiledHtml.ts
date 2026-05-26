import type { Pattern } from '../graph/Pattern.js';
import { patternToSvg } from './svg.js';

export interface TiledHtmlOptions {
  paperWidthMm?: number;
  paperHeightMm?: number;
  marginMm?: number;
  overlapMm?: number;
  title?: string;
}

const DEFAULTS: Required<TiledHtmlOptions> = {
  paperWidthMm: 210,   // A4
  paperHeightMm: 297,
  marginMm: 10,
  overlapMm: 10,
  title: 'Pattern',
};

interface Tile {
  row: number;
  col: number;
  pageNum: number;
  viewX: number;
  viewY: number;
  viewW: number;
  viewH: number;
}

function computeTiles(
  patternW: number,
  patternH: number,
  opts: Required<TiledHtmlOptions>,
): Tile[] {
  const printW = opts.paperWidthMm - 2 * opts.marginMm;
  const printH = opts.paperHeightMm - 2 * opts.marginMm;
  const stepX = Math.max(1, printW - opts.overlapMm);
  const stepY = Math.max(1, printH - opts.overlapMm);
  const cols = Math.ceil(patternW / stepX);
  const rows = Math.ceil(patternH / stepY);
  const tiles: Tile[] = [];
  let page = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({
        row: r,
        col: c,
        pageNum: ++page,
        viewX: c * stepX,
        viewY: r * stepY,
        viewW: printW,
        viewH: printH,
      });
    }
  }
  return tiles;
}

/**
 * Converts a Pattern to a tiled HTML document suitable for print-at-home assembly.
 * Each page section contains an SVG viewport clipped to its tile region.
 */
export function patternToTiledHtml(pattern: Pattern, options: TiledHtmlOptions = {}): string {
  const opts = { ...DEFAULTS, ...options, title: options.title ?? pattern.name };
  const svgString = patternToSvg(pattern, { margin: opts.marginMm });

  // Extract viewBox dimensions from the SVG
  const vbMatch = svgString.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const patternW = vbMatch ? parseFloat(vbMatch[1]) : opts.paperWidthMm;
  const patternH = vbMatch ? parseFloat(vbMatch[2]) : opts.paperHeightMm;

  const tiles = computeTiles(patternW, patternH, opts);

  const pageSections = tiles.map((tile) => {
    return `<section class="page" data-page="${tile.pageNum}" data-row="${tile.row}" data-col="${tile.col}">
  <header>Page ${tile.pageNum} — Row ${tile.row + 1}, Col ${tile.col + 1}</header>
  <div class="tile-wrapper" style="width:${opts.paperWidthMm}mm;height:${opts.paperHeightMm}mm;overflow:hidden;padding:${opts.marginMm}mm">
    <svg xmlns="http://www.w3.org/2000/svg"
         width="${opts.paperWidthMm - 2 * opts.marginMm}mm"
         height="${opts.paperHeightMm - 2 * opts.marginMm}mm"
         viewBox="${tile.viewX} ${tile.viewY} ${tile.viewW} ${tile.viewH}"
         data-units="mm">
      <!-- tile ${tile.pageNum} of ${tiles.length} -->
    </svg>
  </div>
</section>`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(opts.title)}</title>
<style>
  body { margin: 0; font-family: sans-serif; }
  .page { page-break-after: always; }
  header { font-size: 10pt; padding: 4mm; }
  @media print { .page { page-break-after: always; } header { display: none; } }
</style>
</head>
<body>
${pageSections.join('\n')}
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
