/**
 * Padded Strap / H-Harness Generator — types.
 *
 * Two modes on one page:
 *   pack_pair — a mirrored pair of padded pack straps (tail derived from torso
 *               AND gusset depth, vault packs/medpack-shoulder-harness.md).
 *   h_harness — the SOE Slim Padded H: two pads joined by a slotted cross strap,
 *               1.5" webbing running the full pad length and out both ends to
 *               four side-release corners, hydration channels left unsewn
 *               (vault rigs/harness-h-geometry.md, rigs/harness-hydration-comms-routing.md).
 *
 * Lengths the user types (pad, torso, gusset, tail, cross-strap height, drop
 * legs, pad spread) are in the display unit; allowances, foam and webbing
 * widths are always millimetres. `resolveInputs` normalises everything to mm.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { StrapCurve, PadArchitecture, EdgeFinish, StrapHardware, StrapHardwareItem, PaddedStrapDerived } from '../../lib/strap-engine/index.js';

export type { StrapCurve, PadArchitecture, EdgeFinish, StrapHardware };

export type StrapMode = 'pack_pair' | 'h_harness';
export type RoutingSide = 'left' | 'right' | 'both' | 'none';

export interface PaddedStrapInputs {
  units?: 'mm' | 'in';
  mode?: StrapMode;
  /** Finished pad length, display units. */
  pad_length?: number;
  /** Finished pad width at the top, display units. */
  pad_width?: number;
  /** Closed-cell foam thickness, mm. 0 = none. */
  foam_thickness?: number;
  curve?: StrapCurve;
  architecture?: PadArchitecture;
  edge_finish?: EdgeFinish;
  /** Load-bearing webbing width, mm (25 / 38 / 50). */
  webbing_width?: number;
  hardware?: StrapHardware;
  /** Seam allowance for turned pads, mm. */
  seam_allowance?: number;
  /** pack_pair: bag height the strap spans, top anchor to lower anchor, display units. */
  torso_length?: number;
  /** pack_pair: gusset / bag depth the tail must wrap, display units. REQUIRED term of the tail. */
  gusset_depth?: number;
  /** Free tail webbing below the pad, display units. Overrides the derivation when set. */
  tail_length?: number;
  /** h_harness: pad top to the cross strap centre line, display units. Vault: Open — mock it. */
  cross_strap_height?: number;
  /** h_harness: gap between the pads' inner edges at the cross strap, display units. Vault: Open. */
  pad_spread?: number;
  /** h_harness: sewn-slot adjustment across the cross strap, mm. Vault: 8". */
  chest_adjust_range?: number;
  /** h_harness: pitch of the cut-to-fit slots on the cross strap, mm. */
  slot_pitch?: number;
  /** h_harness: webbing from each pad end to its corner buckle, display units. Vault: Open. */
  drop_leg_length?: number;
  /** h_harness: unsewn crossings on the back for the hydration carrier straps (≥ 2). */
  hydration_channels?: number;
  /** h_harness: 1" PALS rows on the pad face for routing (0–4). */
  front_pals_rows?: number;
  /** h_harness: which shoulder carries the routing PALS. */
  routing_side?: RoutingSide;
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  mode: StrapMode;
  pad_length: number;
  pad_width: number;
  foam_thickness: number;
  curve: StrapCurve;
  architecture: PadArchitecture;
  edge_finish: EdgeFinish;
  webbing_width: number;
  hardware: StrapHardware;
  seam_allowance: number;
  torso_length: number;
  gusset_depth: number;
  /** Free tail below the pad, mm — derived unless the user overrode it. */
  tail_length: number;
  tail_derived: boolean;
  cross_strap_height: number;
  pad_spread: number;
  chest_adjust_range: number;
  slot_pitch: number;
  drop_leg_length: number;
  hydration_channels: number;
  front_pals_rows: number;
  routing_side: RoutingSide;
  /** h_harness: cross strap cut length = pad overlap each side + spread + adjustment. */
  cross_strap_length: number;
  /** h_harness: number of sewn slots across the adjustment range. */
  slot_count: number;
}

export type WarningSeverity = 'error' | 'warning' | 'info';

export interface GeneratorWarning {
  id: string;
  severity: WarningSeverity;
  message: string;
  field?: string;
}

export interface BuildPatternError {
  field: string;
  message: string;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: BuildPatternError[] };

export interface PaddedStrapBuildResult {
  pieces: Piece[];
  steps: Step[];
  warnings: GeneratorWarning[];
  hardware: StrapHardwareItem[];
  derived: PaddedStrapDerived & { resolved: ResolvedInputs };
}

export interface BomRow {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  notes?: string;
}
