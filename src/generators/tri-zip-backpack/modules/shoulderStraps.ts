/**
 * Tri-Zip shoulder straps — built on the shared strap engine.
 *
 * Outputs the padded-strap primitive (outer shell, backer, foam, webbing
 * tail and top anchor) as a mirrored pair. Piece id `shoulder-strap` and the
 * step ids `tri-zip.shoulder-straps.cut` / `.assemble` are referenced by the
 * back-panel and final-assembly steps, so they are fixed here.
 */

import type { ResolvedInputs, ModuleResult } from '../types.js';
import { buildPaddedStrap } from '../../../lib/strap-engine/index.js';
import type { StrapCurve } from '../../../lib/strap-engine/types.js';

const CURVE_MAP: Record<ResolvedInputs['curve_style'], StrapCurve> = {
  straight: 'straight',
  ergonomic: 'j_curve',
  s_curve: 's_curve',
};

export function buildShoulderStraps(r: ResolvedInputs): ModuleResult & { warnings: string[] } {
  const result = buildPaddedStrap({
    padLength_mm: r.strap_pad_length,
    padWidth_mm: r.strap_width,
    foamThickness_mm: r.foam_thickness,
    curve: CURVE_MAP[r.curve_style],
    architecture: r.strap_architecture,
    edgeFinish: r.strap_edge_finish,
    webbingWidth_mm: r.strap_webbing_width,
    tailLength_mm: r.strap_tail_length,
    seamAllowance_mm: r.seam_allowance,
    quantity: 2,
    hardware: r.strap_hardware,
    idPrefix: 'tri-zip.shoulder-straps.',
    pieceId: 'shoulder-strap',
    name: 'Shoulder strap',
    gussetDepth_mm: r.depth,
  });

  // Hardware has no home in the tri-zip BOM yet; surface it in the last step.
  const hardwareLine = result.hardware
    .filter((h) => h.quantity > 0)
    .map((h) => `${h.quantity} × ${h.name}`)
    .join(', ');
  const last = result.steps[result.steps.length - 1];
  if (last && hardwareLine) {
    last.body += ` Hardware: ${hardwareLine}.`;
  }

  return { pieces: result.pieces, steps: result.steps, warnings: result.warnings };
}
