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

  it('the single panel folds over the ridgeline at its ridge line: both halves lean out, the fold closes, held at every tie-out, eaves down at the ridgeline height', () => {
    // 56" wide: with 1" rolled hems on both eaves it cuts at the full 58" fabric width.
    // 28" a side reaches the ground only from a lower ridgeline: 24" (a low storm pitch).
    const v = built({ ...DEF, construction: 'single_panel', width: 56, ridge_height: 24 });
    const r = v.resolved;
    const asm = tarpAssembly(v.pieces, r)!;
    expect(asm).not.toBeNull();
    // Split at the ridge line and joined there (see assembly3d.ts): two halves, one fold seam per segment.
    expect(asm.pieces.map((p) => p.id)).toEqual([PANEL_ID, PANEL_B_ID]);
    expect(asm.seams.length).toBeGreaterThanOrEqual(24);
    // Each eave's tie-outs on its half; the two ridge ends on both.
    expect(asm.pins).toHaveLength(v.tieouts.length + v.tieouts.filter((t) => t.kind === 'ridge').length);
    // The halves add up to the cut panel.
    const area = (p: typeof asm.pieces[number]) => { const o = p.paths.find((x) => x.closed)!; let s2 = 0; for (const e of o.edges) s2 += e.start.x * e.end.y - e.end.x * e.start.y; return Math.abs(s2) / 2; };
    const full = v.pieces.find((p) => p.id === PANEL_ID)!;
    expect(area(asm.pieces[0]) + area(asm.pieces[1])).toBeCloseTo(area(full), 0);
    expect(asm.pitchDeg).toBeCloseTo(r.pitch_deg, 9);
    expectViewerMatchesHarness(asm.pieces, asm.placements);
    // The exported pattern keeps its (0°) reference line; only the 3D copy folds it.
    expect(v.pieces[0].paths.find((x) => x.id.endsWith('-ridge-line'))!.label).toMatch(/\(0°\)/);
    const { world, bounds } = assemble(asm.pieces, asm.placements, asm.seams, null, 60, asm.pins, asm.gravity);
    // Before the cloth moves: the rigid fold (hems folded, halves leaned out) already sits below
    // the ridge — no hem strip flipped up over it, as a hinge across the end hems would put it.
    for (const id of [PANEL_ID, PANEL_B_ID]) expect(bounds(id).hi[1], `${id} rigid top`).toBeLessThan(5);
    relax(world, 300);
    expect(seamResidual(world).mean).toBeLessThan(3);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    expect(stretchReport(world, 0.99).value).toBeLessThan(0.02);
    const ba = bounds(PANEL_ID), bb = bounds(PANEL_B_ID);
    // Opposite sides of the ridge.
    expect(ba.hi[2]).toBeLessThan(20);
    expect(bb.lo[2]).toBeGreaterThan(-20);
    const b = { lo: ba.lo.map((x, i) => Math.min(x, bb.lo[i])), hi: ba.hi.map((x, i) => Math.max(x, bb.hi[i])) };
    // The ridge is the top of the panel, at y = 0 and z = 0; the eaves hang either side of it.
    expect(b.hi[1]).toBeLessThan(5);
    expect(b.hi[1]).toBeGreaterThan(-20);
    expect(b.lo[2]).toBeLessThan(-0.4 * r.footprint_width);
    expect(b.hi[2]).toBeGreaterThan(0.4 * r.footprint_width);
    // Eaves down to about the 24" ridgeline height (plus the rolled hem and sag between tie-outs).
    expect(-b.lo[1]).toBeGreaterThan(24 * IN - 10);
    expect(-b.lo[1]).toBeLessThan(27 * IN);
    // Footprint: eave to eave across the ridge.
    expect(b.hi[2] - b.lo[2]).toBeGreaterThan(r.footprint_width - 20);
    expect(b.hi[2] - b.lo[2]).toBeLessThan(r.footprint_width + 4 * IN);
    expect(asm.report[0]).toMatch(/footprint/);
    expect(asm.report.join(' ')).toMatch(/one panel folded over the ridgeline/i);
  });
});

describe('tarp ends in 3D: doors and beaks (ridge-seam tarp)', () => {
  it('doors stand in the end planes, each half seamed to its panel end and to its partner up the middle', () => {
    const v = built({ ...DEF, doors: 'both_ends' });
    const asm = tarpAssembly(v.pieces, v.resolved)!;
    const doorIds = asm.pieces.map((p) => p.id).filter((id) => id.startsWith('tarp-door-'));
    expect(doorIds).toHaveLength(4);
    expect(asm.seams.filter((s) => /door \d zipper/.test(s.label ?? ''))).toHaveLength(2);
    expectViewerMatchesHarness(asm.pieces, asm.placements);
    const { world, bounds } = assemble(asm.pieces, asm.placements, asm.seams, null, 40, asm.pins, asm.gravity);
    relax(world, 300);
    expect(seamResidual(world).mean).toBeLessThan(3);
    expect(maxPenetration(world)).toBeLessThan(world.params.thickness);
    expect(stretchReport(world, 0.99).value).toBeLessThan(0.05);
    // A door half reaches from the ridge down to about the ground, half the footprint out.
    const d = bounds('tarp-door-0-a');
    expect(-d.lo[1]).toBeGreaterThan(42 * IN - 60);
    expect(d.hi[2] - d.lo[2]).toBeGreaterThan(v.resolved.footprint_width / 2 - 60);
    expect(asm.report.join(' ')).toMatch(/both ends closed by doors/);
  });
  it('beaks carry the roof on past the ends, seamed to the panel ends and to each other along the ridge', () => {
    const v = built({ ...DEF, beaks: 'both_ends' });
    const asm = tarpAssembly(v.pieces, v.resolved)!;
    expect(asm.pieces.filter((p) => p.id.startsWith('tarp-beak-'))).toHaveLength(4);
    expectViewerMatchesHarness(asm.pieces, asm.placements);
    const { world, bounds } = assemble(asm.pieces, asm.placements, asm.seams, null, 40, asm.pins, asm.gravity);
    relax(world, 300);
    expect(seamResidual(world).mean).toBeLessThan(3);
    expect(stretchReport(world, 0.99).value).toBeLessThan(0.05);
    const panel = bounds(PANEL_ID), b0 = bounds('tarp-beak-0-a'), b1 = bounds('tarp-beak-1-a');
    // Past the x = 0 end and past the far end, by about the beak reach.
    expect(b0.lo[0]).toBeLessThan(panel.lo[0] - 18 * IN + 60);
    expect(b1.hi[0]).toBeGreaterThan(panel.hi[0] + 18 * IN - 60);
    expect(asm.report.join(' ')).toMatch(/beaks on both ends/);
  });
  it('a staked beak: both halves pinned at one tip, out and down from the ridge end, the ridge seam closed', () => {
    const v = built({ ...DEF, beaks: 'one_end' });
    const asm = tarpAssembly(v.pieces, v.resolved)!;
    const tipPins = asm.pins.filter((p) => p.pieceId.startsWith('tarp-beak-'));
    expect(tipPins).toHaveLength(2);
    expectViewerMatchesHarness(asm.pieces, asm.placements);
    const { world, bounds, ids, meshes } = assemble(asm.pieces, asm.placements, asm.seams, null, 40, asm.pins, asm.gravity);
    relax(world, 300);
    expect(seamResidual(world).mean).toBeLessThan(3);
    const panel = bounds(PANEL_ID), a = bounds('tarp-beak-0-a'), b = bounds('tarp-beak-0-b');
    const L = v.resolved.beak_length;
    // Out past the end by the reach's run, and the tip well below the ridge (the drop at 30°).
    expect(a.lo[0]).toBeLessThan(panel.lo[0] - L * Math.cos(Math.PI / 6) + 60);
    expect(a.lo[0]).toBeGreaterThan(panel.lo[0] - L - 60);
    // Each half's lowest-x point is its tip, in the centre plane at the stake drop.
    const tip = (id: string) => { const mi = ids.indexOf(id); let best = [Infinity, 0, 0]; for (let k = 0; k < meshes[mi].vertexCount; k++) { const o = 3 * (world.base[mi] + k); if (world.pos[o] < best[0]) best = [world.pos[o], world.pos[o + 1], world.pos[o + 2]]; } return best; };
    for (const id of ['tarp-beak-0-a', 'tarp-beak-0-b']) {
      const t = tip(id);
      expect(Math.abs(t[2])).toBeLessThan(40);
      expect(-t[1]).toBeGreaterThan(L * 0.5 - 40);
    }
    expect(b.lo[0]).toBeCloseTo(a.lo[0], -2);
    expect(asm.report.join(' ')).toMatch(/staked out and down/);
  });
});
