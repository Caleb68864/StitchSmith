import type { HammockInputs, BomRow } from './types.js';
import { buildPattern, FABRIC_ID } from './buildPattern.js';
import { bboxFromPieceWithSa } from '../../lib/pattern-engine/geometry/saBbox.js';

/**
 * Cut list: the body at its cut size (Convention B, so the bbox is the cut),
 * the fabric to buy as a length off the roll, and the cords. Every size here
 * traces back to a placeholder.
 */
export function buildBom(inputs: HammockInputs): BomRow[] {
  const built = buildPattern(inputs);
  if (!built.ok) return [];
  const { pieces, resolved: r, hardware } = built.value;
  const rows: BomRow[] = [];
  for (const p of pieces) {
    const bb = bboxFromPieceWithSa(p, 0);
    rows.push({ id: `piece-${p.id}`, description: p.name, quantity: p.quantity, unit: `pc — ${Math.round(bb.width)} × ${Math.round(bb.height)} mm`, notes: `${p.materialId ?? FABRIC_ID}; mock-derived size` });
  }
  rows.push({ id: `material-${FABRIC_ID}`, description: `hammock fabric (sewn nylon or polyester), ${Math.round(r.fabric_width)} mm usable width`, quantity: Math.ceil(r.fabric_length / 10) * 10, unit: 'mm', notes: 'one length off the roll, grain along the hammock' });
  for (const hw of hardware) rows.push({ id: `hw-${hw.id}`, description: hw.name, quantity: hw.quantity, unit: 'ea', notes: hw.notes });
  return rows;
}
