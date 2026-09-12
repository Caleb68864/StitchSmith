/**
 * Padded Two-Point Sling — pattern builder (Convention B: the tube is drawn at
 * cut size with its allowance included and every edge carries an explicit 0;
 * webbing and foam are cut to net).
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { SlingInputs, SlingBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError, HardwareItem } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import { CORD_LOOP_MM, WEBBING_WIDTH_MM, PAD_LENGTH_MM, PAD_GIRTH_MM, FOAM_THICKNESS_MM, FOAM_WIDTH_MM, REAR_TAIL_MM, ADJUST_WEBBING_MM, ANCHOR_STRAP_MM } from './defaults.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };
export const PAD_TUBE_ID = 'sling-pad-tube';
export const FOAM_ID = 'sling-foam';

const IN = 25.4;
const fmt = (mm: number) => String(Math.round(mm));
const fmtIn = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');
const dim = (mm: number) => `${fmt(mm)} mm (${fmtIn(mm)}")`;

function seg(eid: () => EdgeId, role: Edge['role'], sx: number, sy: number, ex: number, ey: number): Edge {
  return { kind: 'straight', id: eid(), role, start: { x: sx, y: sy }, end: { x: ex, y: ey } };
}
function rect(eid: () => EdgeId, id: string, w: number, h: number): Path {
  return { id, closed: true, edges: [seg(eid, 'cut', 0, 0, w, 0), seg(eid, 'cut', w, 0, w, h), seg(eid, 'cut', w, h, 0, h), seg(eid, 'cut', 0, h, 0, 0)] };
}
function zeroSa(path: Path): Record<EdgeId, number> {
  const out: Record<EdgeId, number> = {};
  for (const e of path.edges) out[e.id] = 0;
  return out;
}
function strip(id: string, name: string, w: number, h: number, quantity: number, materialId: string, label: string): Piece {
  const eid = makeEdgeIdGen(id);
  const outline = rect(eid, `${id}-outline`, w, h);
  return { id, name, mirror: false, quantity, materialId, paths: [outline], seamAllowances: zeroSa(outline), annotations: [{ kind: 'label', label }] };
}

function buildTube(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(PAD_TUBE_ID);
  const W = r.tube_cut_width, L = r.tube_cut_length, sa = r.seam_allowance;
  const outline = rect(eid, `${PAD_TUBE_ID}-outline`, W, L);
  const paths: Path[] = [
    outline,
    // Long seam: the tube sews inside out along one edge; the seam is staged off the face.
    { id: `${PAD_TUBE_ID}-long-seam`, closed: false, label: `Long seam at ${fmt(sa)} mm — sew inside out; all allowance faced one way, seam staged off-centre`, edges: [seg(eid, 'stitch', W - sa, 0, W - sa, L)] },
    { id: `${PAD_TUBE_ID}-fold`, closed: false, label: 'Tube fold — the pad face; keep the seam off it', edges: [seg(eid, 'fold', (W - sa) / 2, 0, (W - sa) / 2, L)] },
    // End closures: the load path. Webbing tucked `tuck` inside, foam set back `setback`.
    { id: `${PAD_TUBE_ID}-end-top`, closed: false, label: `End closing stitch at ${fmt(sa)} mm — webbing tucked ${fmtIn(r.tuck_depth)}" inside, foam ${fmtIn(r.foam_setback)}" back; run the second line in the crushed channel`, edges: [seg(eid, 'stitch', 0, sa, W, sa)] },
    { id: `${PAD_TUBE_ID}-end-bottom`, closed: false, label: 'End closing stitch — the tension adapter anchor hides in this line', edges: [seg(eid, 'stitch', 0, L - sa, W, L - sa)] },
    { id: `${PAD_TUBE_ID}-tuck-top`, closed: false, label: `Webbing reaches to here (${fmtIn(r.tuck_depth)}" tuck)`, edges: [seg(eid, 'notch', W * 0.35, sa + r.tuck_depth, W * 0.65, sa + r.tuck_depth)] },
    { id: `${PAD_TUBE_ID}-tuck-bottom`, closed: false, edges: [seg(eid, 'notch', W * 0.35, L - sa - r.tuck_depth, W * 0.65, L - sa - r.tuck_depth)] },
    { id: `${PAD_TUBE_ID}-foam-top`, closed: false, label: `Foam starts here (${fmtIn(r.foam_setback)}" setback)`, edges: [seg(eid, 'notch', 0, sa + r.foam_setback, W * 0.2, sa + r.foam_setback)] },
    { id: `${PAD_TUBE_ID}-foam-bottom`, closed: false, edges: [seg(eid, 'notch', 0, L - sa - r.foam_setback, W * 0.2, L - sa - r.foam_setback)] },
  ];
  return {
    id: PAD_TUBE_ID,
    name: 'Pad tube (turned)',
    mirror: false,
    quantity: 1,
    materialId: 'cordura-500',
    paths,
    seamAllowances: zeroSa(outline),
    annotations: [
      { kind: 'grain', label: 'grain', point: { x: W / 2, y: L / 2 }, angle: 90 },
      { kind: 'label', label: `Pad tube — cut ${dim(W)} × ${dim(L)} incl. ${fmt(sa)} mm allowance and ${fmtIn(r.turning_ease)}" turning ease; finished ${fmtIn(r.pad_finished_length)}" long, ${fmtIn(r.pad_girth)}" round`, point: { x: W / 2, y: L / 2 } },
    ],
  };
}

function buildHardware(r: ResolvedInputs): HardwareItem[] {
  const w = fmtIn(r.webbing_width) + '"';
  const hw: HardwareItem[] = [
    { id: 'tension-adapter', name: `${w} tension adapter (one-way lock, ALICE-pack style)`, quantity: 1, notes: 'Feeds free when tightening, locks under load, released by hand. A plain slider creeps under a bouncing rifle. Slot width = webbing width.' },
    { id: 'tri-glide', name: `${w} tri-glide`, quantity: 2, notes: 'One per sling end: the open attachment interface — commodity part, field-repairable.' },
    { id: 'cord-loop', name: '550 cord pull loop', quantity: 1, notes: `About ${fmtIn(CORD_LOOP_MM)}" on the adapter release so it can be grabbed.` },
  ];
  if (r.end_interface === 'buckle_qd') hw.push({ id: 'side-squeeze', name: `${w} side-squeeze buckle`, quantity: 2, notes: 'QD between sling and rifle adapter; widths must all match.' });
  return hw;
}

function buildSteps(r: ResolvedInputs): Step[] {
  const tube = [PAD_TUBE_ID];
  return [
    { id: 'sling.mock', title: 'Mock it up in cord first', body: 'The vault gives this build no lengths. Rig a length of cord through the intended mounts on the rifle and wear it: hang length, chest-snug length and where the pad sits give the rear tail, the adjustment webbing and the pad length. Enter them here before cutting.', dependsOn: [], refsPieces: [], group: 'Prepare' },
    { id: 'sling.cut', title: 'Cut the tube, foam and webbing', body: `Cut the pad tube ${dim(r.tube_cut_width)} × ${dim(r.tube_cut_length)} — allowance and turning ease included. Mark the hidden face (silver Sharpie on dark Cordura). Cut the foam ${dim(r.foam_width)} × ${dim(r.foam_length)} (pad length less two ${fmtIn(r.foam_setback)}" setbacks). Cut the webbing: rear tail ${dim(r.rear_tail_length + r.tuck_depth)}, adjustment ${dim(r.adjustment_webbing_length + r.tuck_depth)}${r.third_piece === 'anchor_strap' ? `, anchor strap ${dim(r.anchor_strap_length)}` : `, a second adjustment tail ${dim(r.adjustment_webbing_length)}`}. Every hardware slot must equal the ${fmtIn(r.webbing_width)}" webbing.`, dependsOn: ['sling.mock'], refsPieces: [PAD_TUBE_ID, FOAM_ID], group: 'Cut' },
    { id: 'sling.tube', title: 'Sew the tube inside out', body: `Fold the tube lengthwise and sew the long seam at ${fmt(r.seam_allowance)} mm. Face all the allowance one direction so the pad lies flat, and stage the seam off-centre so it sits off the face and off the edge. Sew it loose: the ${fmtIn(r.turning_ease)}" of turning ease is deliberate — tightness is recovered at the second pass, not the cut.`, dependsOn: ['sling.cut'], refsPieces: tube, group: 'Pad' },
    { id: 'sling.turn', title: r.turn_method === 'rod' ? 'Turn the tube with a rod' : 'Turn the tube on a cord', body: r.turn_method === 'rod'
      ? `Push and pull the tube through with a bent ~1/4" metal rod. (The pad is ${fmtIn(r.pad_flat_width)}" flat — wide enough.)`
      : `At ${fmtIn(r.pad_flat_width)}" flat this tube is too tight to turn on a rod: tack a length of 550 cord inside before sewing the long seam, then pull the tube through itself.`, dependsOn: ['sling.tube'], refsPieces: tube, group: 'Pad' },
    { id: 'sling.tighten', title: 'Second pass: pull it tight', body: 'With the tube turned, pull the slack out and run the second stitch line along the long seam to take up the turning ease so the foam fills the pad. Test tension and pressure on a foam scrap sandwich first: once the first line has crushed a channel, a second line in it sews clean — but it does not fix an ugly first one.', dependsOn: ['sling.turn'], refsPieces: tube, group: 'Pad' },
    { id: 'sling.foam', title: 'Insert the foam and tuck the webbing', body: `Slide the foam in, set back ${fmtIn(r.foam_setback)}" from each end. Tuck the rear tail ${fmtIn(r.tuck_depth)}" into one end and the adjustment webbing ${fmtIn(r.tuck_depth)}" into the other, corners tucked with a screwdriver, webbing centred.`, dependsOn: ['sling.tighten'], refsPieces: [PAD_TUBE_ID, FOAM_ID], group: 'Pad' },
    { id: 'sling.close', title: 'Close the ends — the load path', body: `Sew each end closed at ${fmt(r.seam_allowance)} mm through tube and webbing. This one stitch zone carries the rifle, with ${fmtIn(r.webbing_engagement)}" of webbing engaged${r.webbing_engagement < 1 * IN ? ' — bartack it as well' : ''}. Hand-crank the side where the internal allowance stacks. Reinforcement scales with rifle weight.`, dependsOn: ['sling.foam'], refsPieces: tube, group: 'Pad' },
    { id: 'sling.adapter', title: 'Anchor the tension adapter at the front end', body: r.third_piece === 'anchor_strap'
      ? `Fold the ${fmtIn(r.anchor_strap_length)}" anchor strap round the adapter's fixed bar and sew it to the pad's front end with the stitch concealed in the closing stitch line, centred — the anchor placement is fixed by the pad, not free. Route the adjustment webbing through ${r.route_through_both_slots ? 'both slots (more drag: holds its setting, adjusts stiffer)' : 'one slot; the user can add the second for drag'}.`
      : `The adjustment webbing itself carries the adapter: fold it round the adapter's fixed bar at the pad's front end and sew through the closing stitch line, centred. Route the separate adjustment tail through ${r.route_through_both_slots ? 'both slots' : 'one slot; the user can add the second for drag'}.`, dependsOn: ['sling.close'], refsPieces: tube, group: 'Hardware' },
    { id: 'sling.ends', title: 'Fit the tri-glides and the pull loop', body: `${r.end_interface === 'direct_sewn' ? 'Sew the rear tail and the free end directly to the rifle mounts.' : `Fold ${fmtIn(r.rear_tail_length)}" rear tail and the free end back round a tri-glide each and box-X them${r.end_interface === 'buckle_qd' ? ', then clip the side-squeeze buckles between sling and rifle adapters' : ' — the bare tri-glide is the interface any $10–20 adapter clips into'}.`} Tie a 550 loop on the adapter release. Ship the tail loose: the hanging rifle self-tensions when you pull.`, dependsOn: ['sling.adapter'], refsPieces: [], group: 'Hardware' },
  ];
}

function buildWarnings(inputs: SlingInputs, r: ResolvedInputs): GeneratorWarning[] {
  const w: GeneratorWarning[] = [];
  const open = (field: keyof SlingInputs, what: string, def: number, unit: 'mm' | 'in' = 'in') => {
    if (inputs[field] === undefined) w.push({ id: `mock-derived-${field}`, severity: 'warning', field, message: `[mock-derived] ${what} defaults to ${unit === 'in' ? fmtIn(def) + '"' : fmt(def) + ' mm'} — the vault gives this build no lengths. Take it from the cord mock-up, the retail sling or a freeze-frame.` });
  };
  open('webbing_width', 'Webbing width', WEBBING_WIDTH_MM);
  open('pad_finished_length', 'Pad length', PAD_LENGTH_MM);
  open('pad_girth', 'Pad girth', PAD_GIRTH_MM);
  open('foam_thickness', 'Foam thickness', FOAM_THICKNESS_MM, 'mm');
  open('foam_width', 'Foam width', FOAM_WIDTH_MM);
  open('rear_tail_length', 'Rear tail', REAR_TAIL_MM);
  open('adjustment_webbing_length', 'Adjustment webbing', ADJUST_WEBBING_MM);
  if (r.third_piece === 'anchor_strap') open('anchor_strap_length', 'Anchor strap', ANCHOR_STRAP_MM);
  if (r.webbing_engagement < 1 * IN) w.push({ id: 'engagement', severity: 'warning', field: 'tuck_depth', message: `Only ${fmtIn(r.webbing_engagement)}" of webbing is bitten by the closing stitch (tuck − setback); bartack the ends or deepen the tuck.` });
  w.push({ id: 'adapter-lock', severity: 'info', message: 'The tension adapter must be a one-way lock; a second slot adds drag but is not a lock. Every slot equals the webbing width.' });
  w.push({ id: 'third-piece', severity: 'info', message: `The video's third webbing piece is ambiguous; this pattern uses the ${r.third_piece === 'anchor_strap' ? 'anchor-strap' : 'separate adjustment tail'} mapping. Adjustment travel ≈ ${fmtIn(r.adjustment_range)}" (approximate).` });
  return w;
}

export function buildPattern(inputs: SlingInputs): Result<SlingBuildResult> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  const r = resolveInputs(inputs);
  const wb = r.webbing_width;
  const pieces: Piece[] = [
    buildTube(r),
    strip(FOAM_ID, `Closed-cell foam core ${r.foam_thickness} mm`, r.foam_width, r.foam_length, 1, 'foam-closed-cell', `Foam — ${dim(r.foam_width)} × ${dim(r.foam_length)}; pad length less two ${fmtIn(r.foam_setback)}" setbacks`),
    strip('sling-rear-tail', 'Rear tail webbing', wb, r.rear_tail_length + r.tuck_depth, 1, `webbing-${Math.round(wb)}`, `Rear tail — ${dim(r.rear_tail_length)} free + ${fmtIn(r.tuck_depth)}" tucked; the long tail is the back side`),
    strip('sling-adjust-webbing', 'Adjustment webbing', wb, r.adjustment_webbing_length + r.tuck_depth, 1, `webbing-${Math.round(wb)}`, `Front webbing — ${dim(r.adjustment_webbing_length)} free + ${fmtIn(r.tuck_depth)}" tucked; its free end is the pull`),
    r.third_piece === 'anchor_strap'
      ? strip('sling-anchor-strap', 'Adapter anchor strap', wb, r.anchor_strap_length, 1, `webbing-${Math.round(wb)}`, `Anchor strap — holds the tension adapter to the pad's front end`)
      : strip('sling-adjust-tail', 'Separate adjustment tail', wb, r.adjustment_webbing_length, 1, `webbing-${Math.round(wb)}`, 'Runs through the tension adapter'),
  ];
  return { ok: true, value: { pieces, steps: buildSteps(r), warnings: buildWarnings(inputs, r), hardware: buildHardware(r), resolved: r } };
}
