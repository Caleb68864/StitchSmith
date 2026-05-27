/**
 * Seam-allowance helpers for the pouch engine.
 *
 * These utilities are distinct from the pattern-engine's `offset.ts`; they
 * operate on raw numeric dimensions rather than on Piece/Edge graph objects,
 * and they feed into the calc pipeline *before* the graph is built.
 */

/** Expand a 1-D measurement by the given seam allowance (both ends). */
export function addSA1D(measurement: number, sa: number): number {
  return measurement + sa * 2;
}

/** Expand a width measurement by SA on the left and right edges. */
export const expandWidth = addSA1D;

/** Expand a height measurement by SA on the top and bottom edges. */
export const expandHeight = addSA1D;

/**
 * Build a `Record<edgeId, sa>` map for a rectangular piece given a uniform SA
 * and an array of edge IDs in order [top, right, bottom, left].
 */
export function uniformSARecord(
  edgeIds: string[],
  sa: number,
): Record<string, number> {
  return Object.fromEntries(edgeIds.map((id) => [id, sa]));
}

/**
 * Build a SA record where fold edges receive 0 SA and all others receive the
 * supplied value.
 */
export function foldAwareSARecord(
  edgeIds: string[],
  foldEdgeIds: Set<string>,
  sa: number,
): Record<string, number> {
  return Object.fromEntries(
    edgeIds.map((id) => [id, foldEdgeIds.has(id) ? 0 : sa]),
  );
}
