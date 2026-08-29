export type UnitSystem = 'mm' | 'in';

export const PAPER_SIZES_MM = {
  letter: { width: 215.9, height: 279.4 },
  a4:     { width: 210,   height: 297   },
} as const;

export type PrintPaperSize = 'letter' | 'a4';
export type PrintOrientation = 'portrait' | 'landscape';

export function inchesToMm(value: number): number { return value * 25.4; }
export function mmToInches(value: number): number { return value / 25.4; }

export function getPaperSize(size: PrintPaperSize, orientation: PrintOrientation): { width: number; height: number } {
  const p = PAPER_SIZES_MM[size];
  return orientation === 'portrait'
    ? { width: p.width, height: p.height }
    : { width: p.height, height: p.width };
}

/**
 * Convert the length-valued `keys` of `obj` from one display unit to another
 * and return ONLY the converted entries, ready to spread into an inputs patch.
 *
 * Every settings panel that offers a mm/in toggle must call this when the
 * unit changes: flipping the label while leaving the numbers alone silently
 * reinterprets a 28 in waist as a 28 mm one (a 25.4x change to the garment).
 *
 * Results are rounded to 4 decimals so a round trip (in -> mm -> in) lands
 * back on the number the user typed rather than binary float dust. Missing
 * and non-finite values are skipped, so blank fields stay blank.
 */
export function convertLengthValues<T extends object>(
  obj: T,
  keys: readonly (keyof T)[],
  from: UnitSystem,
  to: UnitSystem,
): Partial<T> {
  const out: Partial<T> = {};
  if (from === to) return out;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const converted = to === 'mm' ? inchesToMm(v) : mmToInches(v);
    out[k] = (Math.round(converted * 1e4) / 1e4) as T[keyof T];
  }
  return out;
}
