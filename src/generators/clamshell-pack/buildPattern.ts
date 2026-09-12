/**
 * Clamshell Pack — pattern builder. Convention A: pieces at finished size,
 * per-edge `seamAllowances`; the zipper lip and bottom fold-ins are drawn as
 * fold regions on the piece (fold-role lines, `(180°)`), so a hemmed edge
 * carries 0 allowance and the sewn edges carry `seam_allowance`.
 */
import type { Piece, PieceAnnotation } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { ClamshellPackInputs, ClamshellPackBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError, HardwareItem } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import { buildPalsField, PALS_COL_PITCH_MM, PALS_ROW_WIDTH_MM } from '../../lib/pattern-engine/primitives/palsField.js';
import * as D from './defaults.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };
export const FACE_ID = 'clamshell-face';
export const BACK_ID = 'clamshell-back';
export const GUSSET_ID = 'clamshell-gusset';
export const LID_STRIP_ID = 'clamshell-lid-strip';
export const BOTTOM_ID = 'clamshell-bottom';

const IN = 25.4;
const fmtIn = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');
const dim = (mm: number) => `${Math.round(mm)} mm (${fmtIn(mm)}")`;

function seg(eid: () => EdgeId, role: Edge['role'], sx: number, sy: number, ex: number, ey: number): Edge {
  return { kind: 'straight', id: eid(), role, start: { x: sx, y: sy }, end: { x: ex, y: ey } };
}
/** Rectangle outline; edges in order top, right, bottom, left. */
function rect(eid: () => EdgeId, id: string, w: number, h: number): Path {
  return { id, closed: true, edges: [seg(eid, 'cut', 0, 0, w, 0), seg(eid, 'cut', w, 0, w, h), seg(eid, 'cut', w, h, 0, h), seg(eid, 'cut', 0, h, 0, 0)] };
}
function sa(path: Path, values: [number, number, number, number]): Record<EdgeId, number> {
  const o: Record<EdgeId, number> = {};
  path.edges.forEach((e, i) => { o[e.id] = values[i]; });
  return o;
}
function line(eid: () => EdgeId, id: string, role: Edge['role'], a: Point, b: Point, label?: string): Path {
  return { id, closed: false, label, edges: [seg(eid, role, a.x, a.y, b.x, b.y)] };
}
function strip(id: string, name: string, w: number, h: number, quantity: number, materialId: string, label: string): Piece {
  const eid = makeEdgeIdGen(id);
  const outline = rect(eid, `${id}-outline`, w, h);
  return { id, name, mirror: false, quantity, materialId, paths: [outline], seamAllowances: sa(outline, [0, 0, 0, 0]), annotations: [{ kind: 'label', label }] };
}
/** Re-map a PALS field's points (built in a local frame) into the host's frame. */
function mapPaths(paths: Path[], f: (p: Point) => Point): Path[] {
  return paths.map((p) => ({ ...p, edges: p.edges.map((e) => (e.kind === 'straight' ? { ...e, start: f(e.start), end: f(e.end) } : e)) }));
}

interface PalsUse { rows: number; cols: number; webbingLength: number; quantity: number; warnings: string[]; where: string }

function facePanel(r: ResolvedInputs, id: string, name: string, isFace: boolean, pals: PalsUse[]): Piece {
  const eid = makeEdgeIdGen(id);
  const W = r.width, H = r.height, S = r.seam_allowance;
  const outline = rect(eid, `${id}-outline`, W, H);
  const paths: Path[] = [outline];
  if (isFace && r.pals_rows_face > 0) {
    const palsWhere = 'face';
    const f = buildPalsField({ origin: { x: r.edge_offset, y: r.edge_offset }, width: W - 2 * r.edge_offset, height: H - 2 * r.edge_offset, rows: r.pals_rows_face, cols: r.face_pals_cols, style: r.pals_style, edgeMargin: 0, idPrefix: `${id}-pals`, eid });
    paths.push(...f.paths);
    pals.push({ rows: f.rows, cols: f.cols, webbingLength: f.webbing.lengthMm, quantity: f.webbing.quantity, warnings: f.warnings, where: palsWhere });
  }
  if (!isFace && r.strap_provision !== 'none') {
    // Removable strap hardware: 2" webbing tabs 4" apart at the top (centre ± 2"), lower anchors 1" up, kicked.
    const cx = W / 2;
    for (const side of [-1, 1]) {
      const x = cx + side * r.strap_tab_spacing / 2;
      paths.push(line(eid, `${id}-tab-top-${side > 0 ? 'r' : 'l'}`, 'stitch', { x: x - D.STRAP_TAB_WEBBING_MM / 2, y: S }, { x: x + D.STRAP_TAB_WEBBING_MM / 2, y: S }, side < 0 ? `Top strap tabs — 2" webbing into the top seam, ${fmtIn(r.strap_tab_spacing)}" apart` : undefined));
      const lx = side < 0 ? S + 1.5 * IN : W - S - 1.5 * IN;
      paths.push(line(eid, `${id}-tab-low-${side > 0 ? 'r' : 'l'}`, 'stitch', { x: lx, y: H - D.LOWER_ANCHOR_RISE_MM }, { x: lx + side * 0.75 * IN, y: H - D.LOWER_ANCHOR_RISE_MM - 2 * IN }, side < 0 ? 'Lower strap anchors 1" up, kicked at an angle' : undefined));
    }
    if (r.strap_provision === 'tabs_and_stow') paths.push(line(eid, `${id}-stow`, 'stitch', { x: S + 1 * IN, y: H * 0.45 }, { x: W - S - 1 * IN, y: H * 0.45 }, 'Strap stow pocket sheet sewn along this line and the side seams (opens upward)'));
  }
  if (r.interior_loop && r.loop_strips_per_wall > 0) {
    for (let i = 0; i < r.loop_strips_per_wall; i++) {
      const y = r.edge_offset + i * (r.loop_strip_width + r.loop_gap);
      paths.push({ id: `${id}-loop-${i}`, closed: false, label: i === 0 ? `Inside: ${r.loop_strips_per_wall} loop strips ${fmtIn(r.loop_strip_width)}" wide, ${fmtIn(r.loop_gap)}" apart — sewn before assembly, cut 2" long` : undefined, edges: [seg(eid, 'stitch', S, y, W - S, y), seg(eid, 'stitch', W - S, y + r.loop_strip_width, S, y + r.loop_strip_width)] });
    }
  }
  const annotations: PieceAnnotation[] = [
    { kind: 'grain', label: 'grain', point: { x: W / 2, y: H / 2 }, angle: 90 },
    { kind: 'label', label: `${name} — ${dim(W)} × ${dim(H)} finished, ${fmtIn(S)}" allowance all round${isFace ? '' : '; single layer where nothing is sewn on'}`, point: { x: W / 2, y: H / 2 } },
  ];
  return { id, name, mirror: false, quantity: 1, materialId: 'cordura-500', paths, seamAllowances: sa(outline, [S, S, S, S]), annotations };
}

/**
 * A hoop strip: finished `depthPart` wide plus the zipper lip fold region (at the bottom edge for
 * the base gusset, at the top edge for the lid strip, so both zipper edges face each other when
 * the strips are stacked in the assembly); corner folds and underwrap folds.
 */
function hoopStrip(r: ResolvedInputs, id: string, name: string, depthPart: number, lipAtTop: boolean, withPals: boolean, pals: PalsUse[]): Piece {
  const eid = makeEdgeIdGen(id);
  const L = r.hoop_cut_length, S = r.seam_allowance, u = r.zipper_underwrap, H = r.height, W = r.width;
  const cutW = depthPart + r.zipper_lip;
  const f0 = lipAtTop ? r.zipper_lip : 0;
  const lipY = lipAtTop ? r.zipper_lip : depthPart;
  const outline = rect(eid, `${id}-outline`, L, cutW);
  const paths: Path[] = [outline,
    line(eid, `${id}-lip`, 'fold', { x: 0, y: lipY }, { x: L, y: lipY }, `Zipper lip — fold the ${fmtIn(r.zipper_lip)}" under and sew the zipper behind it (${lipAtTop ? '180' : '-180'}°)`),
    line(eid, `${id}-corner-l`, 'fold', { x: u + H, y: 0 }, { x: u + H, y: cutW }, 'Top-left corner — notch and turn down the side (-90°)'),
    line(eid, `${id}-corner-r`, 'fold', { x: u + H + W, y: 0 }, { x: u + H + W, y: cutW }, 'Top-right corner (-90°)'),
    line(eid, `${id}-under-l`, 'fold', { x: u, y: 0 }, { x: u, y: cutW }, `Zipper runs ${fmtIn(u)}" under the bottom corner (-90°)`),
    line(eid, `${id}-under-r`, 'fold', { x: u + 2 * H + W, y: 0 }, { x: u + 2 * H + W, y: cutW }, 'Under the bottom corner (-90°)'),
    line(eid, `${id}-overcut`, 'notch', { x: L - r.hoop_overcut, y: 0 }, { x: L - r.hoop_overcut, y: cutW }, `Nominal end — ${fmtIn(r.hoop_overcut)}" overcut, trim at the bottom join`),
  ];
  if (withPals && r.pals_rows_side > 0 && r.pals_cols_side > 0) {
    // Side runs: rows lie across the strip (horizontal on the standing pack), pitched along it; columns run in the depth direction from the seam edge.
    const runs: { x0: number; label: string }[] = [
      { x0: u + S, label: 'left' },
      { x0: u + H + W + r.edge_offset, label: 'right' },
    ];
    for (const run of runs) {
      const palsWhere = `side ${run.label}`;
      const f = buildPalsField({ origin: { x: 0, y: 0 }, width: r.side_pals_budget, height: r.side_work_area, rows: r.pals_rows_side, cols: r.pals_cols_side, style: r.pals_style, edgeMargin: 0, centred: false, idPrefix: `${id}-pals-${run.label}`, eid });
      paths.push(...mapPaths(f.paths, (p) => ({ x: run.x0 + p.y, y: f0 + p.x })));
      pals.push({ rows: f.rows, cols: f.cols, webbingLength: f.webbing.lengthMm, quantity: f.webbing.quantity, warnings: f.warnings, where: palsWhere });
    }
  }
  if (withPals && r.handle) {
    const hx = u + H + (W - r.handle_core_length) / 2;
    paths.push(line(eid, `${id}-handle`, 'stitch', { x: hx, y: f0 + depthPart / 2 }, { x: hx + r.handle_core_length, y: f0 + depthPart / 2 }, `Top handle lands here — ${fmtIn(r.handle_fold_under)}" folded under each end, box-X, PALS start 1" below`));
  }
  if (withPals && r.compression_straps_per_side > 0) {
    for (const side of ['l', 'r'] as const) {
      for (let i = 0; i < r.compression_straps_per_side; i++) {
        const t = (i + 1) / (r.compression_straps_per_side + 1);
        const x = side === 'l' ? u + H * (1 - t) : u + H + W + H * t;
        paths.push(line(eid, `${id}-comp-${side}-${i}`, 'stitch', { x, y: f0 }, { x, y: f0 + 0.75 * IN }, side === 'l' && i === 0 ? 'Compression strap buckle tabs — woven webbing under the PALS field, from a shared datum on both sides' : undefined));
      }
    }
  }
  const annotations: PieceAnnotation[] = [
    { kind: 'grain', label: 'grain', point: { x: u + H + W / 2, y: f0 + depthPart / 2 }, angle: 0 },
    { kind: 'label', label: `${name} — cut ${dim(L)} × ${dim(cutW + S)}: ${fmtIn(depthPart)}" finished + ${fmtIn(r.zipper_lip)}" lip + ${fmtIn(S)}" allowance. Cut long; trim at the bottom join.`, point: { x: u + H + W / 2, y: f0 + depthPart / 2 } },
  ];
  // Allowance on the panel edge and both ends; none on the lip edge (folded). Outline edges: top, right, bottom, left.
  return { id, name, mirror: false, quantity: 1, materialId: 'cordura-500', paths, seamAllowances: sa(outline, lipAtTop ? [0, S, S, S] : [S, S, 0, S]), annotations };
}

function bottomStrip(r: ResolvedInputs, pals: PalsUse[]): Piece {
  const id = BOTTOM_ID;
  const eid = makeEdgeIdGen(id);
  const L = r.bottom_nominal_length, Wd = r.bottom_cut_width, fi = r.fold_in;
  const outline = rect(eid, `${id}-outline`, L, Wd);
  const paths: Path[] = [outline,
    line(eid, `${id}-foldin-l`, 'fold', { x: fi, y: 0 }, { x: fi, y: Wd }, `Fold-in ${fmtIn(fi)}" — mark at ${fmtIn(2 * fi)}" (180°)`),
    line(eid, `${id}-foldin-r`, 'fold', { x: L - fi, y: 0 }, { x: L - fi, y: Wd }, 'Fold-in (180°)'),
    line(eid, `${id}-mark-l`, 'notch', { x: 2 * fi, y: 0 }, { x: 2 * fi, y: Wd * 0.2 }),
    line(eid, `${id}-mark-r`, 'notch', { x: L - 2 * fi, y: 0 }, { x: L - 2 * fi, y: Wd * 0.2 }),
    line(eid, `${id}-hem-t`, 'fold', { x: 0, y: fi }, { x: L, y: fi }, 'Depth fold-in (180°)'),
    line(eid, `${id}-hem-b`, 'fold', { x: 0, y: Wd - fi }, { x: L, y: Wd - fi }, 'Depth fold-in (180°)'),
  ];
  if (r.pals_rows_bottom > 0) {
    const palsWhere = 'bottom';
    const f = buildPalsField({ origin: { x: 2 * fi, y: fi }, width: L - 4 * fi, height: Wd - 2 * fi, rows: r.pals_rows_bottom, style: r.pals_style, idPrefix: `${id}-pals`, eid });
    paths.push(...f.paths);
    pals.push({ rows: f.rows, cols: f.cols, webbingLength: f.webbing.lengthMm, quantity: f.webbing.quantity, warnings: f.warnings, where: palsWhere });
  }
  const annotations: PieceAnnotation[] = [
    { kind: 'grain', label: 'grain', point: { x: L / 2, y: Wd / 2 }, angle: 0 },
    { kind: 'label', label: `Bottom (alligator mouth) — nominal ${dim(L)} × ${dim(Wd)}. CUT AFTER THE HOOP: length = measured gap + ${fmtIn(2 * fi)}"`, point: { x: L / 2, y: Wd / 2 } },
  ];
  // Hemmed all round (fold-ins on the ends, fold-ins on the depth edges): the allowance is the fold, 0 here.
  return { id, name: 'Bottom strip (cut after the hoop)', mirror: false, quantity: 1, materialId: 'cordura-500', paths, seamAllowances: sa(outline, [0, 0, 0, 0]), annotations };
}

function buildSteps(r: ResolvedInputs): Step[] {
  const steps: Step[] = [
    { id: 'cs.cut', title: 'Cut the pieces', body: `Face and back ${dim(r.width)} × ${dim(r.height)} plus ${fmtIn(r.seam_allowance)}" allowance. Base gusset ${dim(r.hoop_cut_length)} × ${dim(r.gusset_cut_width)} and lid strip ${dim(r.hoop_cut_length)} × ${dim(r.lid_cut_width)} — both cut long, trimmed at the bottom join. Do NOT cut the bottom strip yet. Handle webbing ${fmtIn(r.handle_cut_length)}" of 2" with a ${fmtIn(r.handle_core_length)}" 1" core. Velcro and PALS webbing cut long (trim after sewing). Label every mark; strike dead ones — the mystery centre mark cost a panel.`, dependsOn: [], refsPieces: [FACE_ID, BACK_ID, GUSSET_ID, LID_STRIP_ID], group: 'Cut' },
    { id: 'cs.zipper', title: 'Zipper frame first, flat', body: `Sew the zipper's outside edge to the base gusset first (the edge you can see), flip and run the inside line with the small foot riding the chain, then fold the ${fmtIn(r.zipper_lip)}" lip over and put two more lines through it. Same on the lid strip. Stay cognisant of the pulls — most machines sew through one, and it can knock the timing out. Lighter layer up, heavier down; pull tension on the stretchy backer so both halves finish the same length.`, dependsOn: ['cs.cut'], refsPieces: [GUSSET_ID, LID_STRIP_ID], group: 'Frame' },
    { id: 'cs.velcro', title: 'Loop Velcro on the inside walls — now, not later', body: `${r.interior_loop ? `${r.loop_strips_per_wall} strips of ${fmtIn(r.loop_strip_width)}" loop per wall, ${fmtIn(r.loop_gap)}" apart, cut ${fmtIn(r.loop_strip_cut_length)}" and trimmed after: the panel shrinks about 1/2" under the Velcro.` : 'No interior loop chosen.'} "I will forget to put the Velcro on and you cannot really go put the Velcro on after the fact." The Velcro is also what makes the panels hold their shape.`, dependsOn: ['cs.cut'], refsPieces: [FACE_ID, BACK_ID], group: 'Flat work' },
    { id: 'cs.pals', title: 'PALS on every flat piece', body: `Sides: ${r.pals_rows_side} rows of ${r.pals_cols_side} columns on the ${fmtIn(r.side_work_area)}" work area of each side run, starting ${fmtIn(r.edge_offset)}" below the top corner and clear of the underwrap. Face: ${r.pals_rows_face} rows of ${r.face_pals_cols}. Bottom: ${r.pals_rows_bottom} rows (on the bottom strip, later, in the alligator mouth). Mark column lines as running sums from one datum (1 1/2, 3, 4 1/2); gauge with a piece of 1" webbing and re-check — crossing sewn rows shifts the gauge and a 10" work area creeps to 10 1/2. Sew all the columns in one direction.${r.pals_style === 'fabricated' ? ' Fabricated PALS: 2" Cordura folded to 1" and edge taped; woven webbing for anything that carries a buckle.' : ''}`, dependsOn: ['cs.zipper'], refsPieces: [GUSSET_ID, FACE_ID], group: 'Flat work' },
  ];
  if (r.handle) steps.push({ id: 'cs.handle', title: 'Top handle on the gusset', body: `${fmtIn(r.handle_cut_length)}" of 2" webbing over a ${fmtIn(r.handle_core_length)}" 1" core, ${fmtIn(r.handle_fold_under)}" folded under each end, box-X with the same stitch count both ends (count them — ten). It bows because the cut is ${fmtIn(r.handle_bow)}" longer than the footprint; size the bow to a gloved hand. Sew it beside the seam, not in it, with a hidden backup line.`, dependsOn: ['cs.pals'], refsPieces: [GUSSET_ID], group: 'Flat work' });
  if (r.compression_straps_per_side > 0) steps.push({ id: 'cs.compression', title: 'Compression strap tabs from a shared datum', body: `${r.compression_straps_per_side} per side, webbing tabs sewn under the PALS field on both mating pieces from the same datum so they meet after assembly. Straps ${fmtIn(r.compression_strap_length)}" (${fmtIn(r.depth)}" depth + ${fmtIn(r.compression_extra)}"): male buckle on the bag tab, tri-glide on the strap. Every wrap length scales with the depth — the standard cut list is ${fmtIn(r.depth - D.STANDARD_DEPTH_MM)}" short on this bag.`, dependsOn: ['cs.pals'], refsPieces: [GUSSET_ID], group: 'Flat work' });
  if (r.strap_provision !== 'none') steps.push({ id: 'cs.tabs', title: 'Shoulder strap tabs on the back', body: `Six 3" pieces of 2" webbing: two into the top seam ${fmtIn(r.strap_tab_spacing)}" apart (find centre, come ${fmtIn(r.strap_tab_spacing / 2)}" each way), lower anchors 1" up and kicked outboard of the closing seam so the seam is not the load path. Male buckles on the tabs, never captive females. Straps are slick 2" webbing that stow in the back pocket; padded straps must end in the same male-buckle spec. Sternum straps 18" and 24".${r.strap_provision === 'tabs_and_stow' ? ' Sew the stow pocket sheet to the back before the panel goes on; it must swallow two rolled straps and their hardware.' : ' Provision only: the tabs trim off without opening a structural seam.'}`, dependsOn: ['cs.velcro'], refsPieces: [BACK_ID], group: 'Flat work' });
  steps.push(
    { id: 'cs.hoop', title: 'Close the hoop with the alligator mouth', body: `Assemble the frame round an ${fmtIn(r.width)} × ${fmtIn(r.height)} form and MEASURE the bottom gap (mock this in paper first — Velcro, PALS tack-downs and tape all draw the hoop in; his 46" came up 1/2–3/4" short twice). Cut the bottom strip to that gap + ${fmtIn(2 * r.fold_in)}", nominally ${dim(r.bottom_nominal_length)} × ${dim(r.bottom_cut_width)}. Mark ${fmtIn(2 * r.fold_in)}" from each end for the ${fmtIn(r.fold_in)}" fold-in, sew the joins partway leaving the jaws open, put the ${r.pals_rows_bottom} bottom PALS rows and any grommets on while it is flat, then tuck each hoop end into its jaw and sew both sides down.`, dependsOn: ['cs.pals', ...(r.handle ? ['cs.handle'] : [])], refsPieces: [GUSSET_ID, LID_STRIP_ID, BOTTOM_ID], group: 'Assembly' },
    { id: 'cs.back', title: 'Back panel onto the hoop', body: 'Back first. Sew down the two sides in opposite directions so both get equal stretch and the bag clocks. Sew in bites: short sections, pulling to match, pleats where you run out of room the same on both sides, excess pushed to the inside where it disappears. A 1/2–3/4" shortfall gets sewn straight across and tucked.', dependsOn: ['cs.hoop', ...(r.strap_provision !== 'none' ? ['cs.tabs'] : ['cs.velcro'])], refsPieces: [BACK_ID, GUSSET_ID], group: 'Assembly' },
    { id: 'cs.face', title: 'Face panel onto the lid strip', body: 'Then the face, the same way, to the lid strip. The zipper dips under both bottom corners so the face flays fully open: wall-mount, seat-back or ground. Trim thread tails with a fresh blade.', dependsOn: ['cs.back'], refsPieces: [FACE_ID, LID_STRIP_ID], group: 'Assembly' },
  );
  return steps;
}

function buildWarnings(r: ResolvedInputs, pals: PalsUse[]): GeneratorWarning[] {
  const w: GeneratorWarning[] = [];
  const need = r.pals_cols_side * PALS_COL_PITCH_MM;
  if (r.pals_rows_side > 0 && need > r.side_pals_budget + 1e-6) w.push({ id: 'side-pals-budget', severity: 'warning', field: 'pals_cols_side', message: `${r.pals_cols_side} side columns need ${fmtIn(need)}" but the base gusset has ${fmtIn(r.side_pals_budget)}" between the seam and the zipper${r.zipper_clearance > 0 ? ' clearance' : ''}. SOE's budget: lip fold ${fmtIn(r.zipper_lip)}" + PALS + 1/2" seam; make it back where the panel goes into the fold, or drop a column.` });
  if (r.zipper_clearance <= 0) w.push({ id: 'zipper-clearance', severity: 'info', field: 'zipper_clearance', message: 'Bartacks run to the zipper tape. SOE has never seen it degrade a zipper, but a warranty zipper replacement becomes brutal when webbing crosses the tape — add 1/2" of clearance if replaceability matters.' });
  if (Math.abs(r.depth - D.STANDARD_DEPTH_MM) > 1e-6) w.push({ id: 'depth-wrap', severity: 'warning', field: 'depth', message: `Depth ${fmtIn(r.depth)}" is ${fmtIn(r.depth - D.STANDARD_DEPTH_MM)}" off the 3" standard: every wrap-around length (compression straps, harness tails, Velcro runs on the hoop) from a standard cut list is that much short. The lengths here scale with the depth.` });
  w.push({ id: 'hoop-shrink', severity: 'info', message: `Hoop cut ${fmtIn(r.hoop_cut_length)}" (${fmtIn(r.hoop_length)}" + ${fmtIn(r.hoop_overcut)}" overcut). Velcro shrink, PALS tack-downs and edge tape draw it in: cut long, trim at the bottom join, and cut the bottom last from the measured gap.` });
  w.push({ id: 'lid-depth', severity: 'info', field: 'lid_depth', tag: 'mock-derived', message: `Lid depth ${fmtIn(r.lid_depth)}" is inferred from the measured 2 1/2" lip piece (1 1/2" visible); the videos never state the lid-side split. Mock the frame in paper.` });
  w.push({ id: 'underwrap', severity: 'info', field: 'zipper_underwrap', tag: 'mock-derived', message: `Underwrap ${fmtIn(r.zipper_underwrap)}" ("a couple inches under the bottom") is inferred from the 8 1/2" bottom on the 11" bag. It is the opening-angle parameter: more wrap, flatter flay.` });
  w.push({ id: 'compression-extra', severity: 'info', field: 'compression_extra', tag: 'mock-derived', message: `Compression strap length = depth + ${fmtIn(r.compression_extra)}" (12" and 14" straps at 6" depth on camera). Drape webbing over the gusset before cutting.` });
  for (const p of pals) for (const m of p.warnings) if (!w.some((x) => x.message === m)) w.push({ id: `pals-${w.length}`, severity: 'warning', message: m });
  if (r.pocket_grid !== 'custom') w.push({ id: 'pocket-grid', severity: 'info', field: 'pocket_grid', message: `Footprint ${fmtIn(r.width)} × ${fmtIn(r.height)}" comes from the ${r.pocket_grid} mesh-pocket grid — the pocket grid drives the panel, not the reverse.` });
  if (r.strap_provision === 'none') w.push({ id: 'strap-trap', severity: 'info', message: 'No strap provision: at this size you will want shoulder straps, and adding them later means opening a structural seam. Provision the tabs now and trim them if the answer is no (the tool pod post-mortem).' });
  return w;
}

export function buildPattern(inputs: ClamshellPackInputs): Result<ClamshellPackBuildResult> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  const r = resolveInputs(inputs);
  const pals: PalsUse[] = [];
  const pieces: Piece[] = [
    facePanel(r, FACE_ID, 'Face panel', true, pals),
    facePanel(r, BACK_ID, 'Back panel', false, pals),
    hoopStrip(r, GUSSET_ID, 'Base gusset (zipper frame)', r.base_depth, false, true, pals),
    hoopStrip(r, LID_STRIP_ID, 'Lid strip (zipper frame)', r.lid_depth, true, false, pals),
    bottomStrip(r, pals),
  ];
  if (r.handle) {
    pieces.push(strip('clamshell-handle', 'Top handle webbing', r.handle_cut_length, D.HANDLE_WEBBING_WIDTH_MM, 1, 'webbing-51', `2" webbing ${fmtIn(r.handle_cut_length)}": ${fmtIn(r.handle_fold_under)}" under each end, ${fmtIn(r.handle_bow)}" of bow`));
    pieces.push(strip('clamshell-handle-core', 'Handle core', r.handle_core_length, D.HANDLE_CORE_WIDTH_MM, 1, 'webbing-25', '1" webbing inside the handle for rigidity'));
  }
  if (r.compression_straps_per_side > 0) pieces.push(strip('clamshell-compression-strap', 'Compression strap', r.compression_strap_length, 1 * IN, 2 * r.compression_straps_per_side, 'webbing-25', `1" webbing ${fmtIn(r.compression_strap_length)}" — depth + ${fmtIn(r.compression_extra)}"`));
  if (r.strap_tab_count > 0) pieces.push(strip('clamshell-strap-tab', 'Shoulder strap tab', D.STRAP_TAB_LENGTH_MM, D.STRAP_TAB_WEBBING_MM, r.strap_tab_count, 'webbing-51', '2" webbing, 3" — the vault cuts six; four take the side-release buckles the two removable straps clip into, the remaining pair anchors the stow pocket'));
  if (r.strap_provision === 'tabs_and_stow') pieces.push(strip('clamshell-stow-pocket', 'Strap stow pocket', r.width, r.height * 0.45, 1, 'cordura-500', 'Back pocket that swallows two rolled straps; doubles as a dressing sleeve'));
  if (r.interior_loop && r.loop_strips_per_wall > 0) pieces.push(strip('clamshell-loop-strip', 'Interior loop strip', r.loop_strip_cut_length, r.loop_strip_width, 2 * r.loop_strips_per_wall, 'velcro-loop', `Loop ${fmtIn(r.loop_strip_width)}" — cut 2" long, trim after sewing`));
  // Rows differ in length by surface (a side run is much shorter than the face):
  // one cut-list entry per length, or the list tells the cutter to cut every row long.
  const byLength = new Map<number, { qty: number; where: Set<string> }>();
  for (const p of pals) {
    if (p.quantity <= 0) continue;
    const key = Math.round(p.webbingLength * 10) / 10;
    const e = byLength.get(key) ?? { qty: 0, where: new Set<string>() };
    e.qty += p.quantity; e.where.add(p.where);
    byLength.set(key, e);
  }
  [...byLength.entries()].sort((x, y) => y[0] - x[0]).forEach(([len, e], i) => {
    pieces.push(strip(`clamshell-pals-row-${i}`, r.pals_style === 'fabricated' ? 'Fabricated PALS row (2" Cordura → 1")' : 'PALS webbing row', len, PALS_ROW_WIDTH_MM, e.qty, r.pals_style === 'fabricated' ? 'cordura-500' : 'webbing-25', `${e.qty} rows of ${fmtIn(len)}" (${[...e.where].join(', ')}) — cut 1" long, trim after sewing`));
  });
  const hardware: HardwareItem[] = [
    { id: 'zipper', name: 'Coil zipper, two sliders, non-locking', quantity: 1, notes: `${fmtIn(r.hoop_length)}" of chain round the hoop` },
  ];
  if (r.compression_straps_per_side > 0) hardware.push({ id: 'sr-buckle', name: '1" side-release buckle', quantity: 2 * r.compression_straps_per_side, notes: 'male on the bag tab' }, { id: 'triglide-25', name: '1" tri-glide', quantity: 2 * r.compression_straps_per_side });
  if (r.strap_provision !== 'none') hardware.push({ id: 'sr-buckle-50', name: '2" side-release buckle', quantity: 4, notes: 'male on the tabs' }, { id: 'triglide-50', name: '2" tri-glide', quantity: 4 }, { id: 'sternum', name: 'Sternum strap', quantity: 1, notes: `18" or 24"` });
  return { ok: true, value: { pieces, steps: buildSteps(r), warnings: buildWarnings(r, pals), hardware, resolved: r } };
}
