/**
 * Modular LBV — pattern builder.
 *
 * Convention A: panels at finished size; every edge-taped (bound) edge carries
 * an explicit 0 and the zipper edge of each pocket layer carries the seam
 * allowance. Strips (webbing, Velcro, foam) carry explicit 0 on every edge.
 * Vault order: face features onto flat panels → zipper → foam → close and
 * edge-tape → belt loops → shoulder set → verticals → front straps.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import { buildPalsField, PALS_COL_PITCH_MM, type PalsFieldResult } from '../../lib/pattern-engine/primitives/palsField.js';
import { buildPaddedStrap, webbingSizeLabel } from '../../lib/strap-engine/index.js';
import type { LbvInputs, LbvBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError, HardwareItem } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import * as D from './defaults.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };

export const FRONT_OUTER_ID = 'lbv-front-outer';
export const FRONT_INNER_ID = 'lbv-front-inner';
export const BACK_OUTER_ID = 'lbv-back-outer';
export const BACK_INNER_ID = 'lbv-back-inner';
export const PAD_ID = 'lbv-shoulder-pad';
export const VERTICAL_ID = 'lbv-vertical-strap';
export const CROSS_PIECE_ID = 'lbv-cross-piece';
export const DRAG_HANDLE_ID = 'lbv-drag-handle';
export const BELT_LOOP_ID = 'lbv-belt-loop';

const IN = 25.4;
const fmtIn = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');
const dim = (mm: number) => `${Math.round(mm)} mm (${fmtIn(mm)}")`;

function seg(eid: () => EdgeId, role: Edge['role'], sx: number, sy: number, ex: number, ey: number): Edge {
  return { kind: 'straight', id: eid(), role, start: { x: sx, y: sy }, end: { x: ex, y: ey } };
}
function rect(eid: () => EdgeId, id: string, w: number, h: number): Path {
  return { id, closed: true, edges: [seg(eid, 'cut', 0, 0, w, 0), seg(eid, 'cut', w, 0, w, h), seg(eid, 'cut', w, h, 0, h), seg(eid, 'cut', 0, h, 0, 0)] };
}
/** Bound edges 0; the bottom (zipper) edge takes the allowance when asked. */
function panelSa(path: Path, bottomSa: number): Record<EdgeId, number> {
  const o: Record<EdgeId, number> = {};
  // rect() edges: 0 top, 1 right, 2 bottom (w,h → 0,h), 3 left.
  path.edges.forEach((e, i) => { o[e.id] = i === 2 ? bottomSa : 0; });
  return o;
}
function zeroSa(path: Path): Record<EdgeId, number> { const o: Record<EdgeId, number> = {}; for (const e of path.edges) o[e.id] = 0; return o; }
function stitchRect(eid: () => EdgeId, id: string, x0: number, y0: number, x1: number, y1: number, label?: string): Path {
  return { id, closed: false, label, edges: [seg(eid, 'stitch', x0, y0, x1, y0), seg(eid, 'stitch', x1, y0, x1, y1), seg(eid, 'stitch', x1, y1, x0, y1), seg(eid, 'stitch', x0, y1, x0, y0)] };
}
/** Two stitch lines 1/4" apart: the redundancy doctrine at every load attachment. */
function doubleStitch(eid: () => EdgeId, id: string, x0: number, y0: number, x1: number, y1: number, label?: string): Path[] {
  const g = D.DOUBLE_STITCH_GAP_MM;
  return [stitchRect(eid, `${id}-a`, x0, y0, x1, y1, label), stitchRect(eid, `${id}-b`, x0 + g, y0 + g, x1 - g, y1 - g)];
}
function strip(id: string, name: string, w: number, h: number, quantity: number, materialId: string, label: string, mirror = false): Piece {
  const eid = makeEdgeIdGen(id);
  const outline = rect(eid, `${id}-outline`, w, h);
  return { id, name, mirror, quantity, materialId, paths: [outline], seamAllowances: zeroSa(outline), annotations: [{ kind: 'label', label }] };
}

interface FieldLayout { field: PalsFieldResult; top: number; bottom: number }

/** The face area the PALS field may occupy: below the top slot strip, above the zipper margin. */
function frontFieldArea(r: ResolvedInputs): { x: number; y: number; w: number; h: number } {
  const c = r.edge_tape_conceal;
  const top = c + r.row_width + (r.row_pitch - r.row_width); // top slot strip is the first row
  const bottom = r.panel_height - r.seam_allowance - 2 * IN;   // belt loop landings and zipper
  return { x: c, y: top, w: r.panel_width - 2 * c, h: Math.max(0, bottom - top) };
}

function buildFrontOuter(r: ResolvedInputs, eidRoot: string, layout: FieldLayout): Piece {
  const eid = makeEdgeIdGen(eidRoot);
  const W = r.panel_width, H = r.panel_height, c = r.edge_tape_conceal;
  const outline = rect(eid, `${FRONT_OUTER_ID}-outline`, W, H);
  const paths: Path[] = [outline];
  // Edge tape conceal line on the three bound edges.
  paths.push({ id: `${FRONT_OUTER_ID}-tape`, closed: false, label: `Edge tape covers ${fmtIn(c)}" — row ends stop here, raw`, edges: [seg(eid, 'notch', c, H, c, c), seg(eid, 'notch', c, c, W - c, c), seg(eid, 'notch', W - c, c, W - c, H)] });
  // Top Velcro'd slot strip: 1.5" webbing, bartacked into an oversized centre slot (PTT) and outer slots.
  const y0 = c, y1 = c + r.row_width;
  paths.push({ id: `${FRONT_OUTER_ID}-top-strip`, closed: false, label: `Top strip ${fmtIn(r.row_width)}" webbing, loop faced — oversized centre slot for a PTT clip, outer slots for malice clips`, edges: [seg(eid, 'stitch', c, y0, W - c, y0), seg(eid, 'stitch', W - c, y1, c, y1)] });
  for (const x of [c, W / 2 - 1.125 * IN, W / 2 + 1.125 * IN, W - c]) paths.push({ id: `${FRONT_OUTER_ID}-top-tack-${Math.round(x)}`, closed: false, edges: [seg(eid, 'stitch', x, y0, x, y1)] });
  // PALS field.
  paths.push(...layout.field.paths);
  // Vertical webbing at the mark from the OUTER edge (x = 0 on the drawn left panel), full height, 1" mouth open at the top.
  const vx0 = r.vertical_mark - r.vertical_width / 2, vx1 = r.vertical_mark + r.vertical_width / 2;
  paths.push({ id: `${FRONT_OUTER_ID}-vertical`, closed: false, label: `Vertical webbing at the ${fmtIn(r.vertical_mark)}" mark, ${fmtIn(r.vertical_width)}" wide — contiguous shoulder → panel → belt; tack–travel–tack leaves a ${fmtIn(D.CHANNEL_MOUTH_MM)}" mouth at the top for cables`, edges: [seg(eid, 'stitch', vx0, D.CHANNEL_MOUTH_MM + c, vx0, H - r.seam_allowance), seg(eid, 'stitch', vx1, D.CHANNEL_MOUTH_MM + c, vx1, H - r.seam_allowance)] });
  paths.push(...doubleStitch(eid, `${FRONT_OUTER_ID}-vertical-anchor`, vx0, D.CHANNEL_MOUTH_MM + c, vx1, D.CHANNEL_MOUTH_MM + c + 1.5 * IN, 'Tension lock anchor — two lines 1/4" apart, three at the ends'));
  // Front closure strap tabs on the INNER edge (x = W on the drawn left panel).
  r.front_strap_positions.forEach((pos, i) => {
    const y = H - pos;
    paths.push(...doubleStitch(eid, `${FRONT_OUTER_ID}-front-tab-${i}`, W - c - 1.5 * IN, y - 0.5 * IN, W - c, y + 0.5 * IN, i === 0 ? `Front strap tabs at ${r.front_strap_positions.map(fmtIn).join('", ')}" from the bottom — ${r.male_side === 'right' ? 'males on the wearer’s right, females left' : 'males on the wearer’s left'}; positions are mock-derived` : undefined));
  });
  // Side-to-back buckle tabs on the outer edge: 1" up and 9" on centre (the old LBV numbers).
  for (const [k, y] of [['bottom', H - 1 * IN], ['top', H - 9 * IN]] as const) {
    if (y > c + 2 * IN) paths.push(...doubleStitch(eid, `${FRONT_OUTER_ID}-side-tab-${k}`, c, y - 0.5 * IN, c + 1.5 * IN, y + 0.5 * IN, k === 'bottom' ? 'Side-to-back buckle tabs: 1" up from the bottom and 9" on centre, females panel-side, tab sewn short of the edge' : undefined));
  }
  // Belt loop landings above the zipper.
  for (let i = 0; i < r.loops_per_panel; i++) {
    const x = (W * (i + 1)) / (r.loops_per_panel + 1);
    paths.push(...doubleStitch(eid, `${FRONT_OUTER_ID}-loop-${i}`, x - 1 * IN, H - r.seam_allowance - 2 * IN, x + 1 * IN, H - r.seam_allowance - 0.25 * IN, i === 0 ? `${r.loops_per_panel} belt loop landings` : undefined));
  }
  // Zipper edge.
  paths.push({ id: `${FRONT_OUTER_ID}-zip`, closed: false, label: `Zipper along the bottom, pull DOWN — ${dim(r.front_zipper_len)}; allowance ${fmtIn(r.seam_allowance)}"`, edges: [seg(eid, 'stitch', 0, H - r.seam_allowance, W, H - r.seam_allowance)] });
  return {
    id: FRONT_OUTER_ID, name: 'Front panel, outer face (left drawn; cut one mirrored)', mirror: true, quantity: 2, materialId: 'cordura-500', paths, seamAllowances: panelSa(outline, r.seam_allowance),
    annotations: [
      { kind: 'grain', label: 'grain', point: { x: W / 2, y: H / 2 }, angle: 90 },
      { kind: 'label', label: `Front outer — ${dim(W)} × ${dim(H)} finished, edge taped; outer edge left, closure edge right`, point: { x: W / 2, y: H / 2 } },
    ],
  };
}

function buildFrontInner(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(FRONT_INNER_ID);
  const W = r.panel_width, H = r.panel_height;
  const outline = rect(eid, `${FRONT_INNER_ID}-outline`, W, H);
  return {
    id: FRONT_INNER_ID, name: 'Front panel, inner face', mirror: true, quantity: 2, materialId: 'cordura-500',
    paths: [outline, { id: `${FRONT_INNER_ID}-zip`, closed: false, label: 'Zipper edge', edges: [seg(eid, 'stitch', 0, H - r.seam_allowance, W, H - r.seam_allowance)] }],
    seamAllowances: panelSa(outline, r.seam_allowance),
    annotations: [{ kind: 'grain', label: 'grain', point: { x: W / 2, y: H / 2 }, angle: 90 }, { kind: 'label', label: `Front inner — ${dim(W)} × ${dim(H)}; single layer, trust the material`, point: { x: W / 2, y: H / 2 } }],
  };
}

function buildBackOuter(r: ResolvedInputs, field: PalsFieldResult): Piece {
  const eid = makeEdgeIdGen(BACK_OUTER_ID);
  const W = r.back_outer_width, H = r.back_outer_height, c = r.edge_tape_conceal;
  const outline = rect(eid, `${BACK_OUTER_ID}-outline`, W, H);
  const paths: Path[] = [outline, ...field.paths];
  paths.push({ id: `${BACK_OUTER_ID}-tape`, closed: false, label: `Edge tape covers ${fmtIn(c)}"; the ${fmtIn(r.back_bellow)}" bellows is NOT tacked down — keep the bulk`, edges: [seg(eid, 'notch', c, H, c, c), seg(eid, 'notch', c, c, W - c, c), seg(eid, 'notch', W - c, c, W - c, H)] });
  // Loop tape 1" off the bottom, matching the shoulder set straps.
  const ly1 = H - r.seam_allowance - D.BACK_LOOP_TAPE_OFFSET_MM, ly0 = ly1 - D.BACK_LOOP_TAPE_WIDTH_MM;
  paths.push({ id: `${BACK_OUTER_ID}-loop-tape`, closed: false, label: `Loop Velcro ${fmtIn(D.BACK_LOOP_TAPE_WIDTH_MM)}" wide, ${fmtIn(D.BACK_LOOP_TAPE_OFFSET_MM)}" off the bottom — lines up with the shoulder set straps`, edges: [seg(eid, 'stitch', c, ly0, W - c, ly0), seg(eid, 'stitch', W - c, ly1, c, ly1)] });
  // Vertical strap landings mid-panel on the outer column lines (the 4-column field dictates their spread).
  const xs = field.cols > 0 ? [field.colX[0], field.colX[field.cols]] : [W / 3, (2 * W) / 3];
  xs.forEach((x, i) => paths.push(...doubleStitch(eid, `${BACK_OUTER_ID}-vertical-${i}`, x - r.vertical_width / 2, c + D.CHANNEL_MOUTH_MM, x + r.vertical_width / 2, c + D.CHANNEL_MOUTH_MM + 2 * IN, i === 0 ? `Vertical straps land mid-panel on the outer column lines, ${fmtIn(xs[1] - xs[0])}" apart — they kick out to where they need to be` : undefined)));
  // Hydration webbing across the top with the 3.5" / 3" attachment pieces.
  const hx0 = W / 2 - r.hydration_webbing / 2;
  paths.push({ id: `${BACK_OUTER_ID}-hydration`, closed: false, label: `${fmtIn(r.hydration_webbing)}" hydration webbing across the top; 3.5" and 3" pieces for the buckle points`, edges: [seg(eid, 'stitch', hx0, c, hx0 + r.hydration_webbing, c), seg(eid, 'stitch', hx0 + r.hydration_webbing, c + 1 * IN, hx0, c + 1 * IN)] });
  for (let i = 0; i < r.loops_per_panel; i++) {
    const x = (W * (i + 1)) / (r.loops_per_panel + 1);
    paths.push(...doubleStitch(eid, `${BACK_OUTER_ID}-loop-${i}`, x - 1 * IN, H - r.seam_allowance - 2 * IN, x + 1 * IN, H - r.seam_allowance - 0.25 * IN));
  }
  paths.push({ id: `${BACK_OUTER_ID}-zip`, closed: false, label: `Zipper along the bottom, pull DOWN — ${dim(r.back_zipper_len)}`, edges: [seg(eid, 'stitch', 0, H - r.seam_allowance, W, H - r.seam_allowance)] });
  return {
    id: BACK_OUTER_ID, name: 'Back panel, outer face (bellowed)', mirror: false, quantity: 1, materialId: 'cordura-500', paths, seamAllowances: panelSa(outline, r.seam_allowance),
    annotations: [
      { kind: 'grain', label: 'grain', point: { x: W / 2, y: H / 2 }, angle: 90 },
      { kind: 'label', label: `Back outer — ${dim(W)} × ${dim(H)}: inner ${fmtIn(r.back_panel_width)} × ${fmtIn(r.back_panel_height)}" + ${fmtIn(r.back_bellow)}" bellows both axes`, point: { x: W / 2, y: H / 2 } },
    ],
  };
}

function buildBackInner(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(BACK_INNER_ID);
  const W = r.back_panel_width, H = r.back_panel_height;
  const outline = rect(eid, `${BACK_INNER_ID}-outline`, W, H);
  return {
    id: BACK_INNER_ID, name: 'Back panel, inner face', mirror: false, quantity: 1, materialId: 'cordura-500',
    paths: [outline, { id: `${BACK_INNER_ID}-zip`, closed: false, label: 'Zipper edge', edges: [seg(eid, 'stitch', 0, H - r.seam_allowance, W, H - r.seam_allowance)] }],
    seamAllowances: panelSa(outline, r.seam_allowance),
    annotations: [{ kind: 'grain', label: 'grain', point: { x: W / 2, y: H / 2 }, angle: 90 }, { kind: 'label', label: `Back inner — ${dim(W)} × ${dim(H)}`, point: { x: W / 2, y: H / 2 } }],
  };
}

function frontField(r: ResolvedInputs): FieldLayout {
  const a = frontFieldArea(r);
  const field = buildPalsField({ origin: { x: a.x, y: a.y }, width: a.w, height: a.h, rowWidth: r.row_width, rowPitch: r.row_pitch, colPitch: PALS_COL_PITCH_MM, edgeMargin: D.STRIP_END_MARGIN_MM, cols: r.front_cols, rows: r.rows_per_panel, idPrefix: `${FRONT_OUTER_ID}-pals`, eid: makeEdgeIdGen(`${FRONT_OUTER_ID}-pals`) });
  return { field, top: a.y, bottom: a.y + a.h };
}
function backField(r: ResolvedInputs): PalsFieldResult {
  const c = r.edge_tape_conceal;
  const top = c + 1.5 * IN, bottom = r.back_outer_height - r.seam_allowance - 3.5 * IN;
  return buildPalsField({ origin: { x: c, y: top }, width: r.back_outer_width - 2 * c, height: Math.max(0, bottom - top), rowWidth: r.row_width, rowPitch: r.row_pitch, colPitch: PALS_COL_PITCH_MM, edgeMargin: D.STRIP_END_MARGIN_MM, cols: r.back_cols, rows: r.rows_per_panel, idPrefix: `${BACK_OUTER_ID}-pals`, eid: makeEdgeIdGen(`${BACK_OUTER_ID}-pals`) });
}

function mockDerived(inputs: LbvInputs, r: ResolvedInputs): GeneratorWarning[] {
  const w: GeneratorWarning[] = [];
  const open = (field: keyof LbvInputs, what: string, value: string) => {
    if (inputs[field] === undefined) w.push({ id: `mock-derived-${field}`, severity: 'warning', field, message: `[mock-derived] ${what} defaults to ${value} — the vault never states it. Measure a real rig or scale video frames, then enter it.` });
  };
  open('panel_width', 'Front panel width', dim(r.panel_width));
  open('panel_height', 'Front panel height', dim(r.panel_height));
  open('back_panel_width', 'Back panel width', dim(r.back_panel_width));
  open('back_panel_height', 'Back panel height', dim(r.back_panel_height));
  open('back_bellow', 'Back bellows oversize', dim(r.back_bellow));
  open('row_pitch', 'PALS row pitch (only "middle row centred" is spoken)', dim(r.row_pitch));
  open('pad_length', 'Shoulder pad length', dim(r.pad_length));
  open('pad_width', 'Shoulder pad width', dim(r.pad_width));
  open('cross_piece_angle', 'Cross piece angle', `${r.cross_piece_angle}°`);
  open('pad_spread', 'Pad spread at the cross piece', dim(r.pad_spread));
  open('front_strap_positions', 'Front strap positions ("1 and 9… 6 1/2 so 3 1/4" does not reconcile)', r.front_strap_positions.map(fmtIn).join('", ') + '"');
  open('vertical_width', 'Vertical webbing width', dim(r.vertical_width));
  open('base_chest', 'Base chest size the vest fits at minimum', dim(r.base_chest));
  open('drag_handle_len', 'Drag handle cut', dim(r.drag_handle_len));
  return w;
}

export function buildPattern(inputs: LbvInputs): Result<LbvBuildResult> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  const r = resolveInputs(inputs);
  const layout = frontField(r);
  const back = backField(r);
  const warnings: GeneratorWarning[] = mockDerived(inputs, r);
  const hardware: HardwareItem[] = [];

  const pad = buildPaddedStrap({
    padLength_mm: r.pad_length, padWidth_mm: r.pad_width, foamThickness_mm: r.foam_thickness, curve: 'straight',
    architecture: 'webbing_tacked_ends', edgeFinish: 'bound', webbingWidth_mm: r.vertical_width,
    tailLength_mm: 150, topAnchorLength_mm: 150, seamAllowance_mm: r.seam_allowance, quantity: 2, hardware: 'ladderlock',
    idPrefix: 'lbv.pad.', pieceId: PAD_ID, name: 'Shoulder pad',
  });
  const padShell = pad.pieces.find((p) => p.id === PAD_ID);
  if (padShell) {
    const eid = makeEdgeIdGen(`${PAD_ID}-lbv`);
    padShell.paths.push(stitchRect(eid, `${PAD_ID}-tension-lock`, r.pad_width / 2 - r.vertical_width / 2, r.pad_length / 2 - 0.5 * IN, r.pad_width / 2 + r.vertical_width / 2, r.pad_length / 2 + 0.5 * IN, 'Tension locks sewn ON CENTRE — the panel verticals route through; move them outboard for +3"'));
    padShell.paths.push({ id: `${PAD_ID}-channel`, closed: false, label: 'Full-length channel — comm wires, flex cuffs', edges: [seg(eid, 'stitch', r.pad_width * 0.25, 0.5 * IN, r.pad_width * 0.25, r.pad_length - 0.5 * IN)] });
  }
  for (const m of pad.warnings) warnings.push({ id: `pad-${m.slice(0, 20)}`, severity: 'info', message: `Shoulder pad: ${m}` });

  const pieces: Piece[] = [
    buildFrontOuter(r, FRONT_OUTER_ID, layout),
    buildFrontInner(r),
    buildBackOuter(r, back),
    buildBackInner(r),
  ];
  if (r.foam_insert) {
    pieces.push(strip('lbv-foam-front', 'Foam sheet, front panel', r.front_foam_width, r.front_foam_height, 2, 'foam-closed-cell', `Cut oversize, trim with baby cuts to fit; ${r.foam_thickness} mm`));
    pieces.push(strip('lbv-foam-back', 'Foam sheet, back panel', r.back_foam_width, r.back_foam_height, 1, 'foam-closed-cell', 'Cut oversize, trim to fit; the bellows takes a second sheet'));
  }
  const rowsFront = layout.field.rows, rowsBack = back.rows;
  if (rowsFront > 0) pieces.push(strip('lbv-pals-row-front', 'PALS row, front panels', layout.field.webbing.lengthMm, r.row_width, rowsFront * 2, `webbing-${Math.round(r.row_width)}`, `Scuba webbing ${fmtIn(r.row_width)}" — ${r.front_cols} columns; strip cut ${fmtIn(r.front_strip_cut)}" (${fmtIn(layout.field.webbing.lengthMm)}" with the trim-after-sew overcut)`));
  if (rowsBack > 0) pieces.push(strip('lbv-pals-row-back', 'PALS row, back panel', back.webbing.lengthMm, r.row_width, rowsBack, `webbing-${Math.round(r.row_width)}`, `${r.back_cols} columns; the 6 1/2" pre-cut`));
  if (r.loop_velcro_face && rowsFront + rowsBack > 0) pieces.push(strip('lbv-row-loop', 'Loop Velcro on the row faces', Math.max(layout.field.webbing.lengthMm, back.webbing.lengthMm), r.row_width, rowsFront * 2 + rowsBack, 'velcro-loop', 'Loop on the face — it gets sewn through; hook eats thread'));
  pieces.push(strip('lbv-top-strip', 'Top slot strip', r.panel_width - 2 * r.edge_tape_conceal + 1 * IN, r.row_width, 2, `webbing-${Math.round(r.row_width)}`, 'Velcro faced, corners clipped with the hot knife'));
  pieces.push(strip(VERTICAL_ID, 'Vertical strap', r.vertical_strap_len, r.vertical_width, 4, `webbing-${Math.round(r.vertical_width)}`, `${fmtIn(r.vertical_strap_len)}" — ${fmtIn(r.tab_foldover)}" fold-over tabs leave ${fmtIn(r.usable_adjustment)}" usable`));
  pieces.push(...pad.pieces);
  const crossLen = (r.pad_spread + 2 * r.pad_width) / Math.cos((r.cross_piece_angle * Math.PI) / 180) + 2 * 1 * IN;
  pieces.push(strip(CROSS_PIECE_ID, 'Cross piece', crossLen, r.cross_piece_width, 2, `webbing-${Math.round(r.cross_piece_width)}`, `Sewn at ${r.cross_piece_angle}° so the pads kick outboard; Velcro closes over the hydration tube`));
  if (r.drag_handle) pieces.push(strip(DRAG_HANDLE_ID, 'Drag handle', r.drag_handle_len, D.DRAG_HANDLE_WIDTH_MM, 1, `webbing-${Math.round(D.DRAG_HANDLE_WIDTH_MM)}`, 'Staggered fold; four-point dispersion stitch, leading edge doubled'));
  const loopLen = 2 * (r.belt_width + 0.25 * IN) + 2.5 * IN;
  pieces.push(strip(BELT_LOOP_ID, 'Snap belt loop', loopLen, 2 * IN, 3 * r.loops_per_panel, 'cordura-500', `Wraps a ${fmtIn(r.belt_width)}" belt, Velcros to itself, snaps across — post/stud/socket, no cap`));
  pieces.push(strip('lbv-front-strap', 'Front closure strap', r.front_strap_cut, 1 * IN, r.front_straps, 'webbing-25', `${fmtIn(r.adjust_per_location)}" of adjustment + tabs + buckle wrap; male from the ${r.male_side}`));
  pieces.push(strip('lbv-side-strap', 'Side-to-back joining strap', r.side_strap_cut, 1 * IN, 4, 'webbing-25', 'Four pieces, two per side; tri-glide + side release'));
  pieces.push(strip('lbv-hydration-web', 'Hydration webbing', r.hydration_webbing, 1 * IN, 1, 'webbing-25', 'Across the back panel top'));
  pieces.push(strip('lbv-attach-a', 'Attachment piece', D.ATTACH_PIECE_A_MM, 1 * IN, 2, 'webbing-25', '3.5"'));
  pieces.push(strip('lbv-attach-b', 'Attachment piece', D.ATTACH_PIECE_B_MM, 1 * IN, 2, 'webbing-25', '3"'));
  pieces.push(strip('lbv-back-loop-tape', 'Back panel loop tape', r.back_outer_width - 2 * r.edge_tape_conceal + 2 * IN, D.BACK_LOOP_TAPE_WIDTH_MM, 1, 'velcro-loop', 'Cut 2" long for shrink; 1" off the bottom'));

  hardware.push(
    { id: 'zipper', name: `#8 coil zipper, ${fmtIn(r.front_zipper_len)}" (front) / ${fmtIn(r.back_zipper_len)}" (back)`, quantity: 3, notes: 'Pull down — gravity keeps it closed. The only zippers on the rig.' },
    { id: 'tension-lock', name: `${webbingSizeLabel(r.vertical_width)} tension lock`, quantity: 4, notes: 'On centre of each pad, one per vertical. Dry-fit printed webbing before sewing the tabs: it may not pass.' },
    { id: 'side-release', name: '1" side-release buckle', quantity: r.front_straps + 4, notes: `${r.front_straps} front (males on the ${r.male_side}) + 4 side-to-back` },
    { id: 'tri-glide', name: '1" tri-glide', quantity: 4, notes: 'Side-to-back straps' },
    { id: 'snap', name: 'Snap set (post + stud + socket, no cap)', quantity: 3 * r.loops_per_panel, notes: 'Holes hot-poked at 750°F, never punched' },
    { id: 'one-wrap', name: 'Velcro One-Wrap keeper', quantity: r.front_straps + 4 + 4, notes: 'Instead of elastic keepers — the first thing to fail on the old rigs' },
    ...pad.hardware.filter((h) => h.id !== 'ladderlock'),
  );

  // Warnings.
  for (const m of layout.field.warnings) warnings.push({ id: `front-field-${m.slice(0, 16)}`, severity: /not the 1" spec/.test(m) ? 'info' : 'warning', field: 'front_cols', message: `Front field: ${m}` });
  for (const m of back.warnings) if (!/not the 1" spec/.test(m)) warnings.push({ id: `back-field-${m.slice(0, 16)}`, severity: 'warning', field: 'back_cols', message: `Back field: ${m}` });
  warnings.push({ id: 'front-cols-unresolved', severity: 'info', field: 'front_cols', message: `Front columns are unresolved in the vault: 6 1/2" strips read as 4, but "24 mags" needs more. Count bartack columns on a video frame before batch-sewing pouches. ${r.front_cols} columns hold ${r.pouches_per_panel} × ${fmtIn(r.pouch_width)}" pouches per panel.` });
  warnings.push({ id: 'row-width-divergence', severity: 'info', message: `Rows are ${fmtIn(r.row_width)}" scuba webbing at the 1.5" column pitch: slots are taller than the 1" PALS spec, so standard pouch straps weave but a long sewn strap sized to 1" rows may tuck in the wrong place — mock one column first.` });
  if (r.back_cols !== D.BACK_COLS) warnings.push({ id: 'back-cols-off-vault', severity: 'info', field: 'back_cols', message: `The back panel runs ${D.BACK_COLS} columns: "we totally could put five, but five doesn't line up on anything appropriately". ${r.back_cols} columns also moves the vertical strap landings, which follow the outer column lines.` });
  if (r.loops_per_panel > D.LOOPS_MAX) warnings.push({ id: 'three-loops', severity: 'warning', field: 'loops_per_panel', message: 'Three belt loops per panel is wrong: it removes an inch of belt surface you could use. Two, never three.' });
  warnings.push({ id: 'belt-usable', severity: 'info', message: `${3 * r.loops_per_panel} loops at ${fmtIn(r.loop_footprint)}" each leave ${fmtIn(r.belt_usable)}" of a ${fmtIn(r.belt_length)}" belt for pouches.` });
  warnings.push({ id: 'adjustment', severity: 'info', message: `Verticals: ${fmtIn(r.vertical_strap_len)}" − 2 × ${fmtIn(r.tab_foldover)}" tabs${r.hardware_wrap > 0 ? ` − ${fmtIn(r.hardware_wrap)}" wrap` : ''} = ${fmtIn(r.usable_adjustment)}" usable for ${fmtIn(r.drop_adjust)}" of drop. Circumference: 3 × ${fmtIn(r.adjust_per_location)}"${r.tension_lock_outboard ? ' + 3" (locks outboard)' : ''} → fits ${fmtIn(r.fit_min_chest)}"–${fmtIn(r.fit_max_chest)}" chests.` });
  if (r.usable_adjustment < r.drop_adjust + 4 * IN) warnings.push({ id: 'drop-short', severity: 'warning', field: 'vertical_strap_len', message: `${fmtIn(r.usable_adjustment)}" of usable vertical cannot fund ${fmtIn(r.drop_adjust)}" of drop plus the reach to the tension lock.` });
  if (r.tab_foldover < 0.75 * IN) warnings.push({ id: 'tab-onewrap', severity: 'warning', field: 'tab_foldover', message: 'Tabs under 3/4" will not pass One-Wrap; the old 3/4" tabs were enlarged for exactly that.' });
  if (r.foam_insert) warnings.push({ id: 'flotation', severity: 'info', message: 'Foam in every panel: rigidity transfers load to the belt; the 8-mag neutral-buoyancy claim is for a 5.56 loadout only.' });

  return { ok: true, value: { pieces, steps: buildSteps(r, pad.steps), warnings, hardware, resolved: r } };
}

function buildSteps(r: ResolvedInputs, padSteps: Step[]): Step[] {
  const s: Step[] = [
    { id: 'lbv.cut', title: 'Cut and designate', body: `Fronts ${dim(r.panel_width)} × ${dim(r.panel_height)} (outer and inner, one of each mirrored — mark LEFT and RIGHT now), back inner ${dim(r.back_panel_width)} × ${dim(r.back_panel_height)}, back outer ${dim(r.back_outer_width)} × ${dim(r.back_outer_height)} for the bellows. Rows from ${fmtIn(r.front_strip_cut)}" / ${fmtIn(r.back_strip_cut)}" strips, four ${fmtIn(r.vertical_strap_len)}" verticals. Hot-cut every webbing end. Separate scissors for Cordura, webbing and foam.`, dependsOn: [], refsPieces: [FRONT_OUTER_ID, BACK_OUTER_ID], group: 'Cut' },
    { id: 'lbv.rows', title: 'PALS rows onto the flat faces — before anything closes', body: `First mark ${fmtIn(r.first_mark_from_edge)}" from the edge (${fmtIn(r.edge_tape_conceal)}" hides under the tape + the ${fmtIn(r.row_width)}" row). Loop Velcro on each row face first. Start every row at the LOWEST edge so the shift pushes away from the datum; bartack every column in the SAME direction, travelling along the webbing between columns; three lines at the anchors. Row ends stay raw — the edge tape swallows them. He razored 100 panel sets apart for getting this order wrong.`, dependsOn: ['lbv.cut'], refsPieces: [FRONT_OUTER_ID, BACK_OUTER_ID], group: 'Faces' },
    { id: 'lbv.verticals', title: 'Vertical webbing at the marks', body: `Centre the ${fmtIn(r.vertical_width)}" webbing on the ${fmtIn(r.vertical_mark)}" mark from each front panel's outer edge, full height so shoulder → panel → belt is one run. Two stitch lines 1/4" apart at the tension-lock anchor. Tack–travel–tack at the top and leave the ${fmtIn(D.CHANNEL_MOUTH_MM)}" mouth open for cables and flex cuffs. Back panel: land the verticals on the outer column lines, mid-panel; they kick out to where they need to be.`, dependsOn: ['lbv.rows'], refsPieces: [FRONT_OUTER_ID, BACK_OUTER_ID], group: 'Faces' },
    { id: 'lbv.top-strip', title: 'Top slot strip and tabs', body: `Velcro-faced strip across the top, bartacked into an oversized centre slot (the PTT holdover) and outer malice slots. Front strap tabs at ${r.front_strap_positions.map(fmtIn).join('", ')}" from the bottom on the closure edge — place the outer two, centre the third by measuring the actual gap; males on the ${r.male_side}. Side buckle tabs 1" up and 9" on centre, sewn short of the edge so the closing seam catches its own layer.`, dependsOn: ['lbv.rows'], refsPieces: [FRONT_OUTER_ID], group: 'Faces' },
    { id: 'lbv.back-face', title: 'Back panel face', body: `Loop tape ${fmtIn(D.BACK_LOOP_TAPE_WIDTH_MM)}" wide, ${fmtIn(D.BACK_LOOP_TAPE_OFFSET_MM)}" off the bottom (a shared datum with the shoulder straps). ${fmtIn(r.hydration_webbing)}" hydration webbing across the top with the 3.5" and 3" attachment pieces — their alignment is aesthetic, the stitching is structural.`, dependsOn: ['lbv.rows'], refsPieces: [BACK_OUTER_ID], group: 'Faces' },
    { id: 'lbv.zippers', title: 'Zippers, pull down', body: `One zipper per panel along the bottom edge, ${fmtIn(r.seam_allowance)}" allowance, equal drag on both halves or one side grows. Sew along it minding the pull: a pull through the machine can knock the timing out.`, dependsOn: ['lbv.verticals', 'lbv.top-strip', 'lbv.back-face'], refsPieces: [FRONT_OUTER_ID, FRONT_INNER_ID, BACK_OUTER_ID, BACK_INNER_ID], group: 'Close' },
  ];
  if (r.foam_insert) s.push({ id: 'lbv.foam', title: 'Foam', body: `Trace the panel, cut oversize, trim with baby cuts until it fits — you can always take more off. ${r.foam_thickness} mm blue camping pad. Chamfer the edges so the tape wraps clean.`, dependsOn: ['lbv.zippers'], refsPieces: ['lbv-foam-front', 'lbv-foam-back'], group: 'Close' });
  s.push(
    { id: 'lbv.close', title: 'Close and edge tape', body: `Outer to inner around the perimeter, ${fmtIn(r.edge_tape_width)}" 5038 nylon tape over the raw edges and the row ends. On the back the ${fmtIn(r.back_bellow)}" of extra fullness stays loose — do not tack the bulk down. Pry the binder open for the thick stack.`, dependsOn: [r.foam_insert ? 'lbv.foam' : 'lbv.zippers'], refsPieces: [FRONT_OUTER_ID, BACK_OUTER_ID], group: 'Close' },
    { id: 'lbv.belt-loops', title: 'Belt loops', body: `${r.loops_per_panel} per panel, ${3 * r.loops_per_panel} total, for a ${fmtIn(r.belt_width)}" belt: wrap, Velcro to itself, tab snaps across. Mark each snap on the assembly, hot-poke the holes at 750°F through both layers, press post + stud + socket. The loop's inner face must grip the belt, not just surround it.`, dependsOn: ['lbv.close'], refsPieces: [BELT_LOOP_ID], group: 'Belt' },
  );
  for (const p of padSteps) s.push({ ...p, dependsOn: p.dependsOn.length ? p.dependsOn : ['lbv.cut'], group: 'Shoulder set' });
  const lastPad = padSteps.length ? padSteps[padSteps.length - 1].id : 'lbv.cut';
  s.push(
    { id: 'lbv.locks', title: 'Tension locks on centre', body: `Sew a lock on centre of each pad for the front vertical and one for the back; the pad's side webbing rests against the lock bodies. Outboard = +3" for big torsos. Tab fold-over marked ${fmtIn(r.pad_tab_foldover)}" gives a ${fmtIn(r.pad_tab_tuck)}" tuck; sew the visible end first and let the far end fall where it falls.`, dependsOn: [lastPad], refsPieces: [PAD_ID], group: 'Shoulder set' },
    { id: 'lbv.cross', title: 'Cross pieces at an angle', body: `Tie the pads together with the cross pieces at ${r.cross_piece_angle}° so the pads kick outboard — the angle, not the pad shape, seats the yoke. Velcro the lower one closed over the hydration tube.`, dependsOn: ['lbv.locks'], refsPieces: [CROSS_PIECE_ID], group: 'Shoulder set' },
  );
  if (r.drag_handle) s.push({ id: 'lbv.drag', title: 'Drag handle — four-point dispersion', body: `${fmtIn(D.DRAG_HANDLE_WIDTH_MM)}" webbing folded staggered, not in thirds. Perimeter rectangle, diagonals into diamonds, then a second line on the leading edge — the first line takes the brunt. Span every layer of handle, cross piece and pad.`, dependsOn: ['lbv.cross'], refsPieces: [DRAG_HANDLE_ID], group: 'Shoulder set' });
  s.push(
    { id: 'lbv.lace', title: 'Lace the verticals', body: `Fold ${fmtIn(r.tab_foldover)}" pull tabs on the four ${fmtIn(r.vertical_strap_len)}" verticals (${fmtIn(r.usable_adjustment)}" usable). Hold all three layers as one, mush, and pop the lock straight on. Sew the panel end to the anchor with two lines 1/4" apart; ${fmtIn(r.drop_adjust)}" of drop lives in the tail.`, dependsOn: [r.drag_handle ? 'lbv.drag' : 'lbv.cross', 'lbv.close'], refsPieces: [VERTICAL_ID], group: 'Assembly' },
    { id: 'lbv.straps', title: 'Front and side straps', body: `${r.front_straps} front straps, ${fmtIn(r.adjust_per_location)}" of adjustment each, male from the ${r.male_side}. Four side-to-back pieces on tri-glides. One-Wrap keepers, not elastic. Fit range ${fmtIn(r.fit_min_chest)}"–${fmtIn(r.fit_max_chest)}" chest; the ladder for bigger: locks outboard, longer front straps, bigger panels.`, dependsOn: ['lbv.lace', 'lbv.belt-loops'], refsPieces: ['lbv-front-strap', 'lbv-side-strap'], group: 'Assembly' },
  );
  return s;
}
