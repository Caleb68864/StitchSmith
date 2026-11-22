import type { BeanieInputs, BomRow } from './types.js';
import { buildPattern, FABRIC_ID, goreOutline } from './buildPattern.js';
import { bboxFromPieceWithSa } from '../../lib/pattern-engine/geometry/saBbox.js';

export function buildBom(inputs: BeanieInputs): BomRow[] {
  const built = buildPattern(inputs);
  if (!built.ok) return [];
  const { pieces, resolved: r } = built.value;
  const rows: BomRow[] = pieces.map((p) => { const bb = bboxFromPieceWithSa(p, 0); return { id: `piece-${p.id}`, description: p.name, quantity: p.quantity, unit: `pc — ${Math.round(bb.width)} × ${Math.round(bb.height)} mm`, notes: `${FABRIC_ID}; mock-derived size` }; });
  // Gores alternate point up / point down in a row; allow a full gore width each to be safe, plus the cuff.
  const g = goreOutline(r);
  const cuff = pieces.find((p) => p.id !== pieces[0].id);
  const len = r.gores * g.width + (cuff ? bboxFromPieceWithSa(cuff, 0).width : 0);
  rows.push({ id: `material-${FABRIC_ID}`, description: 'stretch fabric (fleece or jersey) or a woven with positive ease', quantity: Math.ceil(Math.max(len, 1) / 10) * 10, unit: 'mm', notes: `a strip at least ${Math.round(Math.max(g.height, cuff ? bboxFromPieceWithSa(cuff, 0).height : 0))} mm deep; gores side by side, then the cuff` });
  return rows;
}
