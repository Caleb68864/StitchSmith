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
  buildFlapProfilePath,
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

  // ── Flap sizing (computed before back panel offset) ──────────────────────
  // Each tool's visible amount = how much sticks above the pocket.
  // Flap needs (visibleAmount + overlap) of reach to cover each tool with the
  // requested overlap when folded. We can size the flap from this without
  // knowing absolute Y positions yet.
  const visibleAmounts = sorted.map((t, i) => Math.max(0, t.height - effectiveDepths[i]));
  const tallestVisible = visibleAmounts.length > 0 ? Math.max(...visibleAmounts) : 0;
  const shortestVisible = visibleAmounts.length > 0 ? Math.min(...visibleAmounts) : 0;
  const flapAllowances = settings.flapHemAllowance + settings.flapSeamAllowance;

  let flapMaxHeight = 0;
  let flapDepthPerPocket: number[] = [];
  if (settings.flapEnabled) {
    const overlap = settings.flapOverlap;
    switch (settings.flapHeightMode) {
      case 'matchPockets':
        flapDepthPerPocket = visibleAmounts.map(v => v + overlap);
        flapMaxHeight = Math.max(20, ...flapDepthPerPocket) + flapAllowances;
        break;
      case 'basedOnTallestTool':
        flapMaxHeight = Math.max(20, tallestVisible + overlap) + flapAllowances;
        break;
      case 'shortestTool':
        flapMaxHeight = Math.max(20, shortestVisible + overlap) + flapAllowances;
        break;
      case 'basedOnPocketDepth':
        flapMaxHeight = Math.max(20, maxEffectiveDepth * 0.4 + overlap) + flapAllowances;
        break;
      case 'fixed':
      default:
        flapMaxHeight = settings.flapHeight + flapAllowances;
        break;
    }
  }

  // The back panel sits below the flap. All back-panel Y coords are shifted by panelOffsetY.
  const panelOffsetY = settings.flapEnabled ? flapMaxHeight : 0;

  // ── Pocket layouts ────────────────────────────────────────────────────────
  const pocketBottomY = panelOffsetY + settings.topHemAllowance + settings.topMargin + maxEffectiveDepth;

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

  // ── Back panel (positioned BELOW the flap region in laid-out coords) ─────
  const backPanelTopY = panelOffsetY;
  const backPanelBottomY = panelOffsetY + backPanelHeight;
  const backPanel: PanelShape = {
    cutPath: `M 0 ${backPanelTopY} H ${patternWidth} V ${backPanelBottomY} H 0 Z`,
    boundingBox: { x: 0, y: backPanelTopY, width: patternWidth, height: backPanelHeight },
  };
  // Keep the legacy rectangular path helper around for export-time use.
  void buildBackPanelPath;

  // ── Pocket panel (sits inside back panel area) ───────────────────────────
  const pocketPanelHeight =
    maxEffectiveDepth +
    settings.pocketBottomAllowance +
    settings.seamAllowance;
  const pocketPanelProfilePath = buildPocketPanelProfilePath(
    pockets.map(p => ({ x: p.x, pocketWidth: p.pocketWidth, topY: p.topY })),
    settings.sideHemAllowance,
    patternWidth - settings.sideHemAllowance,
    pocketBottomY + settings.pocketBottomAllowance,
    settings.pocketTopStyle,
  );
  const pocketPanel: PocketPanelShape = {
    cutPath: pocketPanelProfilePath,
    boundingBox: { x: 0, y: backPanelTopY, width: patternWidth, height: pocketPanelHeight },
  };
  void buildPocketPanelPath; // kept for flat-piece exports

  // ── Flap panel (ABOVE the back panel in laid-out coords) ─────────────────
  // The flap region occupies y ∈ [0, flapMaxHeight]. The fold line is at the
  // BOTTOM of the flap (y = flapMaxHeight = backPanelTopY). The free edge is
  // at smaller y values. When folded over, the flap rotates 180° around the
  // fold and drapes DOWN over the back panel — covering each tool by `overlap`
  // past the pocket top.
  //
  // For matchPockets mode, each pocket's flapDepth = visibleAmount + overlap,
  // so the free edge sits at y = flapMaxHeight − flapDepth_i per pocket.
  // For ascending sort with the tallest tools on the right, that puts the
  // free edge HIGHEST on the right — visually matching the pocket profile
  // direction (both pieces grow taller toward the tall-tool side).
  let flap: PanelShape | undefined;
  if (settings.flapEnabled) {
    const foldY = flapMaxHeight - settings.flapHemAllowance; // bottom-fold of flap region
    if (settings.flapHeightMode === 'matchPockets' && pockets.length > 0 && flapDepthPerPocket.length > 0) {
      // Free-edge Y for each pocket (relative to top of pattern). Smaller y = further from fold.
      const pocketsForFlap = pockets.map((p, i) => ({
        x: p.x,
        pocketWidth: p.pocketWidth,
        // In the flap profile builder, "flapBottomY" means the far-end (free edge) coord
        // — here that's the TOP of the flap region (small y) since the fold is below.
        flapBottomY: foldY - flapDepthPerPocket[i],
      }));
      flap = {
        cutPath: buildFlapProfilePath(
          pocketsForFlap,
          settings.sideHemAllowance,
          patternWidth - settings.sideHemAllowance,
          foldY,
          settings.flapTopStyle,
          'above',
        ),
        boundingBox: { x: 0, y: 0, width: patternWidth, height: flapMaxHeight },
      };
    } else {
      // Rectangular flap — spans the full flap region from y=0 (free edge) to fold at y=flapMaxHeight.
      flap = {
        cutPath: `M 0 0 H ${patternWidth} V ${flapMaxHeight} H 0 Z`,
        boundingBox: { x: 0, y: 0, width: patternWidth, height: flapMaxHeight },
      };
    }
  }
  const patternHeight = panelOffsetY + backPanelHeight;

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

  // ── Fold lines (all relative to back panel top, offset down by panelOffsetY) ──
  const foldLines: FoldLine[] = [
    {
      id: generateId('fold'),
      x1: 0,
      y1: backPanelTopY + settings.topHemAllowance,
      x2: patternWidth,
      y2: backPanelTopY + settings.topHemAllowance,
      label: 'Top hem fold',
    },
    {
      id: generateId('fold'),
      x1: 0,
      y1: backPanelBottomY - settings.bottomHemAllowance,
      x2: patternWidth,
      y2: backPanelBottomY - settings.bottomHemAllowance,
      label: 'Bottom hem fold',
    },
  ];
  // Flap fold line: where the flap meets the back panel.
  if (settings.flapEnabled) {
    foldLines.push({
      id: generateId('fold'),
      x1: 0,
      y1: backPanelTopY,
      x2: patternWidth,
      y2: backPanelTopY,
      label: 'Flap fold',
    });
  }

  // ── Hem lines ─────────────────────────────────────────────────────────────
  const hemLines: HemLine[] = [
    {
      id: generateId('hem'),
      x1: settings.sideHemAllowance,
      y1: backPanelTopY,
      x2: settings.sideHemAllowance,
      y2: backPanelBottomY,
      label: 'Left side hem',
    },
    {
      id: generateId('hem'),
      x1: patternWidth - settings.sideHemAllowance,
      y1: backPanelTopY,
      x2: patternWidth - settings.sideHemAllowance,
      y2: backPanelBottomY,
      label: 'Right side hem',
    },
  ];

  // ── Seam allowance lines ──────────────────────────────────────────────────
  const seamAllowanceLines: SeamAllowanceLine[] = [
    {
      id: generateId('seam'),
      x1: 0,
      y1: backPanelTopY + settings.seamAllowance,
      x2: patternWidth,
      y2: backPanelTopY + settings.seamAllowance,
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
