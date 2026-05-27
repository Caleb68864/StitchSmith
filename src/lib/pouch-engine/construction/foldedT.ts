/**
 * Folded-T construction strategy.
 *
 * A single flat piece is cut in a landscape T/cross shape.  When folded:
 *   - The central vertical band becomes front panel → bottom → back panel.
 *   - The left and right wings fold around the sides to form gussets.
 *
 * The center seam runs down the back panel, joining the two wing edges.
 * This strategy works best when `internal_depth ≤ internal_width / 2`; the
 * engine emits a warning when that constraint is violated.
 */

import type { Piece } from '../../pattern-engine/graph/Piece.js';
import type { Step } from '../../pattern-engine/instructions/Step.js';
import type { ConstructionStrategy, PouchSpec } from './ConstructionStrategy.js';
import { runCalcPipeline } from '../geometry/calc.js';

// ─── Strategy-specific defaults ──────────────────────────────────────────────

export interface FoldedTDefaults {
  /** SA applied to the center back seam in mm. */
  center_seam_allowance: number;
  /** How far each wing overlaps the back panel (mm).  Usually equals SA. */
  side_wing_overlap: number;
  /** How the bottom corners of the wings are finished. */
  bottom_corner_treatment: 'square' | 'boxed' | 'trimmed';
  /**
   * Fraction of the object height the pouch encases (1.0 = full coverage).
   * Maps to `fit.exposed_percentage`.
   */
  exposed_percentage: number;
  /**
   * Flap length as a fraction of `internal_height`.
   * Used when no explicit `flap.length_mm` is provided.
   */
  flap_length_pct: number;
}

export const foldedTDefaults: FoldedTDefaults = {
  center_seam_allowance: 9.5,
  side_wing_overlap: 9.5,
  bottom_corner_treatment: 'square',
  exposed_percentage: 1.0,
  flap_length_pct: 0.4,
};

// ─── Assembly steps ───────────────────────────────────────────────────────────

function buildFoldedTSteps(spec: PouchSpec, pieceName: string): Step[] {
  const sa = spec.seamAllowance;
  return [
    {
      id: 'ft-cut',
      title: 'Cut body piece',
      body:
        `Cut one body piece from your fabric.  All edges include ${sa} mm seam allowance unless marked as fold lines.`,
      dependsOn: [],
      refsPieces: [pieceName],
      group: 'cutting',
    },
    {
      id: 'ft-fold-wings',
      title: 'Mark and fold wing attachment lines',
      body:
        'Lightly crease along the left-wing and right-wing fold lines.  ' +
        'These vertical folds separate the side wings from the front/back body panel.',
      dependsOn: ['ft-cut'],
      refsPieces: [pieceName],
      group: 'preparation',
    },
    {
      id: 'ft-fold-bottom',
      title: 'Fold front panel at bottom band',
      body:
        'Fold the piece along the "bottom-to-back" fold line so the front ' +
        'panel faces the back panel.  The bottom band forms the floor of the pouch.',
      dependsOn: ['ft-fold-wings'],
      refsPieces: [pieceName],
      group: 'construction',
    },
    {
      id: 'ft-stitch-center',
      title: 'Stitch center back seam',
      body:
        `Pin the two wing overlap edges together at the back-center.  ` +
        `Stitch with a ${sa} mm seam allowance.  Press seam open.`,
      dependsOn: ['ft-fold-bottom'],
      refsPieces: [pieceName],
      group: 'construction',
    },
    {
      id: 'ft-finish',
      title: 'Finish raw edges',
      body:
        'Serge or zigzag all remaining raw (cut) edges that are not enclosed ' +
        'in the construction seams.',
      dependsOn: ['ft-stitch-center'],
      refsPieces: [pieceName],
      group: 'finishing',
    },
  ];
}

// ─── Strategy implementation ──────────────────────────────────────────────────

/**
 * Folded-T construction strategy implementation.
 * Conforms to the {@link ConstructionStrategy} interface.
 */
export const foldedT: ConstructionStrategy = function foldedT(
  spec: PouchSpec,
): { pieces: Piece[]; steps: Step[]; warnings: string[] } {
  const { pieces, warnings } = runCalcPipeline(spec);
  const steps = buildFoldedTSteps(spec, pieces[0]?.id ?? 'body');
  return { pieces, steps, warnings };
};
