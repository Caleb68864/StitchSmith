// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, gaiterAssembly, GAITER_ID } from '../index.js';
import type { GaiterInputs } from '../types.js';
import { makeDefaultGaiterProject } from '../../../state/useGaiterProject.js';
import { assemble } from '../../../lib/cloth-engine/__tests__/harness.js';
import { expectViewerMatchesHarness } from '../../../components/shared/__tests__/viewerAgreement.js';
import { relax, seamResidual, maxPenetration, stretchReport } from '../../../lib/cloth-engine/index.js';

const IN = 25.4;
const DEF: GaiterInputs = makeDefaultGaiterProject().inputs;
const built = (i: GaiterInputs) => { const b = buildPattern(i); if (!b.ok) throw new Error(JSON.stringify(b.errors)); return b.value; };

describe('gaiter wrapped on a leg', () => {
  for (const closure of ['velcro', 'zipper'] as const) {
    it(`${closure}: the piece wraps back into its tube round the leg, the front closes, the top holds`, () => {
      const v = built({ ...DEF, closure });
      const asm = gaiterAssembly(v.pieces, v.resolved)!;
      expect(asm).not.toBeNull();
      expect(asm.pieces.map((p) => p.id)).toEqual([GAITER_ID]);
      expectViewerMatchesHarness(asm.pieces, asm.placements);
      const { world, bounds } = assemble(asm.pieces, asm.placements, asm.seams, null, 10, asm.pins, asm.gravity, asm.solids);
      relax(world, 300);
      expect(seamResidual(world).mean).toBeLessThan(3);
      expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
      expect(stretchReport(world, 0.99).value).toBeLessThan(0.05);
      const b = bounds(GAITER_ID);
      // Round the leg: about the bottom circumference's diameter across (the wider end), and as tall as the gaiter.
      const across = Math.max(b.hi[0] - b.lo[0], b.hi[2] - b.lo[2]);
      expect(across).toBeGreaterThan((15 * IN) / Math.PI - 10);
      expect(across).toBeLessThan((17 * IN) / Math.PI + 40);
      expect(b.hi[1] - b.lo[1]).toBeGreaterThan(12 * IN);
      expect(asm.report[0]).toMatch(/leg/);
    });
  }
  it('a bottom narrower than the top is not wrapped (the cone would hang upside down)', () => {
    const v = built({ ...DEF, top_circumference: 17, bottom_circumference: 15 });
    expect(gaiterAssembly(v.pieces, v.resolved)).toBeNull();
  });
});
