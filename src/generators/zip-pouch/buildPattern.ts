/**
 * Zip Pouch Generator — Pattern geometry builder
 *
 * Computes cut panel dimensions, builds Piece objects with appropriate edge roles,
 * generates boxing stitch lines, and assembles the canonical 5-step instruction sequence.
 */

import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Edge, StraightEdge } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import { boxedCornerStitchLine } from '../../lib/pattern-engine/geometry/boxedCorner.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { ZipPouchInputs, BomRow, BuildPatternError, Result, ResolvedInputs } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import { buildBom, computeCutDimensions } from './bom.js';

// ─── Geometry helpers ────────────────────────────────────────────────────────

function makeStraightEdge(
  id: string,
  role: StraightEdge['role'],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): StraightEdge {
  return { kind: 'straight', id, role, start: { x: x0, y: y0 }, end: { x: x1, y: y1 } };
}

// ─── Piece builder ───────────────────────────────────────────────────────────

function buildPanelPiece(
  pieceId: string,
  pieceName: string,
  cutWidth: number,
  cutHeight: number,
  seamAllowance: number,
  stitchOffset: number,
): Piece {
  const edgeId = makeEdgeIdGen(pieceId);

  // ── cut boundary (closed rectangle, clockwise from top-left) ──────────────
  const cutEdges: Edge[] = [
    makeStraightEdge(edgeId(), 'cut', 0, 0, cutWidth, 0),        // top
    makeStraightEdge(edgeId(), 'cut', cutWidth, 0, cutWidth, cutHeight), // right
    makeStraightEdge(edgeId(), 'cut', cutWidth, cutHeight, 0, cutHeight), // bottom
    makeStraightEdge(edgeId(), 'cut', 0, cutHeight, 0, 0),        // left
  ];
  const cutPath: Path = { id: `${pieceId}:cut`, edges: cutEdges, closed: true };

  // ── stitch lines — inward SA offset on all 3 sewn edges ─────────────────
  // Top edge uses the zipper SA; left, right, bottom use the seam SA.
  // Only drawn when SA > 0 (with SA=0, finished dims = cut dims, no offset).
  const stitchEdges: Edge[] = seamAllowance > 0 ? [
    // left side seam
    makeStraightEdge(edgeId(), 'stitch', seamAllowance, 0, seamAllowance, cutHeight),
    // right side seam
    makeStraightEdge(edgeId(), 'stitch', cutWidth - seamAllowance, 0, cutWidth - seamAllowance, cutHeight),
    // bottom seam
    makeStraightEdge(edgeId(), 'stitch', 0, cutHeight - seamAllowance, cutWidth, cutHeight - seamAllowance),
  ] : [];
  const stitchPath: Path = { id: `${pieceId}:stitch`, edges: stitchEdges, closed: false };

  // ── notch — zipper seam registration across the top ───────────────────────
  // A short horizontal notch path just below the cut edge at the top seam line.
  const notchEdges: Edge[] = [
    makeStraightEdge(edgeId(), 'notch', cutWidth * 0.25, 0, cutWidth * 0.25, seamAllowance),
    makeStraightEdge(edgeId(), 'notch', cutWidth * 0.75, 0, cutWidth * 0.75, seamAllowance),
  ];
  const notchPath: Path = { id: `${pieceId}:notch`, edges: notchEdges, closed: false };

  // ── boxing stitch lines — short horizontal marks at bottom corners ──────────
  // Each line shows where to stitch across the folded corner triangle.
  // Positioned at y = cutHeight - stitchOffset (the fold line), spanning
  // 2×stitchOffset wide so the full triangle base is visible.
  const boxStitchY = cutHeight - stitchOffset;
  const foldLeftPath: Path = {
    id: `${pieceId}:fold-left`,
    edges: [makeStraightEdge(edgeId(), 'fold', 0, boxStitchY, stitchOffset * 2, boxStitchY)],
    closed: false,
    label: `Box corner — stitch here, trim 3/8"`,
  };
  const foldRightPath: Path = {
    id: `${pieceId}:fold-right`,
    edges: [makeStraightEdge(edgeId(), 'fold', cutWidth - stitchOffset * 2, boxStitchY, cutWidth, boxStitchY)],
    closed: false,
    label: `Box corner — stitch here, trim 3/8"`,
  };

  return {
    id: pieceId,
    name: pieceName,
    mirror: false,
    quantity: 1,
    paths: [cutPath, stitchPath, notchPath, foldLeftPath, foldRightPath],
    // Baked-in SA convention: cut dims already include SA — zero outward offsets.
    seamAllowances: {
      [`${pieceId}:e0`]: 0,
      [`${pieceId}:e1`]: 0,
      [`${pieceId}:e2`]: 0,
      [`${pieceId}:e3`]: 0,
    },
  };
}

// ─── Steps builder ───────────────────────────────────────────────────────────

function buildSteps(
  resolved: ReturnType<typeof resolveInputs>,
  cutWidth: number,
  cutHeight: number,
): Step[] {
  const { finished_length, finished_width, finished_depth, seam_allowance, zip_gauge, pull_loops, grosgrain_width } = resolved;
  const zipperLength = Math.ceil((cutWidth + 25) / 50) * 50;

  return [
    {
      id: 'step-1',
      title: 'Cut panels',
      body:
        `Cut 2 panels from main fabric at ${cutWidth} mm × ${cutHeight} mm (width × height), ` +
        `including ${seam_allowance} mm seam allowance on all sides. ` +
        `Finished interior dimensions: ${finished_length} × ${finished_width} mm with ${finished_depth} mm depth.`,
      dependsOn: [],
      refsPieces: ['front', 'back'],
      group: 'Preparation',
    },
    {
      id: 'step-2',
      title: 'Attach zipper',
      body:
        `Position a ${zip_gauge} coil zipper (${zipperLength} mm) along the top edge of each panel. ` +
        `Align the zipper tape with the top cut edge. ` +
        (pull_loops
          ? `Fold ${grosgrain_width} mm grosgrain ribbon into pull loops at each end of the zipper before stitching. `
          : '') +
        `Sew the zipper tape to both panels using a zipper foot, stitching along the notch/stitch line ${seam_allowance} mm from the top edge.`,
      dependsOn: ['step-1'],
      refsPieces: ['front', 'back'],
      group: 'Assembly',
    },
    {
      id: 'step-3',
      title: 'Sew side seams',
      body:
        `With right sides together and the zipper open slightly, align the front and back panels. ` +
        `Sew down both side seams and across the bottom at ${seam_allowance} mm seam allowance, ` +
        `following the stitch lines. Leave a turning gap if not using a lining.`,
      dependsOn: ['step-2'],
      refsPieces: ['front', 'back'],
      group: 'Assembly',
    },
    {
      id: 'step-4',
      title: 'Box corners',
      body:
        `At each bottom corner, fold the corner so that the side seam aligns with the bottom seam. ` +
        `Stitch perpendicular to the seam along the boxing stitch line at ${finished_depth / 2} mm from the folded tip. ` +
        `Trim seam allowance to 9.5 mm. Repeat for all 4 corners to create a ${finished_depth} mm gusset depth.`,
      dependsOn: ['step-3'],
      refsPieces: ['front', 'back'],
      group: 'Assembly',
    },
    {
      id: 'step-5',
      title: 'Finish with grosgrain',
      body:
        pull_loops
          ? `Turn the pouch right side out through the open zipper. ` +
            `Trim any excess zipper tape and finish the ends with grosgrain ribbon (${grosgrain_width} mm wide). ` +
            `Topstitch the grosgrain over the zipper seam for a clean finish.`
          : `Turn the pouch right side out through the open zipper. ` +
            `Trim excess zipper tape and finish the raw ends with a bar tack or binding.`,
      dependsOn: ['step-4'],
      refsPieces: ['front', 'back'],
      group: 'Finishing',
    },
  ];
}

// ─── Simple rectangle piece builder ─────────────────────────────────────────
// (Internal buildBom removed by SS-01 of 2026-05-29 polish spec — BOM now
// consolidated into bom.ts which exports buildBom + computeCutDimensions.)

function buildRectPiece(
  pieceId: string,
  pieceName: string,
  cutWidth: number,
  cutHeight: number,
  seamAllowance: number,
  quantity = 1,
): Piece {
  const edgeId = makeEdgeIdGen(pieceId);
  const cutEdges: Edge[] = [
    makeStraightEdge(edgeId(), 'cut', 0, 0, cutWidth, 0),
    makeStraightEdge(edgeId(), 'cut', cutWidth, 0, cutWidth, cutHeight),
    makeStraightEdge(edgeId(), 'cut', cutWidth, cutHeight, 0, cutHeight),
    makeStraightEdge(edgeId(), 'cut', 0, cutHeight, 0, 0),
  ];
  const cutPath: Path = { id: `${pieceId}:cut`, edges: cutEdges, closed: true };
  const stitchEdges: Edge[] = seamAllowance > 0 ? [
    makeStraightEdge(edgeId(), 'stitch', seamAllowance, seamAllowance, cutWidth - seamAllowance, seamAllowance),
    makeStraightEdge(edgeId(), 'stitch', seamAllowance, seamAllowance, seamAllowance, cutHeight - seamAllowance),
    makeStraightEdge(edgeId(), 'stitch', cutWidth - seamAllowance, seamAllowance, cutWidth - seamAllowance, cutHeight - seamAllowance),
    makeStraightEdge(edgeId(), 'stitch', seamAllowance, cutHeight - seamAllowance, cutWidth - seamAllowance, cutHeight - seamAllowance),
  ] : [];
  const stitchPath: Path = { id: `${pieceId}:stitch`, edges: stitchEdges, closed: false };
  return {
    id: pieceId,
    name: pieceName,
    mirror: false,
    quantity,
    paths: [cutPath, stitchPath],
    seamAllowances: {
      [`${pieceId}:e0`]: 0,
      [`${pieceId}:e1`]: 0,
      [`${pieceId}:e2`]: 0,
      [`${pieceId}:e3`]: 0,
    },
  };
}

// ─── Cross-bottom style builders ─────────────────────────────────────────────

function buildCrossBottomPieces(r: ResolvedInputs): Piece[] {
  const { finished_length, finished_width, finished_depth, seam_allowance } = r;
  const sa = seam_allowance;
  const C = finished_depth / 2;           // corner cutout size = depth / 2
  const W = finished_length + finished_depth + 2 * sa;  // panelCutWidth
  const H_half = (finished_width + finished_depth + 2 * sa) / 2; // half-cross height

  // Half-cross panel: 8-edge polygon — top corners notched, straight zipper edge at bottom.
  // Two of these pieces join at the straight (bottom) edge with the zipper between them.
  function makeHalfCrossPanel(id: string, name: string): Piece {
    const edgeId = makeEdgeIdGen(id);
    const cutEdges: Edge[] = [
      makeStraightEdge(edgeId(), 'cut', C, 0, W - C, 0),           // top edge
      makeStraightEdge(edgeId(), 'cut', W - C, 0, W - C, C),       // top-right step
      makeStraightEdge(edgeId(), 'cut', W - C, C, W, C),           // right arm out
      makeStraightEdge(edgeId(), 'cut', W, C, W, H_half),          // right side down
      makeStraightEdge(edgeId(), 'cut', W, H_half, 0, H_half),     // zipper edge (straight)
      makeStraightEdge(edgeId(), 'cut', 0, H_half, 0, C),          // left side up
      makeStraightEdge(edgeId(), 'cut', 0, C, C, C),               // left arm in
      makeStraightEdge(edgeId(), 'cut', C, C, C, 0),               // top-left step
    ];
    const cutPath: Path = { id: `${id}:cut`, edges: cutEdges, closed: true };

    // Zipper stitch line along the bottom (straight) edge
    const zipperStitchPath: Path = {
      id: `${id}:zipper-stitch`,
      edges: [makeStraightEdge(edgeId(), 'stitch', 0, H_half - sa, W, H_half - sa)],
      closed: false,
      label: 'Align zipper tape here',
    };

    // Corner dimension annotations — show the C×C cutout size at each top corner.
    // Draws the inner edges of the cutout square so the sewer knows exactly how big to cut.
    const cornerLeftPath: Path = {
      id: `${id}:corner-left`,
      edges: [
        makeStraightEdge(edgeId(), 'fold', 0, C, C, C),    // horizontal inner edge
        makeStraightEdge(edgeId(), 'fold', C, 0, C, C),    // vertical inner edge
      ],
      closed: false,
      label: `Corner: ${C} × ${C} mm`,
    };
    const cornerRightPath: Path = {
      id: `${id}:corner-right`,
      edges: [
        makeStraightEdge(edgeId(), 'fold', W - C, C, W, C),    // horizontal inner edge
        makeStraightEdge(edgeId(), 'fold', W - C, 0, W - C, C), // vertical inner edge
      ],
      closed: false,
      label: `Corner: ${C} × ${C} mm`,
    };

    return {
      id,
      name,
      mirror: false,
      quantity: 1,
      paths: [cutPath, zipperStitchPath, cornerLeftPath, cornerRightPath],
      // Baked-in SA convention: cut dims already include SA — zero outward offsets.
      seamAllowances: {
        [`${id}:e0`]: 0,
        [`${id}:e1`]: 0,
        [`${id}:e2`]: 0,
        [`${id}:e3`]: 0,
        [`${id}:e4`]: 0,
        [`${id}:e5`]: 0,
        [`${id}:e6`]: 0,
        [`${id}:e7`]: 0,
      },
    };
  }

  return [
    makeHalfCrossPanel('cross-panel', 'Cross Panel (Front)'),
    makeHalfCrossPanel('cross-panel-back', 'Cross Panel (Back)'),
  ];
}

// ─── Gusset-strip style builders ─────────────────────────────────────────────

function buildGussetStripPieces(r: ResolvedInputs): Piece[] {
  const { finished_length, finished_width, finished_depth, seam_allowance } = r;
  const sa = seam_allowance;

  const panelCutWidth = finished_length + 2 * sa;
  const panelCutHeight = finished_width + 2 * sa;
  const gussetCutWidth = 2 * finished_width + finished_length + 2 * sa;
  const gussetCutHeight = finished_depth + 2 * sa;

  function makeGussetStrip(): Piece {
    const id = 'gusset-strip';
    const edgeId = makeEdgeIdGen(id);
    const W = gussetCutWidth;
    const H = gussetCutHeight;
    const cutEdges: Edge[] = [
      makeStraightEdge(edgeId(), 'cut', 0, 0, W, 0),
      makeStraightEdge(edgeId(), 'cut', W, 0, W, H),
      makeStraightEdge(edgeId(), 'cut', W, H, 0, H),
      makeStraightEdge(edgeId(), 'cut', 0, H, 0, 0),
    ];
    const cutPath: Path = { id: `${id}:cut`, edges: cutEdges, closed: true };
    // Notches at finished_length + sa from each end to mark panel attachment points
    const notchX1 = finished_length + sa;
    const notchX2 = W - (finished_length + sa);
    const notchEdges: Edge[] = [
      makeStraightEdge(edgeId(), 'notch', notchX1, 0, notchX1, H * 0.25),
      makeStraightEdge(edgeId(), 'notch', notchX2, 0, notchX2, H * 0.25),
    ];
    const notchPath: Path = { id: `${id}:notch`, edges: notchEdges, closed: false };
    return {
      id,
      name: 'Gusset Strip',
      mirror: false,
      quantity: 1,
      paths: [cutPath, notchPath],
      // Baked-in SA convention: cut dims already include SA — zero outward offsets.
      seamAllowances: {
        [`${id}:e0`]: 0,
        [`${id}:e1`]: 0,
        [`${id}:e2`]: 0,
        [`${id}:e3`]: 0,
      },
    };
  }

  const back = buildRectPiece('back-panel', 'Back Panel', panelCutWidth, panelCutHeight, sa);

  if (r.zipper_position === 'front') {
    // Front-zipper: back is solid, front is split into top+bottom strips, gusset wraps all 4 sides.
    const zip_from_top = r.zip_from_top;
    const frontTopH = zip_from_top + sa;
    const frontBottomH = finished_width - zip_from_top + sa;
    const fullGussetW = 2 * finished_length + 2 * finished_width + 2 * sa;

    const frontTop = buildRectPiece('front-top-strip', 'Front Top Strip', panelCutWidth, frontTopH, sa);
    const frontBottom = buildRectPiece('front-bottom-strip', 'Front Bottom Strip', panelCutWidth, frontBottomH, sa);

    const gId = 'full-perimeter-gusset';
    const gEdgeId = makeEdgeIdGen(gId);
    const gW = fullGussetW;
    const gH = gussetCutHeight;
    const gCutEdges: Edge[] = [
      makeStraightEdge(gEdgeId(), 'cut', 0, 0, gW, 0),
      makeStraightEdge(gEdgeId(), 'cut', gW, 0, gW, gH),
      makeStraightEdge(gEdgeId(), 'cut', gW, gH, 0, gH),
      makeStraightEdge(gEdgeId(), 'cut', 0, gH, 0, 0),
    ];
    const fullGusset: Piece = {
      id: gId,
      name: 'Full Perimeter Gusset',
      mirror: false,
      quantity: 1,
      paths: [{ id: `${gId}:cut`, edges: gCutEdges, closed: true }],
      // Baked-in SA convention: cut dims already include SA — zero outward offsets.
      seamAllowances: {
        [`${gId}:e0`]: 0,
        [`${gId}:e1`]: 0,
        [`${gId}:e2`]: 0,
        [`${gId}:e3`]: 0,
      },
    };

    return [back, frontTop, frontBottom, fullGusset];
  }

  // Top-zipper (default): front + back panels + U-shape gusset + two end tabs at zipper corners.
  const front = buildRectPiece('front-panel', 'Front Panel', panelCutWidth, panelCutHeight, sa);
  const tabW = finished_depth + 2 * sa;
  const tabH = 15 + sa;
  const tab = buildRectPiece('zipper-end-tab', 'Zipper End Tab', tabW, tabH, sa, 2);

  return [front, back, makeGussetStrip(), tab];
}

// ─── Multi-panel style builders ───────────────────────────────────────────────

function buildMultiPanelPieces(r: ResolvedInputs): Piece[] {
  const { finished_length, finished_width, finished_depth, seam_allowance } = r;
  const sa = seam_allowance;

  const frontBackW = finished_length + 2 * sa;
  const frontBackH = finished_width + 2 * sa;
  const bottomW = finished_length + 2 * sa;
  const bottomH = finished_depth + 2 * sa;
  const endW = finished_width + 2 * sa;
  const endH = finished_depth + 2 * sa;

  const front = buildRectPiece('front-panel', 'Front Panel', frontBackW, frontBackH, sa);
  const back = buildRectPiece('back-panel', 'Back Panel', frontBackW, frontBackH, sa);
  const bottom = buildRectPiece('bottom-panel', 'Bottom Panel', bottomW, bottomH, sa);
  const end = buildRectPiece('end-panel', 'End Panel', endW, endH, sa, 2);
  const tabW = finished_depth + 2 * sa;
  const tabH = 15 + sa;
  const tab = buildRectPiece('zipper-end-tab', 'Zipper End Tab', tabW, tabH, sa, 2);

  return [front, back, bottom, end, tab];
}

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Build the zip pouch pattern from user inputs.
 *
 * Returns the two panel Pieces (front + back), the 5-step instruction sequence,
 * and a bill of materials. On invalid inputs, returns an error result.
 */
export function buildPattern(
  inputs: ZipPouchInputs,
): Result<{ pieces: Piece[]; steps: Step[]; bom: BomRow[] }> {
  const validationResult = validateInputs(inputs);
  if (!validationResult.ok) {
    return { ok: false, errors: (validationResult as { ok: false; errors: BuildPatternError[]; warnings: string[] }).errors, warnings: validationResult.warnings };
  }

  const resolved = resolveInputs(inputs);
  const { finished_length, finished_width, finished_depth, seam_allowance, construction_style } = resolved;

  let pieces: Piece[];

  if (construction_style === 'cross-bottom') {
    pieces = buildCrossBottomPieces(resolved);
  } else if (construction_style === 'gusset-strip') {
    pieces = buildGussetStripPieces(resolved);
  } else if (construction_style === 'multi-panel') {
    pieces = buildMultiPanelPieces(resolved);
  } else {
    // 'boxed' (default)
    const { cutWidth, cutHeight } = computeCutDimensions(resolved);
    const boxResult = boxedCornerStitchLine({
      panelWidth: cutWidth,
      panelHeight: cutHeight,
      bottomWidth: finished_depth,
    });
    const stitchOffset = boxResult.stitchLineOffsetFromCorner;
    const front = buildPanelPiece('front', 'Front Panel', cutWidth, cutHeight, seam_allowance, stitchOffset);
    const back = buildPanelPiece('back', 'Back Panel', cutWidth, cutHeight, seam_allowance, stitchOffset);
    pieces = [front, back];
  }

  const cutWidth = finished_length + 2 * seam_allowance;
  const cutHeight = finished_width + finished_depth / 2 + seam_allowance;
  const steps = buildSteps(resolved, cutWidth, cutHeight);
  const bom = buildBom(resolved);

  return {
    ok: true,
    value: { pieces, steps, bom },
    warnings: validationResult.warnings,
  };
}
