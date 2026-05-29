/**
 * Zip Pouch Generator — Bill of Materials builder
 */

import type { ResolvedInputs, BomRow } from './types.js';

function roundUpTo(value: number, multiple: number): number {
  return Math.ceil(value / multiple) * multiple;
}

/**
 * Compute cut panel dimensions from resolved inputs.
 *   cut_width  = finished_length + 2 × seam_allowance
 *   cut_height = finished_width + (finished_depth / 2) + seam_allowance
 */
export function computeCutDimensions(r: ResolvedInputs): { cutWidth: number; cutHeight: number } {
  return {
    cutWidth: r.finished_length + 2 * r.seam_allowance,
    cutHeight: r.finished_width + r.finished_depth / 2 + r.seam_allowance,
  };
}

/**
 * Build the bill of materials for a zip pouch.
 *
 * Rows emitted:
 *   - Shell fabric (2 panels)
 *   - YKK coil zipper (length = cut_width + 25, rounded up to nearest 50 mm)
 *   - grosgrain ribbon binding (perimeter × 1.1, rounded up to nearest 100 mm)
 *   - grosgrain pull loops (2 strips × 75 mm, conditional on pull_loops)
 */
export function buildBom(r: ResolvedInputs): BomRow[] {
  const { finished_depth, zip_gauge, grosgrain_width, pull_loops } = r;
  const { cutWidth, cutHeight } = computeCutDimensions(r);

  // Zipper: cut_width + 25 mm ease, rounded up to nearest 50 mm
  const zipperLength = roundUpTo(cutWidth + 25, 50);

  // Grosgrain binding: bound seam perimeter is 2×cut_height + cut_width minus
  // the boxed corners (2×finished_depth), with 10% ease, rounded up to 100 mm.
  const boundSeamPerimeter = 2 * cutHeight + cutWidth - 2 * finished_depth;
  const grosgrainLength = roundUpTo(boundSeamPerimeter * 1.1, 100);

  const rows: BomRow[] = [
    {
      id: 'shell-fabric',
      description: 'shell fabric',
      quantity: 2,
      unit: 'panels',
      notes: `${cutWidth} mm × ${cutHeight} mm per panel`,
    },
    {
      id: 'zipper',
      description: `YKK coil zipper ${zip_gauge}`,
      quantity: zipperLength,
      unit: 'mm',
    },
    {
      id: 'grosgrain-binding',
      description: `grosgrain ribbon binding (${grosgrain_width} mm wide)`,
      quantity: grosgrainLength,
      unit: 'mm',
    },
  ];

  if (pull_loops) {
    rows.push({
      id: 'pull-loops',
      description: 'grosgrain pull loops',
      quantity: 2,
      unit: 'strips',
      notes: `75 mm × ${grosgrain_width} mm each`,
    });
  }

  return rows;
}
