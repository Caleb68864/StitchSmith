/**
 * Fanny Pack — pattern builder.
 *
 * Convention B (baked-in seam allowance): every piece is drawn at cut size,
 * every cut edge carries an explicit `seamAllowances` 0, and the sew line is
 * drawn as a stitch path inset by the allowance. Cut dimensions are derived
 * once in `resolveInputs` so the pattern, the steps and the BOM agree.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { FannyPackInputs, FannyPackBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError, HardwareItem } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import { GROMMET_PATCH_MM, CORD_ANCHOR_DROP_MM, SOE_V15_EXTENSION_MM, SOE_V2_EXTENSION_MM } from './defaults.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };
export const BACK_ID = 'fanny-back-panel';
export const FRONT_ID = 'fanny-front-panel';
export const ZIP_HALF_ID = 'fanny-zipper-half';
export const GUSSET_ID = 'fanny-rising-gusset';
export const BELT_ID = 'fanny-belt';
export const BELT_TAB_ID = 'fanny-belt-tab';
export const GROMMET_PATCH_ID = 'fanny-grommet-patch';
export const CORD_TAB_ID = 'fanny-cord-anchor-tab';

const IN = 25.4;
const fmtIn = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');
const dim = (mm: number) => `${Math.round(mm)} mm (${fmtIn(mm)}")`;

function seg(eid: () => EdgeId, role: Edge['role'], sx: number, sy: number, ex: number, ey: number): Edge {
  return { kind: 'straight', id: eid(), role, start: { x: sx, y: sy }, end: { x: ex, y: ey } };
}
function rect(eid: () => EdgeId, id: string, w: number, h: number): Path {
  return { id, closed: true, edges: [seg(eid, 'cut', 0, 0, w, 0), seg(eid, 'cut', w, 0, w, h), seg(eid, 'cut', w, h, 0, h), seg(eid, 'cut', 0, h, 0, 0)] };
}
function stitchRect(eid: () => EdgeId, id: string, x0: number, y0: number, x1: number, y1: number, label?: string): Path {
  return { id, closed: true, label, edges: [seg(eid, 'stitch', x0, y0, x1, y0), seg(eid, 'stitch', x1, y0, x1, y1), seg(eid, 'stitch', x1, y1, x0, y1), seg(eid, 'stitch', x0, y1, x0, y0)] };
}
function zeroSa(path: Path): Record<EdgeId, number> { const o: Record<EdgeId, number> = {}; for (const e of path.edges) o[e.id] = 0; return o; }
function strip(id: string, name: string, w: number, h: number, quantity: number, materialId: string, label: string): Piece {
  const eid = makeEdgeIdGen(id);
  const outline = rect(eid, `${id}-outline`, w, h);
  return { id, name, mirror: false, quantity, materialId, paths: [outline], seamAllowances: zeroSa(outline), annotations: [{ kind: 'label', label }] };
}
/** A small cross mark at a point (grommet centre). */
function cross(eid: () => EdgeId, x: number, y: number, r: number): Edge[] {
  return [seg(eid, 'notch', x - r, y, x + r, y), seg(eid, 'notch', x, y - r, x, y + r)];
}

function cordAnchors(eid: () => EdgeId, id: string, r: ResolvedInputs, who: 'lid' | 'body'): Path[] {
  if (!r.drawbridge_limiter) return [];
  const sa = r.seam_allowance;
  const y = sa + CORD_ANCHOR_DROP_MM;
  return [sa + 0.75 * IN, r.panel_cut_width - sa - 1.75 * IN].map((x, i) => stitchRect(eid, `${id}-cord-anchor-${i}`, x, y, x + 1 * IN, y + 0.5 * IN, i === 0 ? `Cord anchor on the ${who} interior — bartack, ${fmtIn(CORD_ANCHOR_DROP_MM)}" below the top seam` : undefined));
}

function buildPanel(id: string, name: string, r: ResolvedInputs, who: 'lid' | 'body'): Piece {
  const eid = makeEdgeIdGen(id);
  const W = r.panel_cut_width, H = r.panel_cut_height, sa = r.seam_allowance;
  const outline = rect(eid, `${id}-outline`, W, H);
  const paths: Path[] = [outline];
  if (sa > 0) paths.push(stitchRect(eid, `${id}-sew`, sa, sa, W - sa, H - sa, `Sew line ${fmtIn(sa)}" in — the hoop seam`));
  paths.push(...cordAnchors(eid, id, r, who));
  if (who === 'body') {
    // Belt tabs baste into the side seams at mid-height: a notch each side.
    paths.push({ id: `${id}-belt-tab-marks`, closed: false, label: `Belt tab positions — ${r.belt_webbing}" webbing tabs basted into the side seams at mid-height`, edges: [seg(eid, 'notch', 0, H / 2, sa + 4, H / 2), seg(eid, 'notch', W - sa - 4, H / 2, W, H / 2)] });
  }
  return {
    id, name, mirror: false, quantity: 1, materialId: 'cordura-500', paths, seamAllowances: zeroSa(outline),
    annotations: [
      { kind: 'grain', label: 'grain', point: { x: W / 2, y: H * 0.7 }, angle: 90 },
      { kind: 'label', label: `${name} — cut ${dim(W)} × ${dim(H)} (${fmtIn(sa)}" allowance included)`, point: { x: W / 2, y: H / 2 } },
    ],
  };
}

function buildZipperHalf(r: ResolvedInputs): Piece {
  const id = ZIP_HALF_ID;
  const eid = makeEdgeIdGen(id);
  const L = r.zipper_panel_cut_length, Hc = r.zipper_half_cut_height, sa = r.seam_allowance;
  const outline = rect(eid, `${id}-outline`, L, Hc);
  const paths: Path[] = [outline];
  const lip = r.zipper_edge_finish === 'fold' ? r.zipper_lip : 0;
  if (lip > 0) paths.push({ id: `${id}-lip-fold`, closed: false, label: `Zipper lip — fold the raw edge ${fmtIn(lip)}" back over the zipper tape (0°)`, edges: [seg(eid, 'fold', 0, lip, L, lip)] });
  else paths.push({ id: `${id}-tape-edge`, closed: false, label: `Edge tape this edge (${r.edge_tape_color}), then the zipper on top`, edges: [seg(eid, 'notch', 0, 2, L, 2)] });
  if (sa > 0) paths.push({ id: `${id}-sew`, closed: false, label: 'Sew line to the panel', edges: [seg(eid, 'stitch', 0, Hc - sa, L, Hc - sa)] });
  const cx = [sa + r.lid_extension, sa + r.lid_extension + r.width];
  if (r.lid_extension > 0) {
    for (const [i, x] of cx.entries()) paths.push({ id: `${id}-corner-${i}`, closed: false, label: i === 0 ? `Top corner — turn here (90°); the panel runs ${fmtIn(r.lid_extension)}" down each side for the lid drop` : 'Top corner (90°)', edges: [seg(eid, 'fold', x, 0, x, Hc)] });
  } else {
    for (const [i, x] of cx.entries()) paths.push({ id: `${id}-corner-${i}`, closed: false, edges: [seg(eid, 'notch', x, 0, x, Hc * 0.25), seg(eid, 'notch', x, Hc, x, Hc * 0.75)] });
  }
  return {
    id, name: 'Zipper panel half', mirror: false, quantity: 2, materialId: 'cordura-500', paths, seamAllowances: zeroSa(outline),
    annotations: [
      { kind: 'grain', label: 'grain', point: { x: L / 2, y: Hc / 2 }, angle: 0 },
      { kind: 'label', label: `Zipper panel half ×2 — cut ${dim(L)} × ${dim(Hc)}: ${fmtIn(r.zipper_half_depth)}" of depth per half${lip > 0 ? ` + ${fmtIn(lip)}" lip fold` : ''} + ${fmtIn(sa)}" allowance`, point: { x: L / 2, y: Hc / 2 } },
    ],
  };
}

function buildGusset(r: ResolvedInputs): Piece {
  const id = GUSSET_ID;
  const eid = makeEdgeIdGen(id);
  const L = r.rising_gusset_cut_length, Hc = r.gusset_cut_height, sa = r.seam_allowance;
  const outline = rect(eid, `${id}-outline`, L, Hc);
  const paths: Path[] = [outline];
  if (sa > 0) paths.push({ id: `${id}-sew`, closed: false, label: 'Sew lines: back panel on one edge, front panel on the other', edges: [seg(eid, 'stitch', 0, sa, L, sa), seg(eid, 'stitch', 0, Hc - sa, L, Hc - sa)] });
  const c1 = sa + r.rising_side, c2 = c1 + r.width;
  for (const [i, x] of [c1, c2].entries()) paths.push({ id: `${id}-corner-${i}`, closed: false, label: i === 0 ? `Bottom corner — turn here (90°); the sides rise ${fmtIn(r.rising_side)}" to meet the zipper panel` : 'Bottom corner (90°)', edges: [seg(eid, 'fold', x, 0, x, Hc)] });
  r.grommet_positions.forEach((pos, i) => {
    const x = c1 + pos, y = Hc / 2;
    const p = GROMMET_PATCH_MM / 2;
    paths.push({ id: `${id}-grommet-${i}`, closed: false, label: i === 0 ? `Drainage grommets ×${r.bottom_grommets}, centred on the bottom, ${fmtIn(r.grommet_inset)}"+ clear of the seams; reinforcement patch under each` : undefined, edges: [...cross(eid, x, y, 4)] });
    paths.push(stitchRect(eid, `${id}-grommet-patch-${i}`, x - p, y - p, x + p, y + p));
  });
  return {
    id, name: 'Rising gusset (bottom and lower sides)', mirror: false, quantity: 1, materialId: 'cordura-500', paths, seamAllowances: zeroSa(outline),
    annotations: [
      { kind: 'grain', label: 'grain', point: { x: L / 2, y: Hc / 2 }, angle: 0 },
      { kind: 'label', label: `Rising gusset — cut ${dim(L)} × ${dim(Hc)}: ${fmtIn(r.rising_side)}" side + ${fmtIn(r.width)}" bottom + ${fmtIn(r.rising_side)}" side, ${fmtIn(r.depth)}" deep, allowance included`, point: { x: L / 2, y: Hc / 2 } },
    ],
  };
}

function buildSteps(r: ResolvedInputs): Step[] {
  const fold = r.zipper_edge_finish === 'fold';
  const steps: Step[] = [
    { id: 'fp.cut', title: 'Cut the pieces', body: `Back and front panels ${dim(r.panel_cut_width)} × ${dim(r.panel_cut_height)}; two zipper panel halves ${dim(r.zipper_panel_cut_length)} × ${dim(r.zipper_half_cut_height)}; rising gusset ${dim(r.rising_gusset_cut_length)} × ${dim(r.gusset_cut_height)}. All cut sizes include the ${fmtIn(r.seam_allowance)}" allowance${fold ? ` and the zipper halves include the ${fmtIn(r.zipper_lip)}" lip fold` : ''}. Belt webbing ${dim(r.belt_cut_length)} — cut two grains long and sear.`, dependsOn: [], refsPieces: [BACK_ID, FRONT_ID, ZIP_HALF_ID, GUSSET_ID], group: 'Cut' },
    { id: 'fp.mark', title: 'Mark the corners', body: `On the zipper halves mark ${fmtIn(r.seam_allowance + r.lid_extension)}" from each end (the top corners); on the gusset mark ${fmtIn(r.seam_allowance + r.rising_side)}" from each end (the bottom corners). Label every mark — a dead mark trusted as centre cost SOE a seam-ripped panel.`, dependsOn: ['fp.cut'], refsPieces: [ZIP_HALF_ID, GUSSET_ID], group: 'Cut' },
  ];
  const flat: string[] = [];
  if (r.bottom_grommets > 0) {
    steps.push({ id: 'fp.grommets', title: 'Grommets while the gusset is flat', body: `Sew a ${fmtIn(GROMMET_PATCH_MM)}" reinforcement patch under each grommet mark, mark, pre-burn the holes at 750°F, then set the ${r.bottom_grommets} grommets (#0–#2; SOE runs #4 black oxide). The press lives away from the bench: batch every grommet into one visit, and do it now — nothing goes through a closed hoop.`, dependsOn: ['fp.mark'], refsPieces: [GUSSET_ID, GROMMET_PATCH_ID], group: 'Flat work' });
    flat.push('fp.grommets');
  }
  if (r.drawbridge_limiter) {
    steps.push({ id: 'fp.cord-anchors', title: 'Cord anchors on the lid and body interiors', body: `Bartack a 1" webbing loop at each anchor mark on the inside of the front (lid) and back (body) panels, ${fmtIn(CORD_ANCHOR_DROP_MM)}" below the top seam, left and right. Each 550 loop is ${dim(r.drawbridge_cord_length)} of cord (twice the lid-to-body distance at ${r.lid_drop_target === 'fully_open' ? 180 : r.lid_drop_target === 'closed' ? 0 : r.lid_angle_deg}°); tie it after the bag is turned.`, dependsOn: ['fp.mark'], refsPieces: [FRONT_ID, BACK_ID, CORD_TAB_ID], group: 'Flat work' });
    flat.push('fp.cord-anchors');
  }
  steps.push({ id: 'fp.belt-tabs', title: 'Belt tabs onto the back panel', body: `Baste a ${r.belt_webbing}" webbing tab (folded, buckle or tri-glide captured) to each side edge of the back panel at the mid-height marks, tab pointing inward so it turns out with the seam. The tab is the load path: it must be caught by the hoop seam and bartacked, not sewn to the panel face alone.`, dependsOn: ['fp.mark'], refsPieces: [BACK_ID, BELT_TAB_ID], group: 'Flat work' });
  flat.push('fp.belt-tabs');
  steps.push({ id: 'fp.zipper', title: fold ? 'Zipper into the halves — fold the lip' : 'Zipper into the halves — tape the edge', body: fold
    ? `Fold the ${fmtIn(r.zipper_lip)}" lip back over the zipper tape on each half and sew along the zipper (two lines, or one pass with a double needle). The fold hides the raw edge and stands a lip proud of the zipper. Watch the slider — a machine will sew through a pull and it can knock the timing out.`
    : `Bind the zipper edge of each half with ${r.edge_tape_color} edge tape, then sew the zipper on top aligned to the tape edge. Fiddly: the zipper has to track the tape edge, and it cannot be done in one double-needle pass — the reason SOE recommends the fold instead unless the edge is a multi-layer stack or a tight curve.`, dependsOn: ['fp.mark'], refsPieces: [ZIP_HALF_ID], group: 'Zipper panel' });
  steps.push(
    { id: 'fp.hoop', title: 'Close the hoop', body: `Join each end of the zipper panel to the matching end of the rising gusset, right sides together, ${fmtIn(r.seam_allowance)}" seam: the zipper runs ${fmtIn(r.lid_extension)}" down each side and the gusset rises ${fmtIn(r.rising_side)}" to meet it. Long seams draw in: trim the closing end to the measured gap rather than to the plan. Open the zipper a hand's width before the next step or you cannot turn the bag.`, dependsOn: ['fp.zipper', ...flat], refsPieces: [ZIP_HALF_ID, GUSSET_ID], group: 'Assembly' },
    { id: 'fp.back', title: 'Back panel onto the hoop', body: 'Match the corner marks to the panel corners and sew the back panel to the hoop all round, pleating the corners. Sew the two sides in opposite directions so both stretch the same way and the front clocks to it afterwards.', dependsOn: ['fp.hoop'], refsPieces: [BACK_ID, GUSSET_ID, ZIP_HALF_ID], group: 'Assembly' },
    { id: 'fp.front', title: 'Front panel onto the hoop', body: 'Same again on the other edge of the hoop, in bites, excess pushed to the inside where it disappears. Any shortfall at the last corner is sewn straight across and tucked.', dependsOn: ['fp.back'], refsPieces: [FRONT_ID, GUSSET_ID, ZIP_HALF_ID], group: 'Assembly' },
    { id: 'fp.turn', title: 'Turn and dress', body: `Turn the bag through the zipper, push the corners out, ${r.drawbridge_limiter ? 'tie the 550 loops between the anchors, ' : ''}thread the belt: ${r.belt_webbing}" webbing ${dim(r.belt_cut_length)} through the side tabs, side-release buckle one end, tri-glide the other; set it to ${fmtIn(r.belt_min)}" for the waist and let it out to ${fmtIn(r.belt_max)}" for sling carry.`, dependsOn: ['fp.front'], refsPieces: [BELT_ID], group: 'Finish' },
  );
  return steps;
}

function buildWarnings(r: ResolvedInputs): GeneratorWarning[] {
  const w: GeneratorWarning[] = [];
  w.push({ id: 'mock-derived-body', severity: 'info', message: `${fmtIn(r.width)} × ${fmtIn(r.height)} × ${fmtIn(r.depth)}" (${r.volume_l.toFixed(1)} L) is a starting point: the SOE fanny pack notes give rules, not a cut list. Mock the body in paper before cutting (mock-derived).` });
  if (!r.lid_extension_overridden && r.lid_drop_target !== 'closed') w.push({ id: 'mock-derived-extension', severity: 'info', field: 'lid_extension', message: `The ${fmtIn(r.lid_extension)}" lid-drop extension is the heuristic (≈ bag depth for a lid that lies flat). SOE's v1.5 at ${fmtIn(SOE_V15_EXTENSION_MM)}"/side did not fall open; v2 went to ${fmtIn(SOE_V2_EXTENSION_MM)}". Lid stiffness moves the number — override it after the mock-up (mock-derived).` });
  if (r.lid_drop_target === 'fully_open' && r.lid_extension < r.depth - 1e-6) w.push({ id: 'lid-short', severity: 'warning', field: 'lid_extension', message: `A ${fmtIn(r.lid_extension)}" extension is less than the ${fmtIn(r.depth)}" depth: the side seams will pull the lid short of flat. Add length to the zipper panel and take the same off the rising sides.` });
  if (r.lid_drop_target === 'closed') w.push({ id: 'lid-closed', severity: 'info', message: 'Sides run up uninterrupted: the lid will not fall open at all — SOE v1, by design.' });
  if (r.lid_extension > 0 && r.lid_extension < 1 * IN) w.push({ id: 'extension-tiny', severity: 'info', field: 'lid_extension', message: 'An extension under 1" is hard to sew as a separate corner; consider closed or at least 1".' });
  if (r.zipper_edge_finish === 'tape') w.push({ id: 'tape-vs-fold', severity: 'info', field: 'zipper_edge_finish', message: `Edge tape suits a multi-layer edge, a visible trim or a tight curve; on a straight single-layer edge the fold is easier and double-needle friendly. ${fmtIn(r.edge_tape_length)}" of ${r.edge_tape_color} tape on the cut list${r.edge_tape_color === 'black' ? '' : ' — a long visible run in a colour that does not match the shell will show'}.` });
  if (r.bottom_grommets > 0) {
    const clear = r.depth / 2 - r.grommet_inset;
    if (clear < 0.25 * IN) w.push({ id: 'grommet-tight', severity: 'warning', field: 'bottom_grommets', message: `Grommets sit ${fmtIn(r.depth / 2)}" from each bottom seam: under ${fmtIn(r.grommet_inset + 0.25 * IN)}" the ring fouls the stitching. Use #0 grommets or a deeper bag.` });
    w.push({ id: 'grommet-dual-use', severity: 'info', message: 'The grommets drain and double as lash points: bungee, tabs or a tourniquet through them on the outside.' });
  }
  w.push({ id: 'mock-derived-belt', severity: 'info', field: 'belt_max', message: `Belt ${fmtIn(r.belt_min)}"–${fmtIn(r.belt_max)}" covers waist and sling carry only if measured on the wearer; the vault gives no lengths (mock-derived). ${r.belt_webbing}" webbing needs matching ${r.belt_webbing}" hardware.` });
  return w;
}

export function buildPattern(inputs: FannyPackInputs): Result<FannyPackBuildResult> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  const r = resolveInputs(inputs);
  const beltW = r.belt_webbing * IN;
  // Material id follows the chosen webbing (the engine's scheme: Math.round(mm)),
  // or a 1" belt is listed on the cut list as 1.5" stock.
  const beltMat = `webbing-${Math.round(beltW)}`;
  const pieces: Piece[] = [
    buildPanel(BACK_ID, 'Back panel', r, 'body'),
    buildPanel(FRONT_ID, 'Front panel (lid)', r, 'lid'),
    buildZipperHalf(r),
    buildGusset(r),
    strip(BELT_TAB_ID, 'Belt tab', 4 * IN, beltW, 2, beltMat, `${r.belt_webbing}" webbing, folded round the buckle / tri-glide, basted into the side seams`),
    strip(BELT_ID, 'Belt', r.belt_cut_length, beltW, 1, beltMat, `${r.belt_webbing}" webbing ${fmtIn(r.belt_cut_length)}" — trim after fitting`),
  ];
  if (r.bottom_grommets > 0) pieces.push(strip(GROMMET_PATCH_ID, 'Grommet reinforcement patch', GROMMET_PATCH_MM, GROMMET_PATCH_MM, r.bottom_grommets, 'cordura-1000', '1000D under each grommet, sewn before the hole is burnt'));
  if (r.drawbridge_limiter) pieces.push(strip(CORD_TAB_ID, 'Cord anchor loop', 2 * IN, 1 * IN, 4, 'webbing-25', '1" webbing loops, two per side (lid and body)'));
  const hardware: HardwareItem[] = [
    { id: 'zipper', name: `#8 coil zipper, ${fmtIn(r.zipper_length)}"`, quantity: 1, notes: 'Horizontal, not load-bearing: non-locking slider is fine (custom pull friendly)' },
    { id: 'buckle', name: `${r.belt_webbing}" side-release buckle`, quantity: 1 },
    { id: 'triglide', name: `${r.belt_webbing}" tri-glide`, quantity: 1 },
  ];
  if (r.bottom_grommets > 0) hardware.push({ id: 'grommet', name: '#0–#2 grommet', quantity: r.bottom_grommets, notes: 'Set while flat; pre-burn' });
  if (r.drawbridge_limiter) hardware.push({ id: 'cord', name: `550 cord, ${fmtIn(2 * r.drawbridge_cord_length)}" total`, quantity: 1, notes: 'Two loops' });
  if (r.zipper_edge_finish === 'tape') hardware.push({ id: 'edge-tape', name: `Edge tape (${r.edge_tape_color}), ${fmtIn(r.edge_tape_length)}"`, quantity: 1 });
  return { ok: true, value: { pieces, steps: buildSteps(r), warnings: buildWarnings(r), hardware, resolved: r } };
}
