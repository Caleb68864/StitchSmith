import type { Pattern } from './Pattern.js';
import type { Point } from './Point.js';

function finitePoint(p: Point | undefined): boolean {
  return p != null && Number.isFinite(p.x) && Number.isFinite(p.y);
}

/**
 * Throw if any coordinate, arc radius, bezier control point or per-edge seam
 * allowance in `pattern` is NaN or ±Infinity.
 *
 * Generators resolve defaults with plain arithmetic, so a missing or corrupt
 * input turns into NaN geometry rather than an error. Left unchecked it
 * reaches the exporters, which happily write `width="NaNmm"` into an SVG or a
 * NaN page size into a PDF — a file that opens blank, with no hint why. Every
 * exporter calls this first so the failure is loud and names the culprit.
 */
export function assertFinitePattern(pattern: Pattern): void {
  for (const piece of pattern.pieces) {
    for (const path of piece.paths) {
      for (const edge of path.edges) {
        let ok = finitePoint(edge.start) && finitePoint(edge.end);
        if (edge.kind === 'arc') {
          ok = ok && finitePoint(edge.center) && Number.isFinite(edge.radius);
        } else if (edge.kind === 'bezier') {
          ok = ok && finitePoint(edge.cp1) && finitePoint(edge.cp2);
        }
        if (!ok) {
          throw new Error(
            `Pattern has non-finite geometry: piece "${piece.id}" edge "${edge.id}" (check the inputs that drive it)`,
          );
        }
      }
    }
    if (piece.seamAllowances) {
      for (const [edgeId, sa] of Object.entries(piece.seamAllowances)) {
        if (!Number.isFinite(sa)) {
          throw new Error(
            `Pattern has non-finite geometry: piece "${piece.id}" seam allowance on edge "${edgeId}" is ${sa}`,
          );
        }
      }
    }
  }
}
