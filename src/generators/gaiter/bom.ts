import type { GaiterInputs, BomRow } from './types.js';
import { buildPattern, FABRIC_ID } from './buildPattern.js';

/** Cut list: the pair at cut size, the fabric (two pieces side by side, or end to end), and the hardware. */
export function buildBom(inputs: GaiterInputs): BomRow[] {
  const built = buildPattern(inputs);
  if (!built.ok) return [];
  const { resolved: r, hardware } = built.value;
  const sideBySide = 2 * r.cut_width <= r.fabric_width;
  const rows: BomRow[] = [
    { id: 'piece-gaiter', description: 'Gaiter (mirrored pair)', quantity: 2, unit: `pc — ${Math.round(r.cut_width)} × ${Math.round(r.cut_height)} mm`, notes: `${FABRIC_ID}; mock-derived size` },
    { id: `material-${FABRIC_ID}`, description: `gaiter fabric (sewn), ${Math.round(r.fabric_width)} mm usable width`, quantity: Math.ceil(((sideBySide ? 1 : 2) * r.cut_height) / 10) * 10, unit: 'mm', notes: sideBySide ? 'both pieces side by side across the roll' : 'the pieces end to end' },
  ];
  for (const hw of hardware) rows.push({ id: `hw-${hw.id}`, description: hw.name, quantity: hw.quantity, unit: 'ea', notes: hw.notes });
  return rows;
}
