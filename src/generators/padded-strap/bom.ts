import type { PaddedStrapInputs, BomRow } from './types.js';
import { buildPattern } from './buildPattern.js';
import { bboxFromPiece } from '../../lib/pattern-engine/geometry/bbox.js';

/** Cut list: fabric by bounding box per piece type, webbing by length, hardware by count. */
export function buildBom(inputs: PaddedStrapInputs): BomRow[] {
  const built = buildPattern(inputs);
  if (!built.ok) return [];
  const rows: BomRow[] = [];
  const webbing = new Map<number, number>();
  for (const p of built.value.pieces) {
    const bb = bboxFromPiece(p);
    const isWebbing = p.materialId?.startsWith('webbing-');
    if (isWebbing) {
      const w = Number(p.materialId!.slice('webbing-'.length));
      webbing.set(w, (webbing.get(w) ?? 0) + Math.max(bb.width, bb.height) * p.quantity);
      continue;
    }
    rows.push({
      id: `piece-${p.id}`,
      description: p.name,
      quantity: p.quantity,
      unit: `pc — ${Math.round(bb.width)} × ${Math.round(bb.height)} mm`,
      notes: p.materialId?.replace(/-/g, ' '),
    });
  }
  for (const [w, len] of [...webbing.entries()].sort((a, b) => a[0] - b[0])) {
    rows.push({ id: `webbing-${w}`, description: `${w} mm webbing`, quantity: Math.ceil(len / 10) * 10, unit: 'mm', notes: 'total, hot-knife every end' });
  }
  for (const hw of built.value.hardware) {
    if (hw.quantity <= 0) continue;
    rows.push({ id: `hw-${hw.id}`, description: hw.name, quantity: hw.quantity, unit: 'ea', notes: hw.notes });
  }
  return rows;
}
