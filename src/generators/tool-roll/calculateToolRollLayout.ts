import type {
  ToolItem,
  ToolRollSettings,
  UnitSystem,
  ToolRollLayout,
  PocketLayout,
  PanelShape,
  PocketPanelShape,
  StitchLine,
  FoldLine,
  HemLine,
  SeamAllowanceLine,
} from './types.js';
import {
  calculatePocketDepth,
  calculatePocketWidth,
  sortTools,
  calculatePrintLayout,
  buildBackPanelPath,
  buildPocketPanelPath,
} from './geometry.js';
import { generateConstructionNotes } from './constructionNotes.js';
import { generateId } from '../../utils/ids.js';

// ── Effective pocket depth per height mode ─────────────────────────────────

function effectivePocketDepth(
  rawDepth: number,
  maxDepth: number,
  settings: ToolRollSettings,
): number {
  switch (settings.pocketHeightMode) {
    case 'sameAsTallest':
      return maxDepth;
    case 'steppedToIncrement': {
      const inc = settings.pocketHeightIncrement;
      return inc > 0 ? Math.ceil(rawDepth / inc) * inc : rawDepth;
    }
    case 'individual':
    default:
      return rawDepth;
  }
}

// ── Main layout calculator ─────────────────────────────────────────────────

export function calculateToolRollLayout(
  tools: ToolItem[],
  settings: ToolRollSettings,
  units: UnitSystem,
): ToolRollLayout {
  const sorted = sortTools(tools, settings);

  // Compute pocket widths and depths
  const rawDepths = sorted.map(t => calculatePocketDepth(t));
  const maxRawDepth = rawDepths.length > 0 ? Math.max(...rawDepths) : 0;

  const pocketWidthResults = sorted.map(t => calculatePocketWidth(t, settings));
  const effectiveDepths = rawDepths.map(d =>
    effectivePocketDepth(d, maxRawDepth, settings),
  );
  const maxEffectiveDepth = effectiveDepths.length > 0 ? Math.max(...effectiveDepths) : 0;

  // ── Pattern dimensions ────────────────────────────────────────────────────
  // Width: side hems + sum of pocket widths
  const totalPocketWidth = pocketWidthResults.reduce((s, r) => s + r.width, 0);
  const patternWidth =
    settings.sideHemAllowance * 2 + totalPocketWidth;

  // Height: top hem + top margin + max pocket depth + bottom allowance + bottom margin + bottom hem
  const backPanelHeight =
    settings.topHemAllowance +
    settings.topMargin +
    maxEffectiveDepth +
    settings.pocketBottomAllowance +
    settings.bottomMargin +
    settings.bottomHemAllowance;

  // Flap (separate panel, laid out below back panel in pattern space)
  const flapHeight = settings.flapEnabled
    ? settings.flapHemAllowance + settings.flapHeight + settings.flapSeamAllowance
    : 0;

  const patternHeight = backPanelHeight + (settings.flapEnabled ? flapHeight : 0);

  // ── Pocket layouts ────────────────────────────────────────────────────────
  // Pockets are positioned inside the back panel content area.
  // Y origin: pocket bottom = topHemAllowance + topMargin + maxEffectiveDepth
  const pocketBottomY = settings.topHemAllowance + settings.topMargin + maxEffectiveDepth;

  let cursorX = settings.sideHemAllowance;
  const pockets: PocketLayout[] = sorted.map((tool, i) => {
    const { width: pocketWidth, widthWasForced } = pocketWidthResults[i];
    const pocketDepth = effectiveDepths[i];
    const topY = pocketBottomY - pocketDepth;
    const bottomY = pocketBottomY;

    const pocket: PocketLayout = {
      id: generateId('pocket'),
      toolId: tool.id,
      toolName: tool.name,
      pocketWidth,
      pocketDepth,
      x: cursorX,
      y: topY,
      topY,
      bottomY,
      widthWasForced,
    };

    cursorX += pocketWidth;
    return pocket;
  });

  // ── Back panel ────────────────────────────────────────────────────────────
  const backPanel: PanelShape = {
    cutPath: buildBackPanelPath(patternWidth, backPanelHeight),
    boundingBox: { x: 0, y: 0, width: patternWidth, height: backPanelHeight },
  };

  // ── Pocket panel ──────────────────────────────────────────────────────────
  // Height = max pocket depth + pocket bottom allowance + seam allowance (top/bottom attachment)
  const pocketPanelHeight =
    maxEffectiveDepth +
    settings.pocketBottomAllowance +
    settings.seamAllowance;

  const pocketPanel: PocketPanelShape = {
    cutPath: buildPocketPanelPath(patternWidth, pocketPanelHeight),
    boundingBox: { x: 0, y: 0, width: patternWidth, height: pocketPanelHeight },
  };

  // ── Flap panel ────────────────────────────────────────────────────────────
  let flap: PanelShape | undefined;
  if (settings.flapEnabled) {
    flap = {
      cutPath: buildBackPanelPath(patternWidth, flapHeight),
      boundingBox: { x: 0, y: backPanelHeight, width: patternWidth, height: flapHeight },
    };
  }

  // ── Stitch lines ──────────────────────────────────────────────────────────
  // Vertical dividers between pockets (on the pocket panel)
  const stitchLines: StitchLine[] = [];
  let dividerX = settings.sideHemAllowance;
  for (let i = 0; i < pockets.length - 1; i++) {
    dividerX += pocketWidthResults[i].width;
    stitchLines.push({
      id: generateId('stitch'),
      x1: dividerX,
      y1: pocketBottomY - maxEffectiveDepth,
      x2: dividerX,
      y2: pocketBottomY,
    });
  }

  // ── Fold lines ────────────────────────────────────────────────────────────
  const foldLines: FoldLine[] = [
    {
      id: generateId('fold'),
      x1: 0,
      y1: settings.topHemAllowance,
      x2: patternWidth,
      y2: settings.topHemAllowance,
      label: 'Top hem fold',
    },
    {
      id: generateId('fold'),
      x1: 0,
      y1: backPanelHeight - settings.bottomHemAllowance,
      x2: patternWidth,
      y2: backPanelHeight - settings.bottomHemAllowance,
      label: 'Bottom hem fold',
    },
  ];

  // ── Hem lines ─────────────────────────────────────────────────────────────
  const hemLines: HemLine[] = [
    {
      id: generateId('hem'),
      x1: settings.sideHemAllowance,
      y1: 0,
      x2: settings.sideHemAllowance,
      y2: backPanelHeight,
      label: 'Left side hem',
    },
    {
      id: generateId('hem'),
      x1: patternWidth - settings.sideHemAllowance,
      y1: 0,
      x2: patternWidth - settings.sideHemAllowance,
      y2: backPanelHeight,
      label: 'Right side hem',
    },
  ];

  // ── Seam allowance lines ──────────────────────────────────────────────────
  const seamAllowanceLines: SeamAllowanceLine[] = [
    {
      id: generateId('seam'),
      x1: 0,
      y1: settings.seamAllowance,
      x2: patternWidth,
      y2: settings.seamAllowance,
      label: 'Top seam allowance',
    },
  ];

  // ── Print layout ──────────────────────────────────────────────────────────
  const printLayout = calculatePrintLayout(patternWidth, patternHeight, settings);

  // ── Construction notes ────────────────────────────────────────────────────
  const layoutForNotes: ToolRollLayout = {
    patternWidth,
    patternHeight,
    units,
    pockets,
    backPanel,
    pocketPanel,
    flap,
    stitchLines,
    foldLines,
    hemLines,
    seamAllowanceLines,
    notches: [],
    tieMarks: [],
    labels: [],
    dimensionLines: [],
    warnings: [],
    constructionNotes: [],
    printLayout,
  };

  const constructionNotes = generateConstructionNotes(layoutForNotes, settings, units);

  return {
    patternWidth,
    patternHeight,
    units,
    pockets,
    backPanel,
    pocketPanel,
    flap,
    stitchLines,
    foldLines,
    hemLines,
    seamAllowanceLines,
    notches: [],
    tieMarks: [],
    labels: [],
    dimensionLines: [],
    warnings: [],
    constructionNotes,
    printLayout,
  };
}
