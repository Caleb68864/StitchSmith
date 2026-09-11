/**
 * Pleated-card construction strategy.
 *
 * The SOE "4-pack single rifle mag card": a hemmed back panel and a folded,
 * double-layer face joined at vertical cell divisions. The face is wider than
 * the back by a pucker allowance on each side of every cell, so it bows out to
 * wrap the magazine. Fold is at the mouth (clean edge where the mag enters);
 * the two raw face edges meet at the cell bottom.
 *
 * Source: vault notes mag-pouches/mag-pouch-4pack-single-dimensions.md,
 * mag-pouches/mag-pouch-sizing-formula.md, mag-pouches/pals-grid-vs-cell-width.md,
 * mag-pouches/mag-cell-bottom-flat-vs-cradle.md, bags/construction-hem-mark-at-double.md.
 *
 * Seam-allowance convention: BAKED-IN (Convention B in CLAUDE.md). Every
 * dimension is a CUT dimension with the single-fold hems already included, so
 * every cut edge carries an explicit `seamAllowances` entry of 0 and hem folds
 * are drawn as `fold`-role edges. Cell divisions are `stitch`-role lines.
 */

import type { Piece } from '../../pattern-engine/graph/Piece.js';
import type { Edge, EdgeId } from '../../pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../pattern-engine/graph/Edge.js';
import type { Path } from '../../pattern-engine/graph/Path.js';
import type { Step } from '../../pattern-engine/instructions/Step.js';
import type { ConstructionStrategy, PouchSpec, PleatedCardParams } from './ConstructionStrategy.js';

const IN = 25.4;

/** Below this pucker per side the face will not wrap a rifle mag (vault: ~0.9"). */
export const MIN_PUCKER_PER_SIDE_MM = 0.9 * IN;

/** PALS column pitch, immutable by spec. */
export const PALS_COLUMN_PITCH_MM = 1.5 * IN;

// ─── Step IDs (stable, referenced by generators) ─────────────────────────────

export const PC_STEP_CUT = 'pc-cut';
export const PC_STEP_HEM_BACK = 'pc-hem-back';
export const PC_STEP_HEM_FACE = 'pc-hem-face';
export const PC_STEP_MARK = 'pc-mark-divisions';
/** Interior components (loop, cradles) must depend on this and precede PC_STEP_JOIN_BOTTOM. */
export const PC_STEP_INTERIOR = 'pc-interior-ready';
export const PC_STEP_JOIN_BOTTOM = 'pc-join-bottom';
export const PC_STEP_JOIN_DIVISIONS = 'pc-join-divisions';
export const PC_STEP_JOIN_SIDES = 'pc-join-sides';
export const PC_STEP_BOTTOM = 'pc-bottom';
export const PC_STEP_LID = 'pc-lid';

// ─── Derived geometry ─────────────────────────────────────────────────────────

export interface PleatedCardGeometry {
  backCutW: number;
  backCutH: number;
  faceCutW: number;
  faceCutH: number;
  backFinishedW: number;
  faceHemmedW: number;
  puckerPerSide: number;
  /** y of the lid fold on the back panel (from the top edge), or null. */
  lidFoldY: number | null;
}

export function pleatedCardGeometry(c: PleatedCardParams): PleatedCardGeometry {
  const backFinishedW = c.cellCount * c.cellSpan;
  const faceHemmedW = c.cellCount * c.facePerCell;
  return {
    backFinishedW,
    faceHemmedW,
    backCutW: backFinishedW + 2 * c.backHem,
    backCutH: c.cardHeight + 2 * c.backHem + c.flapLength,
    faceCutW: faceHemmedW + 2 * c.faceEndHem,
    faceCutH: 2 * c.cardHeight + c.faceBottomHem,
    puckerPerSide: (c.facePerCell - c.cellSpan) / 2,
    lidFoldY: c.flapLength > 0 ? c.backHem + c.flapLength : null,
  };
}

function fmtIn(mm: number): string {
  return (mm / IN).toFixed(2).replace(/\.?0+$/, '');
}
function fmtMm(mm: number): string {
  return String(Math.round(mm * 10) / 10);
}
function dim(mm: number): string {
  return `${fmtMm(mm)} mm (${fmtIn(mm)}")`;
}

// ─── Piece builders ───────────────────────────────────────────────────────────

function rectCut(
  eid: () => EdgeId,
  w: number,
  h: number,
): { path: Path; ids: EdgeId[] } {
  const e = (sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: eid(), role: 'cut', start: { x: sx, y: sy }, end: { x: ex, y: ey } });
  const edges = [e(0, 0, w, 0), e(w, 0, w, h), e(w, h, 0, h), e(0, h, 0, 0)];
  return { path: { id: 'outline', closed: true, edges }, ids: edges.map((x) => x.id) };
}

function line(
  eid: () => EdgeId,
  role: Edge['role'],
  id: string,
  sx: number, sy: number, ex: number, ey: number,
  label?: string,
): Path {
  return {
    id,
    closed: false,
    label,
    edges: [{ kind: 'straight', id: eid(), role, start: { x: sx, y: sy }, end: { x: ex, y: ey } }],
  };
}

function notchTick(eid: () => EdgeId, id: string, x: number, y: number, len: number): Path {
  return line(eid, 'notch', id, x, y, x, y + len);
}

function buildBackPanel(c: PleatedCardParams, g: PleatedCardGeometry): Piece {
  const eid = makeEdgeIdGen('back');
  const w = g.backCutW;
  const h = g.backCutH;
  const { path: outline, ids } = rectCut(eid, w, h);

  const yCardTop = c.backHem + c.flapLength;
  const yCardBot = yCardTop + c.cardHeight;
  const hemLabel = `${fmtIn(c.backHem)}" hem — mark at ${fmtIn(2 * c.backHem)}", fold raw edge to the mark`;

  const paths: Path[] = [
    outline,
    line(eid, 'fold', 'hem-top', 0, c.backHem, w, c.backHem, hemLabel),
    line(eid, 'fold', 'hem-bottom', 0, h - c.backHem, w, h - c.backHem),
    line(eid, 'fold', 'hem-left', c.backHem, 0, c.backHem, h),
    line(eid, 'fold', 'hem-right', w - c.backHem, 0, w - c.backHem, h),
  ];

  if (g.lidFoldY !== null) {
    paths.push(line(eid, 'fold', 'lid-fold', 0, g.lidFoldY, w, g.lidFoldY, 'Lid fold (0°) — lid continues behind the mags, creasing in use'));
    // Creases where the lid wraps a magazine standing proud: over the top, then down the face.
    const exposed = c.exposedHeight ?? 0;
    const objDepth = c.objectDepth ?? 0;
    if (exposed > 0 && objDepth > 0 && exposed + objDepth < c.flapLength) {
      const yTop = g.lidFoldY - exposed;
      const yFront = yTop - objDepth;
      // Full width: the side hems crease with the lid.
      paths.push(line(eid, 'fold', 'lid-crease-top', 0, yTop, w, yTop, 'Lid crease over the top (90°)'));
      paths.push(line(eid, 'fold', 'lid-crease-front', 0, yFront, w, yFront, 'Lid crease down the face (90°)'));
    }
  }

  for (let k = 1; k < c.cellCount; k++) {
    const x = c.backHem + k * c.cellSpan;
    paths.push(line(eid, 'stitch', `division-${k}`, x, yCardTop, x, yCardBot,
      k === 1 ? `Cell division — ${fmtIn(c.cellSpan)}" pitch` : undefined));
    paths.push(notchTick(eid, `division-notch-${k}`, x, h - c.backHem, c.backHem));
  }

  const seamAllowances: Record<EdgeId, number> = {};
  for (const id of ids) seamAllowances[id] = 0;

  return {
    id: 'back',
    name: c.flapLength > 0 ? 'Back panel + lid' : 'Back panel',
    mirror: false,
    quantity: 1,
    paths,
    seamAllowances,
    annotations: [
      { kind: 'grain', label: 'grain', point: { x: w / 2, y: h / 2 }, angle: 90 },
      {
        kind: 'label',
        label: `Back — cut ${dim(w)} × ${dim(h)}; finished ${dim(g.backFinishedW)} × ${dim(c.cardHeight)} (hems included)`,
        point: { x: w / 2, y: h / 2 },
      },
    ],
  };
}

function buildFacePanel(c: PleatedCardParams, g: PleatedCardGeometry): Piece {
  const eid = makeEdgeIdGen('face');
  const w = g.faceCutW;
  const h = g.faceCutH;
  const { path: outline, ids } = rectCut(eid, w, h);

  const yMouthFold = c.faceBottomHem + c.cardHeight;
  const paths: Path[] = [
    outline,
    line(eid, 'fold', 'mouth-fold', 0, yMouthFold, w, yMouthFold,
      'Mouth fold — fold in half here; clean edge is the cell mouth'),
    line(eid, 'fold', 'hem-left', c.faceEndHem, 0, c.faceEndHem, h,
      `${fmtIn(c.faceEndHem)}" end hem — mark at ${fmtIn(2 * c.faceEndHem)}"`),
    line(eid, 'fold', 'hem-right', w - c.faceEndHem, 0, w - c.faceEndHem, h),
  ];

  if (c.faceBottomHem > 0) {
    paths.push(line(eid, 'fold', 'bottom-hem', 0, c.faceBottomHem, w, c.faceBottomHem,
      `${fmtIn(c.faceBottomHem)}" hem over the raw-edge meeting (AK lug glide)`));
  }

  for (let k = 1; k < c.cellCount; k++) {
    const x = c.faceEndHem + k * c.facePerCell;
    paths.push(line(eid, 'stitch', `division-${k}`, x, 0, x, h,
      k === 1 ? `Cell division — ${fmtMm(c.facePerCell)} mm pitch (${fmtIn(c.facePerCell)}")` : undefined));
    paths.push(notchTick(eid, `division-notch-${k}`, x, 0, c.faceEndHem));
  }

  const seamAllowances: Record<EdgeId, number> = {};
  for (const id of ids) seamAllowances[id] = 0;

  return {
    id: 'face',
    name: 'Face (folded double)',
    mirror: false,
    quantity: 1,
    paths,
    seamAllowances,
    annotations: [
      { kind: 'grain', label: 'grain', point: { x: w / 2, y: h / 2 }, angle: 90 },
      {
        kind: 'label',
        label: `Face — cut ${dim(w)} × ${dim(h)}; hemmed ${dim(g.faceHemmedW)}, folded to ${dim(c.cardHeight)} tall; pucker ${fmtIn(g.puckerPerSide)}"/side`,
        point: { x: w / 2, y: h / 2 },
      },
    ],
  };
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function buildSteps(c: PleatedCardParams, g: PleatedCardGeometry): Step[] {
  const cells = c.cellCount;
  const backDivs = Array.from({ length: cells - 1 }, (_, i) => fmtIn((i + 1) * c.cellSpan)).join(', ');
  const faceDivs = Array.from({ length: cells - 1 }, (_, i) => fmtMm((i + 1) * c.facePerCell)).join(', ');

  const steps: Step[] = [
    {
      id: PC_STEP_CUT,
      title: 'Cut the back and face',
      body:
        `Cut the back panel ${dim(g.backCutW)} × ${dim(g.backCutH)} and the face ${dim(g.faceCutW)} × ${dim(g.faceCutH)}. ` +
        `These are CUT sizes — every hem is already included (back ${fmtIn(c.backHem)}" on all four edges, face ends ${fmtIn(c.faceEndHem)}"). ` +
        'Cut the first one in cheap solid-colour fabric; the pucker depth is tolerance, not geometry.',
      dependsOn: [],
      refsPieces: ['back', 'face'],
      group: 'Cutting',
    },
    {
      id: PC_STEP_HEM_BACK,
      title: `Hem the back panel ${fmtIn(c.backHem)}" on all four sides`,
      body:
        `Mark ${fmtIn(2 * c.backHem)}" in from each edge and fold the raw edge up to the mark — the fold lands at ${fmtIn(c.backHem)}". ` +
        'Single fold, raw edge inside. Sew long runs as two single folds. Tack the hem ends so they cannot roll out later. ' +
        `Finished back: ${dim(g.backFinishedW)} × ${dim(c.cardHeight)}${c.flapLength > 0 ? ` plus a ${dim(c.flapLength)} lid` : ''}.`,
      dependsOn: [PC_STEP_CUT],
      refsPieces: ['back'],
      group: 'Panels',
    },
    {
      id: PC_STEP_HEM_FACE,
      title: `Hem the face ends ${fmtIn(c.faceEndHem)}"${c.faceBottomHem > 0 ? ` and the bottom edge ${fmtIn(c.faceBottomHem)}"` : ''}`,
      body:
        `Hem both short ends of the face ${fmtIn(c.faceEndHem)}" (mark at ${fmtIn(2 * c.faceEndHem)}"). ` +
        (c.faceBottomHem > 0
          ? `Hem one long edge over ${fmtIn(c.faceBottomHem)}" — this hemmed edge meets the other raw edge at the cell bottom so a magazine lug glides over clean fabric. `
          : 'The two long edges stay raw; they meet at the cell bottom where nothing touches them on a straight rifle mag. ') +
        `Fold the face in half along the mouth fold so the clean folded edge is the mouth. Hemmed width should measure ${dim(g.faceHemmedW)}.`,
      dependsOn: [PC_STEP_CUT],
      refsPieces: ['face'],
      group: 'Panels',
    },
    {
      id: PC_STEP_MARK,
      title: 'Mark the cell divisions on both panels',
      body:
        (cells > 1
          ? `Back: measure from the inside of one hem and mark at ${backDivs}" (${fmtIn(c.cellSpan)}" per cell). ` +
            `Face: measure from the hemmed end and mark at ${faceDivs} mm (${fmtMm(c.facePerCell)} mm per cell — lay the face out in millimetres so the divisions land clean). `
          : `Single cell: the face is ${fmtMm(c.facePerCell)} mm across a ${fmtIn(c.cellSpan)}" back span. `) +
        `The face is ${fmtIn(g.puckerPerSide)}" wider than the back on each side of every cell — that pucker is what wraps the magazine. Mark every piece from one master, never copy-of-a-copy.`,
      dependsOn: [PC_STEP_HEM_BACK, PC_STEP_HEM_FACE],
      refsPieces: ['back', 'face'],
      group: 'Panels',
    },
    {
      id: PC_STEP_INTERIOR,
      title: 'Attach every interior piece to the face BEFORE joining',
      body:
        'Interior loop strips, cradles and face webbing all go on the open face panel now. Retro-fitting them into an assembled card ' +
        'means puckering everything out of the way and sewing blind — the headline mistake of the source build. Sew webbing ends first and let the far end fall where it falls.',
      dependsOn: [PC_STEP_MARK],
      refsPieces: ['face'],
      group: 'Interior',
    },
    {
      id: PC_STEP_JOIN_BOTTOM,
      title: 'Join face to back along the bottom first',
      body:
        'Lay the folded face on the back, raw edges at the bottom, and stitch across the bottom through the back hem. Bottom first, then divisions, then sides, then anything above — ' +
        'so the magazine never meets a raw ridge on its way in (glide-path sequencing).',
      dependsOn: [PC_STEP_INTERIOR],
      refsPieces: ['back', 'face'],
      group: 'Assembly',
    },
    {
      id: PC_STEP_JOIN_DIVISIONS,
      title: cells > 1 ? 'Sew the cell divisions' : 'Sew the outer cell edges',
      body:
        (cells > 1
          ? 'Match each face division mark to its back mark and stitch top to bottom through both face layers and the back, aiming to punch through both division lines. '
          : '') +
        'Expect about 8 layers at each division and 12–14 where webbing and hems stack: sew forward only, turn the work at the ends, never reverse through the bulk. ' +
        'Sew the same direction on every division so the pucker biases consistently.',
      dependsOn: [PC_STEP_JOIN_BOTTOM],
      refsPieces: ['back', 'face'],
      group: 'Assembly',
    },
    {
      id: PC_STEP_JOIN_SIDES,
      title: 'Close the outer sides',
      body:
        'Stitch the two outer face ends down the outside of the outer cells, catching the back hem. Leave the mouth open. ' +
        `Finished card should measure ${dim(g.backFinishedW)} wide; Velcro and webbing draw fabric in, so trim any overhang after sewing, not before.`,
      dependsOn: [PC_STEP_JOIN_DIVISIONS],
      refsPieces: ['back', 'face'],
      group: 'Assembly',
    },
  ];

  const bottomBody =
    c.bottomStyle === 'cradle'
      ? 'The cradle strips already tacked to the face carry the magazine bottom; make sure each cradle end is captured inside the bottom seam and the back hem, never left raw in the channel. Primers stay covered, and the mag rides as low as the cell allows.'
      : c.bottomStyle === 'pleat'
        ? 'Pinch the bottom of each cell into a flat pleat, equal on both sides (keyed to the lid-strap width if there is one — the symmetry is aesthetic, not structural), and lock with three passes forward-and-back. This stack is 12–14 layers: sew slowly, forward only. A pleat lifts the mag 1"–1.5" higher than a cradle.'
        : 'The cell bottom stays open. Retention relies on the interior loop on both walls plus a Kydex wedge or Velcro dot on the magazine; primers are exposed, so keep the cell height generous.';

  steps.push({
    id: PC_STEP_BOTTOM,
    title:
      c.bottomStyle === 'cradle' ? 'Finish the cradle bottoms'
        : c.bottomStyle === 'pleat' ? 'Pleat the cell bottoms'
          : 'Open bottoms — nothing to close',
    body: bottomBody,
    dependsOn: [PC_STEP_JOIN_SIDES],
    refsPieces: ['face'],
    group: 'Assembly',
  });

  if (c.flapLength > 0) {
    steps.push({
      id: PC_STEP_LID,
      title: 'Fold the lid over and fit its closure',
      body:
        `The lid is the top ${dim(c.flapLength)} of the back panel folded forward at the lid fold line. Hook goes on the underside of the lid, loop on the face; ` +
        'make the loop field longer than the hook by the adjustment you want — the loop field is the parametric piece.',
      dependsOn: [PC_STEP_BOTTOM],
      refsPieces: ['back'],
      group: 'Closure',
    });
  }

  return steps;
}

// ─── Warnings ─────────────────────────────────────────────────────────────────

export function pleatedCardWarnings(c: PleatedCardParams, g: PleatedCardGeometry): string[] {
  const warnings: string[] = [];
  if (g.puckerPerSide < MIN_PUCKER_PER_SIDE_MM) {
    warnings.push(
      `Face pucker is only ${fmtIn(g.puckerPerSide)}" per side (face ${fmtIn(c.facePerCell)}" over a ${fmtIn(c.cellSpan)}" span). ` +
        'Below about 0.9" the face will not wrap a rifle magazine; widen face_per_cell or narrow the span.',
    );
  }
  if (c.bottomStyle === 'pleat') {
    warnings.push(
      'Pleated bottoms cost 1"–1.5" of ride height versus a cradle and stack 12–14 layers at each pleat. ' +
        'Confirm your machine can take that stack; prefer a cradle for heavy (.308) magazines.',
    );
  }
  if (c.bottomStyle === 'open') {
    warnings.push(
      'Open bottom: primers are exposed and nothing holds the magazine except the interior loop plus a wedge or Velcro dot. ' +
        'Pick kydex_wedge or velcro_dot retention.',
    );
  }
  return warnings;
}

// ─── Strategy ─────────────────────────────────────────────────────────────────

export const pleatedCard: ConstructionStrategy = function pleatedCard(spec: PouchSpec) {
  const c = spec.card;
  if (!c) {
    throw new Error("pleated_card construction requires spec.card (PleatedCardParams).");
  }
  const bad = Object.entries(c).find(([, v]) => typeof v === 'number' && !Number.isFinite(v));
  if (bad) throw new Error(`pleated_card: ${bad[0]} is not a finite number`);
  if (!Number.isInteger(c.cellCount) || c.cellCount < 1) {
    throw new Error(`pleated_card: cellCount must be a positive integer (got ${c.cellCount})`);
  }
  if (c.facePerCell <= c.cellSpan) {
    throw new Error('pleated_card: facePerCell must exceed cellSpan (the face needs pucker to wrap the object)');
  }

  const g = pleatedCardGeometry(c);
  const pieces = [buildBackPanel(c, g), buildFacePanel(c, g)];
  const steps = buildSteps(c, g);
  const warnings = pleatedCardWarnings(c, g);
  return { pieces, steps, warnings };
};
