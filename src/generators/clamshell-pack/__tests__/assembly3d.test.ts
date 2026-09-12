// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, clamshellAssembly, FACE_ID, GUSSET_ID, LID_STRIP_ID, BOTTOM_ID } from '../index.js';
import { assemble } from '../../../lib/cloth-engine/__tests__/harness.js';
import { relax, seamResidual, maxPenetration, maxStretch } from '../../../lib/cloth-engine/index.js';

const IN = 25.4;
describe('clamshell pack — 3D assembly', () => {
  it('the hoop, bottom and both panels close round an 11 × 16 × 6 block', () => {
    const built = buildPattern({ units: 'in' });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const asm = clamshellAssembly(built.value.pieces, built.value.resolved)!;
    expect(asm).not.toBeNull();
    const body = asm.pieces.filter((p) => p.id in asm.placements);
    const { world, bounds } = assemble(body, asm.placements, asm.seams, asm.object, 10);
    relax(world, 400);
    const res = seamResidual(world);
    const g = bounds(GUSSET_ID), l = bounds(LID_STRIP_ID), b = bounds(BOTTOM_ID), f = bounds(FACE_ID);
    expect(res.mean).toBeLessThan(1);
    expect(res.max).toBeLessThan(4);
    expect(maxStretch(world)).toBeLessThan(0.25);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    // Envelope: the base gusset spans the base depth along z, the lid strip the rest, the bottom the full depth.
    expect(g.hi[2]).toBeCloseTo(4.5 * IN, -1);
    expect(l.lo[2]).toBeGreaterThan(4.5 * IN - 6);
    expect(l.hi[2]).toBeCloseTo(6 * IN, -1);
    expect(b.hi[2] - b.lo[2]).toBeCloseTo(6 * IN, -1);
    expect(b.hi[0] - b.lo[0]).toBeCloseTo(7.5 * IN, -1);
    // The gusset hangs the full height down both sides and the face stands a depth out from the back.
    expect(g.lo[1]).toBeLessThan(-(16 * IN) + 30);
    expect(f.lo[2]).toBeGreaterThan(6 * IN - 15);
  });
});
