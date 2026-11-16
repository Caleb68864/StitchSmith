// @vitest-environment node
/**
 * The viewer and the cloth test harness must place every piece of an assembly
 * in the same spot, or a 3D test passes on a scene the browser never shows.
 * Found on the tarp: a placement that only rotates a piece (`rx` or `rz`, no
 * offset) was laid out flat in the viewer's side-by-side row, while the harness
 * applied the rotation.
 */
import { describe, it, expect } from 'vitest';
import type { PiecePlacement } from '../../../lib/fold-engine/index.js';
import { layoutPieces } from '../viewer/layout.js';
import { expectViewerMatchesHarness } from './viewerAgreement.js';
import { buildPattern, tarpAssembly, PANEL_ID, PANEL_B_ID } from '../../../generators/tarp/index.js';
import { makeDefaultTarpProject } from '../../../state/useTarpProject.js';

function tarp() {
  const b = buildPattern(makeDefaultTarpProject().inputs);
  if (!b.ok) throw new Error('tarp build failed');
  return tarpAssembly(b.value.pieces, b.value.resolved)!;
}
const withoutOffsets = ({ dx: _x, dy: _y, dz: _z, ...rest }: PiecePlacement): PiecePlacement => rest;

describe('viewer layout agrees with the cloth harness', () => {
  it('a rotation-only placement (rx, no offset) is rotated in the viewer, not laid flat in the row', () => {
    const asm = tarp();
    const placements = Object.fromEntries(Object.entries(asm.placements).map(([id, pl]) => [id, withoutOffsets({ ...pl, dx: 0, dy: 0, dz: 0 })]));
    expect(placements[PANEL_ID].dx).toBeUndefined();
    expect(placements[PANEL_ID].rx).not.toBe(0);
    const entries = layoutPieces({ id: 't', name: 't', pieces: asm.pieces }, false, placements);
    for (const id of [PANEL_ID, PANEL_B_ID]) {
      const e = entries.find((x) => x.model.pieceId === id)!;
      expect(e.placement, `${id} keeps its placement`).toBe(placements[id]);
      expect([e.offsetX, e.offsetY, e.offsetZ]).toEqual([0, 0, 0]);
    }
    expectViewerMatchesHarness(asm.pieces, placements);
  });

  it('a turn-only placement (rz, no offset) is turned in the viewer too', () => {
    const asm = tarp();
    const placements: Record<string, PiecePlacement> = { [PANEL_ID]: { keep: true, rz: 180 }, [PANEL_B_ID]: { keep: true, rz: 90 } };
    expectViewerMatchesHarness(asm.pieces, placements);
  });

  it('the same rotation with explicit zero offsets (how every assembly was written before) places identically', () => {
    const asm = tarp();
    const placements = Object.fromEntries(Object.entries(asm.placements).map(([id, pl]) => [id, { ...pl, dx: 0, dy: 0, dz: 0 }]));
    expectViewerMatchesHarness(asm.pieces, placements);
    const bare = layoutPieces({ id: 't', name: 't', pieces: asm.pieces }, false, asm.placements);
    const zero = layoutPieces({ id: 't', name: 't', pieces: asm.pieces }, false, placements);
    expect(bare.map((e) => [e.offsetX, e.offsetY, e.offsetZ, e.placement?.rx])).toEqual(zero.map((e) => [e.offsetX, e.offsetY, e.offsetZ, e.placement?.rx]));
  });
});
