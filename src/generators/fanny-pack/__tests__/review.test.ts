// @vitest-environment node
/** Review pass fixes (docs/reviews/generators.md). */
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom } from '../index.js';
import { BELT_ID, BELT_TAB_ID } from '../buildPattern.js';
import { makeDefaultFannyPackProject } from '../../../state/useFannyPackProject.js';

const DEF = makeDefaultFannyPackProject().inputs;

describe('fanny pack — review fixes', () => {
  it('the belt and its tabs are cut from the webbing the user chose', () => {
    for (const [w, id] of [[1, 'webbing-25'], [1.5, 'webbing-38']] as const) {
      const b = buildPattern({ ...DEF, belt_webbing: w });
      expect(b.ok).toBe(true);
      if (!b.ok) return;
      for (const pid of [BELT_ID, BELT_TAB_ID]) {
        expect(b.value.pieces.find((p) => p.id === pid)!.materialId, `${pid} at ${w}"`).toBe(id);
      }
      // ...and the BOM totals that stock, not a width the user never picked.
      expect(buildBom({ ...DEF, belt_webbing: w }).some((r) => r.id === `material-${id}`)).toBe(true);
    }
  });

  it('the default project raises only notes, and no standing advice', () => {
    const b = buildPattern(DEF);
    if (!b.ok) return;
    expect(b.value.warnings.filter((w) => w.severity !== 'info')).toEqual([]);
    expect(b.value.warnings.map((w) => w.id)).not.toContain('slider');
    expect(b.value.warnings.map((w) => w.id)).not.toContain('shrink');
    expect(b.value.warnings.length).toBeLessThanOrEqual(3);
    // The shrink rule still reaches the sewer, in the step where it bites.
    expect(b.value.steps.find((s) => s.id === 'fp.hoop')!.body).toMatch(/draw in/);
  });
});
