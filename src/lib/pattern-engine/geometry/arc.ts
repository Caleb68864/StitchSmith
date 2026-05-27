/**
 * Arc-correction geometry ported from the tool-roll generator.
 * Provides Fritsch–Carlson monotone cubic splines and constrained single-arc
 * Bézier fitting with control-point post-correction.
 */

export type ArcConstraintDirection = 'flap' | 'pocket';

export interface AnchorPoint {
  x: number;
  y: number;
  pocketWidth?: number;
}

/**
 * Samples the y coordinate of a cubic Bézier at parametric t.
 */
export function sampleBezierY(
  t: number,
  p0y: number, c1y: number, c2y: number, p3y: number,
): number {
  const mt = 1 - t;
  return mt * mt * mt * p0y + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * p3y;
}

/**
 * Finds the parameter t such that the Bézier x(t) ≈ targetX via binary search.
 */
export function findBezierT(
  targetX: number,
  p0x: number, c1x: number, c2x: number, p3x: number,
): number {
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const mt = 1 - mid;
    const x =
      mt * mt * mt * p0x +
      3 * mt * mt * mid * c1x +
      3 * mt * mid * mid * c2x +
      mid * mid * mid * p3x;
    if (x < targetX) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface ConstrainedArcResult {
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
}

/**
 * Fits a single cubic Bézier arc between (startX, startY) and (endX, endY)
 * with horizontal tangents at both ends, then post-corrects control points
 * to satisfy per-anchor constraints.
 *
 * For 'pocket' direction: curve.y must stay >= anchor.y (below or at each anchor).
 * For 'flap' direction:   curve.y must stay <= anchor.y (above or at each anchor).
 */
export function fitConstrainedArc(
  startX: number, startY: number,
  endX: number, endY: number,
  anchors: AnchorPoint[],
  direction: ArcConstraintDirection = 'pocket',
): ConstrainedArcResult {
  const spanX = endX - startX;
  let cp1x = startX + spanX / 3;
  let cp1y = startY;
  let cp2x = endX - spanX / 3;
  let cp2y = endY;

  for (let pass = 0; pass < 6; pass++) {
    let maxViolation = 0;
    let violSide: 'left' | 'right' = 'left';
    for (const anchor of anchors) {
      const cx = anchor.pocketWidth !== undefined
        ? anchor.x + anchor.pocketWidth / 2
        : anchor.x;
      const t = findBezierT(cx, startX, cp1x, cp2x, endX);
      const yAtT = sampleBezierY(t, startY, cp1y, cp2y, endY);
      const violation = direction === 'flap'
        ? yAtT - anchor.y   // flap: curve must be <= anchor.y
        : anchor.y - yAtT;  // pocket: curve must be >= anchor.y
      if (violation > maxViolation) {
        maxViolation = violation;
        violSide = t < 0.5 ? 'left' : 'right';
      }
    }
    if (maxViolation <= 0.01) break;
    const sign = direction === 'flap' ? -1 : 1;
    if (violSide === 'left') cp1y += sign * (maxViolation + 0.5);
    else cp2y += sign * (maxViolation + 0.5);
  }

  return { cp1x, cp1y, cp2x, cp2y };
}

/**
 * Builds a Fritsch–Carlson monotone cubic Hermite spline through a sorted set
 * of (x, y) points and returns it as cubic Bézier segments.
 * If startWithMove is true, prepends an M command.
 */
export function monotoneCubicSplineSegments(
  points: { x: number; y: number }[],
  startWithMove = false,
): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return startWithMove ? `M ${points[0].x} ${points[0].y}` : '';
  }
  const n = points.length;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    m.push((points[i + 1].y - points[i].y) / dx[i]);
  }
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) t[i] = 0;
    else t[i] = (m[i - 1] + m[i]) / 2;
  }
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
