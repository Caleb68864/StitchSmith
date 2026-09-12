import type { MicroRigInputs, BomRow } from './types.js';
import { buildPattern } from './buildPattern.js';
import { bboxFromPiece } from '../../lib/pattern-engine/geometry/bbox.js';

/** Cut list: fabric by piece, webbing/Velcro/elastic by length, hardware by count. */
export function buildBom(inputs: MicroRigInputs): BomRow[] {
  const built = buildPattern(inputs);
  if (!built.ok) return [];
  const rows: BomRow[] = [];
  const byMaterial = new Map<string, number>();
  for (const p of built.value.pieces) {
    const bb = bboxFromPiece(p);
    const m = p.materialId ?? 'cordura-500';
    if (/^(webbing|velcro|elastic)/.test(m)) {
      byMaterial.set(m, (byMaterial.get(m) ?? 0) + Math.max(bb.width, bb.height) * p.quantity);
      continue;
    }
    rows.push({ id: `piece-${p.id}`, description: p.name, quantity: p.quantity, unit: `pc — ${Math.round(bb.width)} × ${Math.round(bb.height)} mm`, notes: m.replace(/-/g, ' ') });
  }
  for (const [m, len] of [...byMaterial.entries()].sort()) {
    rows.push({ id: `material-${m}`, description: m.replace(/-/g, ' '), quantity: Math.ceil(len / 10) * 10, unit: 'mm', notes: 'total length' });
  }
  for (const hw of built.value.hardware) rows.push({ id: `hw-${hw.id}`, description: hw.name, quantity: hw.quantity, unit: 'ea', notes: hw.notes });
  return rows;
}
