import type { ResolvedInputs, Bom } from './types.js';
import type { Material } from '../../lib/pattern-engine/materials/Material.js';
import type { Hardware } from '../../lib/pattern-engine/materials/Hardware.js';

export function buildBom(r: ResolvedInputs): Bom {
  const { book_height, book_width, spine_width, flap_depth, seam_allowance: SA, top_bottom_hem } = r;

  const cutWidth = 2 * flap_depth + 2 * book_width + spine_width + 2 * SA;
  const cutHeight = book_height + 2 * top_bottom_hem;

  const materials: Material[] = [
    {
      id: 'cover-fabric',
      name: 'Main Cover Fabric',
      type: 'fabric',
      notes: `Cut 1 panel at ${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm`,
    },
  ];

  if (r.outer_pocket) {
    const p = r.outer_pocket;
    materials.push({
      id: 'outer-pocket-fabric',
      name: 'Outer Pocket Fabric',
      type: 'fabric',
      notes: `Cut 1 piece at ${Math.round(p.width + 2 * SA)} × ${Math.round(p.height + 2 * SA + top_bottom_hem)} mm`,
    });
  }

  if (r.inner_pocket) {
    const p = r.inner_pocket;
    materials.push({
      id: 'inner-pocket-fabric',
      name: 'Inner Pocket Fabric',
      type: 'fabric',
      notes: `Cut 1 piece at ${Math.round(p.width + 2 * SA)} × ${Math.round(p.height + 2 * SA + top_bottom_hem)} mm`,
    });
  }

  if (r.pen_holder) {
    const ph = r.pen_holder;
    const phHeight = ph.height ?? 80;
    materials.push({
      id: 'pen-holder-fabric',
      name: 'Pen Holder Fabric',
      type: 'fabric',
      notes: `Cut 1 strip at ${Math.round(ph.count * ph.slot_width + 2 * SA)} × ${Math.round(phHeight + 2 * SA)} mm`,
    });
  }

  const hardware: Hardware[] = [];
  const notes: string[] = [
    `Cover wraps book: ${Math.round(book_width)} mm front + ${Math.round(spine_width)} mm spine + ${Math.round(book_width)} mm back + ${Math.round(flap_depth)} mm flaps on each side.`,
    `Top and bottom hems are ${top_bottom_hem} mm each.`,
  ];

  return { materials, hardware, notes };
}
