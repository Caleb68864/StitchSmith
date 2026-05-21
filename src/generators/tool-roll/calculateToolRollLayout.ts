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
  buildPocketPanelProfilePath,
} from './geometry.js';
import { generateConstructionNotes } from './constructionNotes.js';
import { generateId } from '../../utils/ids.js';
import { groupTools, toolFromGroup } from './grouping.js';

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
  // Step 1: merge tools that share a pocket (no-op when grouping is off).
  // Each group becomes a synthetic ToolItem the rest of the pipeline treats as one tool.
  const groups = groupTools(tools, settings);
  const mergedTools: ToolItem[] = groups.map(toolFromGroup);

  // Step 2: sort the merged tools according to the active sort mode.
  const sorted = sortTools(mergedTools, settings);

  // Compute pocket widths and depths
  const rawDepths = sorted.map(t => calculatePocketDepth(t, settings));
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

  // ── Pocket labels (vertical, reads from pocket bottom upward) ─────────────
  // Font size scales with pocket width so a narrow pocket gets a smaller label.
  // text-anchor='start' + rotate(-90, x, y) → text starts at (x, y) and reads upward.
  const pocketLabels = settings.showLabels
    ? pockets.map(p => {
        const fontSize = Math.min(4.5, Math.max(2.5, p.pocketWidth * 0.45));
        return {
          id: generateId('label'),
          x: p.x + p.pocketWidth / 2 + fontSize / 3,
          y: p.bottomY - 2,
          text: p.toolName,
          fontSize,
          anchor: 'start' as const,
          rotate: -90,
        };
      })
    : [];

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

  // Two paths: a flat rectangle (the actual fabric piece dimensions) and a profile
  // path (the visible silhouette where the panel sits on the back panel — used for preview).
  const pocketPanelProfilePath = buildPocketPanelProfilePath(
    pockets.map(p => ({ x: p.x, pocketWidth: p.pocketWidth, topY: p.topY })),
    settings.sideHemAllowance,
    patternWidth - settings.sideHemAllowance,
    pocketBottomY + settings.pocketBottomAllowance,
    settings.pocketTopStyle,
  );

  const pocketPanel: PocketPanelShape = {
    cutPath: pocketPanelProfilePath,
    boundingBox: { x: 0, y: 0, width: patternWidth, height: pocketPanelHeight },
  };
  // Keep the rectangular cut path available for export — sewing pieces are cut flat.
  void buildPocketPanelPath; // referenced for future flat-piece export use

  // ── Flap panel ────────────────────────────────────────────────────────────
  let flap: PanelShape | undefined;
  if (settings.flapEnabled) {
    flap = {
      cutPath: buildBackPanelPath(patternWidth, flapHeight),
      boundingBox: { x: 0, y: backPanelHeight, width: patternWidth, height: flapHeight },
    };
  }

  // ── Stitch lines ──────────────────────────────────────────────────────────
  // Vertical dividers between pockets. Each divider runs from the bottom row up to
  // the SHALLOWER of its two adjacent pockets' tops — beyond that the panel edge takes over.
  const stitchLines: StitchLine[] = [];
  for (let i = 0; i < pockets.length - 1; i++) {
    const leftPocket = pockets[i];
    const rightPocket = pockets[i + 1];
    const dividerX = leftPocket.x + leftPocket.pocketWidth;
    // Shallower pocket has the larger topY (closer to bottom).
    const dividerTopY = Math.max(leftPocket.topY, rightPocket.topY);
    stitchLines.push({
      id: generateId('stitch'),
      x1: dividerX,
      y1: dividerTopY,
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
    labels: pocketLabels,
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
    labels: pocketLabels,
    dimensionLines: [],
    warnings: [],
    constructionNotes,
    printLayout,
  };
}
