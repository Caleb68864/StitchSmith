/**
 * Stacked (tandem-depth) magazine cells — the parametric block from the vault
 * note `rigs/stacked-mag-cell-geometry.md`, shared so the micro rig's
 * `stacked_cells` pocket set and (later) the standalone pleated card's
 * `cells_deep` derive the same numbers from one place.
 *
 * The magazine stands flat side out, so a cell consumes the magazine's
 * front-to-back depth (`depth`, the preset's `width`):
 *
 *   rear cell   = depth + ease            (ease ≥ 1/4", NOT snapped to PALS)
 *   front mark  = rear cell + wrap        (wrap 1/4"–mag thickness, unsettled: mock it)
 *   stack depth = deep × thickness + (deep − 1) × 1/8" divider layers
 *   pouch       = coverage × length
 *   exposed     = length − pouch − cradle drop
 *   cradle      = stack depth + 2 × 1" ends + cradle drop
 *
 * All lengths in mm. The .308 test case (depth 2.9, thick 1.1, length 5.75)
 * is pinned in `__tests__/stacked.test.ts`.
 */

const IN = 25.4;

export const STACK_EASE_MM = 0.5 * IN;
export const STACK_EASE_MIN_MM = 0.25 * IN;
/** Never settled on camera — the vault says pin scrap round two magazines. */
export const WRAP_ALLOWANCE_MM = 0.5 * IN;
export const WRAP_ALLOWANCE_MIN_MM = 0.25 * IN;
export const STACK_COVERAGE = 0.65;
export const STACK_COVERAGE_MIN = 0.3;
/** Divider layers between two stacked magazines. */
export const DIVIDER_LAYERS_MM = 0.125 * IN;
/** Cradle ends: hemmed over at the pouch face, run under the back Velcro — 1" each. */
export const CRADLE_END_MM = 1 * IN;
export const MAX_CELLS_DEEP = 2;

export interface StackedCellInput {
  /** Magazine front-to-back depth (the preset's `width`), mm. */
  depth: number;
  /** Magazine thickness, mm. */
  thickness: number;
  /** Magazine length (the preset's `height`), mm. */
  length: number;
  /** 1 (individual slots) or 2 (a front cell over a rear cell). Default 2. */
  cellsDeep?: number;
  stackEase?: number;
  wrapAllowance?: number;
  coverage?: number;
  cradleDrop?: number;
}

export interface StackedCellGeometry {
  cellsDeep: number;
  stackEase: number;
  wrapAllowance: number;
  coverage: number;
  cradleDrop: number;
  rearCellWidth: number;
  frontCellMark: number;
  stackDepth: number;
  pouchHeight: number;
  exposedHeight: number;
  cradleLength: number;
}

/** Derive the stacked-cell block. Pure; call `validateStackedCells` for the rules. */
export function stackedCellGeometry(i: StackedCellInput): StackedCellGeometry {
  const cellsDeep = i.cellsDeep ?? 2;
  const stackEase = i.stackEase ?? STACK_EASE_MM;
  const wrapAllowance = i.wrapAllowance ?? WRAP_ALLOWANCE_MM;
  const coverage = i.coverage ?? STACK_COVERAGE;
  const cradleDrop = i.cradleDrop ?? 0;
  const rearCellWidth = i.depth + stackEase;
  const stackDepth = cellsDeep * i.thickness + (cellsDeep - 1) * DIVIDER_LAYERS_MM;
  const pouchHeight = coverage * i.length;
  return {
    cellsDeep,
    stackEase,
    wrapAllowance,
    coverage,
    cradleDrop,
    rearCellWidth,
    frontCellMark: rearCellWidth + wrapAllowance,
    stackDepth,
    pouchHeight,
    exposedHeight: i.length - pouchHeight - cradleDrop,
    cradleLength: stackDepth + 2 * CRADLE_END_MM + cradleDrop,
  };
}

export interface StackedCellError {
  field: 'cells_deep' | 'stack_ease' | 'wrap_allowance' | 'coverage' | 'cradle_drop' | 'magazine';
  message: string;
}

/** The vault's rules on the block. Empty array = valid. */
export function validateStackedCells(g: StackedCellGeometry, mag: { depth: number; thickness: number; length: number }): StackedCellError[] {
  const errors: StackedCellError[] = [];
  const pos = (v: number) => Number.isFinite(v) && v > 0;
  if (!pos(mag.depth) || !pos(mag.thickness) || !pos(mag.length)) {
    errors.push({ field: 'magazine', message: 'Magazine depth, thickness and length must be positive numbers' });
  }
  if (!Number.isInteger(g.cellsDeep) || g.cellsDeep < 1 || g.cellsDeep > MAX_CELLS_DEEP) {
    errors.push({ field: 'cells_deep', message: 'Cells deep must be 1 or 2' });
  }
  if (!Number.isFinite(g.stackEase) || g.stackEase < STACK_EASE_MIN_MM) {
    errors.push({ field: 'stack_ease', message: 'Ease must be at least 1/4" — sizing to one magazine exactly locks out its fatter cousins' });
  }
  if (!Number.isFinite(g.wrapAllowance) || g.wrapAllowance < WRAP_ALLOWANCE_MIN_MM || g.wrapAllowance > mag.thickness + 1e-6) {
    errors.push({ field: 'wrap_allowance', message: 'Wrap allowance must be between 1/4" and the magazine thickness' });
  }
  if (!Number.isFinite(g.coverage) || g.coverage < STACK_COVERAGE_MIN || g.coverage > 1) {
    errors.push({ field: 'coverage', message: 'Coverage must be between 0.3 and 1' });
  }
  if (!Number.isFinite(g.cradleDrop) || g.cradleDrop < 0) {
    errors.push({ field: 'cradle_drop', message: 'Cradle drop must be 0 or greater' });
  } else if (Number.isFinite(g.exposedHeight) && g.exposedHeight < 0) {
    // Hardening: a drop deeper than the uncovered length would put the magazine top below the
    // pouch mouth, and every derived length downstream (bungee, exposed height) goes wrong.
    errors.push({ field: 'cradle_drop', message: 'Cradle drop cannot exceed the uncovered magazine length — the magazine would sit below the mouth' });
  }
  return errors;
}
