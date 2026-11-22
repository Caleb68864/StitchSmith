// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, bivyAssembly, FLOOR_3D_ID, TOP_ID, HEAD_GUSSET_ID } from '../index.js';
import { makeDefaultBivyProject } from '../../../state/useBivyProject.js';
import { assemble } from '../../../lib/cloth-engine/__tests__/harness.js';
import { expectViewerMatchesHarness } from '../../../components/shared/__tests__/viewerAgreement.js';
import { relax, seamResidual, maxPenetration, stretchReport } from '../../../lib/cloth-engine/index.js';

const IN = 25.4;
const DEF = makeDefaultBivyProject().inputs;
const built = (i: typeof DEF) => { const b = buildPattern(i); if (!b.ok) throw new Error(JSON.stringify(b.errors)); return b.value; };

describe('bivy in 3D', () => {
  it('the tub stands up round a sleeper, the top arches over it and the gussets close the ends', () => {
    const v = built(DEF);
    const asm = bivyAssembly(v.pieces, v.resolved)!;
    expect(asm.pieces.map((p) => p.id)).toEqual([FLOOR_3D_ID, TOP_ID, HEAD_GUSSET_ID, 'bivy-gusset-foot']);
    expectViewerMatchesHarness(asm.pieces, asm.placements);
    const { world, bounds } = assemble(asm.pieces, asm.placements, asm.seams, null, 30, asm.pins, asm.gravity, asm.solids);
    relax(world, 300);
    expect(seamResidual(world).mean).toBeLessThan(3);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    expect(stretchReport(world, 0.99).value).toBeLessThan(0.05);
    const floor = bounds(FLOOR_3D_ID), top = bounds(TOP_ID);
    // The walls rise to about the tub height and stand within 60 mm of upright: the floor's
    // footprint is the finished floor, not the flat cut.
    expect(floor.hi[1]).toBeGreaterThan(5 * IN - 20);
    const k = v.resolved.seam_allowance + v.resolved.tub_height;
    expect(floor.hi[0] - floor.lo[0]).toBeLessThan(v.resolved.floor_cut_length - 2 * k + 2 * 60);
    // The top stands above the tub over the sleeper.
    expect(top.hi[1]).toBeGreaterThan(5 * IN + 0.5 * v.resolved.arch!.rise);
    expect(asm.report[0]).toMatch(/arches/);
  });
  it('a J-zip top is not assembled', () => {
    const v = built({ ...DEF, zip_style: 'j' });
    expect(bivyAssembly(v.pieces, v.resolved)).toBeNull();
  });
});
