// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, windShirtAssembly, torsoFromMeasurements, BACK_ID, FRONT_ID } from '../index.js';
import { SLEEVE_RIGHT_ID, SLEEVE_LEFT_ID } from '../assembly3d.js';
import { makeDefaultWindShirtProject } from '../../../state/useWindShirtProject.js';
import { assemble } from '../../../lib/cloth-engine/__tests__/harness.js';
import { expectViewerMatchesHarness } from '../../../components/shared/__tests__/viewerAgreement.js';
import { relax, seamResidual, maxPenetration, stretchReport, armForms, torsoForm } from '../../../lib/cloth-engine/index.js';

const IN = 25.4;
const DEF = makeDefaultWindShirtProject().inputs;

describe('arm forms', () => {
  it('two capsules from the shoulders, the arm length long, angled out', () => {
    const t = { chestWidth: 360, chestDepth: 230, torsoLength: 460, shoulderWidth: 440, neckRadius: 63 };
    const a = armForms(t, { radius: 50, length: 630, abductionDeg: 25 });
    expect(a.solids).toHaveLength(2);
    const len = Math.hypot(a.right.wrist[0] - a.right.shoulder[0], a.right.wrist[1] - a.right.shoulder[1]);
    expect(len).toBeCloseTo(630, 6);
    expect(a.right.wrist[0]).toBeGreaterThan(a.right.shoulder[0]);
    expect(a.left.wrist[0]).toBeLessThan(a.left.shoulder[0]);
    expect(a.right.shoulder[1]).toBeCloseTo(torsoForm(t).chestTop, 9);
  });
});

describe('wind shirt on a torso', () => {
  it('the torso is the measured chest round, and the body closes round it at the shoulders and sides', () => {
    const v = (() => { const b = buildPattern(DEF); if (!b.ok) throw new Error('build'); return b.value; })();
    const t = torsoFromMeasurements(v.resolved);
    const a = t.chestWidth / 2, b = t.chestDepth / 2;
    const ramanujan = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    expect(ramanujan).toBeCloseTo(40 * IN, 3);
    const asm = windShirtAssembly(v.pieces, v.resolved)!;
    expect(asm.pieces.map((p) => p.id)).toEqual([BACK_ID, FRONT_ID, SLEEVE_RIGHT_ID, SLEEVE_LEFT_ID]);
    // 2 shoulders + 4 side segments, then per sleeve: cap front, cap back and the underseam.
    expect(asm.seams.length).toBeGreaterThan(2 + 4 + 2 * 64);
    expectViewerMatchesHarness(asm.pieces, asm.placements);
    const { world, bounds } = assemble(asm.pieces, asm.placements, asm.seams, null, 9, asm.pins, asm.gravity, asm.solids);
    expect(asm.pins).toHaveLength(0);
    relax(world, 360);
    expect(seamResidual(world).mean).toBeLessThan(3);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    expect(stretchReport(world, 0.99).value).toBeLessThan(0.11);
    const bb = [bounds(BACK_ID), bounds(FRONT_ID)];
    // Front and back on either side of the form.
    expect(bb[1].hi[2]).toBeGreaterThan(t.chestDepth / 2);
    expect(bb[0].lo[2]).toBeLessThan(-t.chestDepth / 2);
    expect(asm.report[0]).toMatch(/ease/);
    // The sleeves wrap their arms: out past the shoulders on each side, down the arm.
    const sr = bounds(SLEEVE_RIGHT_ID), sl = bounds(SLEEVE_LEFT_ID);
    expect(sr.lo[0]).toBeGreaterThan(0);
    expect(sl.hi[0]).toBeLessThan(0);
    expect(sr.hi[0] - sr.lo[0]).toBeGreaterThan(0.5 * 25 * IN * Math.SQRT1_2);
    expect(asm.report[1]).toMatch(/Sleeves wrapped/);
  });
});
