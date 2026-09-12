/**
 * 3D check for the sling: the finished pad (the turned tube flattened to half
 * its girth) draped over the right shoulder of a medium torso, both ends
 * held where the webbing leaves it. Shows whether the pad length and
 * flat width sit on the shoulder without kinking.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { PiecePlacement } from '../../lib/fold-engine/index.js';
import { shoulderPath, torsoForm, TORSO_MEDIUM, type SeamSpec, type TorsoSpec, type Vec3 } from '../../lib/cloth-engine/index.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { ResolvedInputs } from './types.js';

export const PAD_DISPLAY_ID = 'sling-pad';

export interface SlingAssembly {
  pieces: Piece[];
  object: { shape: 'torso'; width: number; depth: number; height: number; torso: { shoulderWidth: number; neckRadius: number }; at: Vec3; label: string };
  placements: Record<string, PiecePlacement>;
  pins: { pieceId: string; point: Point; radius: number }[];
  seams: SeamSpec[];
}

export function slingAssembly(r: ResolvedInputs, torso: TorsoSpec = TORSO_MEDIUM): SlingAssembly {
  const w = r.pad_flat_width, L = r.pad_finished_length;
  const eid = makeEdgeIdGen(PAD_DISPLAY_ID);
  const e = (sx: number, sy: number, ex: number, ey: number) => ({ kind: 'straight' as const, id: eid(), role: 'cut' as const, start: { x: sx, y: sy }, end: { x: ex, y: ey } });
  const pad: Piece = {
    id: PAD_DISPLAY_ID, name: 'Sling pad (finished)', mirror: false, quantity: 1, materialId: 'foam-closed-cell',
    paths: [{ id: `${PAD_DISPLAY_ID}-outline`, closed: true, edges: [e(0, 0, w, 0), e(w, 0, w, L), e(w, L, 0, L), e(0, L, 0, 0)] }],
    seamAllowances: {},
  };
  const form = torsoForm(torso, [0, 0, 0]);
  // A sling pad sits on the shoulder with more of it toward the back than a pack strap.
  const path = shoulderPath(torso, 'right', form.chestTop - L * 0.35, [0, 0, 0]);
  return {
    pieces: [pad],
    object: { shape: 'torso', width: torso.chestWidth, depth: torso.chestDepth, height: torso.torsoLength, torso: { shoulderWidth: torso.shoulderWidth, neckRadius: torso.neckRadius }, at: [0, 0, 0], label: 'torso' },
    placements: { [PAD_DISPLAY_ID]: { keep: true, drape: { path, across: [1, 0, 0], x0: w / 2 } } },
    pins: [
      { pieceId: PAD_DISPLAY_ID, point: { x: w / 2, y: 0 }, radius: w },
      { pieceId: PAD_DISPLAY_ID, point: { x: w / 2, y: L }, radius: w },
    ],
    seams: [],
  };
}
