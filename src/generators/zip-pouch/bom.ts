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
    const halfCrossHeight = (finished_width + finished_depth + 2 * sa) / 2;
    const cornerCutout = finished_depth / 2;
    const zipperLength = roundUpTo(panelCutWidth + 25, 50);

    return [
      {
        id: 'shell-fabric',
        description: 'shell fabric (half-cross panels)',
        quantity: 2,
        unit: 'panels',
        notes: `half-cross, bounding box ${panelCutWidth} × ${halfCrossHeight} mm, corner cutouts ${cornerCutout} × ${cornerCutout} mm`,
      },
      { id: 'zipper', description: `YKK coil zipper ${zip_gauge}`, quantity: zipperLength, unit: 'mm' },
    ];
  }

  if (construction_style === 'gusset-strip') {
    const panelCutWidth = finished_length + 2 * sa;
    const panelCutHeight = finished_width + 2 * sa;
    const gussetH = finished_depth + 2 * sa;
    const zipperLength = roundUpTo(panelCutWidth + 25, 50);

    if (r.zipper_position === 'front') {
      // Front-zipper: back panel + split front top/bottom strips + full-perimeter gusset.
      const zipFromTop = r.zip_from_top;
      const frontTopH = zipFromTop + sa;
      const frontBottomH = finished_width - zipFromTop + sa;
      const fullGussetW = 2 * finished_length + 2 * finished_width + 2 * sa;

      return [
        { id: 'shell-fabric-back', description: 'shell fabric (back panel)', quantity: 1, unit: 'panel', notes: `${panelCutWidth} × ${panelCutHeight} mm` },
        { id: 'shell-fabric-front-top', description: 'shell fabric (front top strip)', quantity: 1, unit: 'strip', notes: `${panelCutWidth} × ${frontTopH} mm` },
        { id: 'shell-fabric-front-bottom', description: 'shell fabric (front bottom strip)', quantity: 1, unit: 'strip', notes: `${panelCutWidth} × ${frontBottomH} mm` },
        { id: 'gusset-fabric', description: 'full-perimeter gusset fabric', quantity: 1, unit: 'strip', notes: `${fullGussetW} × ${gussetH} mm` },
        { id: 'zipper', description: `YKK coil zipper ${zip_gauge}`, quantity: zipperLength, unit: 'mm' },
      ];
    }

    // Top-zipper (default): front + back panels + U-shape gusset strip + two end tabs.
    const gussetW = 2 * finished_width + finished_length + 2 * sa;
    const tabW = finished_depth + 2 * sa;
    const tabH = 15 + sa;

    return [
      { id: 'shell-fabric', description: 'shell fabric (panels)', quantity: 2, unit: 'panels', notes: `${panelCutWidth} × ${panelCutHeight} mm each` },
      { id: 'gusset-fabric', description: 'gusset strip fabric', quantity: 1, unit: 'strip', notes: `${gussetW} × ${gussetH} mm` },
      { id: 'zipper-end-tabs', description: 'shell fabric (zipper end tabs)', quantity: 2, unit: 'tabs', notes: `${tabW} × ${tabH} mm each` },
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
    const tabW = finished_depth + 2 * sa;
    const tabH = 15 + sa;
    const zipperLength = roundUpTo(frontBackW + 4 * sa, 50);

    return [
      { id: 'shell-fabric-front-back', description: 'shell fabric (front/back)', quantity: 2, unit: 'panels', notes: `${frontBackW} × ${frontBackH} mm each` },
      { id: 'shell-fabric-bottom', description: 'shell fabric (bottom)', quantity: 1, unit: 'panel', notes: `${bottomW} × ${bottomH} mm` },
      { id: 'shell-fabric-ends', description: 'shell fabric (end panels)', quantity: 2, unit: 'panels', notes: `${endW} × ${endH} mm each` },
      { id: 'zipper-end-tabs', description: 'shell fabric (zipper end tabs)', quantity: 2, unit: 'tabs', notes: `${tabW} × ${tabH} mm each` },
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
