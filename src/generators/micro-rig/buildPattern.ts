/**
 * Micro Rig Platform — pattern builder.
 *
 * Convention A (finished dims; `seamAllowances` = SA on every cut edge) for
 * the panel layers and pocket pieces; the pleated face comes from the pouch
 * engine's pleated card (Convention B, hems baked in, explicit 0) and its
 * `back` is dropped — the rig's front panel IS the card's back. Webbing,
 * Velcro and elastic are cut to net with explicit 0.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import { buildPouch } from '../../lib/pouch-engine/index.js';
import type { MicroRigInputs, MicroRigBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError, HardwareItem } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import {
  UTILITY_LOOP_FIELD_MM, INTERIOR_VELCRO_HEIGHT_MM, DANGLER_FIELD_MM, ELASTIC_PITCH_MM, ELASTIC_LOOP_LEN_MM,
  PALS_ROW_PITCH_MM, PALS_WEBBING_MM, PALS_TOP_DROP_MM, PALS_COLUMN_PITCH_MM, JOIN_BUCKLES, ANTIFLOP_CELL_MM,
  MIN_PUCKER_PER_SIDE_MM, STRAP_WEBBING_MM, SHOULDER_STRAP_LEN_MM, WAIST_STRAP_LEN_MM,
  CELL_VELCRO_MM, FRONT_POUCH_BOTTOM_HEM_MM, POUCH_END_HEM_MM, CRADLE_END_MM, WEIGHT_WARN_LB,
} from './defaults.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };

export const PANEL_FRONT_ID = 'panel-front';
export const PANEL_BACK_ID = 'panel-back';
export const FACE_ID = 'face';
export const REAR_POUCH_ID = 'stack-rear-pouch';
export const FRONT_POUCH_ID = 'stack-front-pouch';

const IN = 25.4;
const fmt = (mm: number) => String(Math.round(mm));
const fmtIn = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');

function seg(eid: () => EdgeId, role: Edge['role'], sx: number, sy: number, ex: number, ey: number): Edge {
  return { kind: 'straight', id: eid(), role, start: { x: sx, y: sy }, end: { x: ex, y: ey } };
}
function rect(eid: () => EdgeId, id: string, w: number, h: number): Path {
  return { id, closed: true, edges: [seg(eid, 'cut', 0, 0, w, 0), seg(eid, 'cut', w, 0, w, h), seg(eid, 'cut', w, h, 0, h), seg(eid, 'cut', 0, h, 0, 0)] };
}
function saRecord(path: Path, sa: number): Record<EdgeId, number> {
  const out: Record<EdgeId, number> = {};
  for (const e of path.edges) out[e.id] = sa;
  return out;
}
function strip(id: string, name: string, w: number, h: number, quantity: number, materialId: string, label: string): Piece {
  const eid = makeEdgeIdGen(id);
  const outline = rect(eid, `${id}-outline`, w, h);
  return { id, name, mirror: false, quantity, materialId, paths: [outline], seamAllowances: saRecord(outline, 0), annotations: [{ kind: 'label', label }] };
}

/** Where the mag section and utility pocket sit along the front (mags inboard, utility outboard). */
function layout(r: ResolvedInputs) {
  const magX0 = r.edge_margin;
  const magX1 = magX0 + r.mag_span;
  const utilX1 = r.panel_width - r.edge_margin;
  const utilX0 = utilX1 - r.utility_width;
  const cellTop = r.panel_height - r.cell_height;
  return { magX0, magX1, utilX0, utilX1, cellTop };
}

function buildPanelFront(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(PANEL_FRONT_ID);
  const W = r.panel_width, H = r.panel_height;
  const outline = rect(eid, `${PANEL_FRONT_ID}-outline`, W, H);
  const paths: Path[] = [outline];
  const { magX0, utilX0, utilX1, cellTop } = layout(r);
  // Closure hook strip, 2 1/4" down from the top, the interior loop field's width.
  const cx0 = (W - r.internal_velcro_length) / 2;
  paths.push({ id: `${PANEL_FRONT_ID}-closure-hook`, closed: false, label: 'Closure hook (1") on the inside face, 2 1/4" down', edges: [seg(eid, 'stitch', cx0, r.closure_velcro_drop, cx0 + r.internal_velcro_length, r.closure_velcro_drop), seg(eid, 'stitch', cx0, r.closure_velcro_drop + 1 * IN, cx0 + r.internal_velcro_length, r.closure_velcro_drop + 1 * IN)] });
  // Shoulder-strap buckle anchors on this layer, backed by a second anchor underneath.
  for (const [i, x] of [r.buckle_edge_offset, W - r.buckle_edge_offset].entries()) {
    paths.push({ id: `${PANEL_FRONT_ID}-buckle-${i}`, closed: false, label: i === 0 ? `Shoulder buckle anchors — ${fmtIn(r.buckle_edge_offset)}" from each edge, ${fmtIn(r.buckle_spacing)}" apart, each backed by a second anchor` : undefined, edges: [seg(eid, 'notch', x - STRAP_WEBBING_MM / 2, 0, x - STRAP_WEBBING_MM / 2, 0.75 * IN), seg(eid, 'notch', x + STRAP_WEBBING_MM / 2, 0, x + STRAP_WEBBING_MM / 2, 0.75 * IN)] });
  }
  // Placard loop at top centre.
  paths.push({ id: `${PANEL_FRONT_ID}-placard-loop`, closed: false, label: 'Placard webbing loop — 1" down; the rig mounts as an armour placard', edges: [seg(eid, 'notch', W / 2 - 0.75 * IN, 1 * IN, W / 2 + 0.75 * IN, 1 * IN)] });
  // Med-pouch zone (Stacked Micro): 3" outboard of the columns, with face PALS for the tear-off pouch.
  if (r.med_zone) {
    const mx1 = r.panel_width - r.edge_margin, mx0 = mx1 - r.med_zone_width;
    for (let row = 0; row < 3; row++) {
      const y = PALS_TOP_DROP_MM + row * PALS_ROW_PITCH_MM;
      if (y + PALS_WEBBING_MM > H) break;
      paths.push({ id: `${PANEL_FRONT_ID}-med-pals-${row}`, closed: false, label: row === 0 ? `Med zone ${fmtIn(r.med_zone_width)}" — face PALS for the tear-off med pouch` : undefined, edges: [seg(eid, 'stitch', mx0, y, mx1, y), seg(eid, 'stitch', mx0, y + PALS_WEBBING_MM, mx1, y + PALS_WEBBING_MM)] });
    }
  }
  // Mag section: cell divisions at the cell span pitch, from the cell top to the bottom.
  if (r.cell_count > 0) {
    for (let k = 0; k <= r.cell_count; k++) {
      const x = magX0 + k * r.cell_span;
      paths.push({ id: `${PANEL_FRONT_ID}-cell-${k}`, closed: false, label: k === 0 ? (r.pocket_set === 'stacked_cells' ? `Stacked cells — ${r.cell_count} column${r.cell_count === 1 ? '' : 's'} × ${r.cells_deep} deep at ${fmtIn(r.cell_span)}" (rear cell = mag depth + ${fmtIn(r.stack_ease)}" ease); rear pouch divisions sew here` : `Mag section — ${r.cell_count} cells at ${fmtIn(r.cell_span)}" (span ${fmtIn(r.mag_span)}"); face sews here bottom first, then divisions, then sides`) : undefined, edges: [seg(eid, 'stitch', x, cellTop, x, H)] });
    }
    paths.push({ id: `${PANEL_FRONT_ID}-cell-bottom`, closed: false, label: 'Cell bottom — face bottom gathers onto this line', edges: [seg(eid, 'stitch', magX0, H - 0.5 * IN, magX0 + r.mag_span, H - 0.5 * IN)] });
  }
  // Utility pocket footprint and the PALS column on its outboard seam.
  if (r.utility_pocket) {
    paths.push({ id: `${PANEL_FRONT_ID}-utility`, closed: false, label: `Utility pocket ${fmtIn(r.utility_width)} × ${fmtIn(r.utility_height)}" — gusset sews on this outline`, edges: [
      seg(eid, 'stitch', utilX0, H - r.utility_height, utilX1, H - r.utility_height), seg(eid, 'stitch', utilX1, H - r.utility_height, utilX1, H), seg(eid, 'stitch', utilX0, H, utilX0, H - r.utility_height),
    ] });
  }
  // Side PALS rows on each end.
  for (let row = 0; row < r.side_pals_rows; row++) {
    const y = PALS_TOP_DROP_MM + row * PALS_ROW_PITCH_MM;
    for (const side of ['L', 'R'] as const) {
      if (r.side_pals_columns === 0) break;
      const w = r.side_pals_columns * PALS_COLUMN_PITCH_MM;
      const x0 = side === 'L' ? 0 : W - w;
      paths.push({ id: `${PANEL_FRONT_ID}-pals-${side}-${row}`, closed: false, label: row === 0 && side === 'L' ? `Side PALS — ${r.side_pals_columns} column${r.side_pals_columns === 1 ? '' : 's'} each end, ${r.side_pals_rows} rows at 2" (tourniquet or a pistol mag)` : undefined, edges: [seg(eid, 'stitch', x0, y, x0 + w, y), seg(eid, 'stitch', x0, y + PALS_WEBBING_MM, x0 + w, y + PALS_WEBBING_MM)] });
    }
  }
  // Grommet bottom centre and elastic loops either side.
  paths.push({ id: `${PANEL_FRONT_ID}-grommet`, closed: false, label: '#4 grommet, bottom centre', edges: [seg(eid, 'notch', W / 2 - 3, H - 0.5 * IN, W / 2 + 3, H - 0.5 * IN)] });
  for (let i = 0; i < r.bottom_loop_count; i++) {
    const x = W / 2 + (i % 2 === 0 ? 1 : -1) * (Math.floor(i / 2) + 1) * ELASTIC_PITCH_MM;
    paths.push({ id: `${PANEL_FRONT_ID}-loop-${i}`, closed: false, label: i === 0 ? 'Bottom elastic loops at 1 1/2" pitch' : undefined, edges: [seg(eid, 'notch', x, H, x, H - 0.4 * IN)] });
  }
  return {
    id: PANEL_FRONT_ID,
    name: r.split_front ? 'Panel front layer (one half)' : 'Panel front layer',
    mirror: false,
    quantity: r.split_front ? 2 : 1,
    materialId: 'cordura-500',
    paths,
    seamAllowances: saRecord(outline, r.seam_allowance),
    annotations: [
      { kind: 'grain', label: 'grain', point: { x: W / 2, y: H / 2 }, angle: 0 },
      { kind: 'label', label: `Panel front — ${fmtIn(W)} × ${fmtIn(H)}" finished; patterned 500D outside`, point: { x: W / 2, y: H / 2 } },
    ],
  };
}

function buildPanelBack(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(PANEL_BACK_ID);
  const W = r.panel_width, H = r.panel_height;
  const outline = rect(eid, `${PANEL_BACK_ID}-outline`, W, H);
  const paths: Path[] = [outline];
  const cx0 = (W - r.internal_velcro_length) / 2;
  paths.push({ id: `${PANEL_BACK_ID}-closure-loop`, closed: false, label: 'Closure loop (1") on the inside face, 2 1/4" down', edges: [seg(eid, 'stitch', cx0, r.closure_velcro_drop, cx0 + r.internal_velcro_length, r.closure_velcro_drop), seg(eid, 'stitch', cx0, r.closure_velcro_drop + 1 * IN, cx0 + r.internal_velcro_length, r.closure_velcro_drop + 1 * IN)] });
  paths.push({ id: `${PANEL_BACK_ID}-interior-loop`, closed: false, label: `Interior loop field ${fmtIn(INTERIOR_VELCRO_HEIGHT_MM)} × ${fmtIn(r.internal_velcro_length)}" — hosts velcro-backed admin cards`, edges: [
    seg(eid, 'stitch', cx0, r.interior_velcro_drop + 1 * IN, cx0 + r.internal_velcro_length, r.interior_velcro_drop + 1 * IN),
    seg(eid, 'stitch', cx0, r.interior_velcro_drop + 1 * IN + INTERIOR_VELCRO_HEIGHT_MM, cx0 + r.internal_velcro_length, r.interior_velcro_drop + 1 * IN + INTERIOR_VELCRO_HEIGHT_MM),
  ] });
  if (r.dangler_field) {
    const [dw, dh] = DANGLER_FIELD_MM;
    const w = Math.min(dw, W - 2 * r.edge_margin);
    const x0 = (W - w) / 2, y0 = H - dh;
    paths.push({ id: `${PANEL_BACK_ID}-dangler`, closed: false, label: `Dangler hook field ${fmtIn(w)} × ${fmtIn(dh)}" on the OUTSIDE back`, edges: [seg(eid, 'stitch', x0, y0, x0 + w, y0), seg(eid, 'stitch', x0 + w, y0, x0 + w, H), seg(eid, 'stitch', x0, y0, x0, H)] });
  }
  return {
    id: PANEL_BACK_ID,
    name: r.split_front ? 'Panel back layer (one half)' : 'Panel back layer',
    mirror: false,
    quantity: r.split_front ? 2 : 1,
    materialId: 'cordura-500',
    paths,
    seamAllowances: saRecord(outline, r.seam_allowance),
    annotations: [{ kind: 'label', label: `Panel back — ${fmtIn(W)} × ${fmtIn(H)}"; solid colour inside; opens as the internal pocket`, point: { x: W / 2, y: H / 2 } }],
  };
}

/** The pleated face and its cradles from the pouch engine; the card's `back` is the rig panel. */
function buildFacePieces(r: ResolvedInputs): { pieces: Piece[]; warnings: string[] } {
  if (r.pocket_set !== 'mag_cells') return { pieces: [], warnings: [] };
  const res = buildPouch({
    object: { width: r.mag.width, depth: r.mag.thickness, height: r.mag.height },
    construction: 'pleated_card',
    seamAllowance: 0,
    units: 'mm',
    card: {
      cellCount: r.cell_count,
      cellSpan: r.cell_span,
      facePerCell: r.face_per_cell,
      cardHeight: r.cell_height,
      backHem: 1 * IN,
      faceEndHem: 0.5 * IN,
      faceBottomHem: 0,
      flapLength: 0,
      bottomStyle: 'cradle',
    },
  });
  const pieces = res.pattern.pieces.filter((p) => p.id !== 'back').map((p) => (p.id === 'face' ? { ...p, id: FACE_ID, quantity: r.split_front ? 2 : 1, name: r.split_front ? 'Face (folded double), one per half' : p.name } : { ...p, quantity: p.quantity * (r.split_front ? 2 : 1) }));
  return { pieces, warnings: res.warnings ?? [] };
}

/** Stacked cells: rear double pouch, front single pouches, divider, cradles, bridge, cords, pull tabs, cell Velcro. */
function buildStackedPieces(r: ResolvedInputs): Piece[] {
  if (r.pocket_set !== 'stacked_cells') return [];
  const q = r.split_front ? 2 : 1;
  const n = r.cell_count;
  const out: Piece[] = [];
  // Rear pouch: self-lined, folded at the mouth (clean folded edge at the top; edge tape at the bottom).
  const rw = n * r.rear_cell_width + 2 * POUCH_END_HEM_MM;
  const rh = 2 * r.pouch_height;
  const rEid = makeEdgeIdGen(REAR_POUCH_ID);
  const rOutline = rect(rEid, `${REAR_POUCH_ID}-outline`, rw, rh);
  const rPaths: Path[] = [rOutline,
    { id: `${REAR_POUCH_ID}-mouth-fold`, closed: false, label: 'Mouth fold — fold in half; the clean folded edge is the top', edges: [seg(rEid, 'fold', 0, r.pouch_height, rw, r.pouch_height)] },
    { id: `${REAR_POUCH_ID}-hem-l`, closed: false, label: `${fmtIn(POUCH_END_HEM_MM)}" end hem`, edges: [seg(rEid, 'fold', POUCH_END_HEM_MM, 0, POUCH_END_HEM_MM, rh)] },
    { id: `${REAR_POUCH_ID}-hem-r`, closed: false, edges: [seg(rEid, 'fold', rw - POUCH_END_HEM_MM, 0, rw - POUCH_END_HEM_MM, rh)] },
  ];
  for (let k = 1; k < n; k++) {
    const x = POUCH_END_HEM_MM + k * r.rear_cell_width;
    rPaths.push({ id: `${REAR_POUCH_ID}-division-${k}`, closed: false, label: k === 1 ? `Rear cell division — ${fmtIn(r.rear_cell_width)}" pitch` : undefined, edges: [seg(rEid, 'stitch', x, 0, x, rh)] });
  }
  for (let k = 0; k < n; k++) {
    const x0 = POUCH_END_HEM_MM + k * r.rear_cell_width;
    const vy0 = r.pouch_height - r.pouch_height * 0.85, vy1 = r.pouch_height + r.pouch_height * 0.85;
    rPaths.push({ id: `${REAR_POUCH_ID}-velcro-${k}`, closed: false, label: k === 0 ? `Cell loop Velcro ${fmtIn(CELL_VELCRO_MM)}" wide on both walls, stopping short of the cradle field` : undefined, edges: [seg(rEid, 'stitch', x0 + (r.rear_cell_width - CELL_VELCRO_MM) / 2, vy0, x0 + (r.rear_cell_width - CELL_VELCRO_MM) / 2, vy1), seg(rEid, 'stitch', x0 + (r.rear_cell_width + CELL_VELCRO_MM) / 2, vy0, x0 + (r.rear_cell_width + CELL_VELCRO_MM) / 2, vy1)] });
  }
  out.push({ id: REAR_POUCH_ID, name: 'Rear pouch (self-lined, folded at the mouth)', mirror: false, quantity: q, materialId: 'cordura-500', paths: rPaths, seamAllowances: saRecord(rOutline, 0), annotations: [{ kind: 'label', label: `Rear pouch — cut ${fmtIn(rw)} × ${fmtIn(rh)}"; ${n} cell${n === 1 ? '' : 's'} at ${fmtIn(r.rear_cell_width)}"; folds to ${fmtIn(r.pouch_height)}" tall`, point: { x: rw / 2, y: rh / 2 } }] });
  if (r.cells_deep === 2) {
    // Front pouch, one per column: wider by the wrap allowance, cut 1" longer for a bottom hem.
    const fw = r.front_cell_mark + 2 * POUCH_END_HEM_MM;
    const fh = 2 * r.pouch_height + FRONT_POUCH_BOTTOM_HEM_MM;
    const fEid = makeEdgeIdGen(FRONT_POUCH_ID);
    const fOutline = rect(fEid, `${FRONT_POUCH_ID}-outline`, fw, fh);
    out.push({ id: FRONT_POUCH_ID, name: 'Front pouch (one per column, self-lined)', mirror: false, quantity: n * q, materialId: 'cordura-500', paths: [fOutline,
      { id: `${FRONT_POUCH_ID}-mouth-fold`, closed: false, label: 'Mouth fold', edges: [seg(fEid, 'fold', 0, r.pouch_height + FRONT_POUCH_BOTTOM_HEM_MM / 2, fw, r.pouch_height + FRONT_POUCH_BOTTOM_HEM_MM / 2)] },
      { id: `${FRONT_POUCH_ID}-hem-l`, closed: false, label: `${fmtIn(POUCH_END_HEM_MM)}" end hem`, edges: [seg(fEid, 'fold', POUCH_END_HEM_MM, 0, POUCH_END_HEM_MM, fh)] },
      { id: `${FRONT_POUCH_ID}-hem-r`, closed: false, edges: [seg(fEid, 'fold', fw - POUCH_END_HEM_MM, 0, fw - POUCH_END_HEM_MM, fh)] },
      { id: `${FRONT_POUCH_ID}-bottom-hem`, closed: false, label: `${fmtIn(FRONT_POUCH_BOTTOM_HEM_MM)}" bottom hem — cut long so the raw bottom is hemmed, not taped`, edges: [seg(fEid, 'fold', 0, fh - FRONT_POUCH_BOTTOM_HEM_MM, fw, fh - FRONT_POUCH_BOTTOM_HEM_MM)] },
      { id: `${FRONT_POUCH_ID}-pull`, closed: false, label: `${r.split_pull ? 'Split' : 'Plain'} pull tab lands dead centre, before the face is sewn down`, edges: [seg(fEid, 'notch', fw / 2, r.pouch_height * 0.6, fw / 2, r.pouch_height * 0.9)] },
    ], seamAllowances: saRecord(fOutline, 0), annotations: [{ kind: 'label', label: `Front pouch — cut ${fmtIn(fw)} × ${fmtIn(fh)}"; marks ${fmtIn(r.front_cell_mark)}" on the face (rear cell + ${fmtIn(r.wrap_allowance)}" wrap)`, point: { x: fw / 2, y: fh / 2 } }] });
    out.push(strip('stack-divider', 'Centre divider (folded double)', n * r.rear_cell_width, 2 * r.pouch_height, q, 'cordura-500', `Divider between the rear and front layers — ${fmtIn(n * r.rear_cell_width)} × ${fmtIn(2 * r.pouch_height)}", folded`));
    out.push(strip('stack-bridge', 'Webbing bridge between cells', n * r.rear_cell_width, PALS_WEBBING_MM, q, 'webbing-25', 'Sewn between the two cells: the back bungee anchors here and runs between the mags and over the tops'));
  }
  out.push(strip('stack-cradle', `Cradle webbing ${fmtIn(r.cradle_width)}"`, r.cradle_length, r.cradle_width, n * q, `webbing-${Math.round(r.cradle_width)}`, `Cradle — ${fmtIn(r.cradle_length)}" per column: ${fmtIn(CRADLE_END_MM)}" hemmed over at the face, ${fmtIn(r.stack_depth)}" across the stack${r.cradle_drop > 0 ? ` + ${fmtIn(r.cradle_drop)}" drop` : ''}, ${fmtIn(CRADLE_END_MM)}" under the back Velcro; grommets set in it`));
  out.push(strip('stack-pull-tab', 'Bungee pull tab', r.pull_tab_length, 1 * IN, r.pull_tab_count * q, 'webbing-25', `${r.split_pull ? 'Split pull (curved AK mag)' : 'Plain pull'} — ${fmtIn(r.pull_tab_length)}", one per magazine, dead centre of its cell`));
  out.push(strip('stack-bungee', 'Bungee cord', 2 * (r.pouch_height + r.stack_depth) + 6 * IN, 4, r.cord_count * q, 'elastic-4', 'One cord per magazine (a bungee cut in half): front cord through the face PALS, back cord on the bridge, knotted below the cradle grommet'));
  out.push(strip('stack-cell-velcro', 'Cell loop Velcro', CELL_VELCRO_MM, r.pouch_height * 1.7, 2 * n * q, 'velcro-loop', 'Both interior walls of every rear cell; leading edge captured under the next seam, never raw toward the opening'));
  return out;
}

function buildUtilityPocket(r: ResolvedInputs): Piece[] {
  if (!r.utility_pocket) return [];
  const sa = r.seam_allowance;
  const q = r.split_front ? 2 : 1;
  const frontEid = makeEdgeIdGen('utility-front');
  const front = rect(frontEid, 'utility-front-outline', r.utility_width, r.utility_height);
  const gEid = makeEdgeIdGen('utility-gusset');
  const gLen = 2 * r.utility_height + r.utility_width;
  const gusset = rect(gEid, 'utility-gusset-outline', gLen, r.utility_depth);
  const lidEid = makeEdgeIdGen('utility-lid');
  const lidH = r.utility_depth + 1.5 * IN;
  const lid = rect(lidEid, 'utility-lid-outline', r.utility_width, lidH);
  const [lfW, lfH] = UTILITY_LOOP_FIELD_MM;
  return [
    {
      id: 'utility-front', name: 'Utility pocket front', mirror: false, quantity: q, materialId: 'cordura-500',
      paths: [front, { id: 'utility-front-loop', closed: false, label: `Loop field ${fmtIn(lfH)} × ${fmtIn(lfW)}" inside`, edges: [seg(frontEid, 'stitch', (r.utility_width - lfH) / 2, (r.utility_height - lfW) / 2, (r.utility_width + lfH) / 2, (r.utility_height - lfW) / 2), seg(frontEid, 'stitch', (r.utility_width - lfH) / 2, (r.utility_height + lfW) / 2, (r.utility_width + lfH) / 2, (r.utility_height + lfW) / 2)] }],
      seamAllowances: saRecord(front, sa),
      annotations: [{ kind: 'label', label: `Utility front — ${fmtIn(r.utility_width)} × ${fmtIn(r.utility_height)}" finished` }],
    },
    {
      id: 'utility-gusset', name: 'Utility pocket gusset', mirror: false, quantity: q, materialId: 'cordura-500',
      paths: [gusset, ...[r.utility_height, r.utility_height + r.utility_width].map((x, i) => ({ id: `utility-gusset-corner-${i}`, closed: false, label: 'Corner — turn here (90°)', edges: [seg(gEid, 'fold', x, 0, x, r.utility_depth)] }))],
      seamAllowances: saRecord(gusset, sa),
      annotations: [{ kind: 'label', label: `Gusset — ${fmtIn(gLen)} × ${fmtIn(r.utility_depth)}" finished, 3" off the body` }],
    },
    {
      id: 'utility-lid', name: 'Utility pocket lid', mirror: false, quantity: q, materialId: 'cordura-500',
      paths: [lid, { id: 'utility-lid-velcro', closed: false, label: 'Two 1" velcro strips with a dead channel between — a finger hooks in to rip it open', edges: [seg(lidEid, 'stitch', 0.5 * IN, lidH - 0.75 * IN, r.utility_width - 0.5 * IN, lidH - 0.75 * IN), seg(lidEid, 'stitch', 0.5 * IN, lidH - 2.25 * IN, r.utility_width - 0.5 * IN, lidH - 2.25 * IN)] }],
      seamAllowances: saRecord(lid, sa),
      annotations: [{ kind: 'label', label: `Lid — ${fmtIn(r.utility_width)} × ${fmtIn(lidH)}"; long velcro so it cinches flat or swallows bulk` }],
    },
  ];
}

function buildStrips(r: ResolvedInputs): Piece[] {
  const q = r.split_front ? 2 : 1;
  const out: Piece[] = [];
  out.push(strip('closure-hook', 'Closure hook strip', r.internal_velcro_length, 1 * IN, q, 'velcro-hook', `Hook 1" × ${fmtIn(r.internal_velcro_length)}" — inside the front layer`));
  out.push(strip('closure-loop', 'Closure loop strip', r.internal_velcro_length, 1 * IN, q, 'velcro-loop', `Loop 1" × ${fmtIn(r.internal_velcro_length)}" — inside the back layer`));
  out.push(strip('interior-loop-field', 'Interior loop field', r.internal_velcro_length, INTERIOR_VELCRO_HEIGHT_MM, q, 'velcro-loop', `Loop ${fmtIn(INTERIOR_VELCRO_HEIGHT_MM)} × ${fmtIn(r.internal_velcro_length)}" — inside the back layer, hosts admin cards`));
  out.push(strip('pull-tab', 'Pull tab', 3 * IN, 1 * IN, 2 * q, 'webbing-25', 'Pull tabs on the opening edge — rip the panel open'));
  out.push(strip('shoulder-buckle-anchor', 'Shoulder buckle anchor', 4 * IN, STRAP_WEBBING_MM, 2 * q, 'webbing-38', 'Folded round the female buckle; sews to the FRONT layer'));
  out.push(strip('shoulder-buckle-backer', 'Shoulder buckle backer', 3 * IN, STRAP_WEBBING_MM, 2 * q, 'webbing-38', 'Second anchor under the visible one'));
  out.push(strip('placard-loop', 'Placard loop', 3 * IN, STRAP_WEBBING_MM, q, 'webbing-38', 'Top centre; cut the shoulder hardware off and clip a repair buckle to mount as a placard'));
  out.push(strip('waist-buckle-tab', 'Waist strap buckle tab', 3 * IN, STRAP_WEBBING_MM, 2 * q, 'webbing-38', 'Small buckle at each side, sewn late in the build'));
  if (r.side_pals_columns > 0 && r.side_pals_rows > 0) {
    out.push(strip('side-pals-row', 'Side PALS row', r.side_pals_columns * PALS_COLUMN_PITCH_MM + 1 * IN, PALS_WEBBING_MM, 2 * r.side_pals_rows * q, 'webbing-25', `${r.side_pals_rows} rows × 2 ends; cut 1" long, trim flush after sewing`));
  }
  if (r.bottom_loop_count > 0) out.push(strip('bottom-elastic-loop', 'Bottom elastic loop', ELASTIC_LOOP_LEN_MM, 1 * IN, r.bottom_loop_count * q, 'elastic-25', 'Pocket smokes, tourniquets, antenna wire'));
  if (r.dangler_field) {
    const [dw, dh] = DANGLER_FIELD_MM;
    out.push(strip('dangler-hook', 'Dangler hook field', Math.min(dw, r.panel_width - 2 * r.edge_margin), dh, q, 'velcro-hook', 'Outside back; matching loop on the dangler pouch'));
  }
  if (r.split_front) {
    out.push(strip('join-strap', 'Split join buckle strap', r.buckle_setback + 2 * IN, STRAP_WEBBING_MM, JOIN_BUCKLES, 'webbing-38', `${JOIN_BUCKLES} join straps; anchors ${fmtIn(r.buckle_setback)}" from the panel edge`));
    out.push(strip('antiflop-cell', 'Anti-flop cell', ANTIFLOP_CELL_MM + 1 * IN, r.cell_height, 2, 'cordura-500', 'The 3" join cell goes on the FRONT face — back-mounted it peels open when the wearer bends'));
    out.push(strip('gap-bridge-pals', 'Floating PALS bridge', r.gap_width + 2 * IN, STRAP_WEBBING_MM, 2, 'webbing-38', 'Floats across the gap unsewn to anything in it — takes a pistol mag or chem lights'));
  }
  if (r.suspension === 'webbing_straps') {
    out.push(strip('shoulder-strap', 'Shoulder strap webbing', SHOULDER_STRAP_LEN_MM, STRAP_WEBBING_MM, 2, 'webbing-38', 'Exits the rear of the panel, crosses in an X at the back; ~30" of adjustment'));
    out.push(strip('waist-strap', 'Waist strap webbing', WAIST_STRAP_LEN_MM, STRAP_WEBBING_MM, 1, 'webbing-38', 'Closes with a buckle at the front — the buckle that blocks mag extraction from the internal pocket'));
  }
  return out;
}

function buildHardware(r: ResolvedInputs): HardwareItem[] {
  const q = r.split_front ? 2 : 1;
  const hw: HardwareItem[] = [
    { id: 'shoulder-buckle-f', name: '1.5" side-release buckle (female, on panel)', quantity: 2 * q, notes: 'NSN-compatible so an H-harness drops in' },
    { id: 'waist-buckle', name: '1" side-release buckle', quantity: 2 * q, notes: 'Waist strap at the sides' },
    { id: 'grommet', name: '#4 black-oxide brass grommet', quantity: q, notes: 'Bottom centre' },
    { id: 'tri-glide', name: '1.5" tri-glide', quantity: r.suspension === 'webbing_straps' ? 4 : 0, notes: 'Strap adjustment' },
  ];
  if (r.split_front) hw.push({ id: 'join-buckle', name: '1.5" side-release buckle (join)', quantity: JOIN_BUCKLES, notes: 'Joins the two halves at the sternum' });
  if (r.pocket_set === 'stacked_cells') {
    hw.push({ id: 'cradle-grommet', name: '#4 grommet in the cradle webbing', quantity: r.grommet_count * q, notes: 'One per magazine; holes pre-burned for position, then pressed. The cradle is the bungee anchor plate.' });
    hw.push({ id: 'velcro-dot', name: '1" adhesive hook dot (on the magazine)', quantity: r.cell_count * r.cells_deep * q, notes: 'One inch is enough; a 2" patch makes the mag nearly impossible to draw.' });
  }
  if (r.suspension === 'h_harness') hw.push({ id: 'h-harness', name: 'Slim padded H-harness', quantity: 1, notes: 'Build it on the Padded Strap page (H-harness mode); it clips into the four buckles and is the prerequisite for a hydration carrier' });
  return hw.filter((h) => h.quantity > 0);
}

function buildSteps(r: ResolvedInputs): Step[] {
  const steps: Step[] = [
    { id: 'rig.cut', title: 'Cut the panel layers and pieces', body: `Cut the front and back layers at ${fmtIn(r.panel_width)} × ${fmtIn(r.panel_height)}" finished plus ${fmt(r.seam_allowance)} mm seam allowance${r.split_front ? ', two of each for the split front' : ''}. Cut the face, cradles, utility pocket pieces, Velcro, webbing and elastic from the cut list. Mark the closure Velcro line 2 1/4" down on both layers.`, dependsOn: [], refsPieces: [PANEL_FRONT_ID, PANEL_BACK_ID], group: 'Panel' },
    { id: 'rig.interior', title: 'Interior first: Velcro on both layers', body: `On the back layer sew the closure loop strip 2 1/4" down and the ${fmtIn(INTERIOR_VELCRO_HEIGHT_MM)}" interior loop field below it. On the front layer sew the closure hook strip 2 1/4" down. Everything that lives inside the pocket goes on before the layers meet.`, dependsOn: ['rig.cut'], refsPieces: [PANEL_FRONT_ID, PANEL_BACK_ID, 'closure-hook', 'closure-loop', 'interior-loop-field'], group: 'Panel' },
  ];
  if (r.pocket_set === 'mag_cells') {
    steps.push({ id: 'rig.cells', title: 'Sew the mag cells to the front layer', body: `Hem the face ends, fold it double, and sew it to the front layer over the mag section (${r.cell_count} cells at ${fmtIn(r.cell_span)}", span ${fmtIn(r.mag_span)}"): bottom first (the face gathers onto the cell-bottom line), then the divisions, then the outer sides, so a magazine never meets a raw ridge on the way in. ${fmtIn(r.pucker_per_side)}" of pucker each side of every cell wraps the magazine. Tack the cradles under each cell.`, dependsOn: ['rig.interior'], refsPieces: [PANEL_FRONT_ID, FACE_ID], group: 'Front' });
  }
  if (r.pocket_set === 'stacked_cells') {
    steps.push(
      { id: 'rig.stack-prep', title: 'Prepare the pouches before anything is sewn down', body: `Hem the ends of the rear pouch and the ${r.cell_count} front pouch${r.cell_count === 1 ? '' : 'es'} ${fmtIn(POUCH_END_HEM_MM)}" and fold each at its mouth (clean folded edge up). Sew the ${fmtIn(CELL_VELCRO_MM)}" loop Velcro on BOTH interior walls of every rear cell, stopping short of the cradle field, leading edge captured under the next seam. Anchor the ${r.pull_tab_count} pull tabs dead centre of each cell face now — they cannot be added after the face is locked down.`, dependsOn: ['rig.interior'], refsPieces: [REAR_POUCH_ID, ...(r.cells_deep === 2 ? [FRONT_POUCH_ID] : []), 'stack-pull-tab', 'stack-cell-velcro'], group: 'Front' },
      { id: 'rig.cells', title: 'Sew the rear pouch to the front layer', body: `Sew the rear pouch to the front layer at its ${r.cell_count > 1 ? `${r.cell_count - 1} division${r.cell_count > 2 ? 's' : ''} (${fmtIn(r.rear_cell_width)}" pitch — mag depth + ${fmtIn(r.stack_ease)}" ease) and` : ''} outer sides, side sew lines ${fmtIn(r.rear_cell_width / 2)}" off each cell centre. Edge-tape the raw bottom. Mags sit to the support-hand side; excess runs outboard.${r.pals_aligned ? '' : ` A ${fmtIn(r.cell_span)}" cell does not line up with the 1.5" PALS grid — face PALS on the cells will not mount up in spec spacing.`}`, dependsOn: ['rig.stack-prep'], refsPieces: [PANEL_FRONT_ID, REAR_POUCH_ID], group: 'Front' },
    );
    if (r.cells_deep === 2) {
      steps.push({ id: 'rig.stack-front', title: 'Divider, bridge and the front pouches', body: `Sew the divider over the rear pouch face, then the webbing bridge between the layers at the top (the back bungee anchors to it). Sew each front pouch onto the divider at ${fmtIn(r.front_cell_mark)}" marks — ${fmtIn(r.wrap_allowance)}" more than the rear cell so the face travels out over the rear magazine and back. That wrap was decided by feel on camera; pin scrap round two real magazines and measure before you commit. The stack is ${fmtIn(r.stack_depth)}" deep. Hem the front pouch bottoms.`, dependsOn: ['rig.cells'], refsPieces: [FRONT_POUCH_ID, 'stack-divider', 'stack-bridge'], group: 'Front' });
    }
    steps.push({ id: 'rig.cradles', title: 'Cradles, grommets and bungee', body: `Under each column sew the ${fmtIn(r.cradle_width)}" cradle: front end hemmed over at the pouch face, back end run under the back Velcro, multi-pass ("1 2 3 4 over 1 2 3 4") — never raw in the channel. Burn and press ${r.cells_deep} grommet${r.cells_deep === 1 ? '' : 's'} per cradle. Run one cord per magazine: the front cord through the face PALS, the back cord on the bridge, over the mag tops and down through the grommet, knotted below so it sits inside out of the way. X-tack the load-bearing webbing corners. No elastic anywhere it cannot be replaced with scissors and a knot. Magazines get a 1" hook dot; the mag rides ${fmtIn(r.mag_exposed_height)}" proud of the mouth.`, dependsOn: [r.cells_deep === 2 ? 'rig.stack-front' : 'rig.cells'], refsPieces: ['stack-cradle', 'stack-bungee'], group: 'Front' });
  }
  if (r.utility_pocket) {
    steps.push({ id: 'rig.utility', title: 'Build and attach the utility pocket', body: `Sew the loop field inside the pocket front, join the gusset round three sides of the front (corners turned at the fold marks), and sew the gusset's other edge to the front layer on the utility outline. Sew the lid above it with its two Velcro strips and the dead channel between them.`, dependsOn: ['rig.interior'], refsPieces: [PANEL_FRONT_ID, 'utility-front', 'utility-gusset', 'utility-lid'], group: 'Front' });
  }
  if (r.side_pals_columns > 0) {
    steps.push({ id: 'rig.pals', title: 'Side PALS and bottom loops', body: `Sew ${r.side_pals_rows} rows of 1" webbing at each end at the marks (2" pitch, ${r.side_pals_columns} column${r.side_pals_columns === 1 ? '' : 's'}), bar-tack the column, trim the ends flush. Sew the elastic loops along the bottom edge at 1 1/2" pitch either side of the grommet position.`, dependsOn: ['rig.interior'], refsPieces: [PANEL_FRONT_ID, 'side-pals-row'], group: 'Front' });
  }
  steps.push(
    { id: 'rig.hardware', title: 'Buckle anchors, placard loop, pull tabs', body: `On the FRONT layer only, sew the two shoulder-buckle anchors ${fmtIn(r.buckle_edge_offset)}" from each edge (${fmtIn(r.buckle_spacing)}" apart), each over its backer, and the placard loop at top centre 1" down. Keep the closure Velcro clear of the anchor stitching. Sew the pull tabs on the opening edge.`, dependsOn: ['rig.interior'], refsPieces: [PANEL_FRONT_ID, 'shoulder-buckle-anchor', 'shoulder-buckle-backer', 'placard-loop', 'pull-tab'], group: 'Panel' },
    { id: 'rig.close', title: 'Close the panel', body: `Lay the layers back to back (Velcro inside) and edge-tape the sides and bottom, running the tape out past the edge and catching the run-out under the closure Velcro at the top instead of folding it. The top stays open on the Velcro: the panel is a pocket. Set the grommet at bottom centre${r.dangler_field ? ' and sew the dangler hook field on the outside back' : ''}. Sew the waist-strap buckle tabs at the sides last.`, dependsOn: ['rig.hardware', ...(r.pocket_set === 'mag_cells' ? ['rig.cells'] : []), ...(r.pocket_set === 'stacked_cells' ? ['rig.cradles'] : []), ...(r.utility_pocket ? ['rig.utility'] : [])], refsPieces: [PANEL_FRONT_ID, PANEL_BACK_ID], group: 'Panel' },
  );
  if (r.split_front) {
    steps.push({ id: 'rig.join', title: 'Join the halves at the sternum', body: `Sew the ${JOIN_BUCKLES} join straps with their anchors ${fmtIn(r.buckle_setback)}" from each half's inboard edge, leaving a ${fmtIn(r.gap_width)}" gap between the halves. Put the 3" anti-flop cell on the FRONT face of the join — on the back it lets the panel fall open when the wearer bends. Float a PALS bridge across the gap, sewn to the halves only, never to anything in the gap. Jog the stitch line round the buckles rather than ramming the foot against them; the join zone closes at 8–10 layers.`, dependsOn: ['rig.close'], refsPieces: ['join-strap', 'antiflop-cell', 'gap-bridge-pals'], group: 'Split front' });
  }
  steps.push({ id: 'rig.suspension', title: r.suspension === 'h_harness' ? 'Clip in the H-harness' : 'Fit the webbing straps', body: r.suspension === 'h_harness'
    ? 'Build the Slim Padded H set on the Padded Strap page (H-harness mode) and clip its four corners into the shoulder and waist buckles — no sewing, and the harness is what a hydration carrier mounts to.'
    : 'Thread the shoulder straps through the front-layer buckles, cross them in an X behind the back, and run the waist strap round to its buckle at the front. Adjust, then double-bypass the excess; a 5 ft 2 in wearer cinches fully with ~30" of adjustment left.', dependsOn: [r.split_front ? 'rig.join' : 'rig.close'], refsPieces: r.suspension === 'webbing_straps' ? ['shoulder-strap', 'waist-strap'] : [], group: 'Suspension' });
  return steps;
}

function buildWarnings(inputs: MicroRigInputs, r: ResolvedInputs, engine: string[]): GeneratorWarning[] {
  const w: GeneratorWarning[] = engine.map((message, i) => ({ id: `engine-${i}`, severity: 'warning', message }));
  if (r.width_needed > r.panel_width + 1e-6) {
    w.push({ id: 'width-budget', severity: 'error', field: 'panel_width', message: `Width budget: ${r.cell_count} cells (${fmtIn(r.mag_span)}")${r.utility_pocket ? ` + ${fmtIn(r.utility_width)}" utility pocket` : ''} + 2 × ${fmtIn(r.edge_margin)}" margin = ${fmtIn(r.width_needed)}" needs more than the ${fmtIn(r.panel_width)}" panel. Fewer cells, drop the utility pocket, or widen the panel.` });
  } else if (r.pocket_set === 'mag_cells' && r.panel_width - r.width_needed > 2 * IN) {
    w.push({ id: 'width-slack', severity: 'info', field: 'panel_width', message: `${fmtIn(r.panel_width - r.width_needed)}" of panel width is unused by the mag section${r.utility_pocket ? ' and utility pocket' : ''}.` });
  }
  if (r.pocket_set === 'mag_cells' && r.pucker_per_side < MIN_PUCKER_PER_SIDE_MM) {
    w.push({ id: 'pucker', severity: 'warning', field: 'face_per_cell', message: `Pucker of ${fmtIn(r.pucker_per_side)}" per side is under the ~0.9" a rifle mag needs to be wrapped; widen the face per cell.` });
  }
  if (r.pocket_set === 'stacked_cells') {
    if (inputs.wrap_allowance === undefined) w.push({ id: 'mock-derived-wrap', severity: 'warning', field: 'wrap_allowance', message: `[mock-derived] Wrap allowance defaults to ${fmtIn(r.wrap_allowance)}"; on camera it was 3 1/4", 3 1/2" and 3 3/4" in fifteen seconds. Pin scrap round two real magazines and measure.` });
    if (!r.pals_aligned) w.push({ id: 'pals-misaligned', severity: 'info', field: 'cell_span', message: `A ${fmtIn(r.cell_span)}" cell is not on the 1.5" PALS grid; anything mounted to the cell faces will not line up in spec spacing (the .308 rig accepts this).` });
    if (r.loaded_weight_lb > WEIGHT_WARN_LB) w.push({ id: 'weight', severity: 'warning', field: 'cell_count', message: `${r.cell_count * r.cells_deep} loaded ${r.mag.platform === 'rifle_308' ? '.308' : ''} magazines weigh about ${Math.round(r.loaded_weight_lb)} lb. SOE's eight-mag .308 rig became a four-mag rig: "everybody wants it until they have it". Reduce columns or depth.` });
    if (r.mag.platform === 'rifle_308') w.push({ id: 'r308-height', severity: 'info', message: `The .308 pouch is shorter than the 5.56 one (${fmtIn(r.pouch_height)}" at ${Math.round(r.coverage * 100)} % coverage of a ${fmtIn(r.mag.height)}" magazine), and plain pulls replace the split pulls.` });
    if (r.mag_exposed_height < 1.5 * IN) w.push({ id: 'grab', severity: 'warning', field: 'coverage', message: `Only ${fmtIn(r.mag_exposed_height)}" of magazine stands proud of the mouth; lower the coverage or add cradle drop for a grab.` });
  }
  if (r.pocket_set === 'mag_cells' && r.cell_count > 4 && r.mag.platform !== 'rifle_308') {
    w.push({ id: 'class', severity: 'info', message: 'Four rifle mags is the definition of the micro rig class; six only happens on the .308 panel. More than that and "you do not belong in a micro rig".' });
  }
  if (r.buckle_spacing < 2 * IN) {
    w.push({ id: 'buckle-spacing', severity: 'warning', field: 'panel_width', message: `Shoulder buckles land only ${fmtIn(r.buckle_spacing)}" apart on this panel; the 4" edge offset is a 13–16" panel figure.` });
  }
  if (inputs.panel_height === undefined) {
    w.push({ id: 'mock-derived-height', severity: 'info', field: 'panel_height', message: '[mock-derived] Panel height defaults to the 7" nominal; the site lists PALS variants at 6.5". Expect ±0.5" between variants.' });
  }
  w.push({ id: 'pals-top-drop', severity: 'info', message: '[mock-derived] Side PALS top bar is placed 1 1/2" down (the video garbles 1 1/2" vs 2 1/2").' });
  w.push({ id: 'admin-only', severity: 'info', message: 'The internal pocket is admin-only: rifle mags stick out the top and the front waist buckle blocks extraction beyond about two.' });
  return w;
}

export function buildPattern(inputs: MicroRigInputs): Result<MicroRigBuildResult> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  const r = resolveInputs(inputs);
  const face = buildFacePieces(r);
  const pieces: Piece[] = [buildPanelFront(r), buildPanelBack(r), ...face.pieces, ...buildStackedPieces(r), ...buildUtilityPocket(r), ...buildStrips(r)];
  return {
    ok: true,
    value: { pieces, steps: buildSteps(r), warnings: buildWarnings(inputs, r, face.warnings), hardware: buildHardware(r), resolved: r },
  };
}
