// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, tarpAssembly, PANEL_ID, PANEL_B_ID } from '../index.js';
import type { TarpInputs } from '../types.js';
import { makeDefaultTarpProject } from '../../../state/useTarpProject.js';
import { assemble } from '../../../lib/cloth-engine/__tests__/harness.js';
import { expectViewerMatchesHarness } from '../../../components/shared/__tests__/viewerAgreement.js';
import { relax, seamResidual, maxPenetration, stretchReport } from '../../../lib/cloth-engine/index.js';

const IN = 25.4;
const DEF: TarpInputs = makeDefaultTarpProject().inputs;
const built = (i: TarpInputs) => { const b = buildPattern(i); if (!b.ok) throw new Error(JSON.stringify(b.errors)); return b.value; };

describe('tarp pitched on a ridgeline', () => {
  it('the two panels lean out either side of the ridge, the ridge seam closes, and the eaves reach the ridgeline height below it', () => {
    const v = built(DEF);
    const asm = tarpAssembly(v.pieces, v.resolved)!;
    expect(asm).not.toBeNull();
    expect(asm.pieces.map((p) => p.id)).toEqual([PANEL_ID, PANEL_B_ID]);
    // One seam per segment of the cat-cut ridge stitch line.
    expect(asm.seams.length).toBeGreaterThanOrEqual(24);
    // Every tie-out held on both panels.
    expect(asm.pins).toHaveLength(2 * v.tieouts.length);
    // The browser shows what the harness simulates (rotation-only placements included).
    expectViewerMatchesHarness(asm.pieces, asm.placements);
    const { world, bounds } = assemble(asm.pieces, asm.placements, asm.seams, null, 60, asm.pins, asm.gravity);
    relax(world, 300);
    expect(seamResidual(world).mean).toBeLessThan(3);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    expect(stretchReport(world, 0.99).value).toBeLessThan(0.02);
    const a = bounds(PANEL_ID), b = bounds(PANEL_B_ID);
    // Opposite sides of the ridge (z), both hanging down from it (y ≤ 0).
    expect(a.hi[2]).toBeLessThan(20);
    expect(b.lo[2]).toBeGreaterThan(-20);
    expect(a.hi[1]).toBeLessThan(5);
    // Eaves come down to about the 42" ridgeline height, plus the 1" rolled-hem and
    // 1/2" seam allowances on the slope and the cloth's sag between tie-outs.
    expect(-a.lo[1]).toBeGreaterThan(42 * IN - 10);
    expect(-a.lo[1]).toBeLessThan(45 * IN);
    // Half the footprint each side.
    expect(b.hi[2] - a.lo[2]).toBeGreaterThan(v.resolved.footprint_width - 20);
    expect(asm.report[0]).toMatch(/footprint/);
  });

  it('a ridgeline above the eaves is drawn at the steepest pitch and says so', () => {
    const v = built({ ...DEF, ridge_height: 50 });
    const asm = tarpAssembly(v.pieces, v.resolved)!;
    expect(asm.pitchDeg).toBe(70);
    expect(asm.report[0]).toMatch(/hang 2" off the ground/);
  });

  it('the single panel is not assembled', () => {
    const v = built({ ...DEF, construction: 'single_panel', width: 56 });
    expect(tarpAssembly(v.pieces, v.resolved)).toBeNull();
  });
});
