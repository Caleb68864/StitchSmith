import type { WindShirtInputs, BomRow } from './types.js';
import { buildPattern, FABRIC_ID, SLEEVE_ID } from './buildPattern.js';
import { bboxFromPieceWithSa } from '../../lib/pattern-engine/geometry/saBbox.js';

/** Cut list: pieces at cut size; fabric with the back, front and binding end to end and the sleeves side by side when they fit. */
export function buildBom(inputs: WindShirtInputs): BomRow[] {
  const built = buildPattern(inputs);
  if (!built.ok) return [];
  const { pieces, resolved: r, hardware } = built.value;
  const rows: BomRow[] = [];
  let len = 0;
  for (const p of pieces) {
    const bb = bboxFromPieceWithSa(p, 0);
    rows.push({ id: `piece-${p.id}`, description: p.name, quantity: p.quantity, unit: `pc — ${Math.round(bb.width)} × ${Math.round(bb.height)} mm`, notes: `${FABRIC_ID}; drafted from the measurements` });
    len += p.id === SLEEVE_ID ? (2 * bb.width <= r.fabric_width ? 1 : 2) * bb.height : bb.width > r.fabric_width ? bb.width : bb.height;
  }
  rows.push({ id: `material-${FABRIC_ID}`, description: `wind shirt fabric (sewn), ${Math.round(r.fabric_width)} mm usable width`, quantity: Math.ceil(len / 10) * 10, unit: 'mm', notes: 'pieces end to end, the sleeves side by side when they fit' });
  for (const hw of hardware) rows.push({ id: `hw-${hw.id}`, description: hw.name, quantity: hw.quantity, unit: 'ea', notes: hw.notes });
  return rows;
}
