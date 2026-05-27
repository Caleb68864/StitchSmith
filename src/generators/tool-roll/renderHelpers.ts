// SS-05: render helpers operate on layout data only. Pure presentation — no geometry math.
import type {
  UnitSystem,
  Point,
  BoundingBox,
  SvgPathData,
  DimensionLine,
  PatternLabel,
  StitchLine,
  FoldLine,
  HemLine,
} from './types.js';

// ── Unit formatting ────────────────────────────────────────────────────────

/** Formats a millimetre value as a human-readable dimension string. */
export function formatDimension(valueMm: number, units: UnitSystem): string {
  if (units === 'in') {
    const inches = valueMm / 25.4;
    const whole = Math.floor(inches);
    const frac = inches - whole;
    if (frac === 0) return `${whole}"`;
    // Approximate common fractions
    const nearest = Math.round(frac * 8) / 8;
    const fracStr = nearest > 0 ? ` ${toFraction(nearest)}` : '';
    return `${whole}${fracStr}"`;
  }
  return `${valueMm.toFixed(1)} mm`;
}

function toFraction(decimal: number): string {
  const fractions: Record<number, string> = {
    0.125: '1/8',
    0.25: '1/4',
    0.375: '3/8',
    0.5: '1/2',
    0.625: '5/8',
    0.75: '3/4',
    0.875: '7/8',
  };
  return fractions[decimal] ?? `${decimal.toFixed(3)}`;
}

// ── SVG path helpers ───────────────────────────────────────────────────────

/** Builds a rectangular SVG path from a bounding box. */
export function rectPath(box: BoundingBox): SvgPathData {
  const { x, y, width, height } = box;
  return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
}

/** Builds a dashed SVG path between two points (for stitch lines). */
export function stitchLinePath(x1: number, y1: number, x2: number, y2: number): SvgPathData {
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

/** Builds a single SVG line path. */
export function linePath(p1: Point, p2: Point): SvgPathData {
  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
}

// ── Dash patterns ──────────────────────────────────────────────────────────

export const DASH_PATTERNS = {
  stitchLine: '3 3',
  foldLine: '8 4',
  hemLine: '4 4 1 4',
  seamLine: '2 2',
  tileGrid: '5 5',
} as const;

// ── SVG attribute builders ─────────────────────────────────────────────────

/** Returns SVG stroke-dasharray attribute value for a line type. */
export function dashArrayFor(
  lineType: keyof typeof DASH_PATTERNS,
): string {
  return DASH_PATTERNS[lineType];
}

// ── Dimension line label positioning ──────────────────────────────────────

/**
 * Computes the midpoint label position for a dimension line.
 * The offset shifts the label perpendicular to the line direction.
 */
export function dimensionLabelPosition(dim: DimensionLine): Point {
  return {
    x: (dim.x1 + dim.x2) / 2,
    y: (dim.y1 + dim.y2) / 2 - dim.offset,
  };
}

// ── Label builders ─────────────────────────────────────────────────────────

/** Creates a centered pattern label at the given point. */
export function makeCenteredLabel(
  id: string,
  x: number,
  y: number,
  text: string,
  fontSize = 10,
): PatternLabel {
  return { id, x, y, text, fontSize, anchor: 'middle' };
}

// ── Marker factories ───────────────────────────────────────────────────────

/** Creates a horizontal stitch line entity. */
export function makeHorizontalStitchLine(
  id: string,
  x: number,
  y: number,
  width: number,
): StitchLine {
  return { id, x1: x, y1: y, x2: x + width, y2: y };
}

/** Creates a vertical stitch line entity. */
export function makeVerticalStitchLine(
  id: string,
  x: number,
  y: number,
  height: number,
): StitchLine {
  return { id, x1: x, y1: y, x2: x, y2: y + height };
}

/** Creates a horizontal fold line entity. */
export function makeHorizontalFoldLine(
  id: string,
  x: number,
  y: number,
  width: number,
): FoldLine {
  return { id, x1: x, y1: y, x2: x + width, y2: y };
}

/** Creates a horizontal hem line entity. */
export function makeHorizontalHemLine(
  id: string,
  x: number,
  y: number,
  width: number,
): HemLine {
  return { id, x1: x, y1: y, x2: x + width, y2: y };
}

// ── ViewBox helpers ────────────────────────────────────────────────────────

/** Returns an SVG viewBox string for the given bounding box with optional padding. */
export function viewBoxFromBounds(
  box: BoundingBox,
  padding = 0,
): string {
  return `${box.x - padding} ${box.y - padding} ${box.width + 2 * padding} ${box.height + 2 * padding}`;
}
