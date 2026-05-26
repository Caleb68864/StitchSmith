// SS-05: geometry math is now sourced from src/lib/pattern-engine/geometry/ via geometry.ts.
// This file orchestrates the layout — no raw math lives here.
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
  buildOpenProfilePath,
} from './geometry.js';
import { generateConstructionNotes } from './constructionNotes.js';
import { generateId } from '../../utils/ids.js';
import { groupTools, toolFromGroup } from './grouping.js';

// ── Upper-envelope smoothing for flap depths ───────────────────────────────
/**
 * Returns the upper envelope of a sequence: for each index i, the value is the
 * minimum of (running max from the left through i) and (running max from the
 * right through i). The result never under-covers any input value AND is
 * unimodal — at most one peak — so stepped/smooth flap profiles built from it
 * don't zig-zag.
 */
function upperEnvelope(values: number[]): number[] {
  if (values.length === 0) return [];
  const n = values.length;
  const leftMax: number[] = new Array(n);
  const rightMax: number[] = new Array(n);
  let m = -Infinity;
  for (let i = 0; i < n; i++) {
    m = Math.max(m, values[i]);
    leftMax[i] = m;
  }
  m = -Infinity;
  for (let i = n - 1; i >= 0; i--) {
    m = Math.max(m, values[i]);
    rightMax[i] = m;
  }
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = Math.min(leftMax[i], rightMax[i]);
  }
  return out;
}

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
  // The flap is a lid attached at the top of the back panel. When folded it
  // drapes down over the tools, reaching past each pocket's top by `overlap`.
  //
  // Required flap reach (distance from seam down to pocket top + overlap) for
  // pocket i, in back-panel-local coordinates:
  //   reach_i = pocketTop_i_local + overlap
  //           = (topHem + topMargin + maxEffectiveDepth − pocketDepth_i) + overlap
  //
  // Deep-pocket tools (tall) have their pocket tops CLOSE to the seam — so
  // they need SHORT reach. Shallow-pocket tools (short) have pocket tops FAR
  // from the seam — so they need LONG reach. The match-pockets mode mirrors
  // this per-pocket; rectangular modes pick a single value to size the whole flap.
  const pocketTopLocals = effectiveDepths.map(d =>
    settings.topHemAllowance + settings.topMargin + (maxEffectiveDepth - d),
  );
  const reachPerPocket = pocketTopLocals.map(top => top);
  const minReach = reachPerPocket.length > 0 ? Math.min(...reachPerPocket) : 0; // tallest tool
  const maxReach = reachPerPocket.length > 0 ? Math.max(...reachPerPocket) : 0; // shortest tool
  // Flap's attached edge tucks under the back panel's top hem — no seam allowance there.
  // Only the three exposed sides (left, right, and free edge) need a hem.
  // When flapHemEnabled is false, treat the hem allowance as zero (no extra fabric, no fold line).
  const flapHemAllow = settings.flapHemEnabled ? settings.flapHemAllowance : 0;

  let flapMaxHeight = 0;
  let flapDepthPerPocket: number[] = [];
  if (settings.flapEnabled) {
    const overlap = settings.flapOverlap;
    switch (settings.flapHeightMode) {
      case 'matchPockets': {
        // Per-pocket reach + overlap. Each tool gets its own flap drop.
        const raw = reachPerPocket.map(r => r + overlap);
        // For stepped/smooth styles, smooth out non-monotonic depths so the
        // flap profile doesn't zig-zag. We compute the upper envelope: for
        // every pocket, take the max of itself and the running max from each
        // side. Result is the shallowest sequence that never under-covers
        // any pocket. Arc style does its own smoothing inside the path builder.
        // The effective style follows pocketTopStyle in matchPockets mode (see below).
        const styleForFlap = settings.pocketTopStyle;
        if (styleForFlap === 'stepped' || styleForFlap === 'smooth') {
          flapDepthPerPocket = upperEnvelope(raw);
        } else {
          flapDepthPerPocket = raw;
        }
        flapMaxHeight = Math.max(20, ...flapDepthPerPocket) + flapHemAllow;
        break;
      }
      case 'basedOnTallestTool':
        flapMaxHeight = Math.max(20, minReach + overlap) + flapHemAllow;
        break;
      case 'shortestTool':
        flapMaxHeight = Math.max(20, maxReach + overlap) + flapHemAllow;
        break;
      case 'basedOnPocketDepth':
        flapMaxHeight = Math.max(20, maxEffectiveDepth * 0.4 + overlap) + flapHemAllow;
        break;
      case 'fixed':
      default:
        flapMaxHeight = settings.flapHeight + flapHemAllow;
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
  // labelMode controls what's included in each label.
  const pocketLabels = settings.showLabels && settings.labelMode !== 'none'
    ? pockets.map((p, i) => {
        const fontSize = Math.min(4.5, Math.max(2.5, p.pocketWidth * 0.45));
        let text = p.toolName;
        if (settings.labelMode === 'toolNamesAndDimensions') {
          const tool = sorted[i];
          if (tool) {
            const dim = units === 'in'
              ? `${(tool.width / 25.4).toFixed(2)}×${(tool.height / 25.4).toFixed(2)}in`
              : `${tool.width.toFixed(0)}×${tool.height.toFixed(0)}mm`;
            text = `${p.toolName} (${dim})`;
          }
        }
        return {
          id: generateId('label'),
          x: p.x + p.pocketWidth / 2 + fontSize / 3,
          y: p.bottomY - 2,
          text,
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
  // The pocket panel's TOP edge is the free edge where tools enter the pockets.
  // It needs its own hem (pocketTopHemAllowance). The CUT TOP profile is offset
  // UP by this hem amount from the actual pocket-top body line. The hem fold
  // line (where the fabric folds under) runs along the original (un-offset)
  // pocket-top profile.
  const pocketHemAllow = settings.pocketTopHemEnabled ? settings.pocketTopHemAllowance : 0;
  const pocketPanelHeight =
    maxEffectiveDepth +
    settings.pocketBottomAllowance +
    settings.seamAllowance +
    pocketHemAllow;
  // Body pocket-top profile (where finished edge sits — this is each pocket's topY).
  const pocketTopsForBody = pockets.map(p => ({
    x: p.x, pocketWidth: p.pocketWidth, topY: p.topY,
  }));
  // Cut profile: offset each body topY UP by the pocket-top hem allowance.
  const pocketTopsForCut = pockets.map(p => ({
    x: p.x, pocketWidth: p.pocketWidth, topY: p.topY - pocketHemAllow,
  }));
  const pocketPanelProfilePath = buildPocketPanelProfilePath(
    pocketTopsForCut,
    settings.sideHemAllowance,
    patternWidth - settings.sideHemAllowance,
    pocketBottomY + settings.pocketBottomAllowance,
    settings.pocketTopStyle,
  );
  // Hem fold line: open profile along the body top — only when the hem is enabled
  // (otherwise the body top IS the cut top, so a separate fold line would just
  // duplicate the cut edge).
  const pocketHemFoldPath = pockets.length > 0 && pocketHemAllow > 0
    ? buildOpenProfilePath(
        pocketTopsForBody.map(p => ({ x: p.x, pocketWidth: p.pocketWidth, y: p.topY })),
        settings.sideHemAllowance,
        patternWidth - settings.sideHemAllowance,
        settings.pocketTopStyle,
        'pocket',  // curve sits at or below each pocket's top
      )
    : undefined;
  const pocketPanel: PocketPanelShape = {
    cutPath: pocketPanelProfilePath,
    hemFoldPath: pocketHemFoldPath,
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
  // The flap's attached edge is at the BOTTOM of the flap region (y = flapMaxHeight).
  // It tucks under the back panel's top hem, so it doesn't carry its own seam allowance.
  // The OTHER three edges (free edge at top, plus left and right) are hemmed by
  // including flapHemAllowance worth of fabric on each.
  //
  // For 'matchPockets' mode, the flap's edge style follows the POCKET top style by
  // default — picking "Smooth" on the pocket also gives a smooth flap. The
  // dedicated flapTopStyle setting still acts as an override; we only sync when
  // they differ and the override hasn't been touched. Practically: sync to
  // pocketTopStyle so the two pieces always look like a matched pair.
  const flapStyle = settings.flapTopStyle;
  const effectiveFlapTopStyle = settings.flapHeightMode === 'matchPockets'
    ? settings.pocketTopStyle    // visually match the pocket panel's style
    : flapStyle;
  let flap: PanelShape | undefined;
  if (settings.flapEnabled) {
    const foldY = flapMaxHeight; // attached edge at the very bottom of the flap region
    if (settings.flapHeightMode === 'matchPockets' && pockets.length > 0 && flapDepthPerPocket.length > 0) {
      // For each pocket, cutTopY = foldY − bodyDepth − flapHemAllowance.
      // flapDepthPerPocket already represents body depths (reach + overlap).
      const pocketsForFlap = pockets.map((p, i) => ({
        x: p.x,
        pocketWidth: p.pocketWidth,
        flapBottomY: foldY - flapDepthPerPocket[i] - flapHemAllow,
      }));
      // Free-edge hem fold path: same profile as cut top, offset DOWN by flapHemAllow.
      // Only emit when the hem is enabled (else the body top IS the cut top).
      const hemFoldPocketYs = pocketsForFlap.map(p => ({
        x: p.x,
        pocketWidth: p.pocketWidth,
        y: p.flapBottomY + flapHemAllow,
      }));
      flap = {
        cutPath: buildFlapProfilePath(
          pocketsForFlap,
          0,
          patternWidth,
          foldY,
          effectiveFlapTopStyle,
          'above',
        ),
        hemFoldPath: flapHemAllow > 0
          ? buildOpenProfilePath(
              hemFoldPocketYs,
              0,
              patternWidth,
              effectiveFlapTopStyle,
              'flap',  // curve sits at or above each pocket's body top
            )
          : undefined,
        boundingBox: { x: 0, y: 0, width: patternWidth, height: flapMaxHeight },
      };
    } else {
      // Rectangular flap — spans the full flap region from y=0 (free edge with hem)
      // to y=flapMaxHeight (attached edge, no hem). Side hems live within the
      // patternWidth (shared with back panel's side hem allowance).
      flap = {
        cutPath: `M 0 0 H ${patternWidth} V ${flapMaxHeight} H 0 Z`,
        hemFoldPath: flapHemAllow > 0
          ? `M ${settings.sideHemAllowance} ${flapHemAllow} H ${patternWidth - settings.sideHemAllowance}`
          : undefined,
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
  // Side hems run vertically through BOTH the flap and the back panel since they
  // share a single side-hem allowance baked into patternWidth.
  const hemTopY = settings.flapEnabled ? 0 : backPanelTopY;
  const hemLines: HemLine[] = [
    {
      id: generateId('hem'),
      x1: settings.sideHemAllowance,
      y1: hemTopY,
      x2: settings.sideHemAllowance,
      y2: backPanelBottomY,
      label: 'Left side hem',
    },
    {
      id: generateId('hem'),
      x1: patternWidth - settings.sideHemAllowance,
      y1: hemTopY,
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

  // ── Tie marks ────────────────────────────────────────────────────────────
  // The tie/strap attaches at the top of the back panel; the rectangle just
  // shows the placement footprint. v1 supports 'centered' and 'manual' modes;
  // 'basedOnRollDiameter' falls back to centered since roll-diameter prediction
  // isn't implemented yet.
  const tieMarks = settings.tieEnabled
    ? [
        (() => {
          let tieX = patternWidth / 2;
          if (settings.tiePlacementMode === 'manual') {
            tieX = settings.tiePositionX;
          }
          return {
            id: generateId('tie'),
            x: tieX,
            y: backPanelTopY,
            width: settings.tieWidth,
            label: 'Tie placement',
          };
        })(),
      ]
    : [];

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
    tieMarks,
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
    tieMarks,
    labels: pocketLabels,
    dimensionLines: [],
    warnings: [],
    constructionNotes,
    printLayout,
  };
}
