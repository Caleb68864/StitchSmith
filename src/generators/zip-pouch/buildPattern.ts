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
import {
  crossBottomDims,
  gussetStripDims,
  multiPanelDims,
  zipperEndTabDims,
  zipperLengthForStyle,
  fmt,
} from './dimensions.js';

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

function buildBoxedSteps(
  resolved: ResolvedInputs,
  cutWidth: number,
  cutHeight: number,
): Step[] {
  const { finished_length, finished_width, finished_depth, seam_allowance, zip_gauge, pull_loops, grosgrain_width } = resolved;
  const zipperLength = zipperLengthForStyle(resolved);

  return [
    {
      id: 'step-1',
      title: 'Cut panels',
      body:
        `Cut 2 panels from main fabric at ${fmt(cutWidth)} mm × ${fmt(cutHeight)} mm (width × height), ` +
        `including ${fmt(seam_allowance)} mm seam allowance on all sides. ` +
        `Finished interior dimensions: ${fmt(finished_length)} × ${fmt(finished_width)} mm with ${fmt(finished_depth)} mm depth.`,
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
          ? `Fold ${fmt(grosgrain_width)} mm grosgrain ribbon into pull loops at each end of the zipper before stitching. `
          : '') +
        `Sew the zipper tape to both panels using a zipper foot, stitching along the notch/stitch line ${fmt(seam_allowance)} mm from the top edge.`,
      dependsOn: ['step-1'],
      refsPieces: ['front', 'back'],
      group: 'Assembly',
    },
    {
      id: 'step-3',
      title: 'Sew side seams',
      body:
        `With right sides together and the zipper open slightly, align the front and back panels. ` +
        `Sew down both side seams and across the bottom at ${fmt(seam_allowance)} mm seam allowance, ` +
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
        `Stitch perpendicular to the seam along the boxing stitch line at ${fmt(finished_depth / 2)} mm from the folded tip. ` +
        `Trim seam allowance to 9.5 mm. Repeat for all 4 corners to create a ${fmt(finished_depth)} mm gusset depth.`,
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
            `Trim any excess zipper tape and finish the ends with grosgrain ribbon (${fmt(grosgrain_width)} mm wide). ` +
            `Topstitch the grosgrain over the zipper seam for a clean finish.`
          : `Turn the pouch right side out through the open zipper. ` +
            `Trim excess zipper tape and finish the raw ends with a bar tack or binding.`,
      dependsOn: ['step-4'],
      refsPieces: ['front', 'back'],
      group: 'Finishing',
    },
  ];
}

function buildCrossBottomSteps(r: ResolvedInputs): Step[] {
  const { finished_length, finished_width, finished_depth, seam_allowance: sa, zip_gauge } = r;
  const { panelCutWidth: W, halfCrossHeight: H, cornerCutout: C } = crossBottomDims(r);
  const panels = ['cross-panel', 'cross-panel-back'];

  return [
    {
      id: 'step-1',
      title: 'Cut half-cross panels',
      body:
        `Cut 2 half-cross panels, each ${fmt(W)} × ${fmt(H)} mm before the corner cutouts, ` +
        `then remove a ${fmt(C)} × ${fmt(C)} mm square from both top corners. ` +
        `Dimensions include ${fmt(sa)} mm seam allowance throughout. ` +
        `The straight bottom edge is the zipper edge; the notched top edge joins the other panel across the bag bottom.`,
      dependsOn: [],
      refsPieces: panels,
      group: 'Preparation',
    },
    {
      id: 'step-2',
      title: 'Attach zipper',
      body:
        `Sew a ${zip_gauge} coil zipper (${zipperLengthForStyle(r)} mm) between the two straight edges, ` +
        `stitching ${fmt(sa)} mm from the edge along the marked zipper line on each panel.`,
      dependsOn: ['step-1'],
      refsPieces: panels,
      group: 'Assembly',
    },
    {
      id: 'step-3',
      title: 'Join the bag bottom',
      body:
        `Open the zipper. With right sides together, sew the two panels' top edges to each other ` +
        `at ${fmt(sa)} mm. This seam runs along the centre of the ${fmt(finished_depth)} mm bag bottom.`,
      dependsOn: ['step-2'],
      refsPieces: panels,
      group: 'Assembly',
    },
    {
      id: 'step-4',
      title: 'Sew the side arms',
      body:
        `Still right sides together, sew the full left edge of one panel to the full left edge of the other ` +
        `at ${fmt(sa)} mm, and repeat on the right. Each pair of ${fmt(C)} mm arms forms one ${fmt(finished_depth)} mm ` +
        `end of the pouch. These seams run from the zipper up to the corner cutout.`,
      dependsOn: ['step-3'],
      refsPieces: panels,
      group: 'Assembly',
    },
    {
      id: 'step-5',
      title: 'Close the corners',
      body:
        `At each of the four cut-out corners, bring the two raw edges of the ${fmt(C)} × ${fmt(C)} mm notch together ` +
        `so they meet in a straight line, and sew at ${fmt(sa)} mm along the marked corner stitch line. ` +
        `This squares the bag bottom to ${fmt(finished_depth)} mm deep. ` +
        `Finished interior: ${fmt(finished_length)} × ${fmt(finished_width)} × ${fmt(finished_depth)} mm.`,
      dependsOn: ['step-4'],
      refsPieces: panels,
      group: 'Assembly',
    },
    {
      id: 'step-6',
      title: 'Finish seams',
      body: `Turn right side out through the open zipper. Bind or zigzag the interior seams and bar-tack each zipper end.`,
      dependsOn: ['step-5'],
      refsPieces: panels,
      group: 'Finishing',
    },
  ];
}

function buildGussetStripSteps(r: ResolvedInputs): Step[] {
  const { finished_length, finished_width, finished_depth, seam_allowance: sa, zip_gauge } = r;
  const d = gussetStripDims(r);
  const zipperLength = zipperLengthForStyle(r);

  if (r.zipper_position === 'front') {
    const pieces = ['back-panel', 'front-top-strip', 'front-bottom-strip', 'full-perimeter-gusset'];
    return [
      {
        id: 'step-1',
        title: 'Cut panels and gusset',
        body:
          `Cut 1 back panel ${fmt(d.panelCutWidth)} × ${fmt(d.panelCutHeight)} mm, ` +
          `1 front top strip ${fmt(d.panelCutWidth)} × ${fmt(d.frontTopHeight)} mm, ` +
          `1 front bottom strip ${fmt(d.panelCutWidth)} × ${fmt(d.frontBottomHeight)} mm, ` +
          `and 1 gusset ${fmt(d.fullGussetWidth)} × ${fmt(d.gussetCutHeight)} mm. ` +
          `All dimensions include ${fmt(sa)} mm seam allowance.`,
        dependsOn: [],
        refsPieces: pieces,
        group: 'Preparation',
      },
      {
        id: 'step-2',
        title: 'Set the front zipper',
        body:
          `Sew the ${zip_gauge} zipper (${zipperLength} mm) between the two front strips at ${fmt(sa)} mm, ` +
          `placing it ${fmt(r.zip_from_top)} mm down from the finished top edge. ` +
          `Topstitch both sides. The joined strips now match the back panel at ${fmt(d.panelCutHeight)} mm.`,
        dependsOn: ['step-1'],
        refsPieces: ['front-top-strip', 'front-bottom-strip'],
        group: 'Assembly',
      },
      {
        id: 'step-3',
        title: 'Attach gusset to the front',
        body:
          `Starting at one corner, sew the gusset around the full perimeter of the assembled front at ${fmt(sa)} mm, ` +
          `matching the corner notches. Clip the gusset seam allowance at each corner so it turns cleanly.`,
        dependsOn: ['step-2'],
        refsPieces: ['full-perimeter-gusset', 'front-top-strip', 'front-bottom-strip'],
        group: 'Assembly',
      },
      {
        id: 'step-4',
        title: 'Attach gusset to the back',
        body:
          `Open the zipper. Sew the free edge of the gusset to the back panel at ${fmt(sa)} mm, matching corners. ` +
          `Join the gusset's short ends where they meet.`,
        dependsOn: ['step-3'],
        refsPieces: ['full-perimeter-gusset', 'back-panel'],
        group: 'Assembly',
      },
      {
        id: 'step-5',
        title: 'Finish seams',
        body:
          `Turn right side out through the zipper. Bind or zigzag the interior seams. ` +
          `Finished interior: ${fmt(finished_length)} × ${fmt(finished_width)} × ${fmt(finished_depth)} mm.`,
        dependsOn: ['step-4'],
        refsPieces: pieces,
        group: 'Finishing',
      },
    ];
  }

  const tab = zipperEndTabDims(r);
  const pieces = ['front-panel', 'back-panel', 'gusset-strip', 'zipper-end-tab'];
  return [
    {
      id: 'step-1',
      title: 'Cut panels, gusset and tabs',
      body:
        `Cut 2 panels ${fmt(d.panelCutWidth)} × ${fmt(d.panelCutHeight)} mm, ` +
        `1 U-shaped gusset strip ${fmt(d.gussetCutWidth)} × ${fmt(d.gussetCutHeight)} mm, ` +
        `and 2 zipper end tabs ${fmt(tab.width)} × ${fmt(tab.height)} mm. ` +
        `All dimensions include ${fmt(sa)} mm seam allowance.`,
      dependsOn: [],
      refsPieces: pieces,
      group: 'Preparation',
    },
    {
      id: 'step-2',
      title: 'Attach zipper and end tabs',
      body:
        `Fold each end tab in half and sew one over each end of the ${zip_gauge} zipper (${zipperLength} mm) ` +
        `to square off the tape. Sew the zipper to the top edge of each panel at ${fmt(sa)} mm and topstitch.`,
      dependsOn: ['step-1'],
      refsPieces: ['front-panel', 'back-panel', 'zipper-end-tab'],
      group: 'Assembly',
    },
    {
      id: 'step-3',
      title: 'Attach gusset to the front',
      body:
        `Sew the gusset strip down one side, across the bottom and up the other side of the front panel at ${fmt(sa)} mm. ` +
        `The notches mark the two bottom corners — clip the seam allowance there so the strip turns squarely.`,
      dependsOn: ['step-2'],
      refsPieces: ['gusset-strip', 'front-panel'],
      group: 'Assembly',
    },
    {
      id: 'step-4',
      title: 'Attach gusset to the back',
      body:
        `Open the zipper, then sew the gusset's free edge to the back panel at ${fmt(sa)} mm, matching the corner notches. ` +
        `The ${fmt(finished_depth)} mm gusset width sets the finished depth.`,
      dependsOn: ['step-3'],
      refsPieces: ['gusset-strip', 'back-panel'],
      group: 'Assembly',
    },
    {
      id: 'step-5',
      title: 'Finish seams',
      body:
        `Turn right side out through the open zipper. Bind or zigzag the interior seams. ` +
        `Finished interior: ${fmt(finished_length)} × ${fmt(finished_width)} × ${fmt(finished_depth)} mm.`,
      dependsOn: ['step-4'],
      refsPieces: pieces,
      group: 'Finishing',
    },
  ];
}

function buildMultiPanelSteps(r: ResolvedInputs): Step[] {
  const { finished_length, finished_width, finished_depth, seam_allowance: sa, zip_gauge } = r;
  const d = multiPanelDims(r);
  const tab = zipperEndTabDims(r);
  const zipperLength = zipperLengthForStyle(r);
  const pieces = ['front-panel', 'back-panel', 'bottom-panel', 'end-panel', 'zipper-end-tab'];

  return [
    {
      id: 'step-1',
      title: 'Cut panels and tabs',
      body:
        `Cut 2 front/back panels ${fmt(d.frontBackWidth)} × ${fmt(d.frontBackHeight)} mm, ` +
        `1 bottom panel ${fmt(d.bottomWidth)} × ${fmt(d.bottomHeight)} mm, ` +
        `2 end panels ${fmt(d.endWidth)} × ${fmt(d.endHeight)} mm, ` +
        `and 2 zipper end tabs ${fmt(tab.width)} × ${fmt(tab.height)} mm. ` +
        `All dimensions include ${fmt(sa)} mm seam allowance.`,
      dependsOn: [],
      refsPieces: pieces,
      group: 'Preparation',
    },
    {
      id: 'step-2',
      title: 'Attach zipper and end tabs',
      body:
        `Fold each end tab in half and sew one over each end of the ${zip_gauge} zipper (${zipperLength} mm). ` +
        `Sew the zipper to the top edge of the front and back panels at ${fmt(sa)} mm and topstitch both sides.`,
      dependsOn: ['step-1'],
      refsPieces: ['front-panel', 'back-panel', 'zipper-end-tab'],
      group: 'Assembly',
    },
    {
      id: 'step-3',
      title: 'Join front and back to the bottom',
      body:
        `Sew the long edges of the bottom panel to the lower edges of the front and back panels at ${fmt(sa)} mm, ` +
        `forming an open-ended tube.`,
      dependsOn: ['step-2'],
      refsPieces: ['bottom-panel', 'front-panel', 'back-panel'],
      group: 'Assembly',
    },
    {
      id: 'step-4',
      title: 'Set in the end panels',
      body:
        `Open the zipper. Sew an end panel into each open end at ${fmt(sa)} mm, matching corners and ` +
        `clipping the seam allowance so each corner turns squarely.`,
      dependsOn: ['step-3'],
      refsPieces: ['end-panel'],
      group: 'Assembly',
    },
    {
      id: 'step-5',
      title: 'Finish seams',
      body:
        `Turn right side out through the open zipper. Bind or zigzag all interior seams. ` +
        `Finished interior: ${fmt(finished_length)} × ${fmt(finished_width)} × ${fmt(finished_depth)} mm.`,
      dependsOn: ['step-4'],
      refsPieces: pieces,
      group: 'Finishing',
    },
  ];
}

/** Dispatch to the step sequence matching the construction style actually drawn. */
function buildSteps(r: ResolvedInputs): Step[] {
  if (r.construction_style === 'cross-bottom') return buildCrossBottomSteps(r);
  if (r.construction_style === 'gusset-strip') return buildGussetStripSteps(r);
  if (r.construction_style === 'multi-panel') return buildMultiPanelSteps(r);
  const { cutWidth, cutHeight } = computeCutDimensions(r);
  return buildBoxedSteps(r, cutWidth, cutHeight);
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
  const sa = r.seam_allowance;
  const { cornerCutout: C, panelCutWidth: W, halfCrossHeight: H_half } = crossBottomDims(r);

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

    // Seam stitch lines on the three edges joined to the other panel:
    // the top (centre-of-bottom) seam and both side arms. Inset sa, on-piece.
    const seamStitchPath: Path = {
      id: `${id}:seam-stitch`,
      edges: sa > 0 ? [
        makeStraightEdge(edgeId(), 'stitch', C, sa, W - C, sa),         // centre-of-bottom seam
        makeStraightEdge(edgeId(), 'stitch', sa, C, sa, H_half),        // left arm seam
        makeStraightEdge(edgeId(), 'stitch', W - sa, C, W - sa, H_half), // right arm seam
      ] : [],
      closed: false,
    };

    // Zipper stitch line along the bottom (straight) edge
    const zipperStitchPath: Path = {
      id: `${id}:zipper-stitch`,
      edges: [makeStraightEdge(edgeId(), 'stitch', 0, H_half - sa, W, H_half - sa)],
      closed: false,
      label: 'Align zipper tape here',
    };

    // Corner seam lines. The two edges of each cutout are sewn to each other to
    // box the corner, so the useful annotation is where that stitch falls —
    // inset `sa` from each cutout edge, on the piece.
    //
    // Two earlier attempts were wrong: tracing the cutout's inner edges just
    // retraced cut edges e6/e7 and e2/e1 (and as role 'fold' drew "crease here"
    // on top of a line that is actually cut), while tracing the phantom corner
    // put registration ticks in the middle of fabric that had been cut away.
    // The notch's vertical edge belongs to the half-bottom band (which lies at
    // x > C), and its horizontal edge belongs to the arm (which lies at y > C),
    // so each stitch line insets AWAY from the notch, into its own region.
    const cornerLeftPath: Path = {
      id: `${id}:corner-left`,
      edges: sa > 0 ? [
        makeStraightEdge(edgeId(), 'stitch', C + sa, 0, C + sa, C),   // in the half-bottom band
        makeStraightEdge(edgeId(), 'stitch', 0, C + sa, C, C + sa),   // in the arm
      ] : [],
      closed: false,
      label: `Corner: ${fmt(C)} × ${fmt(C)} mm cutout — sew these two edges together`,
    };
    const cornerRightPath: Path = {
      id: `${id}:corner-right`,
      edges: sa > 0 ? [
        makeStraightEdge(edgeId(), 'stitch', W - C - sa, 0, W - C - sa, C),
        makeStraightEdge(edgeId(), 'stitch', W - C, C + sa, W, C + sa),
      ] : [],
      closed: false,
      label: `Corner: ${fmt(C)} × ${fmt(C)} mm cutout — sew these two edges together`,
    };

    return {
      id,
      name,
      mirror: false,
      quantity: 1,
      paths: [cutPath, seamStitchPath, zipperStitchPath, cornerLeftPath, cornerRightPath],
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
  const { finished_length, finished_width } = r;
  const sa = r.seam_allowance;
  const d = gussetStripDims(r);

  /**
   * A long gusset band with stitch lines on both sewn edges and registration
   * notches at each corner the band turns. `cornerXs` are the distances along
   * the band where those corners fall.
   */
  function makeGussetBand(id: string, name: string, W: number, H: number, cornerXs: number[]): Piece {
    const edgeId = makeEdgeIdGen(id);
    const cutEdges: Edge[] = [
      makeStraightEdge(edgeId(), 'cut', 0, 0, W, 0),
      makeStraightEdge(edgeId(), 'cut', W, 0, W, H),
      makeStraightEdge(edgeId(), 'cut', W, H, 0, H),
      makeStraightEdge(edgeId(), 'cut', 0, H, 0, 0),
    ];
    const cutPath: Path = { id: `${id}:cut`, edges: cutEdges, closed: true };

    // Both long edges sew to a panel, so both carry a stitch line.
    const stitchEdges: Edge[] = sa > 0 ? [
      makeStraightEdge(edgeId(), 'stitch', 0, sa, W, sa),
      makeStraightEdge(edgeId(), 'stitch', 0, H - sa, W, H - sa),
    ] : [];
    const stitchPath: Path = { id: `${id}:stitch`, edges: stitchEdges, closed: false };

    // Corner registration ticks, drawn from both long edges so the mark is
    // visible whichever way the band is fed under the needle.
    const notchEdges: Edge[] = cornerXs.flatMap((x) => [
      makeStraightEdge(edgeId(), 'notch', x, 0, x, H * 0.25),
      makeStraightEdge(edgeId(), 'notch', x, H, x, H * 0.75),
    ]);
    const notchPath: Path = { id: `${id}:notch`, edges: notchEdges, closed: false };

    return {
      id,
      name,
      mirror: false,
      quantity: 1,
      paths: [cutPath, stitchPath, notchPath],
      // Baked-in SA convention: cut dims already include SA — zero outward offsets.
      seamAllowances: {
        [`${id}:e0`]: 0,
        [`${id}:e1`]: 0,
        [`${id}:e2`]: 0,
        [`${id}:e3`]: 0,
      },
    };
  }

  const back = buildRectPiece('back-panel', 'Back Panel', d.panelCutWidth, d.panelCutHeight, sa);

  if (r.zipper_position === 'front') {
    // Front-zipper: back is solid, front is split into top+bottom strips, gusset wraps all 4 sides.
    const frontTop = buildRectPiece('front-top-strip', 'Front Top Strip', d.panelCutWidth, d.frontTopHeight, sa);
    const frontBottom = buildRectPiece('front-bottom-strip', 'Front Bottom Strip', d.panelCutWidth, d.frontBottomHeight, sa);

    // The band wraps the full perimeter: length, width, length, width.
    const fullGusset = makeGussetBand(
      'full-perimeter-gusset',
      'Full Perimeter Gusset',
      d.fullGussetWidth,
      d.gussetCutHeight,
      [
        sa + finished_length,
        sa + finished_length + finished_width,
        sa + 2 * finished_length + finished_width,
      ],
    );

    return [back, frontTop, frontBottom, fullGusset];
  }

  // Top-zipper (default): front + back panels + U-shape gusset + two end tabs at zipper corners.
  const front = buildRectPiece('front-panel', 'Front Panel', d.panelCutWidth, d.panelCutHeight, sa);
  const gusset = makeGussetBand('gusset-strip', 'Gusset Strip', d.gussetCutWidth, d.gussetCutHeight, [d.notchX1, d.notchX2]);
  const tab = zipperEndTabDims(r);
  const tabPiece = buildRectPiece('zipper-end-tab', 'Zipper End Tab', tab.width, tab.height, sa, 2);

  return [front, back, gusset, tabPiece];
}

// ─── Multi-panel style builders ───────────────────────────────────────────────

function buildMultiPanelPieces(r: ResolvedInputs): Piece[] {
  const sa = r.seam_allowance;
  const d = multiPanelDims(r);
  const tab = zipperEndTabDims(r);

  const front = buildRectPiece('front-panel', 'Front Panel', d.frontBackWidth, d.frontBackHeight, sa);
  const back = buildRectPiece('back-panel', 'Back Panel', d.frontBackWidth, d.frontBackHeight, sa);
  const bottom = buildRectPiece('bottom-panel', 'Bottom Panel', d.bottomWidth, d.bottomHeight, sa);
  const end = buildRectPiece('end-panel', 'End Panel', d.endWidth, d.endHeight, sa, 2);
  const tabPiece = buildRectPiece('zipper-end-tab', 'Zipper End Tab', tab.width, tab.height, sa, 2);

  return [front, back, bottom, end, tabPiece];
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
  const { finished_depth, seam_allowance, construction_style } = resolved;

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

  const steps = buildSteps(resolved);
  const bom = buildBom(resolved);

  return {
    ok: true,
    value: { pieces, steps, bom },
    warnings: validationResult.warnings,
  };
}
