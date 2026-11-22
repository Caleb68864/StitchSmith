/**
 * Top quilt (roadmap item 10c) — types.
 *
 * A tapered shell and liner held apart by chambers that run across the quilt
 * (baffled: mesh walls of the loft height; or sewn through both layers), a
 * fill weight per chamber from the chamber volume, fill power and overstuff,
 * and a footbox closed by sewing or a zipper.
 *
 * Sewn fabrics only (owner decision 2026-11-16). NO VAULT NUMBERS: every
 * length and every fill figure here is a placeholder listed in `PLACEHOLDERS`
 * with a `mock-derived` note until it is checked against the vault.
 *
 * Lengths the user types are in the display unit except `seam_allowance`,
 * which is millimetres like every other generator's. Fill power is the US
 * figure (in³/oz) whatever the display unit; fill weights come out in grams.
 *
 * Convention B: shell, liner and baffles are drawn at CUT size with the seam
 * allowance baked in, explicit 0 on every edge, the sew lines drawn.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { ChamberStyle, ChamberLayout } from '../../lib/pattern-engine/primitives/chambers.js';

export type QuiltConstruction = ChamberStyle;
export type QuiltFootbox = 'sewn' | 'zip';
export type QuiltKind = 'top_quilt' | 'underquilt';

export interface QuiltInputs {
  units?: 'mm' | 'in';
  /** A top quilt (default) or an underquilt hung under a hammock. */
  kind?: QuiltKind;
  /** Underquilt: the channel at each end for the shock-cord suspension, display units. Placeholder 3/4" — mock-derived. */
  end_channel?: number;
  /** Top quilt: a drawcord channel across the head (with a snap at the neck), or none (default). */
  neck?: 'none' | 'drawcord';
  /** Neck channel depth, display units. Placeholder 3/4" — mock-derived. */
  neck_channel?: number;
  /** Pad straps: elastic straps under the sleeping pad from loops on the quilt's edges. Default false. */
  pad_straps?: boolean;
  /** Sleeping pad width, display units. Placeholder 20" — mock-derived. */
  pad_width?: number;
  /** Cut each layer as two halves joined down the centre (for a quilt wider than the fabric). Default false. */
  join_widths?: boolean;
  /** Baffled only: a mesh side baffle down each long edge, so the loft runs to the edge (default false). */
  side_baffles?: boolean;
  /** Baffled chambers (default) or sewn through both layers. */
  construction?: QuiltConstruction;
  /** Footbox sewn closed (default) or closed with a zipper. */
  footbox?: QuiltFootbox;
  /** Finished length, head to foot, display units. Placeholder 78" — mock-derived. */
  length?: number;
  /** Finished width at the head (shoulders), display units. Placeholder 54" — mock-derived. */
  shoulder_width?: number;
  /** Finished width at the foot, display units. Placeholder 40" — mock-derived. */
  foot_width?: number;
  /** Footbox length up from the foot, display units. Placeholder 20" — mock-derived. */
  footbox_length?: number;
  /** Usable fabric width (shell and liner), display units. Placeholder 58" — mock-derived. */
  fabric_width?: number;
  /** Target loft (baffle height, or the sewn-through peak), display units. Placeholder 2" — mock-derived. */
  loft?: number;
  /** Largest chamber pitch along the length, display units. Placeholder 6" — mock-derived. */
  baffle_spacing?: number;
  /** Shell cut wider than the liner, percent of the width (baffled only). Placeholder 3 % — mock-derived. */
  shell_differential?: number;
  /** US fill power, in³/oz. Placeholder 850 — mock-derived. */
  fill_power?: number;
  /** Overstuff, percent over the chamber volume. Placeholder 10 % — mock-derived. */
  overstuff?: number;
  /** Seam allowance, mm, on the perimeter seam and both baffle edges. Placeholder 12.7 mm — mock-derived. */
  seam_allowance?: number;
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  kind: QuiltKind;
  construction: QuiltConstruction;
  footbox: QuiltFootbox;
  /** Underquilt end channel depth (0 on a top quilt) and the fabric it takes past each finished end. */
  end_channel: number;
  end_allowance: number;
  /** Which layer the differential widens: the shell on a top quilt, the liner (the inner layer, toward the hammock) on an underquilt. */
  wider_layer: 'shell' | 'liner';
  neck: 'none' | 'drawcord';
  pad_straps: boolean;
  pad_width: number;
  side_baffles: boolean;
  join_widths: boolean;
  /** The widest piece of shell or liner fabric across the roll (a half when joined). */
  piece_cut_width: number;
  /** Rolled channel at each end (0 for none): an underquilt's suspension, or a top quilt's neck drawcord at the head. */
  head_channel: number;
  foot_channel: number;
  /** Fabric past the finished head and foot: the channel's allowance, or the seam allowance. */
  head_allowance: number;
  foot_allowance: number;
  length: number;
  shoulder_width: number;
  foot_width: number;
  footbox_length: number;
  fabric_width: number;
  loft: number;
  baffle_spacing: number;
  /** Percent; 0 on a sewn-through quilt. */
  shell_differential: number;
  fill_power: number;
  overstuff: number;
  seam_allowance: number;
  // Derived
  /** Chamber walls, volumes and fill, or null when the inputs cannot lay them out. */
  chambers: ChamberLayout | null;
  total_fill_g: number;
  /** Zipper length for a zipped footbox (foot end folded in half + the side), else 0. */
  zipper_length: number;
  /** Cut sizes (bounding boxes of the cut outlines). */
  liner_cut_width: number;
  shell_cut_width: number;
  cut_length: number;
  /** Shell and liner off one roll, end to end. */
  fabric_length: number;
}

export type WarningSeverity = 'error' | 'warning' | 'info';
export interface GeneratorWarning { id: string; severity: WarningSeverity; message: string; field?: string }
export interface BuildPatternError { field: string; message: string }
export type ValidationResult = { ok: true } | { ok: false; errors: BuildPatternError[] };
export interface HardwareItem { id: string; name: string; quantity: number; notes?: string }
export interface QuiltBuildResult { pieces: Piece[]; steps: Step[]; warnings: GeneratorWarning[]; hardware: HardwareItem[]; resolved: ResolvedInputs }
export interface BomRow { id: string; description: string; quantity: number; unit: string; notes?: string }
