/**
 * Tactical Organizer (pen and notebook) — types.
 *
 * SOE's pen/notebook organizer: a body panel folded in half at the bottom
 * (hemmed both ends, hook Velcro on the back half), an oversized front pocket
 * panel whose side folds become shallow bellows, pen-slot dividers, sides
 * closed last (vault bags/soe-tactical-organizer.md,
 * construction-hem-mark-at-double.md, construction-bellows-side-fold-math.md,
 * velcro-partial-coverage.md, construction-side-folds-before-top-bottom.md).
 *
 * All lengths the user types are in the display unit; `resolveInputs`
 * normalises to millimetres. Convention B: cut sizes include the hems.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';

export interface OrganizerInputs {
  units?: 'mm' | 'in';
  /** Finished pouch width, display units. Default 5". */
  pouch_width?: number;
  /** Finished pocket height (the folded body), display units. Default 5" — a 3 × 5 bottoms out flush. */
  pocket_height?: number;
  /** Single-fold hem at each body end, display units. Default 1" (mark at 2"). */
  body_hem?: number;
  /** Front panel top hem, display units. Default 1/4" as sewn on camera; production 1/2". */
  panel_hem?: number;
  /** Production mode forces every hand-folded hem to at least 1/2" (the mark-at-double rule's floor). Default false. */
  production_mode?: boolean;
  /** Side seam allowance when closing the sides, display units. Default 1/4". Trades one for one against bellows depth. */
  side_seam_allowance?: number;
  /** Side fold marked in from each front-panel edge, display units. Default 1" — a starting point, not a spec. */
  side_fold?: number;
  /** How much wider than the body the front panel is cut in total, display units. Default 1 1/4" (6 1/4" on a 5" body). */
  panel_extra_width?: number;
  /** Pen slot widths from one side seam, display units; the remainder is the wide pocket. Default [1 1/4", 1 1/4"]. */
  slot_widths?: number[];
  /** Hook strips on the back (split, not one field). Default 2. */
  velcro_strip_count?: number;
  /** Strip width, display units. Default 1 1/2". */
  velcro_strip_width?: number;
  /** Strip length, display units. Default: the clear width (pouch width − 2 × side seam). */
  velcro_strip_length?: number;
  /** Gap between strips, display units. Default 1/2". */
  velcro_gap?: number;
  /** Opposing loop over part of the hook so it does not snag in a pocket. Default false. */
  loop_over_hook?: boolean;
  /** Loop patch on the wide pocket face for name tape. Default false. */
  name_tape_loop?: boolean;
  /** Two grommets for 550 cord. Default false. */
  grommets?: boolean;
  /** Bifold: body twice as long, two front panels. Default false. */
  bifold?: boolean;
  /** PALS webbing rows instead of Velcro on the back. Default false. */
  pals_back?: boolean;
  /** Contents height to check against the pocket (a 3 × 5 notebook is 5"), display units. Default 5". */
  contents_height?: number;
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  pouch_width: number;
  pocket_height: number;
  body_hem: number;
  panel_hem: number;
  production_mode: boolean;
  side_seam_allowance: number;
  side_fold: number;
  panel_extra_width: number;
  slot_widths: number[];
  velcro_strip_count: number;
  velcro_strip_width: number;
  velcro_strip_length: number;
  velcro_gap: number;
  loop_over_hook: boolean;
  name_tape_loop: boolean;
  grommets: boolean;
  bifold: boolean;
  pals_back: boolean;
  contents_height: number;
  // Derived
  body_cut_length: number;
  body_cut_width: number;
  panel_cut_width: number;
  panel_cut_height: number;
  /** Finished front panel height after its hem. */
  panel_finished_height: number;
  panel_flat_center: number;
  span_loss: number;
  bellows_depth: number;
  interior_width: number;
  wide_pocket_width: number;
  /** Divider positions from the side seam, mm. */
  divider_positions: number[];
  clear_width: number;
  clear_height: number;
  velcro_block_height: number;
  /** Strips run across the width (they do not fit vertically). */
  velcro_horizontal: boolean;
  /** Mark lines: double each hem. */
  body_hem_mark: number;
  panel_hem_mark: number;
}

export type WarningSeverity = 'error' | 'warning' | 'info';
export interface GeneratorWarning { id: string; severity: WarningSeverity; message: string; field?: string }
export interface BuildPatternError { field: string; message: string }
export type ValidationResult = { ok: true } | { ok: false; errors: BuildPatternError[] };
export interface HardwareItem { id: string; name: string; quantity: number; notes?: string }
export interface OrganizerBuildResult { pieces: Piece[]; steps: Step[]; warnings: GeneratorWarning[]; hardware: HardwareItem[]; resolved: ResolvedInputs }
export interface BomRow { id: string; description: string; quantity: number; unit: string; notes?: string }
