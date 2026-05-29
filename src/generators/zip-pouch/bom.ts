/**
 * Zip Pouch Generator — Bill of Materials builder
 */

import type { ResolvedInputs, BomRow } from './types.js';

function roundUpTo(value: number, multiple: number): number {
  return Math.ceil(value / multiple) * multiple;
}

/**
 * Compute cut panel dimensions from resolved inputs (boxed style).
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
 * Dispatches based on construction_style.
 */
export function buildBom(r: ResolvedInputs): BomRow[] {
  const { finished_length, finished_width, finished_depth, seam_allowance: sa, zip_gauge, grosgrain_width, pull_loops, construction_style } = r;

  if (construction_style === 'cross-bottom') {
    const panelCutWidth = finished_length + finished_depth + 2 * sa;
    const panelCutHeight = finished_width + finished_depth + 2 * sa;
    const cornerCutout = finished_depth / 2;
    const zipperStripH = cornerCutout + sa;
    const zipperLength = roundUpTo(panelCutWidth + 25, 50);

    return [
      { id: 'shell-fabric', description: 'shell fabric (cross panels)', quantity: 2, unit: 'panels', notes: `cross-bottom ${panelCutWidth} × ${panelCutHeight} mm` },
      { id: 'zipper-strip-fabric', description: 'zipper strip fabric', quantity: 2, unit: 'strips', notes: `${panelCutWidth} × ${zipperStripH} mm each` },
      { id: 'zipper', description: `YKK coil zipper ${zip_gauge}`, quantity: zipperLength, unit: 'mm' },
    ];
  }

  if (construction_style === 'gusset-strip') {
    const panelCutWidth = finished_length + 2 * sa;
    const panelCutHeight = finished_width + 2 * sa;
    const gussetW = 2 * finished_width + finished_length + 2 * sa;
    const gussetH = finished_depth + 2 * sa;
    const zipperLength = roundUpTo(panelCutWidth + 25, 50);

    return [
      { id: 'shell-fabric', description: 'shell fabric (panels)', quantity: 2, unit: 'panels', notes: `${panelCutWidth} × ${panelCutHeight} mm each` },
      { id: 'gusset-fabric', description: 'gusset strip fabric', quantity: 1, unit: 'strip', notes: `${gussetW} × ${gussetH} mm` },
      { id: 'zipper', description: `YKK coil zipper ${zip_gauge}`, quantity: zipperLength, unit: 'mm' },
    ];
  }

  if (construction_style === 'multi-panel') {
    const frontBackW = finished_length + 2 * sa;
    const frontBackH = finished_width + 2 * sa;
    const bottomW = finished_length + 2 * sa;
    const bottomH = finished_depth + 2 * sa;
    const endW = finished_width + 2 * sa;
    const endH = finished_depth + 2 * sa;
    const zipperLength = roundUpTo(frontBackW + 4 * sa, 50);

    return [
      { id: 'shell-fabric-front-back', description: 'shell fabric (front/back)', quantity: 2, unit: 'panels', notes: `${frontBackW} × ${frontBackH} mm each` },
      { id: 'shell-fabric-bottom', description: 'shell fabric (bottom)', quantity: 1, unit: 'panel', notes: `${bottomW} × ${bottomH} mm` },
      { id: 'shell-fabric-ends', description: 'shell fabric (end panels)', quantity: 2, unit: 'panels', notes: `${endW} × ${endH} mm each` },
      { id: 'zipper', description: `YKK coil zipper ${zip_gauge}`, quantity: zipperLength, unit: 'mm' },
    ];
  }

  // 'boxed' — original
  const { cutWidth, cutHeight } = computeCutDimensions(r);
  const zipperLength = roundUpTo(cutWidth + 25, 50);
  const boundSeamPerimeter = 2 * cutHeight + cutWidth - 2 * finished_depth;
  const grosgrainLength = roundUpTo(boundSeamPerimeter * 1.1, 100);

  const rows: BomRow[] = [
    { id: 'shell-fabric', description: 'shell fabric', quantity: 2, unit: 'panels', notes: `${cutWidth} mm × ${cutHeight} mm per panel` },
    { id: 'zipper', description: `YKK coil zipper ${zip_gauge}`, quantity: zipperLength, unit: 'mm' },
    { id: 'grosgrain-binding', description: `grosgrain ribbon binding (${grosgrain_width} mm wide)`, quantity: grosgrainLength, unit: 'mm' },
  ];

  if (pull_loops) {
    rows.push({ id: 'pull-loops', description: 'grosgrain pull loops', quantity: 2, unit: 'strips', notes: `75 mm × ${grosgrain_width} mm each` });
  }

  return rows;
}
