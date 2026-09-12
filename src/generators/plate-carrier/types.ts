/**
 * Plate Carrier — types.
 *
 * Front and back panel envelopes sized from the plate cut, a plate pocket
 * with a hook-and-loop flap, a front loop field or PALS field, shoulder
 * straps from the strap engine, a cummerbund (elastic or skeletal) with
 * optional side plate pockets, bound edges.
 *
 * Vault: plate-carriers/plate-sizes-standard.md, plate-cut-{sapi,shooter,swimmer}.md,
 * plate-size-fit-mapping.md, panel-front-back-construction.md, panel-shoulder-strap.md,
 * panel-loop-velcro-field.md, cummerbund-*.md, construction-binding-edge.md,
 * construction-bartack-reinforcement.md, material-*.md. These notes are reference
 * grade (no reconciled build): every number that is not a plate size or a PALS
 * spec is an input carrying a mock-derived warning.
 *
 * Seam allowance: Convention A. Pieces are drawn at finished size; a bound edge
 * carries an explicit 0 (binding adds no allowance), a turned edge carries SA.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';

export type PlatePreset = '8x10' | '10x12' | '11x14' | 'custom';
export type PlateCut = 'sapi' | 'shooter' | 'swimmer';
export type ShellMaterial = '500d' | '1000d' | 'laminate';
export type EdgeFinish = 'bound' | 'turned';
export type FrontField = 'loop' | 'pals_sewn' | 'pals_laser' | 'split';
export type BackField = 'pals_sewn' | 'pals_laser' | 'loop' | 'none';
export type PocketOpening = 'top' | 'bottom';
export type ShoulderStyle = 'padded' | 'webbing';
export type CummerbundStyle = 'elastic' | 'skeletal' | 'none';
export type SidePlate = 'none' | '6x6' | '6x8';
export type QrBuckle = 'none' | 'roc' | 'tubes' | 'g_hook';
export type BackComfort = 'mesh' | 'foam_mesh' | 'none';

export interface PlateCarrierInputs {
  units?: 'mm' | 'in';
  plate_preset?: PlatePreset;
  /** Custom plate nominal width / height, display units. */
  plate_width?: number;
  plate_height?: number;
  plate_cut?: PlateCut;
  /** Corner clip chord length (SAPI ≈ 2", shooter 2.5–3"), display units. Swimmer: taper start down the side. */
  top_clip_length?: number;
  /** Clip angle from the horizontal, degrees (SAPI 45, shooter 45–55; swimmer taper 20–30 from vertical). */
  top_clip_angle?: number;
  /** Pocket ease per side beyond the plate, display units. Vault: 0.25–0.5". Default 0.375". */
  pocket_ease?: number;
  /** Shell oversize past the pocket on every side for binding and edge reinforcement. Default 0.5". */
  shell_oversize?: number;
  shell_material?: ShellMaterial;
  edge_finish?: EdgeFinish;
  /** Binding tape width, display units. Default 1". */
  binding_width?: number;
  /** Seam allowance for turned edges (and pocket-wall seams), display units. Default 3/8". Required by CLAUDE.md even when bound. */
  seam_allowance?: number;
  back_comfort?: BackComfort;
  /** Comfort foam thickness, mm-equivalent in display units. Default 6 mm. */
  comfort_foam_thickness?: number;
  pocket_opening?: PocketOpening;
  /** Pocket flap length past the opening, display units. Default 3". */
  pocket_flap_length?: number;
  front_field?: FrontField;
  loop_field_width?: number;
  loop_field_height?: number;
  /** Loop field top edge down from the top of the plate pocket. Default 1". */
  loop_field_y_offset?: number;
  back_field?: BackField;
  shoulder_style?: ShoulderStyle;
  /** Strap width, display units. Default 2". */
  strap_width?: number;
  /** Pad length over the trapezius, display units (6–10"). Default 8". */
  pad_length?: number;
  /** Pad foam thickness, display units. Default 6 mm. */
  pad_foam_thickness?: number;
  /** Finished strap length panel top to panel top, display units — Open in the vault. Default 16". */
  shoulder_strap_length?: number;
  /** Velcro-overlap adjustment, display units (2–4"). Default 3". */
  strap_adjust_range?: number;
  cummerbund_style?: CummerbundStyle;
  /** Cummerbund band width, display units (3 or 4"). Default 4". */
  cummerbund_width?: number;
  /** Wearer's torso circumference at the cummerbund, display units. Default 40". */
  torso_circumference?: number;
  /** Hook engagement into each panel's sleeve, display units. Default 2" (the ~2" that holds a placard). */
  cummerbund_overlap?: number;
  side_plate?: SidePlate;
  qr_buckle?: QrBuckle;
  /** Wearer's torso length (sternal notch to navel), display units — sets where the pocket rides. Default 17". */
  torso_length?: number;
}

export interface ResolvedInputs {
  units: 'mm' | 'in';
  plate_preset: PlatePreset;
  plate_width: number;
  plate_height: number;
  plate_cut: PlateCut;
  top_clip_length: number;
  top_clip_angle: number;
  pocket_ease: number;
  shell_oversize: number;
  shell_material: ShellMaterial;
  edge_finish: EdgeFinish;
  binding_width: number;
  seam_allowance: number;
  back_comfort: BackComfort;
  comfort_foam_thickness: number;
  pocket_opening: PocketOpening;
  pocket_flap_length: number;
  front_field: FrontField;
  loop_field_width: number;
  loop_field_height: number;
  loop_field_y_offset: number;
  back_field: BackField;
  shoulder_style: ShoulderStyle;
  strap_width: number;
  pad_length: number;
  pad_foam_thickness: number;
  shoulder_strap_length: number;
  strap_adjust_range: number;
  cummerbund_style: CummerbundStyle;
  cummerbund_width: number;
  torso_circumference: number;
  cummerbund_overlap: number;
  side_plate: SidePlate;
  qr_buckle: QrBuckle;
  torso_length: number;
  // Derived
  pocket_width: number;
  pocket_height: number;
  panel_width: number;
  panel_height: number;
  /** Plate, pocket and shell outlines (flat, y down, top clips at y = 0). */
  plate_outline: Point[];
  pocket_outline: Point[];
  panel_outline: Point[];
  /** Cummerbund cut length per side, mm (half the free girth + overlap). */
  cummerbund_length: number;
  /** Free girth the cummerbund spans: circumference − both panel widths. */
  cummerbund_free_girth: number;
  side_plate_width: number;
  side_plate_height: number;
  /** Binding tape total, mm. */
  binding_length: number;
  /** Which fields carry mock-derived defaults. */
  mock_derived: string[];
}

export type WarningSeverity = 'error' | 'warning' | 'info';
export interface GeneratorWarning { id: string; severity: WarningSeverity; message: string; field?: string }
export interface BuildPatternError { field: string; message: string }
export type ValidationResult = { ok: true } | { ok: false; errors: BuildPatternError[] };
export interface HardwareItem { id: string; name: string; quantity: number; notes?: string }
export interface PlateCarrierBuildResult { pieces: Piece[]; steps: Step[]; warnings: GeneratorWarning[]; hardware: HardwareItem[]; resolved: ResolvedInputs }
export interface BomRow { id: string; description: string; quantity: number; unit: string; notes?: string }
