/**
 * 7-step calculation pipeline for the pouch engine.
 *
 * Each step is exposed as a method of the exported `pipelineSteps` object so
 * that vitest can spy on individual steps and assert call order.
 *
 * Pipeline steps (Requirement 4):
 *   1. parseSpec          – validate and normalise the raw PouchSpec
 *   2. internalDimensions – add ease to object dimensions
 *   3. checkAspectRatio   – emit warnings for problematic proportions
 *   4. computePanelGeometry – derive flat panel dimensions
 *   5. applySeamAllowances  – add SA to cut edges
 *   6. buildEdges           – construct Edge graph with semantic roles
 *   7. assemblePieces       – construct Piece objects from edges
 */

import type { Piece } from '../../pattern-engine/graph/Piece.js';
import type { Edge, EdgeId } from '../../pattern-engine/graph/Edge.js';
import type { Path } from '../../pattern-engine/graph/Path.js';
import type { CarriedObject } from '../object/CarriedObject.js';
import type { FitParams } from '../fit/index.js';
import type { FlapSpec } from '../components/flap.js';
import type { PouchSpec, ConstructionMethod } from '../construction/ConstructionStrategy.js';
import { resolveEase } from '../fit/ease.js';
import { DEFAULT_EXPOSED_PERCENTAGE } from '../fit/exposure.js';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface InternalDimensions {
  width: number;
  depth: number;
  height: number;
}

/** Flat body-panel dimensions (before SA). */
export interface PanelGeometry {
  /** Total panel width including wing extensions. */
  panelWidth: number;
  /** Total panel height including bottom band + flap (if present). */
  panelHeight: number;
  /** Width of each side wing (= internal_depth). */
  wingWidth: number;
  /** Height of front panel region. */
  frontHeight: number;
  /** Height of back panel region. */
  backHeight: number;
  /** Height of the bottom band (= internal_depth). */
  bottomBandHeight: number;
  /** Flap height in mm, 0 when no flap. */
  flapHeight: number;
  /** Object height standing proud of the mouth, mm (0 when fully enclosed). */
  exposedHeight: number;
  internalDims: InternalDimensions;
}

/** Panel geometry with SA already folded in to cut-edge dimensions. */
export interface SAPanelGeometry extends PanelGeometry {
  sa: number;
  cutWidth: number;
  cutHeight: number;
  /** Object height standing proud of the mouth (object height − internal height), mm. */
  exposedHeight: number;
}

/** Edges grouped by semantic role. */
export interface EdgeSet {
  allEdges: Edge[];
  foldEdgeIds: EdgeId[];
  cutEdgeIds: EdgeId[];
  seamAllowances: Record<EdgeId, number>;
}

/** Full context object threaded through the pipeline. */
export interface CalcContext {
  spec: PouchSpec;
  resolvedFit: FitParams;
  internalDims?: InternalDimensions;
  warnings: string[];
  panelGeo?: PanelGeometry;
  saGeo?: SAPanelGeometry;
  edgeSet?: EdgeSet;
  pieces?: Piece[];
}

// ─── Individual pipeline step functions ───────────────────────────────────────

function _parseSpec(spec: PouchSpec): CalcContext {
  const resolved = resolveEase(
    spec.fit?.fit_style ?? 'standard',
    spec.fit ?? {},
  );
  const fullFit: FitParams = {
    width_ease: spec.fit?.width_ease ?? resolved.width_ease,
    depth_ease: spec.fit?.depth_ease ?? resolved.depth_ease,
    height_ease: spec.fit?.height_ease ?? resolved.height_ease,
    fit_style: spec.fit?.fit_style ?? 'standard',
    exposed_percentage: spec.fit?.exposed_percentage ?? DEFAULT_EXPOSED_PERCENTAGE,
  };
  return { spec, resolvedFit: fullFit, warnings: [] };
}

function _internalDimensions(obj: CarriedObject, fit: FitParams): InternalDimensions {
  return {
    width: obj.width + fit.width_ease,
    depth: obj.depth + fit.depth_ease,
    height: obj.height * (fit.exposed_percentage ?? DEFAULT_EXPOSED_PERCENTAGE),
  };
}

function _checkAspectRatio(dims: InternalDimensions, method: ConstructionMethod): string[] {
  const warnings: string[] = [];
  if (method === 'folded_t' && dims.depth > dims.width / 2) {
    warnings.push(
      'Folded-T center seam may not lie flat for this aspect ratio; ' +
      'consider boxed_gusset construction once implemented.',
    );
  }
  return warnings;
}

function _computePanelGeometry(
  dims: InternalDimensions,
  flap?: FlapSpec,
  objectHeight?: number,
): PanelGeometry {
  const wingWidth = dims.depth;
  const frontHeight = dims.height;
  const backHeight = dims.height;
  const bottomBandHeight = dims.depth;
  const flapHeight = (flap && flap.style !== 'none' && flap.length_mm != null)
    ? flap.length_mm
    : 0;

  const panelWidth = dims.width + 2 * wingWidth;
  const panelHeight = frontHeight + bottomBandHeight + backHeight + flapHeight;

  return {
    panelWidth,
    panelHeight,
    wingWidth,
    frontHeight,
    backHeight,
    bottomBandHeight,
    flapHeight,
    exposedHeight: Math.max(0, (objectHeight ?? dims.height) - dims.height),
    internalDims: dims,
  };
}

function _applySeamAllowances(geo: PanelGeometry, sa: number): SAPanelGeometry {
  return {
    ...geo,
    sa,
    cutWidth: geo.panelWidth + sa * 2,
    cutHeight: geo.panelHeight + sa * 2,
    exposedHeight: geo.exposedHeight,
  };
}

function _buildEdges(saGeo: SAPanelGeometry, _flap?: FlapSpec): EdgeSet {
  const sa = saGeo.sa;
  const w = saGeo.cutWidth;
  const h = saGeo.cutHeight;
  const wingW = saGeo.wingWidth;

  // Origin at bottom-left of the cut piece.
  // Layout (from bottom to top):
  //   SA | front | bottom-band | back [| flap] | SA
  //   SA | wing  |    body     | wing           | SA

  const x0 = 0;
  const y0 = 0;

  // Key Y positions (within cut piece, SA already added)
  const yFrontTop    = sa + saGeo.frontHeight;
  const yBackBottom  = yFrontTop + saGeo.bottomBandHeight;
  const yBackTop     = yBackBottom + saGeo.backHeight;
  // const yFlapTop     = yBackTop + saGeo.flapHeight; // == h - sa

  // Key X positions
  const xWingRight   = sa + wingW;
  const xBodyRight   = xWingRight + saGeo.internalDims.width;

  let edgeCounter = 0;
  const eid = () => `body:e${edgeCounter++}`;

  // Perimeter: a true cross. Wings exist on the front and back rows only; the
  // bottom band and the lid are the centre width plus one seam allowance each
  // side, so the band's sides and the lid's sides carry SA and the corner
  // squares (which could never fold two ways) are cut away.
  // Notches run the full band height and the full lid height, so the wings end
  // exactly at the fold lines (their bottom edges are raw — bind or leave the
  // corner open) and the band / lid keep one SA of side beyond the centre.
  const wingW0 = wingW;                    // notch depth = finished wing depth
  const yFrontRowBottom = yFrontTop;
  const yBackRowTop = yBackBottom;
  const yLidRowBottom = yBackTop;
  const ring: { x: number; y: number }[] = [
    { x: x0, y: y0 }, { x: w, y: y0 },
    { x: w, y: yFrontRowBottom }, { x: w - wingW0, y: yFrontRowBottom },
    { x: w - wingW0, y: yBackRowTop }, { x: w, y: yBackRowTop },
    { x: w, y: yLidRowBottom }, { x: w - wingW0, y: yLidRowBottom },
    { x: w - wingW0, y: h }, { x: wingW0, y: h },
    { x: wingW0, y: yLidRowBottom }, { x: x0, y: yLidRowBottom },
    { x: x0, y: yBackRowTop }, { x: wingW0, y: yBackRowTop },
    { x: wingW0, y: yFrontRowBottom }, { x: x0, y: yFrontRowBottom },
  ];
  const cutEdgesList: Edge[] = ring.map((p, i) => ({
    kind: 'straight', id: eid(), role: 'cut', start: p, end: ring[(i + 1) % ring.length],
  }));

  // Fold lines. Wing folds are per row (they do not run through the band or
  // lid); the three horizontal folds span the full width of their rows.
  const eFoldLeftWingFront: Edge = { kind: 'straight', id: eid(), role: 'fold', start: { x: xWingRight, y: y0 }, end: { x: xWingRight, y: yFrontRowBottom } };
  const eFoldRightWingFront: Edge = { kind: 'straight', id: eid(), role: 'fold', start: { x: xBodyRight, y: y0 }, end: { x: xBodyRight, y: yFrontRowBottom } };
  const eFoldLeftWingBack: Edge = { kind: 'straight', id: eid(), role: 'fold', start: { x: xWingRight, y: yBackRowTop }, end: { x: xWingRight, y: yLidRowBottom } };
  const eFoldRightWingBack: Edge = { kind: 'straight', id: eid(), role: 'fold', start: { x: xBodyRight, y: yBackRowTop }, end: { x: xBodyRight, y: yLidRowBottom } };
  // Front-to-bottom fold (horizontal, separating front from bottom band)
  const eFoldFrontToBottom: Edge = {
    kind: 'straight', id: eid(), role: 'fold',
    start: { x: x0, y: yFrontTop },
    end: { x: w,  y: yFrontTop },
  };
  // Bottom-to-back fold (horizontal, top of the bottom band / start of back)
  const eFoldBottomToBack: Edge = {
    kind: 'straight', id: eid(), role: 'fold',
    start: { x: x0, y: yBackBottom },
    end: { x: w,  y: yBackBottom },
  };
  // Back-to-flap fold (horizontal, top of back panel / bottom of flap region).
  // The lid continues flat behind the object; it takes its creases in use.
  const eFoldBackToFlap: Edge = {
    kind: 'straight', id: eid(), role: 'fold',
    start: { x: x0, y: yBackTop },
    end: { x: w,  y: yBackTop },
  };
  // Lid creases where it wraps the object standing proud of the mouth: over the
  // top (one exposed height past the mouth) and down the front (one depth later).
  const lidCreases: Edge[] = [];
  if (saGeo.flapHeight > 0 && saGeo.exposedHeight > 0) {
    const yTop = yBackTop + saGeo.exposedHeight;
    const yFront = yTop + saGeo.internalDims.depth;
    if (yFront < h - sa) {
      lidCreases.push(
        { kind: 'straight', id: eid(), role: 'fold', start: { x: wingW, y: yTop }, end: { x: w - wingW, y: yTop } },
        { kind: 'straight', id: eid(), role: 'fold', start: { x: wingW, y: yFront }, end: { x: w - wingW, y: yFront } },
      );
    }
  }

  const allEdges: Edge[] = [
    ...cutEdgesList,
    eFoldLeftWingFront, eFoldRightWingFront, eFoldLeftWingBack, eFoldRightWingBack,
    eFoldFrontToBottom, eFoldBottomToBack, eFoldBackToFlap, ...lidCreases,
  ];

  const cutEdgeIds = cutEdgesList.map((e) => e.id);
  const foldEdgeIds = [
    eFoldLeftWingFront.id, eFoldRightWingFront.id, eFoldLeftWingBack.id, eFoldRightWingBack.id,
    eFoldFrontToBottom.id, eFoldBottomToBack.id, eFoldBackToFlap.id, ...lidCreases.map((e) => e.id),
  ];

  const seamAllowances: Record<EdgeId, number> = {};
  for (const id of cutEdgeIds) seamAllowances[id] = sa;
  for (const id of foldEdgeIds) seamAllowances[id] = 0;

  return { allEdges, foldEdgeIds, cutEdgeIds, seamAllowances };
}

function _assemblePieces(edgeSet: EdgeSet, ctx: CalcContext): Piece[] {
  const saGeo = ctx.saGeo!;
  const w = saGeo.cutWidth;
  const h = saGeo.cutHeight;

  const cutIdSet = new Set(edgeSet.cutEdgeIds);
  const foldIdSet = new Set(edgeSet.foldEdgeIds);
  const cutEdges = edgeSet.allEdges.filter(e => cutIdSet.has(e.id));
  const foldEdges = edgeSet.allEdges.filter(e => foldIdSet.has(e.id));

  const perimeterPath: Path = {
    id: 'body-perimeter',
    closed: true,
    edges: cutEdges,
  };
  // Labels name the fold for the legend and drive the 3D fold preview's
  // default hinge angles (wing/bottom → 90°, lid → wrap).
  const foldLabels = ['Wing fold (front, left)', 'Wing fold (front, right)', 'Wing fold (back, left)', 'Wing fold (back, right)', 'Front–bottom fold', 'Bottom–back fold', 'Lid fold (0°)', 'Lid crease over the top (90°)', 'Lid crease down the front (90°)'];
  const foldPaths: Path[] = foldEdges.map((e, i) => ({
    id: `body-fold-${e.id}`,
    closed: false,
    label: foldLabels[i],
    edges: [e],
  }));

  const piece: Piece = {
    id: 'body',
    name: 'Body',
    mirror: false,
    quantity: 1,
    paths: [perimeterPath, ...foldPaths],
    seamAllowances: edgeSet.seamAllowances,
    annotations: [
      {
        kind: 'label',
        label: `Body — ${Math.round(w)} × ${Math.round(h)} mm (cut)`,
        point: { x: w / 2, y: h / 2 },
      },
      {
        kind: 'grain',
        label: 'grain',
        point: { x: w / 2, y: h / 2 },
        angle: 90,
      },
    ],
  };

  return [piece];
}

// ─── Pipeline object (enables vi.spyOn) ───────────────────────────────────────

export const pipelineSteps = {
  parseSpec: _parseSpec,
  internalDimensions: _internalDimensions,
  checkAspectRatio: _checkAspectRatio,
  computePanelGeometry: _computePanelGeometry,
  applySeamAllowances: _applySeamAllowances,
  buildEdges: _buildEdges,
  assemblePieces: _assemblePieces,
};

// ─── Public convenience export ────────────────────────────────────────────────

/**
 * Standalone `internalDimensions` export satisfying the acceptance-criteria
 * formula: `{ width: obj.width + ease.width_ease, depth: obj.depth +
 * ease.depth_ease, height: obj.height * (exposed_percentage ?? 1.0) }`.
 */
export function internalDimensions(
  obj: CarriedObject,
  fit: FitParams,
): InternalDimensions {
  return pipelineSteps.internalDimensions(obj, fit);
}

// ─── Full pipeline runner ──────────────────────────────────────────────────────

export function runCalcPipeline(spec: PouchSpec): {
  pieces: Piece[];
  warnings: string[];
} {
  // Step 1 – parse
  const ctx = pipelineSteps.parseSpec(spec);

  // Step 2 – internal dimensions
  const dims = pipelineSteps.internalDimensions(ctx.spec.object, ctx.resolvedFit);
  ctx.internalDims = dims;

  // Step 3 – aspect-ratio warnings
  const warnings = pipelineSteps.checkAspectRatio(dims, ctx.spec.construction);
  ctx.warnings = warnings;

  // Step 4 – panel geometry
  const panelGeo = pipelineSteps.computePanelGeometry(dims, ctx.spec.flap, ctx.spec.object.height);
  ctx.panelGeo = panelGeo;

  // Step 5 – seam allowances
  const saGeo = pipelineSteps.applySeamAllowances(panelGeo, ctx.spec.seamAllowance);
  ctx.saGeo = saGeo;

  // Step 6 – build edges
  const edgeSet = pipelineSteps.buildEdges(saGeo, ctx.spec.flap);
  ctx.edgeSet = edgeSet;

  // Step 7 – assemble pieces
  const pieces = pipelineSteps.assemblePieces(edgeSet, ctx);
  ctx.pieces = pieces;

  return { pieces, warnings };
}
