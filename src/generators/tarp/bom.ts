import type { TarpInputs, BomRow } from './types.js';
import { buildPattern, FABRIC_ID } from './buildPattern.js';
import { bboxFromPieceWithSa } from '../../lib/pattern-engine/geometry/saBbox.js';

/**
 * Cut list: one row per piece at its cut size (Convention B, so the bbox is the
 * cut), the fabric to buy as a length off the roll, grosgrain as a total
 * length, and the sealer. Every size here traces back to a placeholder.
 */
export function buildBom(inputs: TarpInputs): BomRow[] {
  const built = buildPattern(inputs);
  if (!built.ok) return [];
  const { pieces, resolved: r, hardware } = built.value;
  const rows: BomRow[] = [];
  const lengths = new Map<string, number>();
  for (const p of pieces) {
    const bb = bboxFromPieceWithSa(p, 0);
    const m = p.materialId ?? FABRIC_ID;
    if (/^(velcro|webbing)/.test(m)) { lengths.set(m, (lengths.get(m) ?? 0) + Math.max(bb.width, bb.height) * p.quantity); continue; }
    rows.push({ id: `piece-${p.id}`, description: p.name, quantity: p.quantity, unit: `pc — ${Math.round(bb.width)} × ${Math.round(bb.height)} mm`, notes: `${m}; mock-derived size` });
  }
  rows.push({ id: `material-${FABRIC_ID}`, description: `${FABRIC_ID} (or another sewn tarp fabric), ${Math.round(r.fabric_width)} mm usable width`, quantity: Math.ceil(r.fabric_length / 10) * 10, unit: 'mm', notes: 'panels end to end along the roll; patches come from the offcuts' });
  for (const [m, len] of [...lengths.entries()].sort()) rows.push({ id: `material-${m}`, description: m === 'webbing-16' ? 'grosgrain, 5/8" class' : m.replace(/-/g, ' '), quantity: Math.ceil(len / 10) * 10, unit: 'mm', notes: 'total length for the tie-out loops' });
  for (const hw of hardware) rows.push({ id: `hw-${hw.id}`, description: hw.name, quantity: hw.quantity, unit: 'ea', notes: hw.notes });
  return rows;
}
