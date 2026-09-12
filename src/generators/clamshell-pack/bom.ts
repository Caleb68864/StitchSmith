import type { ClamshellPackInputs, BomRow } from './types.js';
import { buildPattern } from './buildPattern.js';
import { bboxFromPiece } from '../../lib/pattern-engine/geometry/bbox.js';

export function buildBom(inputs: ClamshellPackInputs): BomRow[] {
  const built = buildPattern(inputs);
  if (!built.ok) return [];
  const rows: BomRow[] = [];
  const totals = new Map<string, number>();
  for (const p of built.value.pieces) {
    const bb = bboxFromPiece(p);
    const m = p.materialId ?? 'cordura-500';
    if (/^(velcro|webbing)/.test(m)) { totals.set(m, (totals.get(m) ?? 0) + Math.max(bb.width, bb.height) * p.quantity); continue; }
    const sa = Math.max(0, ...Object.values(p.seamAllowances ?? {}));
    rows.push({ id: `piece-${p.id}`, description: p.name, quantity: p.quantity, unit: `pc — ${Math.round(bb.width + 2 * sa)} × ${Math.round(bb.height + 2 * sa)} mm cut`, notes: p.id === 'clamshell-bottom' ? 'cut after the hoop from the measured gap' : m.replace(/-/g, ' ') });
  }
  for (const [m, len] of [...totals.entries()].sort()) rows.push({ id: `material-${m}`, description: m.replace(/-/g, ' '), quantity: Math.ceil(len / 10) * 10, unit: 'mm', notes: 'total length, trim-after-sew' });
  for (const hw of built.value.hardware) rows.push({ id: `hw-${hw.id}`, description: hw.name, quantity: hw.quantity, unit: 'ea', notes: hw.notes });
  return rows;
}
