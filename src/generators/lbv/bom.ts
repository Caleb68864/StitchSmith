import type { LbvInputs, BomRow } from './types.js';
import { buildPattern } from './buildPattern.js';
import { bboxFromPiece } from '../../lib/pattern-engine/geometry/bbox.js';

const IN = 25.4;

export function buildBom(inputs: LbvInputs): BomRow[] {
  const built = buildPattern(inputs);
  if (!built.ok) return [];
  const rows: BomRow[] = [];
  const totals = new Map<string, number>();
  for (const p of built.value.pieces) {
    const bb = bboxFromPiece(p);
    const m = p.materialId ?? 'cordura-500';
    if (/^(velcro|webbing)/.test(m)) { totals.set(m, (totals.get(m) ?? 0) + Math.max(bb.width, bb.height) * p.quantity); continue; }
    rows.push({ id: `piece-${p.id}`, description: p.name, quantity: p.quantity, unit: `pc — ${Math.round(bb.width)} × ${Math.round(bb.height)} mm`, notes: m.replace(/-/g, ' ') });
  }
  for (const [m, len] of [...totals.entries()].sort()) rows.push({ id: `material-${m}`, description: m.replace(/-/g, ' '), quantity: Math.ceil(len / 10) * 10, unit: 'mm', notes: 'total length, hot-knife every end' });
  const r = built.value.resolved;
  // Edge tape: one perimeter per panel plus the 24" zipper-assembly pieces, cut long.
  const tape = 2 * 2 * (r.panel_width + r.panel_height) + 2 * (r.back_outer_width + r.back_outer_height) + 2 * 24 * IN;
  rows.push({ id: 'material-edge-tape', description: `edge tape 5038 nylon ${Math.round(r.edge_tape_width)} mm`, quantity: Math.ceil(tape / 10) * 10, unit: 'mm', notes: 'every panel perimeter + two 24" zipper runs' });
  for (const hw of built.value.hardware) rows.push({ id: `hw-${hw.id}`, description: hw.name, quantity: hw.quantity, unit: 'ea', notes: hw.notes });
  return rows;
}
