// @vitest-environment node
/** Review pass fixes (docs/reviews/generators.md). */
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom } from '../index.js';
import { makeDefaultPlateCarrierProject } from '../../../state/usePlateCarrierProject.js';

const IN = 25.4;
const DEF = makeDefaultPlateCarrierProject().inputs;

describe('plate carrier — review fixes', () => {
  it('uses the engine material ids, so the cut list and the cloth sim both recognise them', () => {
    const b = buildPattern(DEF);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const mats = new Set(b.value.pieces.map((p) => p.materialId));
    // 'mesh-spacer' was a second spelling: unknown to materialBendStiffness and a
    // separate line on the cut list from the strap engine's own mesh backers.
    expect(mats.has('mesh-spacer')).toBe(false);
    expect(mats.has('spacer-mesh')).toBe(true);
    // 2" webbing is webbing-51 everywhere (the engines derive it as Math.round(50.8)).
    expect(mats.has('webbing-50')).toBe(false);
    for (const m of mats) if (m?.startsWith('webbing')) expect(['webbing-25', 'webbing-38', 'webbing-51']).toContain(m);
  });

  it('a cleared wearer measurement raises one note, not one per field', () => {
    const cleared = { ...DEF, pad_length: undefined, shoulder_strap_length: undefined, torso_circumference: undefined, torso_length: undefined };
    const b = buildPattern(cleared);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const mock = b.value.warnings.filter((w) => w.id.startsWith('mock-derived'));
    expect(mock).toHaveLength(1);
    expect(mock[0].severity, 'a default the user has not touched is a note, not a warning').toBe('info');
    for (const f of ['pad length', 'shoulder strap length', 'torso circumference', 'torso length']) {
      expect(mock[0].message).toContain(f);
    }
  });

  it('the BOM reports the cut size of a bound-edge piece and of a turned one', () => {
    const bound = buildBom(DEF).find((r) => r.id === 'piece-pc-front-shell')!;
    // Bound edges carry an explicit 0: cut size is the drawn size.
    expect(bound.unit).toContain(String(Math.round(11.75 * IN)));
    const turnedBuilt = buildPattern({ ...DEF, edge_finish: 'turned' });
    expect(turnedBuilt.ok).toBe(true);
    if (!turnedBuilt.ok) return;
    const sa = Math.max(...Object.values(turnedBuilt.value.pieces.find((p) => p.id === 'pc-front-shell')!.seamAllowances ?? {}));
    expect(sa).toBeGreaterThan(0);
    const turned = buildBom({ ...DEF, edge_finish: 'turned' }).find((r) => r.id === 'piece-pc-front-shell')!;
    const width = (row: string) => Number(row.match(/(\d+) ×/)![1]);
    expect(width(turned.unit) - width(bound.unit), 'turning needs the allowance on the cut size').toBeGreaterThanOrEqual(2 * sa - 1);
  });
});
