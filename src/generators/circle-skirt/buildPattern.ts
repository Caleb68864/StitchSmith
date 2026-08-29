/**
 * Circle Skirt Generator — buildPattern
 *
 * Constructs annulus-sector panel pieces using ArcEdge for waist and hem arcs,
 * plus a straight waistband piece.
 *
 * Coordinate system per panel:
 *   - Center at (0, 0)
 *   - Sector sweeps from θ=0 to θ=panel_sweep_deg (degrees, y-down SVG space)
 *   - All coordinates are non-negative (panel_sweep_deg ≤ 90°)
 */

import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { ArcEdge, StraightEdge } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { CircleSkirtInputs, ResolvedInputs } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import { makeRectOutline } from '../../lib/pattern-engine/geometry/paths.js';

export interface CircleSkirtBuildResult {
  pieces: Piece[];
  steps: Step[];
  warnings: string[];
}

function ptAt(radius: number, angleDeg: number): { x: number; y: number } {
  const rad = angleDeg * (Math.PI / 180);
  return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
}

function buildSectorPanel(resolved: ResolvedInputs, index: number): Piece {
  const { cut_inner_r, cut_outer_r, r, R, panel_sweep_deg } = resolved;
  const theta2 = panel_sweep_deg;
  const thetaMid = theta2 / 2;

  // Corner points of the annulus sector at CUT dimensions
  const A = ptAt(cut_inner_r, 0);       // inner at θ=0
  const B = ptAt(cut_inner_r, theta2);  // inner at θ=theta2
  const C = ptAt(cut_outer_r, theta2);  // outer at θ=theta2
  const D = ptAt(cut_outer_r, 0);       // outer at θ=0

  const center = { x: 0, y: 0 };

  // Inner waist arc: A→B, clockwise in SVG (θ increasing = CW in y-down screen)
  const innerArc: ArcEdge = {
    kind: 'arc',
    id: `panel-${index}-inner-arc`,
    role: 'seam',
    start: A,
    end: B,
    center,
    radius: cut_inner_r,
    clockwise: true,
  };

  // Right side seam: B→C (radial line at θ=theta2)
  const rightSeam: StraightEdge = {
    kind: 'straight',
    id: `panel-${index}-right-seam`,
    role: 'seam',
    start: B,
    end: C,
  };

  // Outer hem arc: C→D, counterclockwise in SVG (θ decreasing back to 0)
  const outerArc: ArcEdge = {
    kind: 'arc',
    id: `panel-${index}-outer-arc`,
    role: 'cut',
    start: C,
    end: D,
    center,
    radius: cut_outer_r,
    clockwise: false,
  };

  // Left side seam: D→A (radial line at θ=0)
  const leftSeam: StraightEdge = {
    kind: 'straight',
    id: `panel-${index}-left-seam`,
    role: 'seam',
    start: D,
    end: A,
  };

  const outline: Path = {
    id: `panel-${index}-outline`,
    closed: true,
    edges: [innerArc, rightSeam, outerArc, leftSeam],
  };

  // Hem fold arc at finished outer radius R (fold allowance lives between R and cut_outer_r)
  const hemFoldArc: ArcEdge = {
    kind: 'arc',
    id: `panel-${index}-hem-fold-arc`,
    role: 'fold',
    start: ptAt(R, 0),
    end: ptAt(R, theta2),
    center,
    radius: R,
    clockwise: true,
  };
  const hemFoldPath: Path = {
    id: `panel-${index}-hem-fold`,
    closed: false,
    edges: [hemFoldArc],
    label: 'hem fold',
  };

  // Waist stitch reference arc at finished inner radius r
  const waistStitchArc: ArcEdge = {
    kind: 'arc',
    id: `panel-${index}-waist-stitch-arc`,
    role: 'stitch',
    start: ptAt(r, 0),
    end: ptAt(r, theta2),
    center,
    radius: r,
    clockwise: true,
  };
  const waistStitchPath: Path = {
    id: `panel-${index}-waist-stitch`,
    closed: false,
    edges: [waistStitchArc],
  };

  // Grain line: radial line along the angle bisector, cut_inner_r → cut_outer_r
  const grainStart = ptAt(cut_inner_r, thetaMid);
  const grainEnd = ptAt(cut_outer_r, thetaMid);
  const grainPath: Path = {
    id: `panel-${index}-grain`,
    closed: false,
    edges: [
      {
        kind: 'straight',
        id: `panel-${index}-grain:e0`,
        role: 'stitch',
        start: grainStart,
        end: grainEnd,
      },
    ],
  };

  return {
    id: `panel-${index + 1}`,
    name: `Skirt Panel ${index + 1}`,
    mirror: false,
    quantity: 1,
    paths: [outline, hemFoldPath, waistStitchPath, grainPath],
    annotations: [
      {
        kind: 'grain',
        angle: thetaMid,
        point: {
          x: (grainStart.x + grainEnd.x) / 2,
          y: (grainStart.y + grainEnd.y) / 2,
        },
      },
    ],
  };
}

function buildWaistband(resolved: ResolvedInputs): Piece {
  const { effective_waist, band_height, elastic_width, seam_allowance, waistband_type } = resolved;
  const SA = seam_allowance;
  const bandH = waistband_type === 'elastic-casing' ? elastic_width : band_height;

  // Cut dimensions: doubled height for fold-in-half waistband construction
  const cutWidth = effective_waist + 2 * SA;
  const cutHeight = 2 * bandH + 2 * SA;

  const outline = makeRectOutline('waistband-outline', cutWidth, cutHeight, 'cut');

  // Center fold line
  const foldY = bandH + SA;
  const foldPath: Path = {
    id: 'waistband-fold',
    closed: false,
    edges: [
      {
        kind: 'straight',
        id: 'waistband-fold:e0',
        role: 'fold',
        start: { x: 0, y: foldY },
        end: { x: cutWidth, y: foldY },
      },
    ],
    label: 'fold',
  };

  return {
    id: 'waistband',
    name: 'Waistband',
    mirror: false,
    quantity: 1,
    paths: [outline, foldPath],
    annotations: [
      {
        kind: 'grain',
        angle: 0,
        point: { x: cutWidth / 2, y: cutHeight / 2 },
      },
    ],
  };
}

function buildSteps(resolved: ResolvedInputs, numPanels: number): Step[] {
  const { seam_allowance, hem_allowance, closure } = resolved;
  const SA = seam_allowance;
  const HA = hem_allowance;

  return [
    {
      id: 'step-1',
      title: 'Cut fabric',
      body: `Cut ${numPanels} skirt panels and 1 waistband piece including ${SA}mm seam allowance. Mark the hem fold line ${HA}mm from the raw outer edge.`,
      dependsOn: [],
      refsPieces: [],
      group: 'cut',
    },
    {
      id: 'step-2',
      title: 'Sew panels together',
      body: `With right sides together, sew adjacent panel side seams at ${SA}mm seam allowance. Press seams open.`,
      dependsOn: ['step-1'],
      refsPieces: [],
      group: 'sew',
    },
    {
      id: 'step-3',
      title: 'Attach waistband',
      body: `Fold waistband in half lengthwise (wrong sides out). Pin and stitch to skirt waist edge at ${SA}mm seam allowance. Fold over and topstitch or slipstitch in place.`,
      dependsOn: ['step-2'],
      refsPieces: ['waistband'],
      group: 'sew',
    },
    {
      id: 'step-4',
      title: closure === 'elastic' ? 'Insert elastic' : `Install ${closure} zipper`,
      body:
        closure === 'elastic'
          ? `Thread elastic through waistband casing. Overlap ends 25mm and stitch securely. Close the casing opening.`
          : `Install ${closure === 'back-zip' ? 'center-back' : 'left-side'} zipper in the open seam. Stitch zipper tape at ${SA}mm. Topstitch if desired.`,
      dependsOn: ['step-3'],
      refsPieces: [],
      group: 'hardware',
    },
    {
      id: 'step-5',
      title: 'Hem',
      body: `Press ${HA}mm hem allowance to wrong side along the fold line. Fold under again for a clean double hem. Topstitch or hand-sew in place.`,
      dependsOn: ['step-2'],
      refsPieces: [],
      group: 'finish',
    },
  ];
}

/**
 * Build a full circle-skirt Pattern from raw inputs.
 *
 * Returns `num_panels` sector panels + 1 waistband piece, plus construction
 * steps and any advisory warnings.
 */
export function buildPattern(inputs: CircleSkirtInputs): CircleSkirtBuildResult {
  // resolveInputs is total — it never throws — so without this gate a missing
  // waist becomes NaN geometry and an out-of-range sweep becomes
  // `Array.from({ length: Infinity })` (or, for a merely huge sweep, an
  // allocation that never finishes). Every caller wraps buildPattern in
  // try/catch; a clear error naming the field is the contract.
  const validation = validateInputs(inputs);
  if (!validation.ok) {
    throw new Error(`Invalid circle-skirt inputs: ${validation.errors.map(e => e.message).join(' ')}`);
  }
  const resolved = resolveInputs(inputs);
  const { num_panels } = resolved;

  const panels: Piece[] = Array.from({ length: num_panels }, (_, i) =>
    buildSectorPanel(resolved, i),
  );

  const waistband = buildWaistband(resolved);

  const pieces: Piece[] = [...panels, waistband];
  const steps = buildSteps(resolved, num_panels);

  const warnings: string[] = [];
  if (resolved.sweep_angle_deg > 360) {
    warnings.push('Multi-circle skirt requires significant piecing — confirm yardage.');
  }

  return { pieces, steps, warnings };
}
