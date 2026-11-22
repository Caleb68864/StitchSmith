/**
 * Baffle-chamber primitive and fill-weight maths (roadmap 10c).
 *
 * A quilt or underquilt is a shell and a liner held apart by chambers. The
 * chambers run across the piece, one after another along its length, each
 * closed by a baffle (a mesh wall of the loft height sewn to both layers) or
 * by a line sewn through both layers (sewn-through: the loft falls to nothing
 * at every line).
 *
 * `layoutChambers` places the chamber walls at an even pitch no longer than
 * the requested spacing and gives each chamber its volume and its fill:
 *
 *   fill (oz) = volume (in³) × (1 + overstuff) / fill power (in³/oz)
 *
 * Fill power is the US figure (cubic inches per ounce), whatever the display
 * unit. Volume models, both approximations and said so in every caller:
 *
 * - baffled: a box, width × pitch × loft (the baffle height);
 * - sewn-through: a lens whose cross-section is a parabola peaking at the
 *   loft mid-chamber and falling to 0 at both stitch lines, 2/3 of the box.
 *
 * The width may vary along the length (a taper); each chamber's width is
 * integrated with Simpson's rule, exact for a straight taper.
 *
 * Lengths are millimetres; volumes mm³; fill in grams.
 */

const IN = 25.4;
/** Cubic millimetres in a cubic inch. */
export const MM3_PER_IN3 = IN * IN * IN;
/** Grams in an ounce (avoirdupois). */
export const G_PER_OZ = 28.349523125;
/** Sewn-through cross-section: a parabola's area is 2/3 of its bounding box. */
export const SEWN_THROUGH_PROFILE = 2 / 3;

/** More chambers than this is an input mistake (or garbage), not a quilt; refuse rather than allocate them. */
export const MAX_CHAMBERS = 500;

export type ChamberStyle = 'baffled' | 'sewn_through';

export interface ChamberSpec {
  /** Finished length the chambers fill, end to end. */
  length: number;
  /** Largest allowed wall-to-wall pitch; the actual pitch divides the length evenly. */
  spacing: number;
  /** Loft: the baffle height, or the sewn-through peak. */
  loft: number;
  style: ChamberStyle;
  /** Finished width at distance y from the first end (0 ≤ y ≤ length). */
  widthAt: (y: number) => number;
  /** US fill power, in³/oz. */
  fillPower: number;
  /** Overstuff, percent over the chamber volume. */
  overstuffPct: number;
}

export interface Chamber {
  /** 1-based, from the first end. */
  index: number;
  y0: number;
  y1: number;
  /** Mean finished width across the chamber. */
  width: number;
  volumeMm3: number;
  fillG: number;
}

export interface ChamberLayout {
  count: number;
  pitch: number;
  /** y of every interior wall (count − 1 of them): a baffle or a sewn-through line. */
  wallY: number[];
  chambers: Chamber[];
  totalVolumeMm3: number;
  totalFillG: number;
}

export type ChamberResult = { ok: true; value: ChamberLayout } | { ok: false; error: string };

/** Grams of fill for a volume at a fill power and overstuff. */
export function fillGrams(volumeMm3: number, fillPower: number, overstuffPct: number): number {
  return ((volumeMm3 / MM3_PER_IN3) * (1 + overstuffPct / 100) / fillPower) * G_PER_OZ;
}

/** Cross-section factor of a chamber style (1 for a box). */
export function profileFactor(style: ChamberStyle): number {
  return style === 'sewn_through' ? SEWN_THROUGH_PROFILE : 1;
}

const pos = (v: number) => Number.isFinite(v) && v > 0;

export function layoutChambers(spec: ChamberSpec): ChamberResult {
  const { length, spacing, loft, style, widthAt, fillPower, overstuffPct } = spec;
  if (!pos(length)) return { ok: false, error: 'length must be a positive number' };
  if (!pos(spacing)) return { ok: false, error: 'spacing must be a positive number' };
  if (!pos(loft)) return { ok: false, error: 'loft must be a positive number' };
  if (!pos(fillPower)) return { ok: false, error: 'fill power must be a positive number' };
  if (!Number.isFinite(overstuffPct) || overstuffPct < 0) return { ok: false, error: 'overstuff must be 0 or more' };
  // Tolerance so a spacing that divides the length exactly is not bumped by float residue.
  const want = length / spacing;
  if (!(want <= MAX_CHAMBERS)) return { ok: false, error: `the spacing gives more than ${MAX_CHAMBERS} chambers along the length` };
  const count = Math.max(1, Math.ceil(want - 1e-9));
  const pitch = length / count;
  const k = profileFactor(style);
  const chambers: Chamber[] = [];
  for (let i = 0; i < count; i++) {
    const y0 = i * pitch;
    const y1 = (i + 1) * pitch;
    const w0 = widthAt(y0), wm = widthAt((y0 + y1) / 2), w1 = widthAt(y1);
    if (![w0, wm, w1].every(pos)) return { ok: false, error: `width must be positive along the length (chamber ${i + 1})` };
    const width = (w0 + 4 * wm + w1) / 6;
    const volumeMm3 = width * pitch * loft * k;
    chambers.push({ index: i + 1, y0, y1, width, volumeMm3, fillG: fillGrams(volumeMm3, fillPower, overstuffPct) });
  }
  const totalVolumeMm3 = chambers.reduce((s, c) => s + c.volumeMm3, 0);
  return {
    ok: true,
    value: {
      count,
      pitch,
      wallY: chambers.slice(1).map((c) => c.y0),
      chambers,
      totalVolumeMm3,
      totalFillG: chambers.reduce((s, c) => s + c.fillG, 0),
    },
  };
}
