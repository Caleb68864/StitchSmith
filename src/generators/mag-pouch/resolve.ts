/**
 * Mag Pouch Generator — resolve every derived dimension in ONE place.
 *
 * `buildPattern`, `toPouchSpec`, the BOM and the step text all read from the
 * object this returns, so the drawing and the cut list cannot disagree
 * (CLAUDE.md, Convention B). Inputs are inches; the resolved record carries
 * inches for display and mm for geometry.
 *
 * Vault provenance for the rules encoded here:
 *  - PALS grid quantization: mag-pouches/pals-grid-vs-cell-width.md
 *  - face per cell ≈ mag_w + 2·mag_t + ease: rigs/micro-rig-mag-cell-sizing.md
 *  - .308 span 3.5": rigs/mag-cell-width-308.md
 *  - AK face hem +0.75": mag-pouches/mag-pouch-ak-variant-hemmed-face.md
 *  - coverage 0.7–0.8: rigs/microrig-velcro-dot-retention.md
 *  - lid = wrap + purchase: rigs/subgun-lid-pull-channel.md
 */

import type { MagPouchInputs, MagPouchConstruction, BottomStyle, RetentionStyle } from './types.js';
import type { MagazinePlatform } from './magazines.js';
import { getMagazine } from './magazines.js';
import {
  DEFAULT_EASE_WIDTH_IN,
  DEFAULT_EASE_DEPTH_IN,
  DEFAULT_EXPOSED_PERCENTAGE,
  DEFAULT_HOOK_LENGTH_IN,
  DEFAULT_LOOP_LENGTH_IN,
  DEFAULT_CLOSURE_OVERLAP_IN,
  DEFAULT_CONSTRUCTION,
  DEFAULT_CELL_COUNT,
  PALS_PITCH_IN,
  R308_CELL_SPAN_IN,
  DEFAULT_FACE_EASE_IN,
  DEFAULT_BACK_HEM_IN,
  DEFAULT_FACE_END_HEM_IN,
  AK_FACE_HEM_IN,
  DEFAULT_BOTTOM_STYLE,
  DEFAULT_PULL_CHANNEL_DEPTH_IN,
  DEFAULT_SEAM_ALLOWANCE_IN,
  HOURGLASS_INSET_IN,
} from './defaults.js';

export const IN_TO_MM = 25.4;
export const inToMm = (v: number): number => v * IN_TO_MM;

export interface MagDimsIn {
  width: number;
  thickness: number;
  height: number;
}

export interface ResolvedMagPouch {
  construction: MagPouchConstruction;
  platform: MagazinePlatform;
  magIn: MagDimsIn;
  retention: RetentionStyle;
  hasFlap: boolean;
  isPalsMount: boolean;
  cellCount: number;
  /** Cell span across the back, inches. */
  cellSpanIn: number;
  /** Span the magazine would want before grid snapping, inches. */
  nominalSpanIn: number;
  /** True when the span was rounded up to the PALS grid. */
  spanSnappedToGrid: boolean;
  /** Distance from the span to the nearest 1.5" multiple, inches (0 = on grid). */
  gridErrorIn: number;
  palsColumns: number;
  facePerCellIn: number;
  puckerPerSideIn: number;
  coverage: number;
  pouchHeightIn: number;
  exposedHeightIn: number;
  easeWidthIn: number;
  easeDepthIn: number;
  cellDepthIn: number;
  flapLengthIn: number;
  /** Lid tip folded back to form the finger channel, inches (0 = none). Included in flapLengthIn. */
  pullChannelDepthIn: number;
  /** Extra side-seam inset per side for the hourglass look, inches (0 = off). */
  hourglassInsetIn: number;
  hookLengthIn: number;
  loopLengthIn: number;
  closureOverlapIn: number;
  backHemIn: number;
  faceEndHemIn: number;
  akFaceHem: boolean;
  bottomStyle: BottomStyle;
  facePals: boolean;
  interiorLoop: boolean;
  seamAllowanceIn: number;
}

/**
 * Resolve magazine dimensions (inches) and platform.
 * @throws {Error} on an unknown preset or missing custom dimensions.
 */
export function resolveMagazine(inputs: MagPouchInputs): { dims: MagDimsIn; platform: MagazinePlatform } {
  if (inputs.magazine.mode === 'predefined') {
    const id = inputs.magazine.presetId ?? '';
    const entry = getMagazine(id);
    if (!entry) {
      throw new Error(`Unknown magazine preset "${id}". Use one of the predefined IDs from magazines.ts.`);
    }
    return {
      dims: { width: entry.width, thickness: entry.thickness, height: entry.height },
      platform: entry.platform,
    };
  }
  const { width, thickness, height, units } = inputs.magazine;
  if (width === undefined || thickness === undefined || height === undefined) {
    throw new Error('Custom magazine must specify width, thickness, and height.');
  }
  const toIn = (v: number) => ((units ?? 'in') === 'mm' ? v / IN_TO_MM : v);
  return {
    dims: { width: toIn(width), thickness: toIn(thickness), height: toIn(height) },
    platform: inputs.magazine.platform ?? 'custom',
  };
}

/** Round `value` up to the next multiple of `pitch` (tolerant of float dust). */
export function snapUpToGrid(value: number, pitch: number): number {
  return Math.ceil(value / pitch - 1e-9) * pitch;
}

/** Distance to the nearest grid multiple. */
export function gridError(value: number, pitch: number): number {
  const r = value / pitch;
  return Math.abs(r - Math.round(r)) * pitch;
}

export function isFlapRetention(r: RetentionStyle): boolean {
  return r === 'flap_velcro' || r === 'flap_snap' || r === 'flap_fastex';
}

export function resolveMagPouch(inputs: MagPouchInputs): ResolvedMagPouch {
  const { dims: magIn, platform } = resolveMagazine(inputs);
  const construction = inputs.construction ?? DEFAULT_CONSTRUCTION;
  const cellCount = inputs.cell_count ?? DEFAULT_CELL_COUNT;
  const easeWidthIn = inputs.ease_width ?? DEFAULT_EASE_WIDTH_IN;
  const easeDepthIn = inputs.ease_depth ?? DEFAULT_EASE_DEPTH_IN;
  const coverage = inputs.exposed_percentage ?? DEFAULT_EXPOSED_PERCENTAGE;
  const isPalsMount = inputs.attachment === 'pals' || inputs.attachment === 'molle';

  // ── Cell span: the grid, not the magazine, sizes a PALS-mounted cell ──────
  const nominalSpanIn = platform === 'rifle_308' ? R308_CELL_SPAN_IN : magIn.width + easeWidthIn;
  let cellSpanIn: number;
  let spanSnappedToGrid = false;
  if (inputs.cell_span !== undefined) {
    cellSpanIn = inputs.cell_span;
  } else if (isPalsMount) {
    cellSpanIn = snapUpToGrid(nominalSpanIn, PALS_PITCH_IN);
    spanSnappedToGrid = cellSpanIn > nominalSpanIn + 1e-9;
  } else {
    cellSpanIn = nominalSpanIn;
  }
  const gridErrorIn = gridError(cellSpanIn, PALS_PITCH_IN);
  const palsColumns = Math.max(1, Math.round((cellSpanIn * cellCount) / PALS_PITCH_IN));

  // ── Face fabric per cell (pleated card) ──────────────────────────────────
  const facePerCellIn = inputs.face_per_cell ?? magIn.width + 2 * magIn.thickness + DEFAULT_FACE_EASE_IN;
  const puckerPerSideIn = (facePerCellIn - cellSpanIn) / 2;

  // ── Heights ───────────────────────────────────────────────────────────────
  const pouchHeightIn = magIn.height * coverage;
  const exposedHeightIn = magIn.height - pouchHeightIn;
  const cellDepthIn = magIn.thickness + easeDepthIn;

  // ── Lid ───────────────────────────────────────────────────────────────────
  const hasFlap = isFlapRetention(inputs.retention);
  const closureOverlapIn = inputs.closure_overlap ?? DEFAULT_CLOSURE_OVERLAP_IN;
  const hookLengthIn = inputs.hook_length ?? DEFAULT_HOOK_LENGTH_IN;
  const loopLengthIn = inputs.loop_length ?? DEFAULT_LOOP_LENGTH_IN;
  // A lid wrapping an object that stands proud climbs the exposed height behind it,
  // crosses the top, comes back DOWN the exposed height to the mouth, then overlaps
  // the face. (The 3D fold preview caught the missing second exposed height.)
  // One-piece lid: the tip folds back on itself to form the pull channel, so the
  // channel depth is cut on top of the wrap + purchase (rigs/subgun-lid-pull-channel.md).
  const pullChannelDepthIn = hasFlap
    ? (inputs.pull_channel_depth ?? (inputs.retention === 'flap_velcro' ? DEFAULT_PULL_CHANNEL_DEPTH_IN : 0))
    : 0;
  const flapLengthIn = hasFlap
    ? (inputs.flap_length ?? 2 * exposedHeightIn + cellDepthIn + closureOverlapIn + pullChannelDepthIn)
    : 0;
  const hourglassInsetIn = inputs.hourglass_aesthetic ? HOURGLASS_INSET_IN : 0;

  // ── Card-only knobs ───────────────────────────────────────────────────────
  const backHemIn = inputs.back_hem ?? DEFAULT_BACK_HEM_IN;
  const faceEndHemIn = inputs.face_end_hem ?? DEFAULT_FACE_END_HEM_IN;
  const akFaceHem = inputs.ak_face_hem ?? platform === 'ak';
  const bottomStyle = inputs.bottom_style ?? DEFAULT_BOTTOM_STYLE;
  const facePals = construction === 'pleated_card' && ((inputs.face_pals ?? true) || inputs.retention === 'open_top_bungee');
  const interiorLoop =
    construction === 'pleated_card'
      ? (inputs.interior_loop ?? true) || inputs.retention === 'velcro_dot' || inputs.retention === 'kydex_wedge'
      : inputs.retention === 'velcro_dot' || inputs.retention === 'kydex_wedge';

  return {
    construction,
    platform,
    magIn,
    retention: inputs.retention,
    hasFlap,
    isPalsMount,
    cellCount,
    cellSpanIn,
    nominalSpanIn,
    spanSnappedToGrid,
    gridErrorIn,
    palsColumns,
    facePerCellIn,
    puckerPerSideIn,
    coverage,
    pouchHeightIn,
    exposedHeightIn,
    easeWidthIn,
    easeDepthIn,
    cellDepthIn,
    flapLengthIn,
    pullChannelDepthIn,
    hourglassInsetIn,
    hookLengthIn,
    loopLengthIn,
    closureOverlapIn,
    backHemIn,
    faceEndHemIn,
    akFaceHem,
    bottomStyle,
    facePals,
    interiorLoop,
    seamAllowanceIn: inputs.seamAllowance ?? DEFAULT_SEAM_ALLOWANCE_IN,
  };
}

/** AK face hem in inches, or 0. */
export function akFaceHemIn(r: ResolvedMagPouch): number {
  return r.akFaceHem ? AK_FACE_HEM_IN : 0;
}
