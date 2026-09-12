import type { PlateCarrierInputs, ResolvedInputs, ValidationResult, BuildPatternError, PlateCut } from './types.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import {
  DEFAULT_UNITS, PLATE_SIZES_MM, CUT_DEFAULTS, POCKET_EASE_MM, SHELL_OVERSIZE_MM, BINDING_WIDTH_MM, SEAM_ALLOWANCE_MM, COMFORT_FOAM_MM,
  POCKET_FLAP_MM, LOOP_FIELD_MM, LOOP_FIELD_Y_OFFSET_MM, STRAP_WIDTH_MM, PAD_LENGTH_MM, PAD_FOAM_MM, SHOULDER_STRAP_LENGTH_MM, STRAP_ADJUST_MM,
  CUMMERBUND_WIDTH_MM, TORSO_CIRCUMFERENCE_MM, CUMMERBUND_OVERLAP_MM, TORSO_LENGTH_MM, SIDE_PLATE_MM,
} from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';

/** Type/range guard run before the generator's own rules (hardening pass H1). */
const GUARD_SPEC: GuardSpec = {
  units: { kind: 'enum', allowed: ['mm', 'in'] },
  plate_preset: { kind: 'enum', allowed: ['8x10', '10x12', '11x14', 'custom'] },
  plate_width: { kind: 'length' },
  plate_height: { kind: 'length' },
  plate_cut: { kind: 'enum', allowed: ['sapi', 'shooter', 'swimmer'] },
  top_clip_length: { kind: 'length' },
  top_clip_angle: { kind: 'angle', max: 90 },
  pocket_ease: { kind: 'length' },
  shell_oversize: { kind: 'length' },
  shell_material: { kind: 'enum', allowed: ['500d', '1000d', 'laminate'] },
  edge_finish: { kind: 'enum', allowed: ['bound', 'turned'] },
  binding_width: { kind: 'length' },
  seam_allowance: { kind: 'length' },
  back_comfort: { kind: 'enum', allowed: ['mesh', 'foam_mesh', 'none'] },
  comfort_foam_thickness: { kind: 'length' },
  pocket_opening: { kind: 'enum', allowed: ['top', 'bottom'] },
  pocket_flap_length: { kind: 'length' },
  front_field: { kind: 'enum', allowed: ['loop', 'pals_sewn', 'pals_laser', 'split'] },
  loop_field_width: { kind: 'length' },
  loop_field_height: { kind: 'length' },
  loop_field_y_offset: { kind: 'number', min: -5000, max: 5000 },
  back_field: { kind: 'enum', allowed: ['pals_sewn', 'pals_laser', 'loop', 'none'] },
  shoulder_style: { kind: 'enum', allowed: ['padded', 'webbing'] },
  strap_width: { kind: 'length' },
  pad_length: { kind: 'length' },
  pad_foam_thickness: { kind: 'length' },
  shoulder_strap_length: { kind: 'length' },
  strap_adjust_range: { kind: 'length' },
  cummerbund_style: { kind: 'enum', allowed: ['elastic', 'skeletal', 'none'] },
  cummerbund_width: { kind: 'length' },
  torso_circumference: { kind: 'length' },
  cummerbund_overlap: { kind: 'length' },
  side_plate: { kind: 'enum', allowed: ['none', '6x6', '6x8'] },
  qr_buckle: { kind: 'enum', allowed: ['none', 'roc', 'tubes', 'g_hook'] },
  torso_length: { kind: 'length' },
};

const IN = 25.4;
export function toMm(v: number, units: 'mm' | 'in'): number { return units === 'in' ? v * IN : v; }

/**
 * Plate-cut outline, flat, y down, width W × height H. SAPI/shooter clip the top corners with a
 * chord `clip` at `angle` from the horizontal; the swimmer tapers the whole upper side inward from
 * `clip` down the side at `angle` from the vertical (plate-cut-*.md). Bottom corners square.
 */
export function plateOutline(W: number, H: number, cut: PlateCut, clip: number, angleDeg: number): Point[] {
  const a = (angleDeg * Math.PI) / 180;
  let dx: number, dy: number;
  if (cut === 'swimmer') { dy = Math.min(clip, H * 0.6); dx = dy * Math.tan(a); }
  else { dx = clip * Math.cos(a); dy = clip * Math.sin(a); }
  dx = Math.min(dx, W / 2 - 6);
  return [{ x: dx, y: 0 }, { x: W - dx, y: 0 }, { x: W, y: dy }, { x: W, y: H }, { x: 0, y: H }, { x: 0, y: dy }];
}

export function resolveInputs(inputs: PlateCarrierInputs): ResolvedInputs {
  inputs = stripNulls(inputs);
  const units = inputs.units ?? DEFAULT_UNITS;
  const d = (v: number | undefined, fallbackMm: number) => (v === undefined || v === null || Number.isNaN(v) ? fallbackMm : toMm(v, units));
  const mock: string[] = [];
  /**
   * A vault-open number: report it as mock-derived while it is still the shipped
   * guess, not merely while the field is empty. The default project now fills
   * these in so the panel opens with numbers instead of blank boxes, and keying
   * the caveat on "unset" would have silently dropped it the moment it did.
   */
  const mockD = (field: keyof PlateCarrierInputs, fallbackMm: number) => {
    const v = inputs[field] as number | undefined;
    if (v === undefined || v === null || Number.isNaN(v)) { mock.push(field); return fallbackMm; }
    const mm = toMm(v, units);
    if (Math.abs(mm - fallbackMm) < 1e-6) mock.push(field);
    return mm;
  };
  const plate_preset = inputs.plate_preset ?? '10x12';
  const plate_cut = inputs.plate_cut ?? 'sapi';
  // An unrecognised preset falls back to 10 x 12 rather than destructuring undefined.
  const presetDims = PLATE_SIZES_MM[plate_preset as keyof typeof PLATE_SIZES_MM] ?? PLATE_SIZES_MM['10x12'];
  const [pw, ph] = plate_preset === 'custom'
    ? [d(inputs.plate_width, PLATE_SIZES_MM['10x12'][0]), d(inputs.plate_height, PLATE_SIZES_MM['10x12'][1])]
    : presetDims;
  const cutDef = CUT_DEFAULTS[plate_cut as keyof typeof CUT_DEFAULTS] ?? CUT_DEFAULTS.sapi;
  const top_clip_length = d(inputs.top_clip_length, cutDef.clip);
  const top_clip_angle = inputs.top_clip_angle ?? cutDef.angle;
  const pocket_ease = d(inputs.pocket_ease, POCKET_EASE_MM);
  const shell_oversize = d(inputs.shell_oversize, SHELL_OVERSIZE_MM);
  const edge_finish = inputs.edge_finish ?? 'bound';
  const seam_allowance = d(inputs.seam_allowance, SEAM_ALLOWANCE_MM);
  const pocket_width = pw + 2 * pocket_ease;
  const pocket_height = ph + 2 * pocket_ease;
  const panel_width = pocket_width + 2 * shell_oversize;
  const panel_height = pocket_height + 2 * shell_oversize;
  const strap_width = d(inputs.strap_width, STRAP_WIDTH_MM);
  const cummerbund_style = inputs.cummerbund_style ?? 'elastic';
  const torso_circumference = d(inputs.torso_circumference, TORSO_CIRCUMFERENCE_MM);
  const cummerbund_overlap = d(inputs.cummerbund_overlap, CUMMERBUND_OVERLAP_MM);
  const cummerbund_free_girth = torso_circumference - 2 * panel_width;
  // An unknown side-plate size (hand-edited file, stale project) must fall back
  // rather than destructure `undefined`: resolve runs before validation on the page.
  const side_plate = (inputs.side_plate !== undefined && inputs.side_plate in SIDE_PLATE_MM ? inputs.side_plate : 'none') as keyof typeof SIDE_PLATE_MM | 'none';
  const [spw, sph] = side_plate === 'none' ? [0, 0] : SIDE_PLATE_MM[side_plate];
  const front_field = inputs.front_field ?? 'loop';
  const perimeter = (W: number, H: number, dx: number) => 2 * H + 2 * W - 2 * dx * 0.6; // clips shorten the top a little
  const clipDx = Math.min(plate_cut === 'swimmer' ? Math.min(top_clip_length, ph * 0.6) * Math.tan((top_clip_angle * Math.PI) / 180) : top_clip_length * Math.cos((top_clip_angle * Math.PI) / 180), pw / 2 - 6);
  const shoulder_style = inputs.shoulder_style ?? 'padded';
  const pad_length = mockD('pad_length', PAD_LENGTH_MM);
  const cummerbund_width = d(inputs.cummerbund_width, CUMMERBUND_WIDTH_MM);
  const r: ResolvedInputs = {
    units,
    plate_preset,
    plate_width: pw,
    plate_height: ph,
    plate_cut,
    top_clip_length,
    top_clip_angle,
    pocket_ease,
    shell_oversize,
    shell_material: inputs.shell_material ?? '500d',
    edge_finish,
    binding_width: d(inputs.binding_width, BINDING_WIDTH_MM),
    seam_allowance,
    back_comfort: inputs.back_comfort ?? 'mesh',
    // Foam thickness is millimetres whatever the display unit, as it is on the
    // sling and the LBV, and as the panel's "(mm)" label already promises. Running
    // it through d() meant a 6 typed into a box labelled mm resolved to 152.4 mm.
    comfort_foam_thickness: inputs.comfort_foam_thickness ?? COMFORT_FOAM_MM,
    pocket_opening: inputs.pocket_opening ?? 'top',
    pocket_flap_length: d(inputs.pocket_flap_length, POCKET_FLAP_MM),
    front_field,
    loop_field_width: d(inputs.loop_field_width, LOOP_FIELD_MM[0]),
    loop_field_height: d(inputs.loop_field_height, LOOP_FIELD_MM[1]),
    loop_field_y_offset: d(inputs.loop_field_y_offset, LOOP_FIELD_Y_OFFSET_MM),
    back_field: inputs.back_field ?? 'pals_sewn',
    shoulder_style,
    strap_width,
    pad_length,
    pad_foam_thickness: inputs.pad_foam_thickness ?? PAD_FOAM_MM,
    shoulder_strap_length: mockD('shoulder_strap_length', SHOULDER_STRAP_LENGTH_MM),
    strap_adjust_range: d(inputs.strap_adjust_range, STRAP_ADJUST_MM),
    cummerbund_style,
    cummerbund_width,
    torso_circumference: mockD('torso_circumference', TORSO_CIRCUMFERENCE_MM),
    cummerbund_overlap,
    side_plate,
    qr_buckle: inputs.qr_buckle ?? 'none',
    torso_length: mockD('torso_length', TORSO_LENGTH_MM),
    pocket_width,
    pocket_height,
    panel_width,
    panel_height,
    plate_outline: plateOutline(pw, ph, plate_cut, top_clip_length, top_clip_angle),
    pocket_outline: plateOutline(pocket_width, pocket_height, plate_cut, top_clip_length, top_clip_angle),
    panel_outline: plateOutline(panel_width, panel_height, plate_cut, top_clip_length, top_clip_angle),
    cummerbund_length: cummerbund_style === 'none' ? 0 : cummerbund_free_girth / 2 + 2 * cummerbund_overlap,
    cummerbund_free_girth,
    side_plate_width: spw,
    side_plate_height: sph,
    binding_length: edge_finish === 'bound' ? 2 * perimeter(panel_width, panel_height, clipDx) + (cummerbund_style !== 'none' ? 2 * (2 * (cummerbund_free_girth / 2 + 2 * cummerbund_overlap) + 2 * cummerbund_width) : 0) + (shoulder_style === 'padded' ? 2 * (2 * pad_length + 2 * strap_width) : 0) : 0,
    mock_derived: mock,
  };
  return r;
}

export function validateInputs(inputs: PlateCarrierInputs): ValidationResult {
  inputs = stripNulls(inputs);
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  if (guard.length) return { ok: false, errors: guard };
  const errors: BuildPatternError[] = [];
  const r = resolveInputs(inputs);
  const pos = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be a positive number` }); };
  const nonNeg = (field: keyof ResolvedInputs, label: string) => { const v = r[field] as number; if (!Number.isFinite(v) || v < 0) errors.push({ field, message: `${label} must be 0 or greater` }); };
  pos('plate_width', 'Plate width');
  pos('plate_height', 'Plate height');
  nonNeg('top_clip_length', 'Corner clip length');
  if (!Number.isFinite(r.top_clip_angle) || r.top_clip_angle < 0 || r.top_clip_angle > 70) errors.push({ field: 'top_clip_angle', message: 'Clip angle must be between 0° and 70°' });
  nonNeg('pocket_ease', 'Pocket ease');
  nonNeg('shell_oversize', 'Shell oversize');
  nonNeg('seam_allowance', 'Seam allowance');
  pos('binding_width', 'Binding width');
  pos('strap_width', 'Strap width');
  pos('pad_length', 'Pad length');
  pos('shoulder_strap_length', 'Shoulder strap length');
  nonNeg('strap_adjust_range', 'Strap adjustment');
  pos('torso_length', 'Torso length');
  if (r.pocket_ease < 0.25 * IN - 1e-6) errors.push({ field: 'pocket_ease', message: 'Pocket ease under 1/4" per side will not take the plate thickness wrap (vault: 0.25–0.5")' });
  if (r.top_clip_length * Math.cos((r.top_clip_angle * Math.PI) / 180) * 2 >= r.plate_width - 12 && r.plate_cut !== 'swimmer') errors.push({ field: 'top_clip_length', message: 'The corner clips meet: no flat top left on the plate' });
  if (r.front_field === 'loop' || r.front_field === 'split') {
    pos('loop_field_width', 'Loop field width');
    pos('loop_field_height', 'Loop field height');
    nonNeg('loop_field_y_offset', 'Loop field offset');
    if (r.loop_field_width > r.pocket_width - 2 * r.binding_width / 2) errors.push({ field: 'loop_field_width', message: `Loop field ${(r.loop_field_width / IN).toFixed(1)}" is wider than the ${((r.pocket_width - r.binding_width) / IN).toFixed(1)}" the front face leaves inside the binding` });
    if (r.loop_field_y_offset + r.loop_field_height > r.pocket_height) errors.push({ field: 'loop_field_height', message: 'Loop field runs off the bottom of the front face' });
  }
  if (r.cummerbund_style !== 'none') {
    pos('cummerbund_width', 'Cummerbund width');
    pos('torso_circumference', 'Torso circumference');
    nonNeg('cummerbund_overlap', 'Cummerbund overlap');
    if (r.cummerbund_free_girth <= 0) errors.push({ field: 'torso_circumference', message: `Torso circumference ${(r.torso_circumference / IN).toFixed(1)}" is less than the two ${(r.panel_width / IN).toFixed(1)}" panels: nothing left for a cummerbund` });
    if (r.cummerbund_overlap * 4 > r.cummerbund_free_girth) errors.push({ field: 'cummerbund_overlap', message: 'Overlap is more than the whole free girth' });
  }
  if (r.side_plate !== 'none' && r.cummerbund_style === 'none') errors.push({ field: 'side_plate', message: 'Side plate pockets need a cummerbund to live in' });
  return errors.length ? { ok: false, errors } : { ok: true };
}
