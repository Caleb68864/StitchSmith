import type { PlateCarrierInputs, BomRow } from './types.js';
import { buildPattern } from './buildPattern.js';
import { bboxFromPieceWithSa } from '../../lib/pattern-engine/geometry/saBbox.js';

export function buildBom(inputs: PlateCarrierInputs): BomRow[] {
  const built = buildPattern(inputs);
  if (!built.ok) return [];
  const rows: BomRow[] = [];
  const totals = new Map<string, number>();
  for (const p of built.value.pieces) {
    // SA-inclusive: on a Convention A piece the drawn outline is the finished size,
    // so the cut list must add the allowance the exporters already draw.
    const bb = bboxFromPieceWithSa(p, 0);
    const m = p.materialId ?? 'cordura-500';
    if (/^(velcro|webbing|elastic)/.test(m)) { totals.set(m, (totals.get(m) ?? 0) + Math.max(bb.width, bb.height) * p.quantity); continue; }
    rows.push({ id: `piece-${p.id}`, description: p.name, quantity: p.quantity, unit: `pc — ${Math.round(bb.width)} × ${Math.round(bb.height)} mm`, notes: m.replace(/-/g, ' ') });
  }
  for (const [m, len] of [...totals.entries()].sort()) rows.push({ id: `material-${m}`, description: m.replace(/-/g, ' '), quantity: Math.ceil(len / 10) * 10, unit: 'mm', notes: 'total length' });
  for (const hw of built.value.hardware) rows.push({ id: `hw-${hw.id}`, description: hw.name, quantity: hw.quantity, unit: 'ea', notes: hw.notes });
  return rows;
}
