import type {
  ToolItem,
  ToolRollSettings,
  SvgPathData,
  PrintLayout,
  PrintTile,
} from './types.js';
import { getPaperSize } from '../../utils/units.js';

// ── Pocket geometry ────────────────────────────────────────────────────────

/** Returns the pocket depth for a tool: height minus the visible amount above the pocket. */
export function calculatePocketDepth(tool: Pick<ToolItem, 'height' | 'visibleAmount'>): number {
  return tool.height - tool.visibleAmount;
}

/**
 * Returns the pocket width for a tool, floored at minimumPocketWidth.
 * Natural width = tool.width + thickness * thicknessEaseFactor + sideGap * 2.
 */
export function calculatePocketWidth(
  tool: ToolItem,
  settings: ToolRollSettings,
): { width: number; widthWasForced: boolean } {
  const natural =
    tool.width +
    tool.thickness * settings.thicknessEaseFactor +
    settings.sideGap * 2;
  const forced = natural < settings.minimumPocketWidth;
  return {
    width: forced ? settings.minimumPocketWidth : natural,
    widthWasForced: forced,
  };
}

// ── Sorting ────────────────────────────────────────────────────────────────

/** Returns a sorted copy of tools according to the active SortMode. */
export function sortTools(tools: ToolItem[], settings: ToolRollSettings): ToolItem[] {
  const copy = [...tools];
  switch (settings.sortMode) {
    case 'manual':
      return copy.sort((a, b) => {
        const la = a.lockedOrder ?? Infinity;
        const lb = b.lockedOrder ?? Infinity;
        return la - lb;
      });
    case 'widthAscending':
      return copy.sort((a, b) => a.width - b.width);
    case 'widthDescending':
      return copy.sort((a, b) => b.width - a.width);
    case 'heightAscending':
      return copy.sort((a, b) => a.height - b.height);
    case 'heightDescending':
      return copy.sort((a, b) => b.height - a.height);
    case 'pocketDepthAscending':
      return copy.sort(
        (a, b) => calculatePocketDepth(a) - calculatePocketDepth(b),
      );
    case 'pocketDepthDescending':
      return copy.sort(
        (a, b) => calculatePocketDepth(b) - calculatePocketDepth(a),
      );
    default:
      return copy;
  }
}

// ── Print layout ───────────────────────────────────────────────────────────

/**
 * Computes the tile grid needed to print the pattern at 1:1 scale.
 * Each tile overlaps the next by tileOverlap to allow alignment when assembling.
 */
export function calculatePrintLayout(
  patternWidth: number,
  patternHeight: number,
  settings: ToolRollSettings,
): PrintLayout {
  const paper = getPaperSize(settings.printPaperSize, settings.printOrientation);
  const { width: paperWidth, height: paperHeight } = paper;

  const printableWidth = paperWidth - 2 * settings.printMargin;
  const printableHeight = paperHeight - 2 * settings.printMargin;

  // Effective step per tile (subtract overlap so adjacent tiles share a strip)
  const stepX = Math.max(1, printableWidth - settings.tileOverlap);
  const stepY = Math.max(1, printableHeight - settings.tileOverlap);

  const columns = Math.ceil(patternWidth / stepX);
  const rows = Math.ceil(patternHeight / stepY);
  const totalPages = columns * rows;

  const pages: PrintTile[] = [];
  let pageNumber = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      pageNumber++;
      const x = col * stepX;
      const y = row * stepY;
      pages.push({
        id: `tile-${row}-${col}`,
        row,
        column: col,
        pageNumber,
        x,
        y,
        width: paperWidth,
        height: paperHeight,
        viewBox: `${x} ${y} ${paperWidth} ${paperHeight}`,
        label: `Page ${pageNumber} (row ${row + 1}, col ${col + 1})`,
      });
    }
  }

  return {
    paperSize: settings.printPaperSize,
    orientation: settings.printOrientation,
    paperWidth,
    paperHeight,
    printableWidth,
    printableHeight,
    columns,
    rows,
    totalPages,
    pages,
  };
}

// ── SVG paths ──────────────────────────────────────────────────────────────

/** Returns a closed rectangular SVG path for the back panel cut line. */
export function buildBackPanelPath(width: number, height: number): SvgPathData {
  return `M 0 0 H ${width} V ${height} H 0 Z`;
}

/** Returns a closed rectangular SVG path for the pocket panel cut line. */
export function buildPocketPanelPath(width: number, height: number): SvgPathData {
  return `M 0 0 H ${width} V ${height} H 0 Z`;
}
