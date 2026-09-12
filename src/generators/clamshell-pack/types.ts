/**
 * Clamshell Pack (SOE fat medpack / tool pod) — types.
 *
 * A front-panel-loading clamshell: a continuous zipper frame hoop (top and
 * both sides, dipping under the bottom corners) split into a base gusset and
 * a lid strip by the zipper, a bottom strip that closes the hoop last with the
 * alligator mouth, and front (face) and back panels sewn on last. PALS on the
 * sides, face and bottom; a bowed top handle; compression straps; slick
 * removable shoulder straps on 2" webbing tabs; loop Velcro walls inside.
 *
 * Vault: packs/medpack-overview.md, medpack-body-panels.md,
 * medpack-zipper-lip-math.md, medpack-technique-alligator-mouth.md,
 * toolpod-zipper-frame-construction.md, toolpod-pack-build.md,
 * medpack-handle-construction.md, medpack-compression-straps.md,
 * medpack-technique-fabricated-pals.md, medpack-technique-pals-spacing.md,
 * medpack-pouch-system.md, toolpod-shoulder-strap-provision.md,
 * medpack-shoulder-harness.md, reference/technique-stitch-shrinkage.md.
 *
 * Convention A: panels and strips are drawn at finished size and carry
 * per-edge `seamAllowances`; the zipper lip and the bottom fold-ins are
 * hem-style fold regions drawn on the piece (fold-role lines).
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { PalsStyle } from '../../lib/pattern-engine/primitives/palsField.js';

export type PocketGrid = 'custom' | '2x2' | '3x3';
export type StrapProvision = 'none' | 'tabs' | 'tabs_and_stow';
export type { PalsStyle };

export interface ClamshellPackInputs {
  units?: 'mm' | 'in';
  /** Mesh pocket grid drives the footprint (2×2 ⇒ 11 × 16, 3×3 ⇒ 15 × 24); custom uses width/height. */
  pocket_grid?: PocketGrid;
  /** Footprint width, display units. Default 11". */
  width?: number;
  /** Footprint height, display units. Default 16". */
  height?: number;
  /** Total finished depth off the deck, display units. Default 6" (SOE's standard medpack is 3"). */
  depth?: number;
  /** Depth of the lid side of the zipper (the visible lip strip), display units. Default 1 1/2" — Inferred from the measured 2 1/2" lip piece. */
  lid_depth?: number;
  /** Split the frame equally front/back (tool pod) instead of a shallow lid. Default false. */
  equal_split?: boolean;
  /** Fabric consumed by folding the zipper lip, display units. Default 1" (measured, not the remembered 2"). */
  zipper_lip?: number;
  /** How far the zipper wraps under each bottom corner, display units. Default 1 3/4" — Inferred from the 8 1/2" bottom on an 11" bag. */
  zipper_underwrap?: number;
  /** Extra hoop length cut and trimmed at the bottom join, display units. Default 1/2". */
  hoop_overcut?: number;
  /** Seam allowance, display units. Default 1/2". */
  seam_allowance?: number;
  /** Fold-in at each end of the bottom strip (alligator mouth), display units. Default 1/2", marked at 1". */
  fold_in?: number;
  /** Clearance kept between the last PALS bartack and the zipper tape, display units. Default 0 (SOE sews to the tape). */
  zipper_clearance?: number;
  pals_style?: PalsStyle;
  /** PALS rows on each side run. Default 7. */
  pals_rows_side?: number;
  /** PALS rows on the face. Default 5. */
  pals_rows_face?: number;
  /** PALS rows on the bottom. Default 3. */
  pals_rows_bottom?: number;
  /** PALS columns across the side gusset. Default 3 (4 1/2"). */
  pals_cols_side?: number;
  /** PALS start this far off a panel edge, display units. Default 1". */
  edge_offset?: number;
  /** Bowed rigid top handle. Default true. */
  handle?: boolean;
  /** Handle bow rise allowance, display units. Default 2". */
  handle_bow?: number;
  /** Handle fold-under at each end, display units. Default 2". */
  handle_fold_under?: number;
  /** Compression straps per side. Default 2. */
  compression_straps_per_side?: number;
  /** Adjustment range + tail added to the depth for each compression strap, display units. Default 6" — Inferred from 12" straps on the 6" bag. */
  compression_extra?: number;
  /** Loop Velcro walls inside. Default true. */
  interior_loop?: boolean;
  /** Loop strip width, display units. Default 2". */
  loop_strip_width?: number;
  /** Gap between loop strips, display units. Default 1/2". */
  loop_gap?: number;
  /** Removable shoulder strap hardware: none, tabs only (provision), or tabs plus the stow pocket. Default tabs_and_stow. */
  strap_provision?: StrapProvision;
  /** Spread between the two top strap tabs, display units. Default 4". */
  strap_tab_spacing?: number;
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  pocket_grid: PocketGrid;
  width: number;
  height: number;
  depth: number;
  lid_depth: number;
  equal_split: boolean;
  zipper_lip: number;
  zipper_underwrap: number;
  hoop_overcut: number;
  seam_allowance: number;
  fold_in: number;
  zipper_clearance: number;
  pals_style: PalsStyle;
  pals_rows_side: number;
  pals_rows_face: number;
  pals_rows_bottom: number;
  pals_cols_side: number;
  edge_offset: number;
  handle: boolean;
  handle_bow: number;
  handle_fold_under: number;
  compression_straps_per_side: number;
  compression_extra: number;
  interior_loop: boolean;
  loop_strip_width: number;
  loop_gap: number;
  strap_provision: StrapProvision;
  strap_tab_spacing: number;
  // Derived (mm)
  /** Gusset depth on the base side of the zipper. */
  base_depth: number;
  /** Finished hoop length: both sides, the top, and the two underwraps. */
  hoop_length: number;
  /** Hoop strips are cut this long and trimmed at the bottom join. */
  hoop_cut_length: number;
  /** Base gusset cut width: base depth + lip fold-over + seam allowance. */
  gusset_cut_width: number;
  lid_cut_width: number;
  /** Bottom strip: depth + 2 × fold-in wide; nominal length width − 2 × underwrap + 2 × fold-in — cut after the hoop. */
  bottom_cut_width: number;
  bottom_nominal_length: number;
  bottom_finished_length: number;
  /** PALS work area on a side run: height − edge offset − seam zone. */
  side_work_area: number;
  /** Depth available to the side PALS columns: base depth − zipper clearance. */
  side_pals_budget: number;
  face_pals_cols: number;
  handle_cut_length: number;
  handle_core_length: number;
  compression_strap_length: number;
  strap_tab_count: number;
  /** Loop strips per wall (back and face). */
  loop_strips_per_wall: number;
  loop_strip_cut_length: number;
}

export type WarningSeverity = 'error' | 'warning' | 'info';
export interface GeneratorWarning { id: string; severity: WarningSeverity; message: string; field?: string; tag?: 'mock-derived' }
export interface BuildPatternError { field: string; message: string }
export type ValidationResult = { ok: true } | { ok: false; errors: BuildPatternError[] };
export interface HardwareItem { id: string; name: string; quantity: number; notes?: string }
export interface ClamshellPackBuildResult { pieces: Piece[]; steps: Step[]; warnings: GeneratorWarning[]; hardware: HardwareItem[]; resolved: ResolvedInputs }
export interface BomRow { id: string; description: string; quantity: number; unit: string; notes?: string }
