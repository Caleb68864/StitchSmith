import type { QuiltInputs, BomRow } from './types.js';
import { buildPattern, SHELL_FABRIC_ID, LINER_FABRIC_ID, MESH_ID, SIDE_BAFFLE_ID } from './buildPattern.js';
import { bboxFromPieceWithSa } from '../../lib/pattern-engine/geometry/saBbox.js';

/**
 * Cut list: every piece at its cut size (Convention B, so the bbox is the cut),
 * the shell and liner fabric as lengths off the roll, the baffle mesh, the fill
 * in grams and the hardware. Every size here traces back to a placeholder.
 */
export function buildBom(inputs: QuiltInputs): BomRow[] {
  const built = buildPattern(inputs);
  if (!built.ok) return [];
  const { pieces, resolved: r, hardware } = built.value;
  const rows: BomRow[] = [];
  for (const p of pieces) {
    const bb = bboxFromPieceWithSa(p, 0);
    rows.push({ id: `piece-${p.id}`, description: p.name, quantity: p.quantity, unit: `pc — ${Math.round(bb.width)} × ${Math.round(bb.height)} mm`, notes: `${p.materialId}; mock-derived size` });
  }
  const per = Math.ceil(r.cut_length / 10) * 10;
  rows.push({ id: `material-${SHELL_FABRIC_ID}`, description: `shell fabric (sewn, downproof), ${Math.round(r.fabric_width)} mm usable width`, quantity: per, unit: 'mm', notes: 'one length off the roll, grain along the quilt' });
  rows.push({ id: `material-${LINER_FABRIC_ID}`, description: `liner fabric (sewn, downproof), ${Math.round(r.fabric_width)} mm usable width`, quantity: per, unit: 'mm', notes: 'one length off the roll, grain along the quilt' });
  const baffles = pieces.filter((p) => p.materialId === MESH_ID && p.id !== SIDE_BAFFLE_ID);
  const sideB = pieces.find((p) => p.id === SIDE_BAFFLE_ID);
  if (baffles.length) {
    const h = bboxFromPieceWithSa(baffles[0], 0).height;
    // Side baffles lie along the roll, both side by side: they add their length.
    const side = sideB ? bboxFromPieceWithSa(sideB, 0).width : 0;
    rows.push({ id: `material-${MESH_ID}`, description: 'baffle mesh (noseeum)', quantity: Math.ceil((baffles.length * h + side) / 10) * 10, unit: 'mm', notes: `${baffles.length} strips ${Math.round(h)} mm tall cut across a roll at least ${Math.round(Math.max(...baffles.map((b) => bboxFromPieceWithSa(b, 0).width)))} mm wide${sideB ? `, plus two side baffles ${Math.round(side)} mm long along it` : ''}` });
  }
  rows.push({ id: 'material-fill', description: `down fill, ${r.fill_power} fill power`, quantity: Math.ceil(r.total_fill_g), unit: 'g', notes: `${r.overstuff} % overstuff included; estimate from the chamber volume, mock-derived` });
  for (const hw of hardware) if (hw.id !== 'fill') rows.push({ id: `hw-${hw.id}`, description: hw.name, quantity: hw.quantity, unit: 'ea', notes: hw.notes });
  return rows;
}
