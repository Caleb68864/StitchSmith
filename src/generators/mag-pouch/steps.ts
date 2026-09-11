/**
 * Mag Pouch Generator — Step definitions
 *
 * Canonical step IDs are exported as constants so that downstream consumers
 * can reference them without hard-coding strings.
 *
 * Folded-T mandatory sequence (all four appear in every folded-T build):
 *   1. MAG_STEP_CUT      — cut-fabric
 *   2. MAG_STEP_ASSEMBLE — assemble-body
 *   3. MAG_STEP_ATTACH   — attach-retention
 *   4. MAG_STEP_FINISH   — finish-edges
 *
 * The pleated card's core sequence comes from the engine strategy
 * (PC_STEP_* in pouch-engine/construction/pleatedCard.ts); this module adds
 * the lid-closure and finishing steps shared by both constructions.
 */

import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { ResolvedMagPouch } from './resolve.js';

// ─── Canonical step IDs ───────────────────────────────────────────────────────

export const MAG_STEP_CUT = 'cut-fabric';
export const MAG_STEP_ASSEMBLE = 'assemble-body';
export const MAG_STEP_ATTACH = 'attach-retention';
export const MAG_STEP_FINISH = 'finish-edges';
export const MAG_STEP_LID_CLOSURE = 'lid-closure';
export const MAG_STEP_BATCH_NOTE = 'batch-note';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inTxt(v: number): string {
  return `${(Math.round(v * 100) / 100).toString().replace(/\.?0+$/, '')}"`;
}

// ─── Folded-T ─────────────────────────────────────────────────────────────────

export interface FoldedTStepContext {
  r: ResolvedMagPouch;
  seamAllowanceMm: number;
  bodyPieceId: string;
  /** Step ids that must finish before the body is assembled (interior loop, drainage). */
  beforeAssembly: string[];
}

/** Build the mandatory folded-T sequence. */
export function buildFoldedTSteps(ctx: FoldedTStepContext): Step[] {
  const { r } = ctx;
  const saMm = ctx.seamAllowanceMm.toFixed(1);
  const saIn = inTxt(r.seamAllowanceIn);

  const cut: Step = {
    id: MAG_STEP_CUT,
    title: 'Cut the body',
    body:
      `Cut one body piece along the outer (green) cut line — that line already includes the ${saIn} (${saMm} mm) seam allowance; the black line is the finished edge. ` +
      'Dashed blue lines are folds: two vertical wing folds, the bottom fold and the lid fold. Transfer the fold lines to the wrong side. ' +
      `The pouch is ${inTxt(r.pouchHeightIn)} deep on a ${inTxt(r.magIn.height)} magazine, so ${inTxt(r.exposedHeightIn)} stands proud for the grab. ` +
      'Cut the first one from cheap solid-colour fabric.',
    dependsOn: [],
    refsPieces: [ctx.bodyPieceId],
    group: 'Cutting',
  };

  const assemble: Step = {
    id: MAG_STEP_ASSEMBLE,
    title: 'Fold and sew the body',
    body:
      'Crease the two wing folds, then fold the front up over the bottom band so it faces the back. ' +
      `Wrap each wing round the side and stitch it to the front at ${saIn} — bottom edge first, then the sides, so the magazine never meets a raw ridge on the way in. ` +
      'Sew forward only where the wing, bottom and hem stack (8+ layers); turn the work rather than reversing. Leave the top open.',
    dependsOn: [MAG_STEP_CUT, ...ctx.beforeAssembly],
    refsPieces: [ctx.bodyPieceId],
    group: 'Assembly',
  };

  let retentionBody: string;
  switch (r.retention) {
    case 'open_top_bungee':
      retentionBody =
        'Lace the bungee over the mouth: anchor it to the back top corners, run it through a cord lock at the front so it stays adjustable and replaceable, and fit a pull tab over the magazine top. ' +
        'Start with 16" of cord and lace a mock first; fat cord needs about 18".';
      break;
    case 'velcro_dot':
      retentionBody =
        'The interior loop is already sewn on both walls. Stick a 1" hook square on ONE face of each magazine — two faces grab too hard to draw. Cell depth does the holding; the dot stops the mag walking out.';
      break;
    case 'kydex_wedge':
      retentionBody =
        'The interior loop is already sewn on both walls. Mask the loop with a strip of card, drop the platform-specific Kydex wedge in, pull the mask and press it home — once the loop grabs it will not come out.';
      break;
    case 'none':
      retentionBody =
        `No retention hardware: the ${inTxt(r.pouchHeightIn)} cell depth (${Math.round(r.coverage * 100)}% coverage) is what holds the magazine. Raise the coverage if the mag walks.`;
      break;
    case 'flap_velcro':
      retentionBody =
        `Fold the lid forward at the lid fold. Sew the ${inTxt(r.hookLengthIn)} hook strip to the underside of the lid, short sides first, and the ${inTxt(r.loopLengthIn)} loop field to the face — ` +
        `the loop is longer than the hook by ${inTxt(r.loopLengthIn - r.hookLengthIn)} so the lid can close over a taller magazine. Hook goes on last so nothing sews across it.`;
      break;
    case 'flap_snap':
      retentionBody =
        'Fold the lid forward at the lid fold and set the snap: stud on the lid, socket on the face, centred on the cell. Set snaps with a press or setting tool, not a hammer alone.';
      break;
    case 'flap_fastex':
      retentionBody =
        'Fold the lid forward at the lid fold. Bartack the female half of the 1" side-release buckle on a short webbing tab at the lid tip and the male half on an adjustable webbing tail on the face, centred on the cell.';
      break;
  }

  const attachRetention: Step = {
    id: MAG_STEP_ATTACH,
    title: 'Fit the retention',
    body: retentionBody,
    dependsOn: [MAG_STEP_ASSEMBLE],
    refsPieces: [ctx.bodyPieceId],
    group: 'Retention',
  };

  const finish: Step = {
    id: MAG_STEP_FINISH,
    title: 'Finish edges and mouth',
    body:
      `Bind or edge-stitch the remaining raw edges at ${saMm} mm and topstitch the mouth so it stays open under a gloved hand. ` +
      'Hot-knife every webbing end. Trim any Velcro or webbing that was cut long flush after sewing.',
    dependsOn: [MAG_STEP_ATTACH],
    refsPieces: [ctx.bodyPieceId],
    group: 'Finish',
  };

  return [cut, assemble, attachRetention, finish];
}

// ─── Shared ───────────────────────────────────────────────────────────────────

/** Lid-closure step for the pleated card (the folded-T folds this into MAG_STEP_ATTACH). */
export function buildCardLidClosureStep(r: ResolvedMagPouch, dependsOn: string[]): Step | null {
  if (!r.hasFlap) return null;
  let body: string;
  switch (r.retention) {
    case 'flap_velcro':
      body =
        `Sew the ${inTxt(r.hookLengthIn)} hook strip to the underside of the lid tip, short sides first, and the ${inTxt(r.loopLengthIn)} loop field to the face directly below it. ` +
        `The loop is ${inTxt(r.loopLengthIn - r.hookLengthIn)} longer than the hook — that is the adjustment. Hook goes on last in the build.`;
      break;
    case 'flap_snap':
      body = 'Set one snap per cell: stud on the lid underside, socket on the face, centred on each cell. Use a press or setting tool.';
      break;
    default:
      body = 'Fit one 1" side-release buckle per cell: female half on a webbing tab at the lid tip, male half on an adjustable tail on the face, centred on each cell.';
  }
  return {
    id: MAG_STEP_LID_CLOSURE,
    title: 'Fit the lid closure',
    body,
    dependsOn,
    refsPieces: ['back'],
    group: 'Closure',
  };
}

/** Production note appended to every build. */
export function buildBatchNoteStep(r: ResolvedMagPouch, dependsOn: string[]): Step {
  const cells = r.cellCount;
  return {
    id: MAG_STEP_BATCH_NOTE,
    title: 'Before you cut the final fabric',
    body:
      'Build one in scrap first — pucker depth, cradle length and bungee length are tolerances, not geometry. ' +
      (cells > 1
        ? `Per-magazine sew time rises with cell count (${cells} cells share hems but every division is a multi-layer join); four singles are faster to build than one four-cell card. `
        : 'Even for one pouch, cut two — chaining identical pieces is faster per unit. ') +
      'Mark every copy from one master pattern, re-measure against the spec every few units, and cut Velcro and long webbing runs long, trimming after sewing.',
    dependsOn,
    refsPieces: [],
    group: 'Finish',
  };
}
