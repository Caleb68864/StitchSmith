// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, fannyPackAssembly, BACK_ID, FRONT_ID, HOOP_3D_ID } from '../index.js';
import { assemble } from '../../../lib/cloth-engine/__tests__/harness.js';
import { relax, seamResidual, maxStretch, maxPenetration, clothBounds } from '../../../lib/cloth-engine/index.js';

describe('fanny pack 3D', () => {
  it('the hoop turns round the block at four corners and both panels seam to it', () => {
    const built = buildPattern({ units: 'in' });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const asm = fannyPackAssembly(built.value.pieces, built.value.resolved)!;
    expect(asm.seams.filter((s) => /front/.test(s.label ?? ''))).toHaveLength(5);
    const body = asm.pieces.filter((p) => p.id in asm.placements || p.id === asm.object.base.pieceId);
    expect(body.map((p) => p.id)).toEqual([BACK_ID, FRONT_ID, HOOP_3D_ID]);
    const { world, bounds } = assemble(body, asm.placements, asm.seams, asm.object, 8);
    relax(world, 400);
    const res = seamResidual(world);
    console.log('fanny seam', res.max.toFixed(2), res.mean.toFixed(2), 'stretch', (maxStretch(world) * 100).toFixed(1), 'front z', bounds(FRONT_ID).lo[2].toFixed(1), bounds(FRONT_ID).hi[2].toFixed(1), 'hoop z', bounds(HOOP_3D_ID).lo[2].toFixed(1), bounds(HOOP_3D_ID).hi[2].toFixed(1));
    expect(res.mean).toBeLessThan(3);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    // Envelope: about the finished block (unfilled cloth pillows a little).
    const size = clothBounds(world).size;
    const r = built.value.resolved;
    expect(size[0]).toBeGreaterThan(r.width - 5);
    expect(size[0]).toBeLessThan(r.width + 2 * r.seam_allowance + 15);
    expect(size[2]).toBeGreaterThan(r.depth - 2);
    expect(size[2]).toBeLessThan(r.depth + 2 * r.seam_allowance + 15);
    expect(bounds(FRONT_ID).lo[2]).toBeGreaterThan(r.depth - 4);
  });
});
