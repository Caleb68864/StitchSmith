// @vitest-environment node
/** Review pass fixes (docs/reviews/generators.md). */
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom } from '../index.js';
import { makeDefaultClamshellPackProject } from '../../../state/useClamshellPackProject.js';

const IN = 25.4;
const DEF = makeDefaultClamshellPackProject().inputs;

describe('clamshell pack — review fixes', () => {
  it('PALS rows are listed at the length each surface needs, not all at the longest', () => {
    const b = buildPattern(DEF);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const rows = b.value.pieces.filter((p) => p.id.startsWith('clamshell-pals-row'));
    expect(rows.length, 'face, side and bottom runs are different lengths').toBeGreaterThan(1);
    const total = rows.reduce((a, p) => a + p.quantity, 0);
    expect(total).toBe(2 * DEF.pals_rows_side! + DEF.pals_rows_face! + DEF.pals_rows_bottom!);
    const lengths = rows.map((p) => Math.max(...p.paths[0].edges.map((e) => Math.max(e.start.x, e.end.x))));
    expect(new Set(lengths.map((l) => Math.round(l))).size, 'each entry is a distinct length').toBe(rows.length);
    // Webbing consumed is the sum of the real lengths, well under rows x longest.
    const consumed = rows.reduce((a, p, i) => a + lengths[i] * p.quantity, 0);
    expect(consumed).toBeLessThan(total * Math.max(...lengths) * 0.85);
  });

  it('the BOM lists the cut size of a finished-size piece, allowance included', () => {
    const b = buildPattern(DEF);
    if (!b.ok) return;
    const face = b.value.pieces.find((p) => p.id === 'clamshell-face')!;
    const sa = Math.max(...Object.values(face.seamAllowances ?? {}));
    expect(sa, 'the face is drawn at finished size with a real allowance').toBeGreaterThan(0);
    const row = buildBom(DEF).find((x) => x.id === 'piece-clamshell-face')!;
    const w = Math.round(DEF.width! * IN + 2 * sa);
    expect(row.unit, 'cut size, not the finished size the panel is drawn at').toContain(String(w));
  });
});
