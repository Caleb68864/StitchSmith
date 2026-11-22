/**
 * Top quilt — panel geometry in one place (Convention B), shared by the
 * resolver (cut sizes, fabric check), the pattern and the tests.
 *
 * Flat frame per panel: y runs head (finished edge at y = sa) to foot, x
 * across with the centre line at x = cutWidth / 2. The finished outline is a
 * straight taper from the shoulder width at the head to the foot width at the
 * foot; the cut outline is that taper offset outward by the seam allowance
 * (mitred at the corners).
 */
import type { Point } from '../../lib/pattern-engine/graph/Point.js';

export interface PanelOutline {
  /** Finished (sew-line) corners: head left, head right, foot right, foot left. */
  finished: Point[];
  /** Cut corners in the same order. */
  cut: Point[];
  cutWidth: number;
  cutLength: number;
  /** x of the centre line. */
  cx: number;
  /** Finished half-width at a distance y from the head (finished frame, 0..length). */
  halfWidthAt: (y: number) => number;
  /** Piece y of a finished-frame y. */
  yAt: (y: number) => number;
}

/**
 * @param length finished head-to-foot length
 * @param headWidth finished width at the head
 * @param footWidth finished width at the foot
 * @param sa seam allowance beyond every finished edge
 */
export function panelOutline(length: number, headWidth: number, footWidth: number, sa: number): PanelOutline {
  const a = headWidth / 2, b = footWidth / 2, L = length;
  const halfWidthAt = (y: number) => a + ((b - a) * y) / L;
  // Right side runs (a, 0) → (b, L); its outward normal points to +x.
  const len = Math.hypot(b - a, L);
  const nx = L / len, ny = (a - b) / len;
  const offsetX = (y: number) => a + sa * nx + ((b - a) * (y - sa * ny)) / L;
  const xHead = offsetX(-sa), xFoot = offsetX(L + sa);
  const cutHalf = Math.max(xHead, xFoot);
  const cx = cutHalf;
  const yAt = (y: number) => y + sa;
  const finished: Point[] = [
    { x: cx - a, y: yAt(0) }, { x: cx + a, y: yAt(0) }, { x: cx + b, y: yAt(L) }, { x: cx - b, y: yAt(L) },
  ];
  const cut: Point[] = [
    { x: cx - xHead, y: 0 }, { x: cx + xHead, y: 0 }, { x: cx + xFoot, y: L + 2 * sa }, { x: cx - xFoot, y: L + 2 * sa },
  ];
  return { finished, cut, cutWidth: 2 * cutHalf, cutLength: L + 2 * sa, cx, halfWidthAt, yAt };
}
