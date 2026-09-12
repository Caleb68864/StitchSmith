/**
 * Mag Pouch Generator — buildPattern
 *
 * Orchestrates the full pattern generation pipeline:
 *   resolveMagPouch() → toPouchSpec() → buildPouch() → components → BOM → steps
 *
 * Public exports:
 *   - `buildPattern(inputs)` — main entry point
 *   - `detectAkProfile(dims)` — AK-magazine dimension check (folded-T only)
 *   - `AK_WARNING_COPY`       — canonical warning string for tests / UI
 */

import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import { buildPouch } from '../../lib/pouch-engine/index.js';
import { buildAttachment, palsRowCount } from '../../lib/pouch-engine/components/attachment.js';
import { buildDrainage } from '../../lib/pouch-engine/components/drainage.js';
import { buildRetention } from '../../lib/pouch-engine/components/retention.js';
import { buildCradles } from '../../lib/pouch-engine/components/cradle.js';
import { buildFacePals } from '../../lib/pouch-engine/components/facePals.js';
import {
  PC_STEP_HEM_BACK,
  PC_STEP_INTERIOR,
  PC_STEP_JOIN_BOTTOM,
  PC_STEP_JOIN_SIDES,
  PC_STEP_BOTTOM,
  PC_STEP_LID,
} from '../../lib/pouch-engine/construction/pleatedCard.js';
import type {
  MagPouchInputs,
  MagPouchBuildResult,
  MagPouchDerived,
} from './types.js';
import { toPouchSpec } from './toPouchSpec.js';
import { resolveMagPouch, inToMm, type ResolvedMagPouch } from './resolve.js';
import {
  buildFoldedTSteps,
  buildCardLidClosureStep,
  buildBatchNoteStep,
  MAG_STEP_ASSEMBLE,
  MAG_STEP_FINISH,
} from './steps.js';
import { buildBom, cutPiecesFromPattern } from './bom.js';
import {
  AK_THRESHOLD_HEIGHT_IN,
  AK_THRESHOLD_THICKNESS_IN,
} from './unsupportedMagazines.js';
import { PALS_PITCH_IN, R308_CELL_SPAN_IN, DEFAULT_PULL_CHANNEL_DEPTH_IN, MIN_LID_PURCHASE_IN } from './defaults.js';
import { PLATFORM_LABELS } from './magazines.js';

// ─── AK profile detection ─────────────────────────────────────────────────────

/**
 * Canonical AK warning copy (folded-T construction only — the pleated card
 * takes AK magazines with the hemmed-face variant).
 *
 * Tests use substring match against this string via `AK_WARNING_COPY`.
 */
export const AK_WARNING_COPY =
  'AK-pattern magazine dimensions detected (height ≥ 8.5", thickness ≥ 1.05"). ' +
  'The folded-T body is optimized for straight AR-15 family magazines; a curved AK magazine ' +
  'may not seat correctly. Switch to the pleated-card construction (which hems the face for the AK lug) ' +
  'or verify fit with a physical mock-up before cutting final fabric.';

/**
 * Check whether a set of magazine dimensions (in inches) matches an AK-pattern
 * profile.  Returns the canonical warning string if the profile is matched, or
 * `undefined` otherwise.
 *
 * Matching rule:
 *   height ≥ AK_THRESHOLD_HEIGHT_IN  AND  thickness ≥ AK_THRESHOLD_THICKNESS_IN
 */
export function detectAkProfile(dims: {
  width: number;
  thickness: number;
  height: number;
}): string | undefined {
  if (
    dims.height >= AK_THRESHOLD_HEIGHT_IN &&
    dims.thickness >= AK_THRESHOLD_THICKNESS_IN
  ) {
    return AK_WARNING_COPY;
  }
  return undefined;
}

// ─── Warnings from the resolved dimensions ────────────────────────────────────

function inTxt(v: number): string {
  return `${(Math.round(v * 100) / 100).toString().replace(/\.?0+$/, '')}"`;
}

export function resolvedWarnings(r: ResolvedMagPouch): string[] {
  const w: string[] = [];

  const deadPerCell = r.cellSpanIn - r.nominalSpanIn;
  // A rifle mag pays ~0.2" of grid tax; that is the normal case and the derived
  // summary shows it. Only shout when the rounding is large (.308 → 4.5").
  if (r.isPalsMount && r.spanSnappedToGrid && (deadPerCell >= 0.45 || r.platform === 'rifle_308')) {
    w.push(
      `Cell span rounded up from ${inTxt(r.nominalSpanIn)} to ${inTxt(r.cellSpanIn)} so it lands on the 1.5" PALS grid (${inTxt(deadPerCell)} of grid tax per cell). ` +
        (r.platform === 'rifle_308'
          ? `A .308 cell wants ${inTxt(R308_CELL_SPAN_IN)}, which is off-grid: either accept three columns per cell or mount on a Velcro field / sewn placard and set cell_span to ${inTxt(R308_CELL_SPAN_IN)}.`
          : 'Mount on Velcro or sew the pouch to a placard if you want the cell closer to the magazine.'),
    );
  }

  if (r.isPalsMount && r.gridErrorIn > 0.01) {
    w.push(
      `Cell span ${inTxt(r.cellSpanIn)} is not a multiple of the ${inTxt(PALS_PITCH_IN)} PALS pitch — the pouch will not mount up in spec spacing (a tested failure, not a style choice). ` +
        'Round the span to the grid or change the attachment to a Velcro panel.',
    );
  }

  if (!r.isPalsMount && r.cellSpanIn < r.magIn.width + 0.2) {
    w.push(
      `Cell span ${inTxt(r.cellSpanIn)} leaves under 0.2" of clearance on a ${inTxt(r.magIn.width)} magazine; the mag will bind. Add ease.`,
    );
  }

  if (r.hasFlap && r.pullChannelDepthIn > 0 && r.pullChannelDepthIn < DEFAULT_PULL_CHANNEL_DEPTH_IN) {
    w.push(`Pull channel ${inTxt(r.pullChannelDepthIn)} is under the 1.5" SOE marks for a gloved finger; the 1" sample was the one he called too small (rigs/subgun-lid-pull-channel.md).`);
  }
  if (r.hasFlap && r.retention === 'flap_velcro' && r.closureOverlapIn < MIN_LID_PURCHASE_IN) {
    w.push(`Lid purchase ${inTxt(r.closureOverlapIn)} is under the ${inTxt(MIN_LID_PURCHASE_IN)} of hook SOE keeps at every adjustment; a taller magazine will leave less. Raise closure_overlap or the loop length.`);
  }
  if (r.hourglassInsetIn > 0) {
    w.push('Hourglass aesthetic is on: the side seams pinch in 1/4" per side. Purely cosmetic and it costs real labour — SOE dropped it from the 4-pack rifle card.');
  }

  if (r.retention === 'open_top_bungee') {
    w.push(
      `Bungee retention commits this pouch to ${PLATFORM_LABELS[r.platform]}: a .308 pull will not work on an M4 cell and an AK needs a channelled pull. ` +
        'For a caliber-flexible rig prefer a Velcro dot or Kydex wedge and keep the bungee kit swappable.',
    );
  }

  if (r.hasFlap && r.exposedHeightIn <= 0) {
    w.push('Coverage is 100% — the lid has nothing to wrap; lower the coverage so some magazine stands proud for the grab.');
  }

  if (r.construction === 'pleated_card' && r.platform === 'ak' && !r.akFaceHem) {
    w.push('AK magazines drag their locking lug along the face interior; enable the AK face hem (+0.75") so the lug glides over clean fabric.');
  }

  if (r.construction === 'pleated_card' && r.platform === 'rifle_308' && r.bottomStyle === 'pleat') {
    w.push('.308 magazines are heavy: SOE ships cradles, not pleats, on .308 rigs. A pleat also costs 1"–1.5" of ride height.');
  }

  if (r.construction === 'folded_t' && r.cellDepthIn > r.cellSpanIn / 2) {
    // The engine also warns; this one names the fix.
    w.push('Cell depth exceeds half the cell span — the folded-T centre seam may not lie flat. Consider the pleated card.');
  }

  return w;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Generate a complete mag-pouch pattern from validated `MagPouchInputs`.
 *
 * The caller is responsible for validating inputs with `validateInputs` before
 * calling this function.  Passing invalid inputs may throw or produce
 * nonsensical patterns.
 */
export function buildPattern(inputs: MagPouchInputs): MagPouchBuildResult {
  const warnings: string[] = [];
  const r = resolveMagPouch(inputs);
  const cells = r.cellCount;
  const cellHeightMm = inToMm(r.pouchHeightIn);
  const backWidthMm = inToMm(r.cellSpanIn * cells);

  // AK profile warning applies to the folded-T body only.
  if (r.construction === 'folded_t') {
    const akWarning = detectAkProfile(r.magIn);
    if (akWarning) warnings.push(akWarning);
  }
  warnings.push(...resolvedWarnings(r));

  // ── Build the construction ─────────────────────────────────────────────────
  const spec = toPouchSpec(inputs);
  const { pattern: basePattern, warnings: engineWarnings, steps: engineSteps } = buildPouch(spec);
  warnings.push(...engineWarnings);

  const pieces: Piece[] = [];
  const steps: Step[] = [];
  const isCard = r.construction === 'pleated_card';

  // ── Attachment (back rows + mount straps, or belt loop etc.) ───────────────
  const attach = buildAttachment({
    style: inputs.attachment,
    finishedHeight_mm: cellHeightMm,
    finishedWidth_mm: backWidthMm,
    mountColumns: r.isPalsMount ? r.palsColumns : undefined,
  });
  warnings.push(...attach.warnings);
  const palsRows = r.isPalsMount ? palsRowCount(cellHeightMm) : 0;

  // ── Retention (interior loop, hook/loop strips, dots) ─────────────────────
  const retention = buildRetention({
    style: r.retention,
    hookLength_mm: inToMm(r.hookLengthIn),
    loopLength_mm: inToMm(r.loopLengthIn),
    cellCount: cells,
    cellHeight_mm: cellHeightMm,
    interiorLoop: r.interiorLoop,
    interiorDependsOn: isCard ? [PC_STEP_INTERIOR] : [],
    facePieceId: isCard ? 'face' : 'body',
  });
  warnings.push(...retention.warnings);

  if (isCard) {
    // Engine steps come out in build order: cut → hems → mark → interior-ready → joins → bottom → lid.
    pieces.push(...basePattern.pieces);

    // Interior components go onto the face before any joining.
    const interiorStepIds: string[] = [];
    const interior: Step[] = [];

    const loopStep = retention.steps.find((s) => s.id === 'interior-loop-sew');
    if (loopStep) { interior.push(loopStep); interiorStepIds.push(loopStep.id); }

    if (r.bottomStyle === 'cradle') {
      const cradle = buildCradles({
        cellCount: cells,
        objectDepth_mm: inToMm(r.magIn.thickness),
        dependsOn: [PC_STEP_INTERIOR],
        facePieceId: 'face',
      });
      warnings.push(...cradle.warnings);
      pieces.push(...cradle.pieces);
      interior.push(...cradle.steps);
      interiorStepIds.push(...cradle.steps.map((s) => s.id));
    }

    if (r.facePals) {
      const fp = buildFacePals({
        cellCount: cells,
        cellSpan_mm: inToMm(r.cellSpanIn),
        cellHeight_mm: cellHeightMm,
        dependsOn: [PC_STEP_INTERIOR],
        facePieceId: 'face',
      });
      warnings.push(...fp.warnings);
      pieces.push(...fp.pieces);
      interior.push(...fp.steps);
      interiorStepIds.push(...fp.steps.map((s) => s.id));
    }

    // Back rows go on the hemmed back, before joining; mount straps after.
    const backRowStep = attach.steps.find((s) => s.id === 'pals-back-rows');
    const attachAfter = attach.steps.filter((s) => s.id !== 'pals-back-rows');
    if (backRowStep) {
      backRowStep.dependsOn = [PC_STEP_HEM_BACK];
      interiorStepIds.push(backRowStep.id);
    }
    for (const s of attachAfter) s.dependsOn = [PC_STEP_JOIN_SIDES];

    // Splice: engine steps up to and including interior-ready, then interior work, then the joins.
    const idxInterior = engineSteps.findIndex((s) => s.id === PC_STEP_INTERIOR);
    const before = engineSteps.slice(0, idxInterior + 1);
    const after = engineSteps.slice(idxInterior + 1);
    const joinBottom = after.find((s) => s.id === PC_STEP_JOIN_BOTTOM);
    if (joinBottom) joinBottom.dependsOn = [...joinBottom.dependsOn, ...interiorStepIds];

    steps.push(...before);
    if (backRowStep) steps.push(backRowStep);
    steps.push(...interior);
    steps.push(...after);

    // Retention that happens after assembly (dot / wedge / bungee / lid closure).
    const postRetention = retention.steps.filter((s) => s.id !== 'interior-loop-sew');
    for (const s of postRetention) s.dependsOn = [PC_STEP_BOTTOM];
    steps.push(...postRetention);
    const lidClosure = buildCardLidClosureStep(r, [after.some((s) => s.id === PC_STEP_LID) ? PC_STEP_LID : PC_STEP_BOTTOM]);
    if (lidClosure) steps.push(lidClosure);
    steps.push(...attachAfter);
    pieces.push(...retention.pieces, ...attach.pieces);
    steps.push(buildBatchNoteStep(r, [steps[steps.length - 1]?.id ?? PC_STEP_BOTTOM]));
  } else {
    // ── Folded-T ─────────────────────────────────────────────────────────────
    const bodyPiece: Piece = basePattern.pieces[0] ?? {
      id: 'body', name: 'Body', mirror: false, quantity: 1, paths: [], annotations: [],
    };
    const drainage = buildDrainage({
      style: inputs.drainage,
      bodyPiece,
      grommetSize: (inputs.grommet_size as '#0' | '#00' | undefined) ?? '#0',
      exposed_percentage: r.coverage,
    });
    warnings.push(...drainage.warnings);

    const beforeAssembly = [
      ...drainage.steps.map((s) => s.id),
      ...retention.steps.filter((s) => s.id === 'interior-loop-sew').map((s) => s.id),
    ];
    const core = buildFoldedTSteps({
      r,
      seamAllowanceMm: spec.seamAllowance,
      bodyPieceId: bodyPiece.id,
      beforeAssembly,
    });

    for (const s of attach.steps) s.dependsOn = [MAG_STEP_ASSEMBLE];
    const loopStep = retention.steps.find((s) => s.id === 'interior-loop-sew');
    const postRetention = retention.steps.filter((s) => s.id !== 'interior-loop-sew');
    for (const s of postRetention) s.dependsOn = [MAG_STEP_ASSEMBLE];

    pieces.push(drainage.piecePatches, ...basePattern.pieces.slice(1), ...retention.pieces, ...attach.pieces);
    steps.push(
      core[0],
      ...drainage.steps,
      ...(loopStep ? [loopStep] : []),
      core[1],
      ...attach.steps,
      core[2],
      ...postRetention.filter((s) => s.id !== 'retention-bungee'),
      core[3],
      buildBatchNoteStep(r, [MAG_STEP_FINISH]),
    );
  }

  const pattern: Pattern = {
    ...basePattern,
    name: isCard
      ? `Mag card — ${cells} × ${PLATFORM_LABELS[r.platform]}`
      : `Mag pouch — ${PLATFORM_LABELS[r.platform]}`,
    pieces,
  };

  const defaultSaMm = isCard ? 0 : inToMm(r.seamAllowanceIn);
  const bom = buildBom(inputs, r, pattern, palsRows);
  const cutPieces = cutPiecesFromPattern(pattern, defaultSaMm);

  const derived: MagPouchDerived = {
    construction: r.construction,
    platform: r.platform,
    cellCount: cells,
    cellSpanIn: r.cellSpanIn,
    palsColumns: r.palsColumns,
    facePerCellIn: isCard ? r.facePerCellIn : undefined,
    puckerPerSideIn: isCard ? r.puckerPerSideIn : undefined,
    pouchHeightIn: r.pouchHeightIn,
    exposedHeightIn: r.exposedHeightIn,
    flapLengthIn: r.flapLengthIn,
    palsRows,
    maxLayers: isCard ? (r.bottomStyle === 'pleat' ? 14 : 8) : 8,
    caliberLocked: r.retention === 'open_top_bungee',
  };

  return { pattern, warnings, bom, steps, cutPieces, derived };
}
