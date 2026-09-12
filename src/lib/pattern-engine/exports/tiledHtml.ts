import type { Pattern } from '../graph/Pattern.js';
import { patternToSvg } from './svg.js';

export interface TiledHtmlOptions {
  paperWidthMm?: number;
  paperHeightMm?: number;
  marginMm?: number;
  overlapMm?: number;
  title?: string;
  /** Seam allowance for pieces without per-edge values, passed through to the SVG. */
  defaultSeamAllowance?: number;
}

const DEFAULTS: Required<TiledHtmlOptions> = {
  paperWidthMm: 210,   // A4
  paperHeightMm: 297,
  marginMm: 10,
  overlapMm: 10,
  title: 'Pattern',
  defaultSeamAllowance: 0,
};

/** Length of the printed scale-check rule, in mm. */
export const SCALE_RULE_MM = 50;

interface Tile {
  row: number;
  col: number;
  pageNum: number;
  viewX: number;
  viewY: number;
  viewW: number;
  viewH: number;
}

export function computeTiles(
  patternW: number,
  patternH: number,
  opts: Required<TiledHtmlOptions>,
): Tile[] {
  const printW = opts.paperWidthMm - 2 * opts.marginMm;
  const printH = opts.paperHeightMm - 2 * opts.marginMm;
  const stepX = Math.max(1, printW - opts.overlapMm);
  const stepY = Math.max(1, printH - opts.overlapMm);
  const cols = Math.max(1, Math.ceil(patternW / stepX));
  const rows = Math.max(1, Math.ceil(patternH / stepY));
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

/** The drawing inside a `patternToSvg` document, without its wrapper or title. */
function svgInnerContent(svg: string): string {
  const open = svg.indexOf('>', svg.indexOf('<svg'));
  const close = svg.lastIndexOf('</svg>');
  if (open < 0 || close < 0) return '';
  return svg.slice(open + 1, close).replace(/<title>[\s\S]*?<\/title>/, '').trim();
}

/**
 * Converts a Pattern to a tiled HTML document for printing at home and taping
 * together. Every page carries the pattern clipped to its own tile, crop marks
 * at the trim lines, a row/column label for assembly, and a 50 mm rule to check
 * the printer did not scale the page.
 *
 * Print at 100%. "Fit to page" silently resizes the pattern and ruins it, which
 * is exactly what the rule on each page is there to catch.
 */
export function patternToTiledHtml(pattern: Pattern, options: TiledHtmlOptions = {}): string {
  const opts = { ...DEFAULTS, ...options, title: options.title ?? pattern.name };
  const svgString = patternToSvg(pattern, { margin: opts.marginMm, defaultSeamAllowance: opts.defaultSeamAllowance });
  const inner = svgInnerContent(svgString);

  // Extract viewBox dimensions from the SVG
  const vbMatch = svgString.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const patternW = vbMatch ? parseFloat(vbMatch[1]) : opts.paperWidthMm;
  const patternH = vbMatch ? parseFloat(vbMatch[2]) : opts.paperHeightMm;

  const tiles = computeTiles(patternW, patternH, opts);
  const cols = Math.max(...tiles.map((t) => t.col)) + 1;
  const rows = Math.max(...tiles.map((t) => t.row)) + 1;
  const printW = opts.paperWidthMm - 2 * opts.marginMm;
  const printH = opts.paperHeightMm - 2 * opts.marginMm;

  const pageSections = tiles.map((tile) => `<section class="page" data-page="${tile.pageNum}" data-row="${tile.row}" data-col="${tile.col}">
  <div class="sheet">
    <div class="tile-wrapper">
      <svg xmlns="http://www.w3.org/2000/svg"
           width="${printW}mm"
           height="${printH}mm"
           viewBox="${round(tile.viewX)} ${round(tile.viewY)} ${round(tile.viewW)} ${round(tile.viewH)}"
           data-units="mm">
${inner}
      </svg>
    </div>
    <div class="crop tl"></div><div class="crop tr"></div><div class="crop bl"></div><div class="crop br"></div>
    <div class="overlap-x" style="left:${opts.marginMm}mm"></div>
    <div class="overlap-y" style="top:${opts.marginMm}mm"></div>
    <div class="page-label">${esc(opts.title)} — row ${tile.row + 1} of ${rows}, column ${tile.col + 1} of ${cols} (page ${tile.pageNum} of ${tiles.length})</div>
    <div class="rule"><span class="rule-bar"></span><span class="rule-text">${SCALE_RULE_MM} mm — measure this before cutting. If it is short, the printer scaled the page.</span></div>
  </div>
</section>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(opts.title)}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; font-family: sans-serif; background: #f4f4f5; }
  .page { page-break-after: always; display: flex; justify-content: center; padding: 6mm 0; }
  .sheet {
    position: relative;
    width: ${opts.paperWidthMm}mm;
    height: ${opts.paperHeightMm}mm;
    background: #fff;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,.2);
  }
  .tile-wrapper {
    position: absolute;
    left: ${opts.marginMm}mm;
    top: ${opts.marginMm}mm;
    width: ${printW}mm;
    height: ${printH}mm;
    overflow: hidden;
  }
  /* Crop marks sit on the trim line at each corner of the print area. */
  .crop { position: absolute; width: ${opts.marginMm}mm; height: ${opts.marginMm}mm; }
  .crop.tl { left: 0; top: 0; border-right: .3mm solid #000; border-bottom: .3mm solid #000; }
  .crop.tr { right: 0; top: 0; border-left: .3mm solid #000; border-bottom: .3mm solid #000; }
  .crop.bl { left: 0; bottom: 0; border-right: .3mm solid #000; border-top: .3mm solid #000; }
  .crop.br { right: 0; bottom: 0; border-left: .3mm solid #000; border-top: .3mm solid #000; }
  /* Overlap guides: trim to these and the next sheet's pattern lines up. */
  .overlap-x { position: absolute; top: 0; bottom: 0; width: ${opts.overlapMm}mm; border-right: .2mm dashed #999; }
  .overlap-y { position: absolute; left: 0; right: 0; height: ${opts.overlapMm}mm; border-bottom: .2mm dashed #999; }
  .page-label { position: absolute; left: ${opts.marginMm}mm; top: 2mm; font-size: 8pt; color: #333; }
  .rule { position: absolute; left: ${opts.marginMm}mm; bottom: 1.5mm; display: flex; align-items: center; gap: 2mm; font-size: 7pt; color: #333; }
  .rule-bar { display: inline-block; width: ${SCALE_RULE_MM}mm; height: 3mm; border: .3mm solid #000; border-top: none; }
  @page { size: ${opts.paperWidthMm}mm ${opts.paperHeightMm}mm; margin: 0; }
  @media print {
    body { background: #fff; }
    .page { padding: 0; page-break-after: always; }
    .sheet { box-shadow: none; }
  }
</style>
</head>
<body>
${pageSections.join('\n')}
</body>
</html>`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
