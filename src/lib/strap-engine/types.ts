/**
 * Strap engine — public types.
 *
 * A padded shoulder strap is a reusable primitive across packs, chest rigs,
 * plate carriers and slings (vault reference/technique-shoulder-strap-construction.md).
 * All measurements are millimetres.
 */

import type { Piece } from '../pattern-engine/graph/Piece.js';
import type { Step } from '../pattern-engine/instructions/Step.js';

/**
 * Pad outline.
 *   straight — rectangle
 *   j_curve  — straight at the top, sweeping inward toward the bottom to clear
 *              pec/breast tissue; the standard pack strap
 *   s_curve  — sweeps inward mid-length and back outward at the bottom; the
 *              vest-style / "ergonomic" strap
 */
export type StrapCurve = 'straight' | 'j_curve' | 's_curve';

/**
 * How the pad is built (vault rigs/harness-padded-strap-construction.md,
 * packs/compare-shoulder-strap-traditions.md).
 *   foam_sandwich_mesh     — shell + closed-cell foam + spacer mesh, bound; the
 *                            MYOG standard. Webbing tacked 1" into the ends.
 *   webbing_tacked_ends    — SOE-recommended: Cordura-wrapped foam, webbing
 *                            inserted 1" into each pad end and tacked; no foam
 *                            in any needle path.
 *   webbing_through_quilted — SOE production H-harness: 1.5" webbing full
 *                            length over the pad face, quilted through the foam.
 *   crushable_sleeve       — Vietnam-era: thin shell tube over soft fill, no
 *                            foam sandwich, webbing continuous through it.
 *   none                   — slick webbing only (armour-compatible, stowable).
 */
export type PadArchitecture =
  | 'foam_sandwich_mesh'
  | 'webbing_tacked_ends'
  | 'webbing_through_quilted'
  | 'crushable_sleeve'
  | 'none';

/**
 * Edge finish. Binding adds no seam allowance to the shell; a turned pad needs
 * SA on every edge (vault plate-carriers/construction-binding-edge.md).
 */
export type EdgeFinish = 'bound' | 'turned';

export type StrapHardware = 'ladderlock' | 'side_release' | 'tri_glide';

export interface PaddedStrapSpec {
  /** Finished padded length, top (yoke) to bottom (tail end). */
  padLength_mm: number;
  /** Finished pad width at the top. 38 mm ultralight, 50 mm general, up to 76 mm heavy. */
  padWidth_mm: number;
  /** Closed-cell foam thickness. 6–10 mm is the sweet spot. 0 = no foam. */
  foamThickness_mm: number;
  curve: StrapCurve;
  architecture: PadArchitecture;
  edgeFinish: EdgeFinish;
  /** Load-bearing webbing width (25 / 38 / 50 mm). Drives every hardware slot. */
  webbingWidth_mm: number;
  /**
   * Free webbing below the pad to the lower anchor / adjuster. MUST be derived
   * from torso AND gusset depth by the caller (vault packs/medpack-shoulder-harness.md).
   */
  tailLength_mm: number;
  /** Short webbing stub at the top that sews into the yoke / top anchor. Default 100. */
  topAnchorLength_mm?: number;
  /** Seam allowance used when `edgeFinish === 'turned'`. */
  seamAllowance_mm: number;
  /** Binding tape width when bound. Default 25.4. */
  bindingWidth_mm?: number;
  /** Mesh backer inset from the shell outline when bound. Default 6.35. */
  meshInset_mm?: number;
  /** Foam inset from the shell outline on the long edges. Default 12.7 (bound) or SA + 3 (turned). */
  foamInset_mm?: number;
  /** How far the webbing is inserted into the pad end before tacking. Default 25.4. */
  webbingInsertion_mm?: number;
  /** Straps to cut. Default 2, mirrored. */
  quantity?: number;
  hardware?: StrapHardware;
  /** Prefix for step ids, e.g. 'tri-zip.shoulder-straps.'. Default 'strap.'. */
  idPrefix?: string;
  /** Base piece id; the outer shell gets exactly this id. Default 'shoulder-strap'. */
  pieceId?: string;
  /** Display name for the outer shell. Default 'Shoulder strap'. */
  name?: string;
  /** Recorded in `derived` so the tail derivation is auditable. */
  gussetDepth_mm?: number;
}

export interface StrapHardwareItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
}

export interface PaddedStrapDerived {
  /** Pad width at the bottom (tapered toward the webbing on curved pads). */
  bottomWidth_mm: number;
  /** Lateral sweep of a curved pad. */
  sweep_mm: number;
  foamLength_mm: number;
  foamWidth_mm: number;
  /** Total webbing per strap, all pieces. */
  webbingPerStrap_mm: number;
  /** Worst-case layer count the machine must sew through. */
  maxLayers: number;
  /** True when a seam passes through foam (needs a walking foot; never reverse). */
  foamInNeedlePath: boolean;
  gussetDepth_mm?: number;
}

export interface PaddedStrapResult {
  pieces: Piece[];
  steps: Step[];
  warnings: string[];
  hardware: StrapHardwareItem[];
  derived: PaddedStrapDerived;
}
