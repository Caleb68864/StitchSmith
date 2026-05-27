/**
 * Drainage component for the pouch engine.
 *
 * Drainage modifies the body piece's bottom geometry rather than adding a
 * separate piece.  Supported styles:
 *
 * - open_corner   : Notched bottom-corner cut (annotation + geometry note)
 * - sewn_closed   : No geometry change; emits a topstitch step only
 * - grommet       : Grommet placement annotation at bottom-center
 *
 * The `exposed_percentage` field on the spec controls an exposure-conflict
 * warning for the `grommet` style: when the body is more than 85% exposed
 * (e.g. on a molle rig front face), a grommet can become clogged or blocked,
 * leaving insufficient retention fabric around the hole.
 */

import type { Piece, PieceAnnotation } from '../../pattern-engine/graph/Piece.js';
import type { Step } from '../../pattern-engine/instructions/Step.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DrainageStyle = 'open_corner' | 'sewn_closed' | 'grommet';

export interface DrainageSpec {
  style: DrainageStyle;
  /** The body piece to annotate / patch. */
  bodyPiece: Piece;
  /**
   * Grommet size — applicable to `grommet` style only.
   * Defaults to '#0' (1/4" hole).
   */
  grommetSize?: '#0' | '#00';
  /**
   * Fraction of the pouch face that is exposed (0–1).
   * Used to emit a warning when a grommet is placed on a highly-exposed face.
   * Only relevant for `grommet` style.
   */
  exposed_percentage?: number;
}

export interface DrainageResult {
  /** Updated body piece — drainage mutates bottom geometry annotations. */
  piecePatches: Piece;
  steps: Step[];
  warnings: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Threshold above which grommet drainage conflicts with exposure. */
const GROMMET_EXPOSURE_THRESHOLD = 0.85;

/**
 * Warning copy for insufficient retention fabric around a grommet when
 * the exposed percentage is too high.
 */
export const GROMMET_EXPOSURE_WARNING =
  'Grommet drainage may be ineffective: insufficient retention fabric surrounds ' +
  'the grommet hole when exposed_percentage > 0.85. Consider open_corner drainage ' +
  'or reduce the exposed area before adding a grommet.';

// ─── Build functions ──────────────────────────────────────────────────────────

function buildOpenCorner(spec: DrainageSpec): DrainageResult {
  const annotation: PieceAnnotation = {
    kind: 'custom',
    label:
      'OPEN-CORNER DRAINAGE: notch both bottom corners 6 mm × 6 mm before sewing ' +
      'side seams. Leave the notch un-sewn to form a self-draining gap.',
  };

  const patched: Piece = {
    ...spec.bodyPiece,
    annotations: [...(spec.bodyPiece.annotations ?? []), annotation],
  };

  const steps: Step[] = [
    {
      id: 'drainage-open-corner',
      title: 'Cut open-corner drainage notches',
      body:
        'Before sewing the body seams, cut a 6 mm × 6 mm notch from each bottom ' +
        'corner of the body piece (inside the seam allowance). Leave these corners ' +
        'un-sewn when joining the side seams to create drainage gaps.',
      dependsOn: [],
      refsPieces: [spec.bodyPiece.id],
      group: 'drainage',
    },
  ];

  return { piecePatches: patched, steps, warnings: [] };
}

function buildSewnClosed(spec: DrainageSpec): DrainageResult {
  // No geometry change — the piece is returned unmodified.
  const steps: Step[] = [
    {
      id: 'drainage-sewn-closed',
      title: 'Topstitch bottom edge closed',
      body: 'Topstitch bottom edge closed at 6 mm seam allowance.',
      dependsOn: [],
      refsPieces: [spec.bodyPiece.id],
      group: 'drainage',
    },
  ];

  return { piecePatches: spec.bodyPiece, steps, warnings: [] };
}

function buildGrommet(spec: DrainageSpec): DrainageResult {
  const size = spec.grommetSize ?? '#0';
  const holeDiameter_mm = size === '#0' ? 6.35 : 4.76; // #0 = 1/4", #00 ≈ 3/16"
  const warnings: string[] = [];

  if (
    spec.exposed_percentage !== undefined &&
    spec.exposed_percentage > GROMMET_EXPOSURE_THRESHOLD
  ) {
    warnings.push(GROMMET_EXPOSURE_WARNING);
  }

  const annotation: PieceAnnotation = {
    kind: 'custom',
    label:
      `GROMMET DRAINAGE: install one ${size} grommet (${holeDiameter_mm.toFixed(2)} mm hole) ` +
      'at the bottom-center of the body piece. Mark center point before cutting.',
  };

  const patched: Piece = {
    ...spec.bodyPiece,
    annotations: [...(spec.bodyPiece.annotations ?? []), annotation],
  };

  const steps: Step[] = [
    {
      id: 'drainage-grommet',
      title: 'Install grommet at bottom-center',
      body:
        `Mark the bottom-center of the body piece and cut a ${holeDiameter_mm.toFixed(2)} mm ` +
        `hole. Set one ${size} grommet using a grommet setter tool. ` +
        'Ensure the grommet flange is fully seated before hammering.',
      dependsOn: [],
      refsPieces: [spec.bodyPiece.id],
      group: 'drainage',
    },
  ];

  return { piecePatches: patched, steps, warnings };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Apply drainage geometry patches and generate assembly steps for a body piece.
 *
 * Returns `piecePatches` — the updated body piece (with drainage annotations).
 * For `sewn_closed` style the piece is returned unmodified.
 */
export function buildDrainage(spec: DrainageSpec): DrainageResult {
  switch (spec.style) {
    case 'open_corner':
      return buildOpenCorner(spec);
    case 'sewn_closed':
      return buildSewnClosed(spec);
    case 'grommet':
      return buildGrommet(spec);
    default: {
      const _exhaustive: never = spec.style;
      return {
        piecePatches: spec.bodyPiece,
        steps: [],
        warnings: [`Unknown drainage style: ${_exhaustive}`],
      };
    }
  }
}
