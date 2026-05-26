export const FRENCH_SEAM_TOTAL_MM = 12.7;

export function frenchSeamAllowance(standardSaMm: number): number {
  return Math.max(standardSaMm * 2, FRENCH_SEAM_TOTAL_MM);
}
