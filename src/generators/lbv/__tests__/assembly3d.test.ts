// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, lbvAssembly, FRONT_OUTER_ID, FRONT_RIGHT_ID, BACK_OUTER_ID, PAD_ID, PAD_LEFT_ID, VERTICAL_IDS } from '../index.js';
import { assemble } from '../../../lib/cloth-engine/__tests__/harness.js';
import { relax, seamResidual, maxPenetration, maxStretch, torsoForm, TORSO_MEDIUM } from '../../../lib/cloth-engine/index.js';

describe('modular LBV on a medium torso', () => {
  it('panels sit on chest and back, pads crest both shoulders, the verticals seam to the panel marks and the 24" strap funds the 12" drop', () => {
    const built = buildPattern({ units: 'in' });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const asm = lbvAssembly(built.value.pieces, built.value.resolved)!;
    expect(asm).not.toBeNull();
    expect(asm.fit.dropOk).toBe(true);
    expect(asm.fit.chestOk).toBe(true);
    expect(asm.seams).toHaveLength(4);
    const body = asm.pieces.filter((p) => p.id in asm.placements);
    expect(body).toHaveLength(9);
    const { world, bounds } = assemble(body, asm.placements, asm.seams, asm.object, 8, asm.pins, [0, -0.01, 0]);
    relax(world, 300);
    expect(seamResidual(world).mean).toBeLessThan(3);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    expect(maxStretch(world)).toBeLessThan(0.12);
    const form = torsoForm(TORSO_MEDIUM);
    // Front panels in front of the chest, either side of the closure; back panel behind.
    const fl = bounds(FRONT_OUTER_ID), fr = bounds(FRONT_RIGHT_ID), bk = bounds(BACK_OUTER_ID);
    expect(fl.lo[2]).toBeGreaterThan(form.frontZ);
    expect(fr.lo[2]).toBeGreaterThan(form.frontZ);
    expect(fl.hi[0]).toBeLessThan(0);
    expect(fr.lo[0]).toBeGreaterThan(0);
    expect(bk.hi[2]).toBeLessThan(form.backZ);
    expect(fl.hi[1]).toBeLessThan(form.chestTop);
    // Pads crest the shoulders above the chest top.
    for (const id of [PAD_ID, PAD_LEFT_ID]) expect(bounds(id).hi[1]).toBeGreaterThan(form.chestTop + form.shoulderRadius - 10);
    // Verticals start at the panel tops and reach over the shoulder.
    for (const id of Object.values(VERTICAL_IDS)) {
      const b = bounds(id);
      expect(b.hi[1]).toBeGreaterThan(form.chestTop + form.shoulderRadius - 10);
      expect(b.lo[1]).toBeLessThan(form.chestTop - 40);
    }
  });
  it('a short vertical strap fails the drop check in the report', () => {
    const built = buildPattern({ units: 'in', vertical_strap_len: 14 });
    if (!built.ok) return;
    const asm = lbvAssembly(built.value.pieces, built.value.resolved)!;
    expect(asm.fit.dropOk).toBe(false);
    expect(asm.report[0]).toMatch(/does NOT fund/);
  });
});
