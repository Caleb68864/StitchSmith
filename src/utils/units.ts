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
