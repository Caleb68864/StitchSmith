// @vitest-environment node
/** Review pass fixes (docs/reviews/generators.md). */
import { describe, it, expect } from 'vitest';
import { buildPattern } from '../index.js';
import { makeDefaultLbvProject } from '../../../state/useLbvProject.js';

const DEF = makeDefaultLbvProject().inputs;

describe('modular LBV — review fixes', () => {
  it('cleared vault-open numbers raise one note naming them, not one warning each', () => {
    const cleared = { ...DEF, pad_length: undefined, pad_width: undefined, panel_width: undefined, back_bellow: undefined };
    const b = buildPattern(cleared);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const mock = b.value.warnings.filter((w) => w.id.startsWith('mock-derived'));
    expect(mock).toHaveLength(1);
    expect(mock[0].severity).toBe('info');
    expect(mock[0].message).toMatch(/Shoulder pad length/);
    expect(mock[0].message).toMatch(/Front panel width/);
  });

  it('the default project raises no warnings the user must act on', () => {
    const b = buildPattern(DEF);
    if (!b.ok) return;
    expect(b.value.warnings.filter((w) => w.severity === 'warning')).toEqual([]);
  });

  it('webbing ids follow the engine scheme', () => {
    const b = buildPattern(DEF);
    if (!b.ok) return;
    for (const p of b.value.pieces) {
      if (p.materialId?.startsWith('webbing')) expect(['webbing-25', 'webbing-38', 'webbing-51']).toContain(p.materialId);
    }
  });
});
