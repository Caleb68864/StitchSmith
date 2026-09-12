// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, plateCarrierAssembly, FRONT_SHELL_ID, BACK_SHELL_ID, STRAP_RIGHT_ID, CB_RIGHT_ID } from '../index.js';
import { assemble } from '../../../lib/cloth-engine/__tests__/harness.js';
import { relax, seamResidual, maxPenetration, maxStretch, torsoForm, TORSO_MEDIUM } from '../../../lib/cloth-engine/index.js';

const IN = 25.4;

describe('plate carrier on a medium torso', () => {
  it('panels hang on chest and back, straps and cummerbund close to the panels, and the report states the required spans', () => {
    const built = buildPattern({ units: 'in' });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const asm = plateCarrierAssembly(built.value.pieces, built.value.resolved)!;
    expect(asm.pieces.map((p) => p.id)).toContain(STRAP_RIGHT_ID);
    expect(asm.pieces.map((p) => p.id)).toContain(CB_RIGHT_ID);
    // The 16" default strap span is what a medium torso needs, within its 3" adjustment.
    expect(asm.fit.strapRequired).toBeGreaterThan(14 * IN);
    expect(asm.fit.strapRequired).toBeLessThan(19 * IN);
    expect(asm.fit.strapOk).toBe(true);
    expect(asm.fit.cummerbundRequired).toBeGreaterThan(8 * IN);
    expect(asm.report).toHaveLength(3);
    const { world, bounds } = assemble(asm.pieces, asm.placements, asm.seams, asm.object, 10, asm.pins, [0, -0.01, 0]);
    relax(world, 400);
    expect(seamResidual(world).mean).toBeLessThan(3);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    // The panel corners are dragged round the chest block's rounded sides by the cummerbund seams.
    expect(maxStretch(world)).toBeLessThan(0.25);
    const form = torsoForm(TORSO_MEDIUM);
    const front = bounds(FRONT_SHELL_ID), back = bounds(BACK_SHELL_ID);
    // Front panel stays on the chest side, back panel on the back side, both near the torso's faces.
    expect(front.lo[2]).toBeGreaterThan(0);
    expect(back.hi[2]).toBeLessThan(0);
    expect(front.hi[2]).toBeLessThan(form.frontZ + 40);
    expect(back.lo[2]).toBeGreaterThan(form.backZ - 40);
    // Tops at the ride height.
    expect(front.hi[1]).toBeCloseTo(form.chestTop - 60, -1);
  });
  it('a short strap span is reported as riding low and shows as a seam gap', () => {
    const built = buildPattern({ units: 'in', shoulder_strap_length: 11, strap_adjust_range: 1 });
    if (!built.ok) return;
    const asm = plateCarrierAssembly(built.value.pieces, built.value.resolved)!;
    expect(asm.fit.strapOk).toBe(false);
    expect(asm.report[0]).toMatch(/lengthen the span/);
    const { world } = assemble(asm.pieces, asm.placements, asm.seams, asm.object, 10, asm.pins);
    relax(world, 150);
    expect(seamResidual(world).max).toBeGreaterThan(30);
  });
  it('no cummerbund: only the straps are draped', () => {
    const built = buildPattern({ units: 'in', cummerbund_style: 'none' });
    if (!built.ok) return;
    const asm = plateCarrierAssembly(built.value.pieces, built.value.resolved)!;
    expect(asm.pieces).toHaveLength(4);
    expect(asm.report).toHaveLength(2);
  });
});
