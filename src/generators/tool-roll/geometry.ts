import type {
  ToolItem,
  ToolRollSettings,
  SvgPathData,
  PrintLayout,
  PrintTile,
} from './types.js';
import { getPaperSize } from '../../utils/units.js';

// ── Pocket geometry ────────────────────────────────────────────────────────

/**
 * Returns the pocket depth for a tool.
 * If `settings` is omitted, falls back to visibleAmount mode (height - visibleAmount).
 * With settings.pocketDepthMode === 'heightPercentage', returns height * pocketHeightPercentage,
 * clamped to [0, height].
 */
export function calculatePocketDepth(
  tool: Pick<ToolItem, 'height' | 'visibleAmount'>,
  settings?: Pick<ToolRollSettings, 'pocketDepthMode' | 'pocketHeightPercentage'>,
): number {
  if (settings?.pocketDepthMode === 'heightPercentage') {
    const pct = Math.max(0, Math.min(1, settings.pocketHeightPercentage));
    return tool.height * pct;
  }
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
        (a, b) => calculatePocketDepth(a, settings) - calculatePocketDepth(b, settings),
      );
    case 'pocketDepthDescending':
      return copy.sort(
        (a, b) => calculatePocketDepth(b, settings) - calculatePocketDepth(a, settings),
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

/**
 * Returns a closed SVG path for the pocket panel cut line with a stepped or sloped top edge.
 * The panel sits in pattern coordinates with its bottom at `pocketBottomY` (the row where
 * all pocket bottoms align) and its top profile rising and falling with each pocket's depth.
 *
 * Inputs:
 *  - `pockets`: in left-to-right pattern order. Each carries x, pocketWidth, topY.
 *  - `leftX`, `rightX`: outer left/right boundary of the panel (typically the side hem allowances).
 *  - `bottomY`: y-coordinate of the bottom edge (in pattern coords; higher Y = further down).
 *  - `style`: 'stepped' (zig-zag) or 'sloped' (diagonal connections between pocket tops).
 */
/**
 * Builds a Fritsch–Carlson monotone cubic Hermite spline through a sorted set of
 * (x, y) points and emits it as a stitched sequence of cubic Bézier segments
 * starting from the first point with an implicit `M`. Monotonicity guarantees the
 * curve never overshoots the input y values — so when used for a pocket top, the
 * curve cannot rise above (smaller y than) any anchor point.
 */
function monotoneCubicSplineSegments(
  points: { x: number; y: number }[],
  startWithMove = false,
): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return startWithMove ? `M ${points[0].x} ${points[0].y}` : '';
  }
  const n = points.length;
  const dx: number[] = [];
  const m: number[] = []; // secant slopes
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    m.push((points[i + 1].y - points[i].y) / dx[i]);
  }
  // Initial tangents = average of adjacent secants, endpoints use one-sided
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) t[i] = 0;
    else t[i] = (m[i - 1] + m[i]) / 2;
  }
  // Fritsch–Carlson monotonicity adjustment
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
    } else {
      const a = t[i] / m[i];
      const b = t[i + 1] / m[i];
      const s = a * a + b * b;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        t[i] = tau * a * m[i];
        t[i + 1] = tau * b * m[i];
      }
    }
  }
  const out: string[] = [];
  if (startWithMove) out.push(`M ${points[0].x} ${points[0].y}`);
  for (let i = 0; i < n - 1; i++) {
    const cp1x = points[i].x + dx[i] / 3;
    const cp1y = points[i].y + (t[i] * dx[i]) / 3;
    const cp2x = points[i + 1].x - dx[i] / 3;
    const cp2y = points[i + 1].y - (t[i + 1] * dx[i]) / 3;
    out.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i + 1].x} ${points[i + 1].y}`);
  }
  return out.join(' ');
}

export function buildPocketPanelProfilePath(
  pockets: { x: number; pocketWidth: number; topY: number }[],
  leftX: number,
  rightX: number,
  bottomY: number,
  style: 'stepped' | 'sloped' | 'smooth' | 'arc',
): SvgPathData {
  if (pockets.length === 0) {
    return `M ${leftX} 0 H ${rightX} V ${bottomY} H ${leftX} Z`;
  }
  // Start at bottom-left, walk clockwise.
  const parts: string[] = [];
  parts.push(`M ${leftX} ${bottomY}`);
  parts.push(`H ${rightX}`); // bottom edge
  // Right edge: go up to right-most pocket's top
  const last = pockets[pockets.length - 1];
  parts.push(`V ${last.topY}`);
  if (style === 'stepped') {
    // Walk pockets right→left along the top, stepping vertically at each boundary.
    for (let i = pockets.length - 1; i > 0; i--) {
      const cur = pockets[i];
      const prev = pockets[i - 1];
      parts.push(`H ${cur.x}`); // horizontal across this pocket's top
      parts.push(`V ${prev.topY}`); // vertical step to neighbor's top
    }
    parts.push(`H ${leftX}`); // final horizontal across the leftmost pocket
  } else if (style === 'sloped') {
    // Sloped: each boundary is a single diagonal from this pocket's far edge to the
    // neighbor's near edge. No intermediate horizontal — the pocket top is a sawtooth.
    for (let i = pockets.length - 1; i > 0; i--) {
      const cur = pockets[i];
      const prev = pockets[i - 1];
      parts.push(`L ${cur.x} ${prev.topY}`);
    }
    parts.push(`H ${leftX}`); // close across leftmost pocket
  } else if (style === 'smooth') {
    // Smooth: replace each diagonal with a cubic Bézier that meets the adjacent
    // pocket horizontally at both ends. No angles anywhere along the top.
    // For each pocket i: start at (cur.x + cur.width, cur.topY), end at (cur.x, prev.topY).
    // Control points lie on horizontal tangents at start and end.
    for (let i = pockets.length - 1; i > 0; i--) {
      const cur = pockets[i];
      const prev = pockets[i - 1];
      const startX = cur.x + cur.pocketWidth;
      const endX = cur.x;
      const cp1x = startX - cur.pocketWidth / 2;
      const cp2x = endX + cur.pocketWidth / 2;
      parts.push(`C ${cp1x} ${cur.topY}, ${cp2x} ${prev.topY}, ${endX} ${prev.topY}`);
    }
    parts.push(`H ${leftX}`); // leftmost pocket top — still horizontal (C0 + C1 continuous)
  } else {
    // Arc: ONE cubic Bézier from the rightmost edge to the leftmost edge.
    // Endpoints anchor at the first and last pockets' allowed tops; the curve
    // sweeps smoothly between them with horizontal tangents at both ends.
    //
    // Constraint enforcement: after laying down the initial curve, we check
    // each intermediate pocket's center. If the curve would dip ABOVE that
    // pocket's allowed top (smaller y → deeper than 75%), we push the offending
    // control point downward (larger y) until every pocket's ceiling is honored.
    // Result: one sweeping arc that never makes any pocket deeper than allowed.
    const firstTop = pockets[0].topY;
    const lastTop = pockets[pockets.length - 1].topY;
    const spanX = rightX - leftX;

    // Initial horizontal-tangent handles (handle length = 1/3 of span).
    let cp1x = leftX + spanX / 3;
    let cp1y = firstTop;
    let cp2x = rightX - spanX / 3;
    let cp2y = lastTop;

    // Helper: sample y at parametric t for a cubic Bézier with current cps.
    const sampleY = (t: number, p0y: number, c1y: number, c2y: number, p3y: number) => {
      const mt = 1 - t;
      return mt * mt * mt * p0y + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * p3y;
    };
    // Helper: find t such that bezier x(t) ≈ targetX (binary search).
    const findT = (targetX: number, p0x: number, c1x: number, c2x: number, p3x: number) => {
      let lo = 0, hi = 1;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const mt = 1 - mid;
        const x = mt * mt * mt * p0x + 3 * mt * mt * mid * c1x + 3 * mt * mid * mid * c2x + mid * mid * mid * p3x;
        if (x < targetX) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    };

    // Up to a few correction passes: if curve overshoots any ceiling, lower the
    // nearer control point's y just enough to clear it.
    for (let pass = 0; pass < 6; pass++) {
      let maxOver = 0;
      let overSide: 'left' | 'right' = 'left';
      for (const p of pockets) {
        const cx = p.x + p.pocketWidth / 2;
        const t = findT(cx, leftX, cp1x, cp2x, rightX);
        const yAtT = sampleY(t, firstTop, cp1y, cp2y, lastTop);
        // "Over" the ceiling means curve is above (smaller y than) the pocket's allowed top.
        const overshoot = p.topY - yAtT; // positive = violation
        if (overshoot > maxOver) {
          maxOver = overshoot;
          overSide = t < 0.5 ? 'left' : 'right';
        }
      }
      if (maxOver <= 0.01) break; // tolerance in mm — close enough
      // Push the nearer control point down by the overshoot amount (plus a small margin).
      if (overSide === 'left') cp1y += maxOver + 0.5;
      else cp2y += maxOver + 0.5;
    }

    // Emit one cubic, traversed right → left.
    parts.push(`C ${cp2x} ${cp2y}, ${cp1x} ${cp1y}, ${leftX} ${firstTop}`);
  }
  // Suppress unused-var warning when monotoneCubicSplineSegments isn't called above.
  void monotoneCubicSplineSegments;
  parts.push(`Z`);
  return parts.join(' ');
}

/**
 * Builds the flap cut path when the flap follows the pocket profile so that every
 * tool gets the same overlap when the flap is folded over.
 *
 * The flap sits in the laid-out pattern BELOW the back panel (y > backPanelBottomY).
 * Its top edge is the fold line (straight, at `foldY`). Its bottom edge varies per
 * pocket so that when folded, the bottom edge sits at (topY_i − overlap) above each
 * pocket — giving each tool the same coverage regardless of tool height.
 *
 * Pocket inputs carry the precomputed `flapBottomY` (in laid-out coords). Style
 * controls the connection between pockets, mirroring the pocket-top styles.
 */
/**
 * Builds an OPEN path tracing only the per-pocket profile edge of the flap
 * (without the side walls or attached-edge segments). Used for the free-edge
 * hem fold line, which sits flapHemAllowance below the cut top and follows the
 * same shape.
 *
 * Same input shape as buildFlapProfilePath, but emits only:
 *   M leftX firstY  →  profile right-to-left  →  ends at rightX lastY
 * (Or the reverse — endpoints don't include side walls.)
 *
 * Walks LEFT to RIGHT for natural reading order.
 */
export function buildOpenProfilePath(
  pockets: { x: number; pocketWidth: number; y: number }[],
  leftX: number,
  rightX: number,
  style: 'stepped' | 'sloped' | 'smooth' | 'arc',
): SvgPathData {
  if (pockets.length === 0) return '';
  const parts: string[] = [];
  const first = pockets[0];
  parts.push(`M ${leftX} ${first.y}`);
  if (style === 'stepped') {
    for (let i = 0; i < pockets.length; i++) {
      const cur = pockets[i];
      const next = pockets[i + 1];
      // Horizontal across this pocket
      const endX = next ? cur.x + cur.pocketWidth : rightX;
      parts.push(`H ${endX}`);
      if (next) parts.push(`V ${next.y}`); // step to next pocket's y
    }
  } else if (style === 'sloped') {
    for (let i = 0; i < pockets.length - 1; i++) {
      const next = pockets[i + 1];
      parts.push(`L ${next.x} ${next.y}`);
    }
    parts.push(`H ${rightX}`);
  } else if (style === 'smooth') {
    for (let i = 0; i < pockets.length - 1; i++) {
      const cur = pockets[i];
      const next = pockets[i + 1];
      const startX = cur.x + cur.pocketWidth;
      const endX = next.x;
      const cp1x = startX - cur.pocketWidth / 2;
      const cp2x = endX + next.pocketWidth / 2;
      // We're walking L→R, so first emit H to the start of the curve, then C to next pocket
      // Simpler: emit C from current position to (next.x, next.y) with horizontal tangents
      parts.push(`C ${cp1x} ${cur.y}, ${cp2x} ${next.y}, ${next.x} ${next.y}`);
    }
    parts.push(`H ${rightX}`);
  } else {
    // Arc: single cubic Bézier from leftmost to rightmost, with the SAME post-
    // correction logic used by buildPocketPanelProfilePath / buildFlapProfilePath
    // so an offset profile parallels the cut path. Detects the constraint direction
    // from the input: if pocket ys span "above" the endpoint baseline, we treat
    // this as a flap-style profile (curve must stay ABOVE every pocket — y_curve <=
    // pocket.y); otherwise it's pocket-style (curve must stay BELOW every pocket —
    // y_curve >= pocket.y).
    const last = pockets[pockets.length - 1];
    const spanX = rightX - leftX;
    let cp1x = leftX + spanX / 3;
    let cp1y = first.y;
    let cp2x = rightX - spanX / 3;
    let cp2y = last.y;

    const sampleY = (t: number, p0y: number, c1y: number, c2y: number, p3y: number) => {
      const mt = 1 - t;
      return mt * mt * mt * p0y + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * p3y;
    };
    const findT = (targetX: number, p0x: number, c1x: number, c2x: number, p3x: number) => {
      let lo = 0, hi = 1;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const mt = 1 - mid;
        const x = mt * mt * mt * p0x + 3 * mt * mt * mid * c1x + 3 * mt * mid * mid * c2x + mid * mid * mid * p3x;
        if (x < targetX) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    };

    // Decide the constraint direction by sampling whether intermediate pocket ys
    // are mostly ABOVE or BELOW the linear interpolation between endpoints.
    // If pockets are mostly above the line (smaller y) we use 'flap' direction
    // (curve must stay above them); otherwise 'pocket' direction.
    let aboveCount = 0;
    let belowCount = 0;
    for (const p of pockets) {
      const interp = first.y + (last.y - first.y) * ((p.x + p.pocketWidth / 2 - first.x) / (last.x - first.x || 1));
      if (p.y < interp) aboveCount++;
      else if (p.y > interp) belowCount++;
    }
    const flapStyle = aboveCount >= belowCount;

    for (let pass = 0; pass < 6; pass++) {
      let maxViolation = 0;
      let violSide: 'left' | 'right' = 'left';
      for (const p of pockets) {
        const cx = p.x + p.pocketWidth / 2;
        const t = findT(cx, leftX, cp1x, cp2x, rightX);
        const yAtT = sampleY(t, first.y, cp1y, cp2y, last.y);
        // pocket-style (constraint: curve.y >= p.y): violation = p.y - yAtT > 0
        // flap-style    (constraint: curve.y <= p.y): violation = yAtT - p.y > 0
        const violation = flapStyle ? yAtT - p.y : p.y - yAtT;
        if (violation > maxViolation) {
          maxViolation = violation;
          violSide = t < 0.5 ? 'left' : 'right';
        }
      }
      if (maxViolation <= 0.01) break;
      const sign = flapStyle ? -1 : 1;
      if (violSide === 'left') cp1y += sign * (maxViolation + 0.5);
      else cp2y += sign * (maxViolation + 0.5);
    }

    parts.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${rightX} ${last.y}`);
  }
  return parts.join(' ');
}

export function buildFlapProfilePath(
  pockets: { x: number; pocketWidth: number; flapBottomY: number }[],
  leftX: number,
  rightX: number,
  foldY: number,
  style: 'stepped' | 'sloped' | 'smooth' | 'arc',
  /**
   * Which side of `foldY` the flap extends from.
   * 'below' — fold at top, flap drapes downward (`flapBottomY` > `foldY`).
   * 'above' — fold at bottom, flap extends upward (`flapBottomY` < `foldY`).
   * Affects the arc post-correction direction.
   */
  direction: 'below' | 'above' = 'below',
): SvgPathData {
  if (pockets.length === 0) {
    return `M ${leftX} ${foldY} H ${rightX} V ${foldY + 30} H ${leftX} Z`;
  }
  const parts: string[] = [];
  // Start at top-left (the fold line) and walk clockwise.
  parts.push(`M ${leftX} ${foldY}`);
  parts.push(`H ${rightX}`); // top edge (the fold line)
  const last = pockets[pockets.length - 1];
  parts.push(`V ${last.flapBottomY}`); // right wall down to the rightmost pocket's flap depth

  if (style === 'stepped') {
    for (let i = pockets.length - 1; i > 0; i--) {
      const cur = pockets[i];
      const prev = pockets[i - 1];
      parts.push(`H ${cur.x}`);
      parts.push(`V ${prev.flapBottomY}`);
    }
    parts.push(`H ${leftX}`);
  } else if (style === 'sloped') {
    for (let i = pockets.length - 1; i > 0; i--) {
      const cur = pockets[i];
      const prev = pockets[i - 1];
      parts.push(`L ${cur.x} ${prev.flapBottomY}`);
    }
    parts.push(`H ${leftX}`);
  } else if (style === 'smooth') {
    for (let i = pockets.length - 1; i > 0; i--) {
      const cur = pockets[i];
      const prev = pockets[i - 1];
      const startX = cur.x + cur.pocketWidth;
      const endX = cur.x;
      const cp1x = startX - cur.pocketWidth / 2;
      const cp2x = endX + cur.pocketWidth / 2;
      parts.push(`C ${cp1x} ${cur.flapBottomY}, ${cp2x} ${prev.flapBottomY}, ${endX} ${prev.flapBottomY}`);
    }
    parts.push(`H ${leftX}`);
  } else {
    // Arc: single cubic Bézier from rightmost flap depth to leftmost. Post-correct
    // by pushing the nearer control point DOWN (larger y) until no pocket is
    // under-covered (curve must not be ABOVE any pocket's flapBottomY target).
    const firstBot = pockets[0].flapBottomY;
    const lastBot = pockets[pockets.length - 1].flapBottomY;
    const spanX = rightX - leftX;
    let cp1x = leftX + spanX / 3;
    let cp1y = firstBot;
    let cp2x = rightX - spanX / 3;
    let cp2y = lastBot;

    const sampleY = (t: number, p0y: number, c1y: number, c2y: number, p3y: number) => {
      const mt = 1 - t;
      return mt * mt * mt * p0y + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * p3y;
    };
    const findT = (targetX: number, p0x: number, c1x: number, c2x: number, p3x: number) => {
      let lo = 0, hi = 1;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const mt = 1 - mid;
        const x = mt * mt * mt * p0x + 3 * mt * mt * mid * c1x + 3 * mt * mid * mid * c2x + mid * mid * mid * p3x;
        if (x < targetX) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    };

    for (let pass = 0; pass < 6; pass++) {
      let maxViolation = 0;
      let violSide: 'left' | 'right' = 'left';
      for (const p of pockets) {
        const cx = p.x + p.pocketWidth / 2;
        const t = findT(cx, leftX, cp1x, cp2x, rightX);
        const yAtT = sampleY(t, firstBot, cp1y, cp2y, lastBot);
        // For 'below' direction: under-coverage means curve.y < target.y → fix by pushing cp DOWN (+y).
        // For 'above' direction: under-coverage means curve.y > target.y → fix by pushing cp UP (−y).
        const violation = direction === 'below' ? p.flapBottomY - yAtT : yAtT - p.flapBottomY;
        if (violation > maxViolation) {
          maxViolation = violation;
          violSide = t < 0.5 ? 'left' : 'right';
        }
      }
      if (maxViolation <= 0.01) break;
      const sign = direction === 'below' ? 1 : -1;
      if (violSide === 'left') cp1y += sign * (maxViolation + 0.5);
      else cp2y += sign * (maxViolation + 0.5);
    }

    parts.push(`C ${cp2x} ${cp2y}, ${cp1x} ${cp1y}, ${leftX} ${firstBot}`);
  }

  parts.push(`Z`);
  return parts.join(' ');
}
