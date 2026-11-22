import type { BivyInputs, BomRow } from './types.js';
import { buildPattern, FLOOR_FABRIC_ID, TOP_FABRIC_ID, MESH_ID } from './buildPattern.js';
import { bboxFromPieceWithSa } from '../../lib/pattern-engine/geometry/saBbox.js';

/** Cut list: pieces at cut size, each fabric as a length off the roll (pieces end to end), and the hardware. */
export function buildBom(inputs: BivyInputs): BomRow[] {
  const built = buildPattern(inputs);
  if (!built.ok) return [];
  const { pieces, resolved: r, hardware } = built.value;
  const rows: BomRow[] = [];
  const along = new Map<string, number>();
  for (const p of pieces) {
    const bb = bboxFromPieceWithSa(p, 0);
    rows.push({ id: `piece-${p.id}`, description: p.name, quantity: p.quantity, unit: `pc — ${Math.round(bb.width)} × ${Math.round(bb.height)} mm`, notes: `${p.materialId}; mock-derived size` });
    // Long pieces lie along the roll; gussets lie across it.
    const m = p.materialId!;
    along.set(m, (along.get(m) ?? 0) + (p.id.includes('gusset') ? bb.height : bb.width));
  }
  const name: Record<string, string> = { [FLOOR_FABRIC_ID]: 'floor fabric (waterproof, sewn)', [TOP_FABRIC_ID]: 'top fabric (breathable or water-resistant, sewn)', [MESH_ID]: 'no-see-um mesh' };
  for (const [m, len] of along) rows.push({ id: `material-${m}`, description: `${name[m] ?? m}, ${Math.round(r.fabric_width)} mm usable width`, quantity: Math.ceil(len / 10) * 10, unit: 'mm', notes: 'pieces end to end along the roll' });
  for (const hw of hardware) rows.push({ id: `hw-${hw.id}`, description: hw.name, quantity: hw.quantity, unit: 'ea', notes: hw.notes });
  return rows;
}
