import type { SlingInputs, BomRow } from './types.js';
import { buildPattern } from './buildPattern.js';
import { bboxFromPiece } from '../../lib/pattern-engine/geometry/bbox.js';

export function buildBom(inputs: SlingInputs): BomRow[] {
  const built = buildPattern(inputs);
  if (!built.ok) return [];
  const rows: BomRow[] = [];
  let webbing = 0; let webbingW = 0;
  for (const p of built.value.pieces) {
    const bb = bboxFromPiece(p);
    if (p.materialId?.startsWith('webbing-')) { webbing += Math.max(bb.width, bb.height) * p.quantity; webbingW = Number(p.materialId.slice(8)); continue; }
    rows.push({ id: `piece-${p.id}`, description: p.name, quantity: p.quantity, unit: `pc — ${Math.round(bb.width)} × ${Math.round(bb.height)} mm`, notes: p.materialId?.replace(/-/g, ' ') });
  }
  if (webbing > 0) rows.push({ id: `webbing-${webbingW}`, description: `${webbingW} mm webbing`, quantity: Math.ceil(webbing / 10) * 10, unit: 'mm', notes: 'total, hot-knife every end' });
  for (const hw of built.value.hardware) rows.push({ id: `hw-${hw.id}`, description: hw.name, quantity: hw.quantity, unit: 'ea', notes: hw.notes });
  return rows;
}
