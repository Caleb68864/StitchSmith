/**
 * Zip Pouch Generator — Bill of Materials builder
 *
 * Every dimension here comes from ./dimensions.js, which buildPattern.ts also
 * reads. Do not re-derive cut sizes locally: the BOM must describe exactly the
 * pieces the pattern draws.
 */

import type { ResolvedInputs, BomRow } from './types.js';
import {
  boxedDims,
  crossBottomDims,
  gussetStripDims,
  multiPanelDims,
  zipperEndTabDims,
  zipperLengthFor,
  roundUpTo,
} from './dimensions.js';

/**
 * Compute cut panel dimensions from resolved inputs (boxed style).
 *   cut_width  = finished_length + 2 × seam_allowance
 *   cut_height = finished_width + (finished_depth / 2) + seam_allowance
 */
export function computeCutDimensions(r: ResolvedInputs): { cutWidth: number; cutHeight: number } {
  return boxedDims(r);
}

/**
 * Build the bill of materials for a zip pouch.
 * Dispatches based on construction_style.
 */
export function buildBom(r: ResolvedInputs): BomRow[] {
  const { finished_depth, zip_gauge, grosgrain_width, pull_loops, construction_style } = r;

  if (construction_style === 'cross-bottom') {
    const { panelCutWidth, halfCrossHeight, cornerCutout } = crossBottomDims(r);

    return [
      {
        id: 'shell-fabric',
        description: 'shell fabric (half-cross panels)',
        quantity: 2,
        unit: 'panels',
        notes: `half-cross, bounding box ${panelCutWidth} × ${halfCrossHeight} mm, corner cutouts ${cornerCutout} × ${cornerCutout} mm`,
      },
      { id: 'zipper', description: `YKK coil zipper ${zip_gauge}`, quantity: zipperLengthFor(panelCutWidth), unit: 'mm' },
    ];
  }

  if (construction_style === 'gusset-strip') {
    const d = gussetStripDims(r);
    const zipperLength = zipperLengthFor(d.panelCutWidth);

    if (r.zipper_position === 'front') {
      // Front-zipper: solid back, front split either side of the zipper,
      // gusset wrapping all four sides.
      return [
        { id: 'shell-fabric-back', description: 'shell fabric (back panel)', quantity: 1, unit: 'panel', notes: `${d.panelCutWidth} × ${d.panelCutHeight} mm` },
        { id: 'shell-fabric-front-top', description: 'shell fabric (front top strip)', quantity: 1, unit: 'strip', notes: `${d.panelCutWidth} × ${d.frontTopHeight} mm` },
        { id: 'shell-fabric-front-bottom', description: 'shell fabric (front bottom strip)', quantity: 1, unit: 'strip', notes: `${d.panelCutWidth} × ${d.frontBottomHeight} mm` },
        { id: 'gusset-fabric', description: 'full-perimeter gusset fabric', quantity: 1, unit: 'strip', notes: `${d.fullGussetWidth} × ${d.gussetCutHeight} mm` },
        { id: 'zipper', description: `YKK coil zipper ${zip_gauge}`, quantity: zipperLength, unit: 'mm' },
      ];
    }

    // Top-zipper (default): front + back panels + U-shape gusset + two end tabs.
    const tab = zipperEndTabDims(r);
    return [
      { id: 'shell-fabric', description: 'shell fabric (panels)', quantity: 2, unit: 'panels', notes: `${d.panelCutWidth} × ${d.panelCutHeight} mm each` },
      { id: 'gusset-fabric', description: 'gusset strip fabric', quantity: 1, unit: 'strip', notes: `${d.gussetCutWidth} × ${d.gussetCutHeight} mm` },
      { id: 'zipper-end-tabs', description: 'shell fabric (zipper end tabs)', quantity: 2, unit: 'tabs', notes: `${tab.width} × ${tab.height} mm each` },
      { id: 'zipper', description: `YKK coil zipper ${zip_gauge}`, quantity: zipperLength, unit: 'mm' },
    ];
  }

  if (construction_style === 'multi-panel') {
    const d = multiPanelDims(r);
    const tab = zipperEndTabDims(r);
    const zipperLength = roundUpTo(d.frontBackWidth + 4 * r.seam_allowance, 50);

    return [
      { id: 'shell-fabric-front-back', description: 'shell fabric (front/back)', quantity: 2, unit: 'panels', notes: `${d.frontBackWidth} × ${d.frontBackHeight} mm each` },
      { id: 'shell-fabric-bottom', description: 'shell fabric (bottom)', quantity: 1, unit: 'panel', notes: `${d.bottomWidth} × ${d.bottomHeight} mm` },
      { id: 'shell-fabric-ends', description: 'shell fabric (end panels)', quantity: 2, unit: 'panels', notes: `${d.endWidth} × ${d.endHeight} mm each` },
      { id: 'zipper-end-tabs', description: 'shell fabric (zipper end tabs)', quantity: 2, unit: 'tabs', notes: `${tab.width} × ${tab.height} mm each` },
      { id: 'zipper', description: `YKK coil zipper ${zip_gauge}`, quantity: zipperLength, unit: 'mm' },
    ];
  }

  // 'boxed' — original
  const { cutWidth, cutHeight } = boxedDims(r);
  const boundSeamPerimeter = 2 * cutHeight + cutWidth - 2 * finished_depth;
  const grosgrainLength = roundUpTo(boundSeamPerimeter * 1.1, 100);

  const rows: BomRow[] = [
    { id: 'shell-fabric', description: 'shell fabric', quantity: 2, unit: 'panels', notes: `${cutWidth} mm × ${cutHeight} mm per panel` },
    { id: 'zipper', description: `YKK coil zipper ${zip_gauge}`, quantity: zipperLengthFor(cutWidth), unit: 'mm' },
    { id: 'grosgrain-binding', description: `grosgrain ribbon binding (${grosgrain_width} mm wide)`, quantity: grosgrainLength, unit: 'mm' },
  ];

  if (pull_loops) {
    rows.push({ id: 'pull-loops', description: 'grosgrain pull loops', quantity: 2, unit: 'strips', notes: `75 mm × ${grosgrain_width} mm each` });
  }

  return rows;
}
