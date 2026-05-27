/**
 * Mag Pouch Generator — Step definitions
 *
 * Canonical step IDs are exported as constants so that downstream consumers
 * (e.g. SS-04 inline instruction rendering) can reference them without
 * hard-coding strings.
 *
 * Mandatory step sequence (all four must appear in every build):
 *   1. MAG_STEP_CUT      — cut-fabric
 *   2. MAG_STEP_ASSEMBLE — assemble-body
 *   3. MAG_STEP_ATTACH   — attach-retention
 *   4. MAG_STEP_FINISH   — finish-edges
 */

import type { Step } from '../../lib/pattern-engine/instructions/Step.js';

// ─── Canonical step IDs ───────────────────────────────────────────────────────

export const MAG_STEP_CUT = 'cut-fabric';
export const MAG_STEP_ASSEMBLE = 'assemble-body';
export const MAG_STEP_ATTACH = 'attach-retention';
export const MAG_STEP_FINISH = 'finish-edges';

// ─── Optional step IDs ────────────────────────────────────────────────────────

export const MAG_STEP_ATTACH_HARDWARE = 'attach-hardware';
export const MAG_STEP_DRAINAGE = 'install-drainage';

// ─── Step builders ────────────────────────────────────────────────────────────

export interface StepContext {
  seamAllowanceMm: number;
  retentionStyle: string;
  drainageStyle: string;
  bodyPieceId: string;
}

/** Build the mandatory four-step sequence. */
export function buildMandatorySteps(ctx: StepContext): Step[] {
  const saMm = ctx.seamAllowanceMm.toFixed(1);

  const cut: Step = {
    id: MAG_STEP_CUT,
    title: 'Cut fabric pieces',
    body:
      `Cut all pattern pieces as marked, including the ${saMm} mm seam allowance on all ` +
      'stitch edges (dashed lines are fold/hem lines). Transfer all notches. ' +
      'Cut any drainage features before assembly.',
    dependsOn: [],
    refsPieces: [ctx.bodyPieceId],
    group: 'prep',
  };

  const assemble: Step = {
    id: MAG_STEP_ASSEMBLE,
    title: 'Assemble body',
    body:
      'Fold the body piece as indicated by the fold lines (folded-T construction). ' +
      'Right sides together, stitch the side seams at the seam allowance. ' +
      'Press seams open. Box the bottom corners if applicable.',
    dependsOn: [MAG_STEP_CUT],
    refsPieces: [ctx.bodyPieceId],
    group: 'construction',
  };

  const retentionVerb =
    ctx.retentionStyle === 'open_top_bungee'
      ? 'Thread bungee cord through the cord locks at the top opening.'
      : 'Attach the retention hardware (velcro / snap / buckle) to the flap as marked.';

  const attachRetention: Step = {
    id: MAG_STEP_ATTACH,
    title: 'Attach retention',
    body: retentionVerb,
    dependsOn: [MAG_STEP_ASSEMBLE],
    refsPieces: [ctx.bodyPieceId],
    group: 'hardware',
  };

  const drainageNote =
    ctx.drainageStyle === 'sewn_closed'
      ? 'No drainage opening — bottom corners are sewn fully closed.'
      : ctx.drainageStyle === 'grommet'
        ? 'Install the grommet at the marked drainage point on the bottom panel.'
        : 'Leave the open-corner drainage cut unsewn on each bottom corner.';

  const finish: Step = {
    id: MAG_STEP_FINISH,
    title: 'Finish edges',
    body:
      `Finish all raw edges with a bar-tack or edge stitch at ${saMm} mm. ` +
      drainageNote +
      ' Topstitch the top opening edge for reinforcement.',
    dependsOn: [MAG_STEP_ATTACH],
    refsPieces: [ctx.bodyPieceId],
    group: 'finish',
  };

  return [cut, assemble, attachRetention, finish];
}
