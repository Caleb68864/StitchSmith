import type { ResolvedInputs, Bom } from './types.js';
import type { Material } from '../../lib/pattern-engine/materials/Material.js';
import type { Hardware } from '../../lib/pattern-engine/materials/Hardware.js';
import { DEFAULT_WEBBING_WIDTH_MM, DEFAULT_BUCKLE_SIZE_MM } from './defaults.js';

export function buildBom(resolved: ResolvedInputs): Bom {
  const { bottom_length, bottom_width, height_when_rolled, collar_height } = resolved;

  // Webbing length: one loop across the bottom width + collar on each side for roll-top closure
  const webbingLengthMm = bottom_width + 2 * collar_height + 100;

  // Fabric: main body panel (2 panels in two-panel construction)
  // cutWidth = bottom_length + 2 × frenchSeamAllowance (two-panel construction)
  // cutHeight = height_when_rolled + collar_height + hem + bottom_seam
  const materials: Material[] = [
    {
      id: 'body-fabric',
      name: 'Main Body Fabric',
      type: 'fabric',
      notes: `Cut 2 panels, each approx ${Math.round(bottom_length + 19)} mm × ${Math.round(height_when_rolled + collar_height + 35)} mm`,
    },
    {
      id: 'webbing',
      name: `${DEFAULT_WEBBING_WIDTH_MM} mm Webbing`,
      type: 'webbing',
      widthMm: DEFAULT_WEBBING_WIDTH_MM,
      notes: `Cut ${Math.round(webbingLengthMm)} mm for roll-top closure loop`,
    },
  ];

  const hardware: Hardware[] = [
    {
      id: 'buckle',
      name: `${DEFAULT_BUCKLE_SIZE_MM} mm Side-Release Buckle`,
      type: 'buckle',
      quantity: 1,
      sizeMm: DEFAULT_BUCKLE_SIZE_MM,
    },
    {
      id: 'cord-lock',
      name: 'Cord Lock',
      type: 'cord-lock',
      quantity: 1,
    },
  ];

  const notes: string[] = [
    `Webbing length includes 100 mm ease for the roll-top closure loop (total: ${Math.round(webbingLengthMm)} mm).`,
    'Two-panel construction: front and back panels are seamed along both side edges using French seams.',
    'Boxed bottom corners add depth equal to the bottom width.',
  ];

  return { materials, hardware, notes };
}
