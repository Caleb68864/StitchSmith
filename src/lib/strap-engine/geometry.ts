/**
 * Strap engine — pad outline geometry.
 *
 * Local frame: x across the strap (0 = inner edge, toward the wearer's
 * centre-line), y along it (0 = top / yoke end, `length` = bottom / tail end).
 * Mirrored pairs are produced by `Piece.mirror`, so one outline serves both.
 */

import type { Edge, EdgeId } from '../pattern-engine/graph/Edge.js';
import type { Path } from '../pattern-engine/graph/Path.js';
import type { Point } from '../pattern-engine/graph/Point.js';
import type { StrapCurve } from './types.js';

export interface OutlineSpec {
  width: number;
  length: number;
  curve: StrapCurve;
  /** Bottom width; defaults to a taper toward the webbing on curved pads. */
  bottomWidth?: number;
  /** Lateral sweep; defaults to 30 % of width on curved pads. */
  sweep?: number;
}

/** Fraction of length that stays straight at the top of a J-curve. */
export const J_STRAIGHT_FRACTION = 0.4;
/** Fraction of length that stays straight at the top of an S-curve. */
export const S_STRAIGHT_FRACTION = 0.3;
/** Where the S-curve reaches its inward extreme. */
export const S_INFLECTION_FRACTION = 0.65;
/** Default sweep as a fraction of pad width. */
export const DEFAULT_SWEEP_FRACTION = 0.3;

export function defaultBottomWidth(width: number, webbingWidth: number, curve: StrapCurve): number {
  if (curve === 'straight') return width;
  return Math.max(webbingWidth + 12, Math.round(width * 0.65));
}

export function defaultSweep(width: number, curve: StrapCurve): number {
  return curve === 'straight' ? 0 : Math.round(width * DEFAULT_SWEEP_FRACTION);
}

/**
 * Build the closed cut outline. `offset` translates the whole outline so
 * inset copies (foam, mesh) can sit inside the shell in the same frame.
 */
export function strapOutline(
  spec: OutlineSpec,
  eid: () => EdgeId,
  pathId: string,
  offset: Point = { x: 0, y: 0 },
  role: Edge['role'] = 'cut',
): Path {
  const w = spec.width;
  const L = spec.length;
  const bw = spec.bottomWidth ?? w;
  const sweep = spec.sweep ?? 0;
  const P = (x: number, y: number): Point => ({ x: x + offset.x, y: y + offset.y });
  const seg = (a: Point, b: Point): Edge => ({ kind: 'straight', id: eid(), role, start: a, end: b });
  const bez = (a: Point, b: Point, c1: Point, c2: Point): Edge =>
    ({ kind: 'bezier', id: eid(), role, start: a, end: b, cp1: c1, cp2: c2 });

  let edges: Edge[];

  if (spec.curve === 'straight') {
    edges = [
      seg(P(0, 0), P(w, 0)),
      seg(P(w, 0), P(w, L)),
      seg(P(w, L), P(0, L)),
      seg(P(0, L), P(0, 0)),
    ];
  } else if (spec.curve === 'j_curve') {
    const yS = L * J_STRAIGHT_FRACTION;
    const xBotIn = -sweep;
    const xBotOut = -sweep + bw;
    edges = [
      seg(P(0, 0), P(w, 0)),
      seg(P(w, 0), P(w, yS)),
      bez(P(w, yS), P(xBotOut, L), P(w, L * 0.75), P(xBotOut, L * 0.9)),
      seg(P(xBotOut, L), P(xBotIn, L)),
      bez(P(xBotIn, L), P(0, yS), P(xBotIn, L * 0.9), P(0, L * 0.75)),
      seg(P(0, yS), P(0, 0)),
    ];
  } else {
    const yS = L * S_STRAIGHT_FRACTION;
    const yI = L * S_INFLECTION_FRACTION;
    const xBotIn = sweep * 0.5;
    const xBotOut = xBotIn + bw;
    edges = [
      seg(P(0, 0), P(w, 0)),
      seg(P(w, 0), P(w, yS)),
      bez(P(w, yS), P(w - sweep, yI), P(w, L * 0.5), P(w - sweep, L * 0.5)),
      bez(P(w - sweep, yI), P(xBotOut, L), P(w - sweep, L * 0.85), P(xBotOut, L * 0.9)),
      seg(P(xBotOut, L), P(xBotIn, L)),
      bez(P(xBotIn, L), P(-sweep, yI), P(xBotIn, L * 0.9), P(-sweep, L * 0.85)),
      bez(P(-sweep, yI), P(0, yS), P(-sweep, L * 0.5), P(0, L * 0.5)),
      seg(P(0, yS), P(0, 0)),
    ];
  }

  return { id: pathId, closed: true, edges };
}

/**
 * An outline shrunk by `insetSides` on the long edges and `insetEnds` at the
 * top and bottom, positioned inside the parent outline. Curved pads keep the
 * same sweep so the inset piece follows the shell.
 */
export function insetOutline(
  spec: OutlineSpec,
  insetSides: number,
  insetEnds: number,
  eid: () => EdgeId,
  pathId: string,
  role: Edge['role'] = 'cut',
): Path {
  const inner: OutlineSpec = {
    width: Math.max(1, spec.width - 2 * insetSides),
    length: Math.max(1, spec.length - 2 * insetEnds),
    curve: spec.curve,
    bottomWidth: spec.bottomWidth === undefined ? undefined : Math.max(1, spec.bottomWidth - 2 * insetSides),
    sweep: spec.sweep,
  };
  return strapOutline(inner, eid, pathId, { x: insetSides, y: insetEnds }, role);
}
