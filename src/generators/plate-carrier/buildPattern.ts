/**
 * Plate Carrier — pattern builder (Convention A: finished dims; bound edges
 * carry explicit 0, turned edges carry the seam allowance).
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import { buildPalsField, type PalsFieldResult } from '../../lib/pattern-engine/primitives/palsField.js';
import { buildPaddedStrap } from '../../lib/strap-engine/index.js';
import type { PlateCarrierInputs, PlateCarrierBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError, HardwareItem } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import { PLACARD_MIN_ENGAGEMENT_MM } from './defaults.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };

export const FRONT_SHELL_ID = 'pc-front-shell';
export const BACK_SHELL_ID = 'pc-back-shell';
export const FRONT_POCKET_ID = 'pc-front-pocket-wall';
export const BACK_POCKET_ID = 'pc-back-pocket-wall';
export const POCKET_FLAP_ID = 'pc-pocket-flap';
export const BACK_COMFORT_ID = 'pc-back-comfort';
export const BACK_FOAM_ID = 'pc-back-foam';
export const LOOP_FIELD_ID = 'pc-loop-field';
export const SHOULDER_PAD_ID = 'pc-shoulder-pad';
export const SHOULDER_WEBBING_ID = 'pc-shoulder-webbing';
export const CUMMERBUND_ID = 'pc-cummerbund';
export const CUMMERBUND_LAMINATE_ID = 'pc-cummerbund-laminate';
export const CUMMERBUND_ELASTIC_ID = 'pc-cummerbund-elastic';
export const SIDE_PLATE_POCKET_ID = 'pc-side-plate-pocket';
/** Rear elastic section of a skeletal cummerbund — Open in the vault. */
export const SKELETAL_REAR_ELASTIC_MM = 6 * 25.4;

const IN = 25.4;
const fmtIn = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');
const dim = (mm: number) => `${Math.round(mm)} mm (${fmtIn(mm)}")`;

function seg(eid: () => EdgeId, role: Edge['role'], a: Point, b: Point): Edge {
  return { kind: 'straight', id: eid(), role, start: a, end: b };
}
function polygon(eid: () => EdgeId, id: string, pts: Point[], role: Edge['role'] = 'cut'): Path {
  return { id, closed: true, edges: pts.map((p, i) => seg(eid, role, p, pts[(i + 1) % pts.length])) };
}
function rectPts(x: number, y: number, w: number, h: number): Point[] {
  return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
}
function saRecord(path: Path, sa: number): Record<EdgeId, number> { const o: Record<EdgeId, number> = {}; for (const e of path.edges) o[e.id] = sa; return o; }
/** Bartack / box-X marks: a short notch cross labelled B or X (construction-bartack-reinforcement.md). */
function mark(eid: () => EdgeId, id: string, at: Point, kind: 'B' | 'X', label?: string): Path {
  const s = kind === 'X' ? 8 : 4;
  return { id, closed: false, label: label ?? (kind === 'X' ? 'Box-X' : 'Bartack'), edges: [seg(eid, 'notch', { x: at.x - s, y: at.y - s }, { x: at.x + s, y: at.y + s }), seg(eid, 'notch', { x: at.x - s, y: at.y + s }, { x: at.x + s, y: at.y - s })] };
}

function shellPiece(r: ResolvedInputs, side: 'front' | 'back'): { piece: Piece; pals?: PalsFieldResult } {
  const id = side === 'front' ? FRONT_SHELL_ID : BACK_SHELL_ID;
  const eid = makeEdgeIdGen(id);
  const W = r.panel_width, H = r.panel_height, o = r.shell_oversize;
  const outline = polygon(eid, `${id}-outline`, r.panel_outline);
  const sa = r.edge_finish === 'turned' ? r.seam_allowance : 0;
  const paths: Path[] = [outline];
  // Pocket wall lands inside the binding: its outline is the sew reference.
  paths.push(polygon(eid, `${id}-pocket-line`, r.pocket_outline.map((p) => ({ x: p.x + o, y: p.y + o })), 'stitch'));
  paths[1].label = `Pocket wall sew line — the plate cavity is ${fmtIn(r.pocket_width)} × ${fmtIn(r.pocket_height)}" (plate + ${fmtIn(r.pocket_ease)}" ease per side)`;
  const field = side === 'front' ? r.front_field : r.back_field;
  const faceX = o + r.binding_width / 2, faceW = W - 2 * faceX;
  const topClipDy = r.panel_outline[2].y;
  let pals: PalsFieldResult | undefined;
  const loopTop = o + r.loop_field_y_offset;
  if (field === 'loop' || field === 'split') {
    const lw = r.loop_field_width, lh = r.loop_field_height;
    const lx = (W - lw) / 2;
    paths.push(polygon(eid, `${id}-loop-field`, rectPts(lx, loopTop, lw, lh), 'stitch'));
    paths[paths.length - 1].label = `Loop field ${fmtIn(lw)} × ${fmtIn(lh)}" — box-stitch the perimeter, edges tucked under the binding where they reach it`;
  }
  if (field === 'pals_sewn' || field === 'pals_laser' || field === 'split') {
    const y0 = field === 'split' ? loopTop + r.loop_field_height + 0.5 * IN : Math.max(topClipDy, o) + 0.25 * IN;
    const h = H - o - y0;
    if (h > 0) {
      pals = buildPalsField({ origin: { x: faceX, y: y0 }, width: faceW, height: h, style: field === 'pals_laser' ? 'laser' : 'sewn', idPrefix: `${id}-pals`, eid });
      paths.push(...pals.paths);
    }
  }
  // Reinforcement map: box-X where each shoulder strap lands, bartacks at the cummerbund anchors.
  const strapX = [W * 0.25, W * 0.75];
  strapX.forEach((x, i) => paths.push(mark(eid, `${id}-strap-x-${i}`, { x, y: topClipDy + o + r.strap_width / 2 }, 'X', i === 0 ? `Box-X — shoulder strap lands here (${fmtIn(r.strap_width)}" wide)` : undefined)));
  if (r.cummerbund_style !== 'none') {
    const cy = H * 0.55;
    [o + 6, W - o - 6].forEach((x, i) => paths.push(mark(eid, `${id}-cb-b-${i}`, { x, y: cy }, 'B', i === 0 ? `Bartack — cummerbund sleeve anchor, ${fmtIn(r.cummerbund_width)}" band centred here` : undefined)));
  }
  const piece: Piece = {
    id, name: side === 'front' ? 'Front panel shell' : 'Back panel shell', mirror: false, quantity: 1,
    materialId: r.shell_material === 'laminate' ? 'laminate-squadron' : r.shell_material === '1000d' ? 'cordura-1000' : 'cordura-500',
    paths, seamAllowances: saRecord(outline, sa),
    annotations: [
      { kind: 'grain', label: 'grain', point: { x: W / 2, y: H * 0.8 }, angle: 90 },
      { kind: 'label', label: `${side === 'front' ? 'Front' : 'Back'} shell — ${dim(W)} × ${dim(H)} finished, ${r.plate_cut.toUpperCase()} cut, ${r.edge_finish === 'bound' ? `bound with ${fmtIn(r.binding_width)}" tape (no allowance)` : `turned (${fmtIn(r.seam_allowance)}" allowance)`}`, point: { x: W / 2, y: H * 0.5 } },
    ],
  };
  return { piece, pals };
}

function pocketWall(r: ResolvedInputs, side: 'front' | 'back'): Piece {
  const id = side === 'front' ? FRONT_POCKET_ID : BACK_POCKET_ID;
  const eid = makeEdgeIdGen(id);
  const o = r.shell_oversize;
  // Same outline as the shell so it binds in the same pass; the opening edge is hemmed 1".
  const outline = polygon(eid, `${id}-outline`, r.panel_outline);
  const W = r.panel_width, H = r.panel_height;
  const hemY = r.pocket_opening === 'top' ? o + 1 * IN : H - o - 1 * IN;
  const paths: Path[] = [outline,
    { id: `${id}-opening-hem`, closed: false, label: `Opening hem — fold 1" (mark at 2") at the ${r.pocket_opening} of the pocket (180°)`, edges: [seg(eid, 'fold', { x: 0, y: hemY }, { x: W, y: hemY })] },
  ];
  const sa = r.edge_finish === 'turned' ? r.seam_allowance : 0;
  return {
    id, name: `${side === 'front' ? 'Front' : 'Back'} plate pocket wall`, mirror: false, quantity: 1, materialId: 'cordura-500', paths, seamAllowances: saRecord(outline, sa),
    annotations: [{ kind: 'label', label: `Pocket wall — sits inside the shell, bound with it; ${r.pocket_opening} edge is the opening`, point: { x: W / 2, y: H / 2 } }],
  };
}

function pocketFlap(r: ResolvedInputs): Piece {
  const id = POCKET_FLAP_ID;
  const eid = makeEdgeIdGen(id);
  const W = r.pocket_width - r.binding_width, L = r.pocket_flap_length + 1 * IN;
  const outline = polygon(eid, `${id}-outline`, rectPts(0, 0, W, L));
  return {
    id, name: 'Plate pocket flap', mirror: false, quantity: 2, materialId: 'cordura-500',
    paths: [outline,
      { id: `${id}-anchor`, closed: false, label: 'Sewn into the shell binding along this 1" (the flap clears the strap box-X)', edges: [seg(eid, 'stitch', { x: 0, y: 1 * IN }, { x: W, y: 1 * IN })] },
      polygon(eid, `${id}-hook`, rectPts(0.5 * IN, 1.5 * IN, W - 0.5 * IN, r.pocket_flap_length - 1 * IN), 'stitch'),
    ],
    seamAllowances: saRecord(outline, 0),
    annotations: [{ kind: 'label', label: `Pocket flap ${dim(W)} × ${dim(L)}: hook on the inside face, loop on the pocket wall`, point: { x: W / 2, y: L / 2 } }],
  };
}

function comfortPieces(r: ResolvedInputs): Piece[] {
  if (r.back_comfort === 'none') return [];
  const inset = 0.25 * IN;
  const shrink = (pts: Point[]) => {
    const W = r.panel_width, H = r.panel_height;
    return pts.map((p) => ({ x: p.x < W / 2 ? p.x + inset : p.x - inset, y: p.y < H / 2 ? p.y + inset : p.y - inset }));
  };
  const out: Piece[] = [];
  const eid = makeEdgeIdGen(BACK_COMFORT_ID);
  const outline = polygon(eid, `${BACK_COMFORT_ID}-outline`, shrink(r.panel_outline));
  out.push({ id: BACK_COMFORT_ID, name: 'Back comfort layer (spacer mesh)', mirror: false, quantity: 1, materialId: 'spacer-mesh', paths: [outline], seamAllowances: saRecord(outline, 0), annotations: [{ kind: 'label', label: 'Spacer mesh, inset 1/4" so the binding closes round shell + mesh', point: { x: r.panel_width / 2, y: r.panel_height / 2 } }] });
  if (r.back_comfort === 'foam_mesh') {
    const eid2 = makeEdgeIdGen(BACK_FOAM_ID);
    const o2 = polygon(eid2, `${BACK_FOAM_ID}-outline`, shrink(shrink(r.panel_outline)));
    out.push({ id: BACK_FOAM_ID, name: `Back pad foam (${Math.round(r.comfort_foam_thickness)} mm closed-cell)`, mirror: false, quantity: 1, materialId: 'foam-closed-cell', paths: [o2], seamAllowances: saRecord(o2, 0), annotations: [{ kind: 'label', label: 'Foam — separate cut sheet (different blade); inset 1/2" so no foam sits under the binding', point: { x: r.panel_width / 2, y: r.panel_height / 2 } }] });
  }
  return out;
}

function loopFieldPiece(r: ResolvedInputs): Piece | null {
  const front = r.front_field === 'loop' || r.front_field === 'split';
  const back = r.back_field === 'loop';
  if (!front && !back) return null;
  const eid = makeEdgeIdGen(LOOP_FIELD_ID);
  const W = r.loop_field_width, H = r.loop_field_height;
  const outline = polygon(eid, `${LOOP_FIELD_ID}-outline`, rectPts(0, 0, W, H));
  return { id: LOOP_FIELD_ID, name: 'Loop field', mirror: false, quantity: (front ? 1 : 0) + (back ? 1 : 0), materialId: 'velcro-loop', paths: [outline], seamAllowances: saRecord(outline, 0), annotations: [{ kind: 'label', label: `Loop ${dim(W)} × ${dim(H)} — cut 1/4" long each way; loop shrinks under the box stitch`, point: { x: W / 2, y: H / 2 } }] };
}

function cummerbundPieces(r: ResolvedInputs, warnings: GeneratorWarning[]): Piece[] {
  if (r.cummerbund_style === 'none') return [];
  const out: Piece[] = [];
  const cw = r.cummerbund_width, L = r.cummerbund_length;
  if (r.cummerbund_style === 'elastic') {
    const eid = makeEdgeIdGen(CUMMERBUND_ID);
    const outline = polygon(eid, `${CUMMERBUND_ID}-outline`, rectPts(0, 0, L, cw));
    const paths: Path[] = [outline,
      polygon(eid, `${CUMMERBUND_ID}-rear-hook`, rectPts(0, 0.25 * IN, r.cummerbund_overlap, cw - 0.5 * IN), 'stitch'),
      polygon(eid, `${CUMMERBUND_ID}-front-hook`, rectPts(L - r.cummerbund_overlap, 0.25 * IN, r.cummerbund_overlap, cw - 0.5 * IN), 'stitch'),
    ];
    paths[1].label = `Rear end: ${fmtIn(r.cummerbund_overlap)}" of hook into the back panel sleeve`;
    paths[2].label = r.qr_buckle === 'none' ? `Front end: ${fmtIn(r.cummerbund_overlap)}" of hook into the front sleeve` : `Front end: ${r.qr_buckle.toUpperCase()} buckle mount (webbing loop, geometry per the buckle)`;
    out.push({ id: CUMMERBUND_ID, name: `Cummerbund, ${fmtIn(cw)}" elastic`, mirror: false, quantity: 2, materialId: cw >= 3.9 * IN ? 'elastic-4in' : 'elastic-3in', paths, seamAllowances: saRecord(outline, 0), annotations: [{ kind: 'label', label: `Elastic cummerbund ${dim(L)} per side = half of ${fmtIn(r.cummerbund_free_girth)}" free girth + ${fmtIn(r.cummerbund_overlap)}" of hook at each end`, point: { x: L / 2, y: cw / 2 } }] });
  } else {
    const lamL = Math.max(0, L - SKELETAL_REAR_ELASTIC_MM);
    const eid = makeEdgeIdGen(CUMMERBUND_LAMINATE_ID);
    const outline = polygon(eid, `${CUMMERBUND_LAMINATE_ID}-outline`, rectPts(0, 0, lamL, cw));
    const pals = buildPalsField({ origin: { x: 0, y: 0 }, width: lamL, height: cw, style: 'laser', idPrefix: `${CUMMERBUND_LAMINATE_ID}-pals`, eid });
    out.push({ id: CUMMERBUND_LAMINATE_ID, name: 'Cummerbund, laminate front section', mirror: false, quantity: 2, materialId: 'laminate-squadron', paths: [outline, ...pals.paths], seamAllowances: saRecord(outline, 0), annotations: [{ kind: 'label', label: `Laser-cut laminate ${dim(lamL)} × ${dim(cw)}, ${pals.cols} × ${pals.rows} slots`, point: { x: lamL / 2, y: cw / 2 } }] });
    const eid2 = makeEdgeIdGen(CUMMERBUND_ELASTIC_ID);
    const o2 = polygon(eid2, `${CUMMERBUND_ELASTIC_ID}-outline`, rectPts(0, 0, SKELETAL_REAR_ELASTIC_MM, cw));
    out.push({ id: CUMMERBUND_ELASTIC_ID, name: 'Cummerbund, rear elastic section', mirror: false, quantity: 2, materialId: cw >= 3.9 * IN ? 'elastic-4in' : 'elastic-3in', paths: [o2], seamAllowances: saRecord(o2, 0), annotations: [{ kind: 'label', label: `Rear elastic ${dim(SKELETAL_REAR_ELASTIC_MM)} — length is Open in the vault (mock it)`, point: { x: SKELETAL_REAR_ELASTIC_MM / 2, y: cw / 2 } }] });
    warnings.push({ id: 'mock-derived-skeletal-rear', severity: 'warning', message: `[mock-derived] The skeletal cummerbund's rear elastic section is ${fmtIn(SKELETAL_REAR_ELASTIC_MM)}" here; the vault gives no length. Mock the split on the wearer.` });
  }
  if (r.side_plate !== 'none') {
    const eid = makeEdgeIdGen(SIDE_PLATE_POCKET_ID);
    const ease = 0.375 * IN;
    const W = r.side_plate_width + 2 * ease, H = r.side_plate_height + ease + 1.5 * IN;
    const outline = polygon(eid, `${SIDE_PLATE_POCKET_ID}-outline`, rectPts(0, 0, W, H));
    out.push({ id: SIDE_PLATE_POCKET_ID, name: `Side plate pocket (${r.side_plate})`, mirror: false, quantity: 2, materialId: 'cordura-500', paths: [outline, { id: `${SIDE_PLATE_POCKET_ID}-flap`, closed: false, label: 'Hook-and-loop flap fold (180°)', edges: [seg(eid, 'fold', { x: 0, y: 1.5 * IN }, { x: W, y: 1.5 * IN })] }], seamAllowances: saRecord(outline, 0), annotations: [{ kind: 'label', label: `Side plate pocket ${dim(W)} × ${dim(H)} on the inner face of the cummerbund`, point: { x: W / 2, y: H / 2 } }] });
    if (r.side_plate_height > r.cummerbund_width) warnings.push({ id: 'side-plate-taller', severity: 'warning', field: 'side_plate', message: `A ${fmtIn(r.side_plate_height)}" side plate is taller than the ${fmtIn(r.cummerbund_width)}" cummerbund: the pocket steps above and below the band (drawn ${fmtIn(r.side_plate_height + 0.375 * IN)}" tall). A wider band is the cleaner fix.` });
  }
  return out;
}

function shoulderPieces(r: ResolvedInputs, hardware: HardwareItem[], steps: Step[], warnings: GeneratorWarning[]): Piece[] {
  if (r.shoulder_style === 'webbing') {
    const eid = makeEdgeIdGen(SHOULDER_WEBBING_ID);
    const L = r.shoulder_strap_length + r.strap_adjust_range + 2 * IN;
    const outline = polygon(eid, `${SHOULDER_WEBBING_ID}-outline`, rectPts(0, 0, r.strap_width, L));
    hardware.push({ id: 'velcro-strap', name: `${fmtIn(r.strap_width)}" hook + loop, ${fmtIn(r.strap_adjust_range + 2 * IN)}" each per strap`, quantity: 2, notes: 'Velcro overlap adjustment; bartack both ends of the loop run.' });
    return [{ id: SHOULDER_WEBBING_ID, name: 'Shoulder strap (slick webbing)', mirror: false, quantity: 2, materialId: r.strap_width >= 1.9 * IN ? 'webbing-51' : 'webbing-38', paths: [outline, mark(eid, `${SHOULDER_WEBBING_ID}-x0`, { x: r.strap_width / 2, y: 1 * IN }, 'X', 'Box-X onto the back panel'), mark(eid, `${SHOULDER_WEBBING_ID}-x1`, { x: r.strap_width / 2, y: L - 1 * IN }, 'X', 'Box-X onto the front panel (or the Velcro overlap end)')], seamAllowances: saRecord(outline, 0), annotations: [{ kind: 'label', label: `Slick strap ${dim(r.strap_width)} × ${dim(L)}: ${fmtIn(r.shoulder_strap_length)}" span + ${fmtIn(r.strap_adjust_range)}" adjustment + 2" box-X ends`, point: { x: r.strap_width / 2, y: L / 2 } }] }];
  }
  const free = Math.max(0, r.shoulder_strap_length - r.pad_length);
  const strap = buildPaddedStrap({
    padLength_mm: r.pad_length,
    padWidth_mm: r.strap_width,
    foamThickness_mm: r.pad_foam_thickness,
    curve: 'straight',
    architecture: 'foam_sandwich_mesh',
    edgeFinish: r.edge_finish,
    webbingWidth_mm: r.strap_width,
    tailLength_mm: free / 2 + r.strap_adjust_range + 2 * IN,
    topAnchorLength_mm: free / 2 + 2 * IN,
    seamAllowance_mm: r.seam_allowance,
    bindingWidth_mm: r.binding_width,
    quantity: 2,
    hardware: 'tri_glide',
    idPrefix: 'pc.strap.',
    pieceId: SHOULDER_PAD_ID,
    name: 'Shoulder strap pad',
  });
  hardware.push(...strap.hardware);
  steps.push(...strap.steps);
  warnings.push(...strap.warnings.map((message, i) => ({ id: `strap-${i}`, severity: 'warning' as const, message })));
  return strap.pieces;
}

function buildSteps(r: ResolvedInputs, pals: { front?: PalsFieldResult; back?: PalsFieldResult }): Step[] {
  const bound = r.edge_finish === 'bound';
  const steps: Step[] = [
    { id: 'pc.cut', title: 'Cut the panels', body: `Front and back shells ${dim(r.panel_width)} × ${dim(r.panel_height)} in the ${r.plate_cut.toUpperCase()} outline${bound ? ' (finished size: binding adds nothing)' : ` plus ${fmtIn(r.seam_allowance)}" allowance for turning`}; pocket walls the same outline; flaps; ${r.back_comfort !== 'none' ? 'spacer mesh inset 1/4"; ' : ''}foam on its own sheet. The pocket cavity comes out ${fmtIn(r.pocket_width)} × ${fmtIn(r.pocket_height)}" for a ${fmtIn(r.plate_width)} × ${fmtIn(r.plate_height)}" plate.`, dependsOn: [], refsPieces: [FRONT_SHELL_ID, BACK_SHELL_ID, FRONT_POCKET_ID, BACK_POCKET_ID], group: 'Cut' },
    { id: 'pc.fields', title: 'Fields onto the flat shells — before anything else', body: [
      r.front_field === 'loop' || r.front_field === 'split' ? `Front: box-stitch the ${fmtIn(r.loop_field_width)} × ${fmtIn(r.loop_field_height)}" loop field at the marks, ${fmtIn(r.loop_field_y_offset)}" below the pocket top.` : '',
      pals.front ? `Front: ${pals.front.rows} PALS rows × ${pals.front.cols} columns${r.front_field === 'pals_laser' ? ' (laser slots — cut, not sewn)' : ', rows cut 1" long, bartack every column line, all columns in one direction, trim flush'}.` : '',
      pals.back ? `Back: ${pals.back.rows} PALS rows × ${pals.back.cols} columns${r.back_field === 'pals_laser' ? ' (laser slots)' : ', rows cut 1" long, bartacked, trimmed flush'}.` : '',
      r.back_field === 'loop' ? 'Back: box-stitch the loop field.' : '',
      'Nothing goes on after the pocket wall is in: you would sew the pocket shut.',
    ].filter(Boolean).join(' '), dependsOn: ['pc.cut'], refsPieces: [FRONT_SHELL_ID, BACK_SHELL_ID], group: 'Fields' },
    { id: 'pc.pocket-hem', title: 'Hem the pocket openings', body: `Fold the ${r.pocket_opening} edge of each pocket wall 1" (mark at 2"), double stitch. Loop for the flap goes on the wall's outer face now.`, dependsOn: ['pc.cut'], refsPieces: [FRONT_POCKET_ID, BACK_POCKET_ID], group: 'Pocket' },
    { id: 'pc.sleeves', title: 'Cummerbund sleeves on the inner faces', body: r.cummerbund_style === 'none' ? 'No cummerbund: skip.' : `Loop strips ${fmtIn(r.cummerbund_overlap)}" long on the inner face of both panels at the bartack marks, centred on the ${fmtIn(r.cummerbund_width)}" band height; bartack each end. ${r.qr_buckle !== 'none' ? `Front side takes the ${r.qr_buckle.toUpperCase()} buckle mount instead: a webbing loop pass-through sized to that buckle.` : ''}`, dependsOn: ['pc.fields'], refsPieces: [FRONT_SHELL_ID, BACK_SHELL_ID], group: 'Pocket' },
    { id: 'pc.stack', title: 'Stack each panel', body: `Shell face down, pocket wall on it (hemmed edge at the ${r.pocket_opening}), flap anchor caught in the ${r.pocket_opening === 'top' ? 'top' : 'bottom'} edge${r.back_comfort !== 'none' ? ', mesh (and foam) on the back panel' : ''}. Baste the stack 1/4" from the edge.`, dependsOn: ['pc.pocket-hem', 'pc.sleeves'], refsPieces: [FRONT_SHELL_ID, FRONT_POCKET_ID, POCKET_FLAP_ID], group: 'Assembly' },
    bound
      ? { id: 'pc.bind', title: 'Bind the perimeters', body: `${fmtIn(r.binding_width)}" tape folded over the whole stack, one pass, binder foot or careful hand feed. Do not compress the mesh with the binding. Bind the pads and cummerbund ends the same way.`, dependsOn: ['pc.stack'], refsPieces: [FRONT_SHELL_ID, BACK_SHELL_ID], group: 'Assembly' }
      : { id: 'pc.bind', title: 'Turn and topstitch', body: `Shell and pocket wall right sides together, ${fmtIn(r.seam_allowance)}" seam round the outline leaving the opening, turn, topstitch 1/8" from the edge. Foam does not turn: leave it out of turned panels.`, dependsOn: ['pc.stack'], refsPieces: [FRONT_SHELL_ID, BACK_SHELL_ID], group: 'Assembly' },
    { id: 'pc.straps', title: 'Shoulder straps last — box-X', body: `Sew the strap ends to the box-X marks: front and back, ${fmtIn(r.strap_width)}" wide, thread one size up. Stitch the rectangle first, then the X, in one pass. Sew the left and right straps in opposite directions so the panels clock together. ${r.shoulder_style === 'padded' ? `Pads ${fmtIn(r.pad_length)}" cover the trapezius; ${fmtIn(r.strap_adjust_range)}" of Velcro overlap at the front end, bartacked at both adjustment limits.` : `${fmtIn(r.strap_adjust_range)}" of Velcro overlap at the front end, bartacked at both adjustment limits.`}`, dependsOn: ['pc.bind'], refsPieces: [FRONT_SHELL_ID, BACK_SHELL_ID, r.shoulder_style === 'padded' ? SHOULDER_PAD_ID : SHOULDER_WEBBING_ID], group: 'Assembly' },
    { id: 'pc.fit', title: 'Fit check', body: `Plate top two finger widths below the sternal notch, bottom at or above the navel seated. That vertical placement is what the ${fmtIn(r.shoulder_strap_length)}" strap span sets — adjust the straps, not the plate size.`, dependsOn: ['pc.straps'], refsPieces: [], group: 'Finish' },
  ];
  if (r.cummerbund_style !== 'none') steps.splice(7, 0, { id: 'pc.cummerbund', title: 'Cummerbund', body: `${r.cummerbund_style === 'elastic' ? `Two ${fmtIn(r.cummerbund_width)}" elastic bands ${fmtIn(r.cummerbund_length)}" long` : `Laminate front sections with the laser slots, elastic rear sections`}${r.side_plate !== 'none' ? `, side plate pockets sewn to the inner face, symmetric` : ''}; hook on both ends, rear end into the back sleeve first, then the front. Bind the ends.`, dependsOn: ['pc.bind'], refsPieces: [r.cummerbund_style === 'elastic' ? CUMMERBUND_ID : CUMMERBUND_LAMINATE_ID], group: 'Assembly' });
  return steps;
}

function buildWarnings(r: ResolvedInputs, pals: { front?: PalsFieldResult; back?: PalsFieldResult }): GeneratorWarning[] {
  const w: GeneratorWarning[] = [];
  w.push({ id: 'reference-grade', severity: 'info', message: 'The vault\'s plate-carrier notes are reference material, not a reconciled build: plate sizes and PALS spacing are firm, everything else here is a starting point to mock in scrap.' });
  // One note, not one per field: the settings panel marks each of these fields
  // itself, and a stack of identical yellow warnings on an untouched project
  // teaches the user to ignore the list.
  if (r.mock_derived.length > 0) w.push({ id: 'mock-derived', severity: 'info', field: r.mock_derived[0], message: `[mock-derived] ${r.mock_derived.map((f) => f.replace(/_/g, ' ')).join(', ')} ${r.mock_derived.length === 1 ? 'is a default' : 'are defaults'} the vault does not measure. Enter the wearer's numbers before cutting.` });
  if ((r.front_field === 'loop' || r.front_field === 'split') && r.loop_field_height < PLACARD_MIN_ENGAGEMENT_MM) w.push({ id: 'loop-engagement', severity: 'warning', field: 'loop_field_height', message: `A ${fmtIn(r.loop_field_height)}" loop field gives less than the ~2" of hook/loop engagement a placard needs.` });
  if ((r.front_field === 'pals_laser' || r.back_field === 'pals_laser') && r.shell_material !== 'laminate') w.push({ id: 'laser-needs-laminate', severity: 'warning', field: 'shell_material', message: 'Laser-cut PALS wants a stiff laminate (Squadron / B52 / Hypalon); 500D or 1000D alone is too floppy to hold slots.' });
  if (r.plate_height > r.torso_length - 1.5 * IN) w.push({ id: 'plate-too-tall', severity: 'warning', field: 'plate_preset', message: `A ${fmtIn(r.plate_height)}" plate on a ${fmtIn(r.torso_length)}" torso leaves under 1.5" for the two finger widths below the sternal notch and clearance above the navel: it will hit the lap seated.` });
  if (r.pocket_ease > 0.5 * IN + 1e-6) w.push({ id: 'ease-loose', severity: 'info', field: 'pocket_ease', message: 'Over 1/2" of ease per side lets the plate shift in the pocket.' });
  for (const p of [pals.front, pals.back]) if (p) for (const m of p.warnings) w.push({ id: `pals-${w.length}`, severity: 'warning', message: m });
  if (r.qr_buckle !== 'none') w.push({ id: 'qr-geometry', severity: 'info', field: 'qr_buckle', message: `${r.qr_buckle.toUpperCase()} mount geometry is buckle-specific (loop pass-throughs); the cummerbund front end is marked, the hardware drawing comes from the buckle maker.` });
  if (r.cummerbund_style === 'skeletal') w.push({ id: 'skeletal-stretch', severity: 'info', message: 'A skeletal cummerbund has little stretch: size the free girth to the wearer with the elastic rear section taking the breathing room.' });
  if (r.edge_finish === 'turned' && r.back_comfort === 'foam_mesh') w.push({ id: 'turned-foam', severity: 'warning', field: 'edge_finish', message: 'Foam does not turn well: turned construction leaves the foam out of the seam and drops it in afterwards, or switch to binding.' });
  w.push({ id: 'strap-span', severity: 'info', field: 'shoulder_strap_length', message: `Strap span ${fmtIn(r.shoulder_strap_length)}" panel top to panel top (+${fmtIn(r.strap_adjust_range)}" adjustment). The 3D check compares it to a medium torso; the wearer's own over-the-shoulder measurement wins.` });
  return w;
}

export function buildPattern(inputs: PlateCarrierInputs): Result<PlateCarrierBuildResult> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  const r = resolveInputs(inputs);
  const hardware: HardwareItem[] = [];
  const steps: Step[] = [];
  const warnings: GeneratorWarning[] = [];
  const front = shellPiece(r, 'front');
  const back = shellPiece(r, 'back');
  const pieces: Piece[] = [front.piece, back.piece, pocketWall(r, 'front'), pocketWall(r, 'back'), pocketFlap(r), ...comfortPieces(r)];
  const loop = loopFieldPiece(r);
  if (loop) pieces.push(loop);
  pieces.push(...shoulderPieces(r, hardware, steps, warnings));
  pieces.push(...cummerbundPieces(r, warnings));
  const pals = { front: front.pals, back: back.pals };
  const mainSteps = buildSteps(r, pals);
  hardware.push({ id: 'binding', name: `${fmtIn(r.binding_width)}" binding tape`, quantity: Math.ceil(r.binding_length / IN), notes: r.edge_finish === 'bound' ? 'Inches, all bound edges.' : 'Not needed when turned.' });
  if (r.cummerbund_style !== 'none') hardware.push({ id: 'velcro-cummerbund', name: 'Hook + loop, cummerbund ends and sleeves', quantity: 4, notes: `${fmtIn(r.cummerbund_overlap)}" × ${fmtIn(r.cummerbund_width - 0.5 * IN)}" pairs` });
  if (r.qr_buckle !== 'none') hardware.push({ id: 'qr-buckle', name: { roc: 'ROC buckle 40 mm', tubes: 'FirstSpear Tubes', g_hook: 'ITW G-hook' }[r.qr_buckle], quantity: 2, notes: r.qr_buckle === 'g_hook' ? 'No quick release; slides under tension.' : 'Quick release at the front of the cummerbund.' });
  hardware.push({ id: 'velcro-flap', name: 'Hook + loop, pocket flaps', quantity: 2 });
  return { ok: true, value: { pieces, steps: [...mainSteps, ...steps], warnings: [...buildWarnings(r, pals), ...warnings], hardware, resolved: r } };
}
