// @vitest-environment node
/**
 * The settle cache is what makes a second visit to the 3D tab instant, so its
 * key has to change for every input the solve reads and for nothing else.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { solveKey, getSolve, putSolve, clearSolveCache, type SolveKeyParts } from '../viewer/settleCache.js';
import { buildClothMesh, type SeamSpec, type Solid } from '../../../lib/cloth-engine/index.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';

function rect(id: string, w: number, h: number): Piece {
  return { id, name: id, mirror: false, quantity: 1, paths: [{ id: `${id}-o`, closed: true, edges: [
    { kind: 'straight', id: `${id}-0`, role: 'cut', start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
    { kind: 'straight', id: `${id}-1`, role: 'cut', start: { x: w, y: 0 }, end: { x: w, y: h } },
    { kind: 'straight', id: `${id}-2`, role: 'cut', start: { x: w, y: h }, end: { x: 0, y: h } },
    { kind: 'straight', id: `${id}-3`, role: 'cut', start: { x: 0, y: h }, end: { x: 0, y: 0 } },
  ] }] };
}

const seam: SeamSpec = {
  label: 's',
  a: { pieceId: 'a', from: { x: 0, y: 0 }, to: { x: 0, y: 100 } },
  b: { pieceId: 'b', from: { x: 0, y: 0 }, to: { x: 0, y: 100 } },
};
const solid: Solid = { kind: 'box', center: [0, 0, 0], half: [10, 10, 10] };

function parts(over: Partial<SolveKeyParts> = {}): SolveKeyParts {
  return {
    meshes: [buildClothMesh(rect('a', 100, 100), { spacing: 8 })!, buildClothMesh(rect('b', 100, 100), { spacing: 8 })!],
    seams: [seam],
    solids: [solid],
    pins: [1, 0, 0, 5],
    gravity: [0, -0.01, 0],
    spacing: 8,
    selfCollision: true,
    angles: [Math.PI],
    progress: 1,
    ...over,
  };
}

describe('solveKey', () => {
  it('is stable for the same inputs', () => {
    expect(solveKey(parts())).toBe(solveKey(parts()));
  });

  it('changes when anything the solver reads changes', () => {
    const base = solveKey(parts());
    const different: Array<[string, SolveKeyParts]> = [
      ['spacing', parts({ spacing: 10 })],
      ['self-collision', parts({ selfCollision: false })],
      ['gravity', parts({ gravity: [0, -0.02, 0] })],
      ['fold angles', parts({ angles: [Math.PI / 2] })],
      ['fold progress', parts({ progress: 0.5 })],
      ['pins', parts({ pins: [1, 0, 0, 6] })],
      ['seam geometry', parts({ seams: [{ ...seam, a: { ...seam.a, to: { x: 0, y: 90 } } }] })],
      ['seam gap', parts({ seams: [{ ...seam, gap: 4 }] })],
      ['solids', parts({ solids: [{ ...solid, half: [10, 20, 10] } as Solid] })],
      ['piece size', parts({ meshes: [buildClothMesh(rect('a', 120, 100), { spacing: 8 })!, buildClothMesh(rect('b', 100, 100), { spacing: 8 })!] })],
      ['piece id', parts({ meshes: [buildClothMesh(rect('z', 100, 100), { spacing: 8 })!, buildClothMesh(rect('b', 100, 100), { spacing: 8 })!] })],
    ];
    for (const [what, p] of different) expect(solveKey(p), what).not.toBe(base);
  });
});

describe('the cache', () => {
  beforeEach(clearSolveCache);

  it('returns a stored solve and refuses one of the wrong size', () => {
    const pos = new Float64Array([1, 2, 3, 4, 5, 6]);
    putSolve('k', pos, 200, true);
    expect(getSolve('k', 6)).toEqual({ pos, steps: 200, settled: true });
    expect(getSolve('k', 9)).toBeNull();
    expect(getSolve('missing', 6)).toBeNull();
  });

  it('copies the positions so a later solve cannot mutate the stored answer', () => {
    const pos = new Float64Array([1, 2, 3]);
    putSolve('k', pos, 10, false);
    pos[0] = 99;
    expect(getSolve('k', 3)!.pos[0]).toBe(1);
  });

  it('evicts the least recently used entry past its limit, keeping what was read', () => {
    for (let i = 0; i < 6; i++) putSolve(`k${i}`, new Float64Array([i]), 1, true);
    expect(getSolve('k0', 1)).not.toBeNull();
    // k0 is now the most recent; adding a seventh must drop k1, not k0.
    putSolve('k6', new Float64Array([6]), 1, true);
    expect(getSolve('k0', 1)).not.toBeNull();
    expect(getSolve('k1', 1)).toBeNull();
  });
});
