// @vitest-environment node
/**
 * Convergence and stretch reporting. These two decide what the viewer shows and
 * how long it runs, so they are pinned here rather than left to the sweep.
 */
import { describe, it, expect } from 'vitest';
import {
  buildClothMesh, createWorld, relax, relaxUntilSettled, createSettleMonitor, stepMovement,
  stretchReport, stretchPercentile, materialPlateStiffness, PLATE_MIN_STIFFNESS,
  type SeamSpec,
} from '../index.js';
import type { Piece } from '../../pattern-engine/graph/Piece.js';

function rect(id: string, w: number, h: number, materialId?: string): Piece {
  return {
    id, name: id, mirror: false, quantity: 1, materialId,
    paths: [{ id: `${id}-o`, closed: true, edges: [
      { kind: 'straight', id: `${id}-0`, role: 'cut', start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
      { kind: 'straight', id: `${id}-1`, role: 'cut', start: { x: w, y: 0 }, end: { x: w, y: h } },
      { kind: 'straight', id: `${id}-2`, role: 'cut', start: { x: w, y: h }, end: { x: 0, y: h } },
      { kind: 'straight', id: `${id}-3`, role: 'cut', start: { x: 0, y: h }, end: { x: 0, y: 0 } },
    ] }],
  };
}

/** Two panels face to face, seamed down both sides: settles quickly and stays put. */
function twoPanelWorld(opts: { gravity?: [number, number, number]; pinTop?: boolean } = {}) {
  const front = rect('front', 120, 160, 'cordura-500');
  const back = rect('back', 120, 160, 'cordura-500');
  const meshes = [buildClothMesh(front, { spacing: 8 })!, buildClothMesh(back, { spacing: 8 })!];
  const seams: SeamSpec[] = [
    { label: 'left', a: { pieceId: 'front', from: { x: 0, y: 0 }, to: { x: 0, y: 160 } }, b: { pieceId: 'back', from: { x: 0, y: 0 }, to: { x: 0, y: 160 } } },
    { label: 'right', a: { pieceId: 'front', from: { x: 120, y: 0 }, to: { x: 120, y: 160 } }, b: { pieceId: 'back', from: { x: 120, y: 0 }, to: { x: 120, y: 160 } } },
  ];
  return createWorld({
    meshes,
    initial: (mi, _v, f) => [f.x, -f.y, mi === 0 ? 30 : -30],
    seams,
    pinned: opts.pinTop ? (_mi, _v, f) => f.y < 1 : undefined,
    params: { spacing: 8, gravity: opts.gravity ?? [0, 0, 0] },
  });
}

describe('stepMovement and the settle monitor', () => {
  it('movement is zero before any step and positive once the seams start pulling', () => {
    const world = twoPanelWorld();
    expect(stepMovement(world)).toBe(0);
    // Step 1 moves nothing: the seam ramp is still at its initial distance and a
    // flat panel already satisfies every stretch constraint.
    relax(world, 1);
    expect(stepMovement(world)).toBe(0);
    relax(world, 20);
    expect(stepMovement(world)).toBeGreaterThan(0);
  });

  it('relaxUntilSettled stops early on an assembly that comes to rest, and the answer matches the full run', () => {
    const settleWorld = twoPanelWorld();
    const res = relaxUntilSettled(settleWorld, { maxSteps: 400 });
    expect(res.settled).toBe(true);
    expect(res.steps).toBeGreaterThanOrEqual(settleWorld.params.seamRampSteps);
    expect(res.steps).toBeLessThan(400);

    const fullWorld = twoPanelWorld();
    relax(fullWorld, 400);
    // Stopping at the plateau must not change the shape by more than the mesh can resolve.
    let sum = 0;
    for (let i = 0; i < fullWorld.pos.length; i += 3) {
      const dx = fullWorld.pos[i] - settleWorld.pos[i];
      const dy = fullWorld.pos[i + 1] - settleWorld.pos[i + 1];
      const dz = fullWorld.pos[i + 2] - settleWorld.pos[i + 2];
      sum += dx * dx + dy * dy + dz * dz;
    }
    const rms = Math.sqrt(sum / (fullWorld.pos.length / 3));
    expect(rms).toBeLessThan(settleWorld.params.spacing / 8);
  });

  it('reports a cloth still falling under gravity as unsettled rather than stopping on its steady velocity', () => {
    // Pinned along the top edge and pulled down hard: a long fall that 60 steps cannot finish.
    const world = twoPanelWorld({ gravity: [0, -0.4, 0], pinTop: true });
    const res = relaxUntilSettled(world, { maxSteps: 60, minSteps: 20 });
    expect(res.settled).toBe(false);
    expect(res.steps).toBe(60);
  });

  it('onStep can stop the loop, leaving the world mid-solve for the next slice', () => {
    const world = twoPanelWorld();
    const res = relaxUntilSettled(world, { maxSteps: 400, onStep: (w) => w.steps < 5 });
    expect(res.settled).toBe(false);
    expect(res.steps).toBe(5);
    expect(world.steps).toBe(5);
  });

  it('the monitor is the same criterion, usable a step at a time', () => {
    const world = twoPanelWorld();
    const monitor = createSettleMonitor(world);
    let settledAt = 0;
    for (let i = 0; i < 400 && !settledAt; i++) {
      relax(world, 1);
      if (monitor.observe()) settledAt = world.steps;
    }
    expect(settledAt).toBeGreaterThan(0);
    expect(monitor.lastMovement()).toBeLessThan(world.params.spacing / 40);
  });
});

describe('stretchReport', () => {
  it('separates a single sheared edge from the state of the fabric as a whole', () => {
    const world = twoPanelWorld();
    relax(world, 200);
    // Drag one vertex far away: the maximum leaps, the 99th percentile should barely move.
    const before = stretchReport(world, 0.99);
    world.pos[0] += 400;
    const after = stretchReport(world, 0.99);
    expect(after.max).toBeGreaterThan(before.max + 1);
    expect(after.value).toBeCloseTo(before.value, 2);
    expect(after.worstPiece).toBe('front');
    expect(after.count).toBe(before.count);
    expect(stretchPercentile(world, 0.99)).toBeCloseTo(after.value, 6);
  });

  it('counts how widespread the strain is and handles an empty selection', () => {
    const world = twoPanelWorld();
    relax(world, 100);
    const r = stretchReport(world, 0.99);
    expect(r.strained).toBeGreaterThanOrEqual(0);
    expect(r.strained).toBeLessThanOrEqual(1);
    const none = stretchReport(world, 0.99, () => false);
    expect(none).toEqual({ value: 0, max: 0, worstPiece: null, strained: 0, count: 0 });
  });
});

describe('plate constraints', () => {
  it('are built for foam and webbing but not for cloth, whose nominal stiffness is below the floor', () => {
    expect(materialPlateStiffness('foam-closed-cell')).toBeGreaterThanOrEqual(PLATE_MIN_STIFFNESS);
    expect(materialPlateStiffness('webbing-25')).toBeGreaterThanOrEqual(PLATE_MIN_STIFFNESS);
    expect(materialPlateStiffness('cordura-500')).toBeLessThan(PLATE_MIN_STIFFNESS);

    const build = (materialId: string) => {
      const piece = rect('p', 80, 80, materialId);
      return createWorld({
        meshes: [buildClothMesh(piece, { spacing: 8 })!],
        initial: (_mi, _v, f) => [f.x, -f.y, 0],
        plateStiffnessOf: () => materialPlateStiffness(materialId),
        params: { spacing: 8 },
      });
    };
    expect(build('foam-closed-cell').plates.length).toBeGreaterThan(0);
    expect(build('cordura-500').plates).toHaveLength(0);
  });
});
