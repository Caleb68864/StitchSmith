import type { ResolvedInputs, Bom } from './types.js';
import type { Material } from '../../lib/pattern-engine/materials/Material.js';
import type { Hardware } from '../../lib/pattern-engine/materials/Hardware.js';

export function buildBom(r: ResolvedInputs): Bom {
  const { book_height, book_width, spine_width, flap_depth, seam_allowance: SA, top_bottom_hem } = r;

  const cutHeight = book_height + 2 * top_bottom_hem;

  // Body panel (without flap_depth — flaps are separate sleeve pieces)
  const bodyCutWidth = 2 * book_width + spine_width + 2 * SA;
  const flapCutWidth = flap_depth + SA + top_bottom_hem;

  const materials: Material[] = [
    {
      id: 'cover-fabric',
      name: 'Main Cover Fabric',
      type: 'fabric',
      notes: `Cut 1 body panel at ${Math.round(bodyCutWidth)} × ${Math.round(cutHeight)} mm AND 2 inner sleeve flaps at ${Math.round(flapCutWidth)} × ${Math.round(cutHeight)} mm each.`,
    },
  ];

  if (r.lining?.enabled) {
    materials.push({
      id: 'lining-fabric',
      name: 'Lining Fabric',
      type: 'fabric',
      notes: `Cut 1 lining panel at ${Math.round(bodyCutWidth)} × ${Math.round(cutHeight)} mm (matches the body). Use a lightweight, smooth fabric.`,
    });
  }

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

  if (r.lining?.enabled && r.lining?.interfacing && r.lining.interfacing !== 'none') {
    const kind = r.lining.interfacing;
    const interfacingName = kind === 'fusible' ? 'Fusible Interfacing'
      : kind === 'sew-in' ? 'Sew-In Interfacing'
      : kind === 'hdpe' ? 'HDPE Sheet Interfacing'
      : kind === 'eva' ? 'EVA Foam Interfacing'
      : 'Interfacing';
    materials.push({
      id: 'lining-interfacing',
      name: interfacingName,
      type: 'interfacing',
      notes: `Cut 1 panel at ${Math.round(bodyCutWidth)} × ${Math.round(cutHeight)} mm`,
    });
  }

  if (r.mesh_pocket) {
    const mp = r.mesh_pocket;
    const mpWidth = (mp.width ?? book_width) + 2 * SA;
    const mpHeight = (mp.height ?? Math.round(book_height * 0.5)) + 2 * SA;
    materials.push({
      id: 'mesh-pocket-fabric',
      name: 'Mesh Pocket Fabric',
      type: 'fabric',
      notes: `Cut 1 piece at ${Math.round(mpWidth)} × ${Math.round(mpHeight)} mm`,
    });
  }

  const hardware: Hardware[] = [];

  if (r.bookmark_ribbon) {
    const ribbonLength = book_height + 50;
    const ribbonWidth = r.bookmark_ribbon.width_mm ?? 9.5;
    hardware.push({
      id: 'bookmark-ribbon',
      name: 'Grosgrain Ribbon',
      type: 'other',
      quantity: r.bookmark_ribbon.count,
      sizeMm: ribbonWidth,
      notes: `${ribbonWidth} mm wide grosgrain ribbon, ~${Math.round(ribbonLength)} mm per ribbon (book height + 50 mm tail)`,
    });
  }

  if (r.internal_zip_pocket) {
    const gauge = r.internal_zip_pocket.gauge ?? '#5';
    hardware.push({
      id: 'internal-zip-pocket-zipper',
      name: `Internal Zipper ${gauge}`,
      type: 'zipper',
      quantity: 1,
      notes: `${gauge} zipper for internal zip pocket`,
    });
  }

  if (r.mesh_pocket?.elastic_top) {
    hardware.push({
      id: 'mesh-pocket-elastic',
      name: 'Elastic (mesh pocket top)',
      type: 'other',
      quantity: 1,
      sizeMm: 12.7,
      notes: `12.7 mm elastic for mesh pocket top channel, ~${Math.round(book_width + 20)} mm`,
    });
  }

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

  if (r.tactical?.enabled) {
    const vpW = r.tactical.velcro_panel_width;
    const vpH = r.tactical.velcro_panel_height;
    // The Velcro itself (hardware) and a backing fabric (material) for the panel.
    materials.push({
      id: 'tactical-velcro-panel-fabric',
      name: 'Tactical Velcro Backing',
      type: 'fabric',
      notes: `Cut 1 backing panel at ${Math.round(vpW + 2 * SA)} × ${Math.round(vpH + 2 * SA)} mm. Loop-side Velcro is bonded or stitched to this panel.`,
    });
    if (r.tactical.spare_mag_pocket) {
      // Spare-mag pocket dimensions: scaled to a standard magazine pouch — about
      // 30 mm wide × 80 mm tall internal, plus SA and a top hem for the opening.
      const smW = 30 + 2 * SA;
      const smH = 80 + 2 * SA + top_bottom_hem;
      materials.push({
        id: 'spare-mag-pocket-fabric',
        name: 'Spare-Mag Pocket Fabric',
        type: 'fabric',
        notes: `Cut 1 pocket at ${Math.round(smW)} × ${Math.round(smH)} mm. Attaches to the inside back cover.`,
      });
    }
    hardware.push({
      id: 'tactical-velcro-loop',
      name: 'Loop Velcro',
      type: 'other',
      quantity: 1,
      notes: `${Math.round(vpW)} × ${Math.round(vpH)} mm loop-side Velcro panel`,
    });
    if (r.tactical.retention_strap) {
      const webbingLength = Math.round(book_height + 50 + 2 * SA);
      hardware.push({
        id: 'retention-strap-webbing',
        name: 'Nylon Webbing (retention strap)',
        type: 'other',
        quantity: 1,
        sizeMm: 25.4,
        notes: `25.4 mm wide webbing, ~${webbingLength} mm`,
      });
      hardware.push({
        id: 'retention-strap-hook-tab',
        name: 'Hook Tab (retention strap)',
        type: 'other',
        quantity: 1,
        sizeMm: 25.4,
        notes: '25.4 mm hook tab for retention strap attachment',
      });
    }
  }

  const notes: string[] = [
    `Body panel: ${Math.round(bodyCutWidth)} × ${Math.round(cutHeight)} mm — front (${Math.round(book_width)}) + spine (${Math.round(spine_width)}) + back (${Math.round(book_width)}) plus 2 × ${SA} mm seam allowance and 2 × ${top_bottom_hem} mm hem.`,
    `Each inner sleeve flap: ${Math.round(flapCutWidth)} × ${Math.round(cutHeight)} mm — flap_depth ${Math.round(flap_depth)} + ${SA} mm SA + ${top_bottom_hem} mm sleeve-mouth hem.`,
    `Top and bottom hems are ${top_bottom_hem} mm each, folded to the wrong side and topstitched 2 mm from the fold.`,
  ];

  return { materials, hardware, notes };
}
