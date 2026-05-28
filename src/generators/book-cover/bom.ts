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

  if (r.closure && r.closure.kind !== 'none') {
    const c = r.closure;
    if (c.kind === 'zipper') {
      const coverPerimeter = 2 * (book_height + 2 * book_width + spine_width + 2 * flap_depth);
      const zipperLength = Math.round(coverPerimeter + 50);
      hardware.push({
        id: 'closure-zipper',
        name: `Zipper ${c.gauge}`,
        type: 'zipper',
        quantity: 1,
        notes: `${c.gauge} gauge zipper, ${zipperLength} mm length (cover perimeter + 50 mm)`,
      });
    } else if (c.kind === 'elastic') {
      const elasticWidth = c.width_mm ?? 25.4;
      const elasticLength = Math.round(2 * (book_height + book_width) + 50);
      hardware.push({
        id: 'closure-elastic',
        name: 'Elastic',
        type: 'other',
        quantity: 1,
        sizeMm: elasticWidth,
        notes: `${elasticWidth} mm wide elastic, ~${elasticLength} mm length`,
      });
    } else if (c.kind === 'snap') {
      const snapCount = c.count ?? 2;
      hardware.push({
        id: 'closure-snap',
        name: 'Snap Fastener',
        type: 'snap',
        quantity: snapCount,
        notes: `${snapCount} snap fastener${snapCount > 1 ? 's' : ''}`,
      });
    } else if (c.kind === 'flap-buckle') {
      const strapWidth = c.strap_width ?? 25.4;
      const buckleSize = c.buckle_size ?? 25.4;
      const webbingLength = Math.round(flap_depth * 2 + 150);
      hardware.push({
        id: 'closure-buckle',
        name: 'Buckle',
        type: 'buckle',
        quantity: 1,
        sizeMm: buckleSize,
        notes: `${buckleSize} mm buckle`,
      });
      hardware.push({
        id: 'closure-webbing',
        name: 'Webbing',
        type: 'other',
        quantity: 1,
        sizeMm: strapWidth,
        notes: `${strapWidth} mm wide webbing, ~${webbingLength} mm length`,
      });
    }
  }

  const notes: string[] = [
    `Cover wraps book: ${Math.round(book_width)} mm front + ${Math.round(spine_width)} mm spine + ${Math.round(book_width)} mm back + ${Math.round(flap_depth)} mm flaps on each side.`,
    `Top and bottom hems are ${top_bottom_hem} mm each.`,
  ];

  return { materials, hardware, notes };
}
