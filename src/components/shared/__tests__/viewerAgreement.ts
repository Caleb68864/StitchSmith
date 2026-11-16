/**
 * Test helper: the viewer's layout and the cloth harness must put every piece
 * the viewer shows in the same place. Used by the viewer-layout test and the
 * assembly sweep (every generator's assembly).
 */
import { expect } from 'vitest';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { PiecePlacement } from '../../../lib/fold-engine/index.js';
import { layoutPieces } from '../viewer/layout.js';
import { harnessEntries, placedPoints, type AssemblyObject } from '../../../lib/cloth-engine/__tests__/harness.js';

/** Outline corners of a piece, flat. */
function corners(piece: Piece) {
  const outline = piece.paths.find((p) => p.closed && p.edges.length > 0)!;
  return outline.edges.map((e) => e.start);
}

/** Viewer vs harness: the placed outline of every piece the viewer shows, compared point by point. */
export function expectViewerMatchesHarness(pieces: Piece[], placements: Record<string, PiecePlacement>, object: AssemblyObject | null = null, tol = 1e-6) {
  const viewer = layoutPieces({ id: 'x', name: 'x', pieces }, false, placements, object?.base);
  const harness = harnessEntries(pieces, placements, object);
  expect(viewer.length).toBeGreaterThan(0);
  for (const v of viewer) {
    const h = harness.find((e) => e.model.pieceId === v.model.pieceId)!;
    const piece = pieces.find((p) => p.id === v.model.pieceId)!;
    const pts = corners(piece);
    const pv = placedPoints(viewer, v, pts);
    const ph = placedPoints(harness, h, pts);
    for (let i = 0; i < pts.length; i++) {
      for (let k = 0; k < 3; k++) expect(Math.abs(pv[i][k] - ph[i][k]), `${piece.id} corner ${i} axis ${k}`).toBeLessThan(tol);
    }
  }
}
