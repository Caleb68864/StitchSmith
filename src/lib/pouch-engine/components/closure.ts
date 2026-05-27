/**
 * Closure component specification for the pouch engine.
 *
 * A closure is the hardware or material attachment that keeps the flap (or
 * pouch top) secured.  Examples: hook-and-loop, magnetic snap, buckle, zipper.
 */

export type ClosureStyle =
  | 'hook_and_loop'
  | 'magnetic_snap'
  | 'buckle'
  | 'zipper'
  | 'button_snap'
  | 'none';

export interface ClosureSpec {
  style: ClosureStyle;
  /**
   * Width of the closure hardware in mm (relevant for hook-and-loop patches,
   * magnetic snaps, buckles).  Optional; defaults to style-specific standard.
   */
  width_mm?: number;
  /**
   * Height / depth of the closure hardware in mm.  Optional.
   */
  height_mm?: number;
  /**
   * For positioned closures (e.g. magnetic snap), distance from the flap free
   * edge inward to the snap centre in mm.
   */
  offset_from_edge_mm?: number;
}

/** Default closure (none). */
export const defaultClosureSpec: ClosureSpec = {
  style: 'none',
};

/**
 * Validate a ClosureSpec, returning an array of error strings.
 * An empty array means the spec is valid.
 */
export function validateClosureSpec(closure: ClosureSpec): string[] {
  const errors: string[] = [];
  if (closure.style === 'none') return errors;

  if (
    closure.width_mm !== undefined &&
    (!Number.isFinite(closure.width_mm) || closure.width_mm <= 0)
  ) {
    errors.push(
      `closure.width_mm must be a positive finite number (got ${closure.width_mm})`,
    );
  }
  if (
    closure.height_mm !== undefined &&
    (!Number.isFinite(closure.height_mm) || closure.height_mm <= 0)
  ) {
    errors.push(
      `closure.height_mm must be a positive finite number (got ${closure.height_mm})`,
    );
  }
  if (
    closure.offset_from_edge_mm !== undefined &&
    (!Number.isFinite(closure.offset_from_edge_mm) ||
      closure.offset_from_edge_mm < 0)
  ) {
    errors.push(
      `closure.offset_from_edge_mm must be a non-negative finite number (got ${closure.offset_from_edge_mm})`,
    );
  }
  return errors;
}
