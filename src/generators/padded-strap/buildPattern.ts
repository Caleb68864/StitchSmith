/**
 * Padded Strap / H-Harness — pattern builder.
 *
 * The pads come from the strap engine (Convention A: finished dims; a bound
 * pad carries explicit 0 SA, a turned pad carries SA on every shell edge). The
 * H-harness adds a slotted cross strap, four-corner hardware on the webbing
 * ends, hydration channels marked as unsewn spans, and front PALS rows.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import { buildPaddedStrap, webbingSizeLabel } from '../../lib/strap-engine/index.js';
import type { StrapHardwareItem } from '../../lib/strap-engine/index.js';
import type { PaddedStrapInputs, PaddedStrapBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import { PALS_ROW_PITCH_MM, PALS_WEBBING_MM, BUCKLE_FOLD_MM, H_PAD_LENGTH_MM, H_PAD_WIDTH_MM, H_CROSS_STRAP_HEIGHT_MM, H_PAD_SPREAD_MM, H_DROP_LEG_MM, H_FOAM_MM } from './defaults.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };

export const PAD_PIECE_ID = 'strap-pad';
export const CROSS_STRAP_PIECE_ID = 'h-cross-strap';
export const PALS_ROW_PIECE_ID = 'h-pals-row';
export const CHANNEL_BAR_PIECE_ID = 'h-channel-bar';
/** Gap between the cross strap and the first hydration channel bar, and between bars. */
export const CHANNEL_GAP_MM = 12.7;

const IN = 25.4;
const fmt = (mm: number) => String(Math.round(mm));

function seg(eid: () => EdgeId, role: Edge['role'], sx: number, sy: number, ex: number, ey: number): Edge {
  return { kind: 'straight', id: eid(), role, start: { x: sx, y: sy }, end: { x: ex, y: ey } };
}

function rect(eid: () => EdgeId, id: string, w: number, h: number): Path {
  return { id, closed: true, edges: [seg(eid, 'cut', 0, 0, w, 0), seg(eid, 'cut', w, 0, w, h), seg(eid, 'cut', w, h, 0, h), seg(eid, 'cut', 0, h, 0, 0)] };
}

function zeroSa(path: Path): Record<EdgeId, number> {
  const r: Record<EdgeId, number> = {};
  for (const e of path.edges) r[e.id] = 0;
  return r;
}

/** Vault numbers marked Open become inputs with a mock-derived warning, never silent defaults. */
function mockDerivedWarnings(inputs: PaddedStrapInputs, r: ResolvedInputs): GeneratorWarning[] {
  if (r.mode !== 'h_harness') return [];
  const w: GeneratorWarning[] = [];
  const open = (field: keyof PaddedStrapInputs, what: string, def: number) => {
    if (inputs[field] === undefined) {
      w.push({ id: `mock-derived-${field}`, severity: 'warning', field, message: `[mock-derived] ${what} defaults to ${fmt(def)} mm — the vault never puts a ruler on it. Mock the pad and the H crossing height in scrap on your own torso, then enter the measurement.` });
    }
  };
  open('pad_length', 'H-harness pad length', H_PAD_LENGTH_MM);
  open('pad_width', 'H-harness pad width', H_PAD_WIDTH_MM);
  open('cross_strap_height', 'Cross strap height', H_CROSS_STRAP_HEIGHT_MM);
  open('pad_spread', 'Pad spread at the cross strap', H_PAD_SPREAD_MM);
  open('drop_leg_length', 'Corner drop-leg length', H_DROP_LEG_MM);
  if (inputs.foam_thickness === undefined) {
    w.push({ id: 'mock-derived-foam', severity: 'info', field: 'foam_thickness', message: `[mock-derived] Foam defaults to ${H_FOAM_MM} mm from the LBV's 3/8" blue camping pad; the H set's foam is unconfirmed.` });
  }
  return w;
}

export function buildPattern(inputs: PaddedStrapInputs): Result<PaddedStrapBuildResult> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  const r = resolveInputs(inputs);
  const h = r.mode === 'h_harness';

  const strap = buildPaddedStrap({
    padLength_mm: r.pad_length,
    padWidth_mm: r.pad_width,
    foamThickness_mm: r.foam_thickness,
    curve: r.curve,
    architecture: r.architecture,
    edgeFinish: r.edge_finish,
    webbingWidth_mm: r.webbing_width,
    tailLength_mm: r.tail_length,
    // H-harness: the webbing runs out the top of the pad to the rear corner buckle — same drop as the front leg.
    topAnchorLength_mm: h ? r.drop_leg_length : undefined,
    seamAllowance_mm: r.seam_allowance,
    quantity: 2,
    hardware: r.hardware,
    idPrefix: 'strap.',
    pieceId: PAD_PIECE_ID,
    name: h ? 'H-harness pad' : 'Shoulder strap',
    gussetDepth_mm: h ? undefined : r.gusset_depth,
  });

  const pieces: Piece[] = [...strap.pieces];
  const steps: Step[] = [...strap.steps];
  const hardware: StrapHardwareItem[] = [...strap.hardware];
  const warnings: GeneratorWarning[] = strap.warnings.map((message, i) => ({ id: `strap-${i}`, severity: 'warning', message }));
  warnings.push(...mockDerivedWarnings(inputs, r));
  if (!h && r.tail_derived) {
    warnings.push({ id: 'tail-derived', severity: 'info', field: 'tail_length', message: `Tail webbing ${fmt(r.tail_length)} mm = torso ${fmt(r.torso_length)} − pad ${fmt(r.pad_length)} + gusset ${fmt(r.gusset_depth)} + 200 adjustment. Mock it on the loaded bag before cutting.` });
  }

  if (h) {
    const pad = pieces.find((p) => p.id === PAD_PIECE_ID);
    if (pad) annotateHarnessPad(pad, r);
    pieces.push(buildCrossStrap(r));
    const channelCount = pad ? pad.paths.filter((p) => p.id.includes('-channel-')).length : 0;
    if (channelCount > 0) pieces.push(buildChannelBars(r, channelCount));
    if (r.front_pals_rows > 0 && r.routing_side !== 'none') pieces.push(buildPalsRows(r));
    steps.push(...harnessSteps(r));
    // Four corners: the pad webbing's four ends take the male side-release halves; tri-glides adjust each leg.
    const wIn = webbingSizeLabel(r.webbing_width);
    const sr = hardware.find((x) => x.id === 'side-release');
    if (sr) { sr.quantity = 4; sr.notes = 'One per corner leg, male half on the harness so the rig keeps the mating halves — the harness drops into any rig with the same buckles. NSN-compatible 1.5" class; treat the choice as frozen.'; }
    else hardware.push({ id: 'side-release', name: `${wIn} side-release buckle`, quantity: 4, notes: 'One per corner leg, male half on the harness.' });
    const tg = hardware.find((x) => x.id === 'tri-glide');
    if (tg) { tg.quantity = 4; tg.notes = 'One per corner leg. Adjustment lives on the harness, not the rig: double-bypass the excess.'; }
    else hardware.push({ id: 'tri-glide', name: `${wIn} tri-glide`, quantity: 4, notes: 'One per corner leg.' });
    if (r.front_pals_rows > 0 && r.routing_side !== 'none') {
      const sides = r.routing_side === 'both' ? 2 : 1;
      hardware.push({ id: 'elastic-loops', name: 'Elastic loop / cord dominator', quantity: r.front_pals_rows * sides, notes: 'One per PALS row on the routing shoulder: hydration tube and comm wire run under the rows and through the elastic.' });
    }
    hardware.push({ id: 'velcro-onewrap', name: 'Velcro One-Wrap (tail keeper)', quantity: 4, notes: 'Hook faces up, away from the body, so it never chews a collar. Never cut the corner tails — bypass and stow them.' });
    warnings.push({ id: 'not-a-suspender', severity: 'info', message: 'This H set is a chest-rig suspension, not a belt suspender: there is not enough webbing by design to run it to a belt.' });
  }

  return {
    ok: true,
    value: { pieces, steps, warnings, hardware, derived: { ...strap.derived, resolved: r } },
  };
}

/** Mark the cross-strap crossing, the hydration channels and the PALS rows on the pad shell. */
function annotateHarnessPad(pad: Piece, r: ResolvedInputs): void {
  const eid = makeEdgeIdGen(`${pad.id}-h`);
  const w = r.pad_width;
  const y0 = r.cross_strap_height - r.webbing_width / 2;
  const y1 = r.cross_strap_height + r.webbing_width / 2;
  // Cross strap lands here, sewn along both long edges of its own webbing.
  pad.paths.push({
    id: `${pad.id}-cross-strap-land`, closed: false, label: 'Cross strap lands here — sew both long edges',
    edges: [seg(eid, 'stitch', 0, y0, w, y0), seg(eid, 'stitch', 0, y1, w, y1)],
  });
  // Hydration channels: crossings above the cross strap that stay UNSEWN. The carrier's upper straps
  // pick one — height tuning is which channel, not a slider (vault harness-hydration-comms-routing.md).
  // Each channel is a crossing bar of the same webbing sewn at both ends only, stacked up the
  // back from the cross strap at half-inch gaps.
  for (let i = 0; i < r.hydration_channels; i++) {
    const yc = y0 - CHANNEL_GAP_MM - r.webbing_width / 2 - i * (r.webbing_width + CHANNEL_GAP_MM);
    if (yc - r.webbing_width / 2 < 0) break;
    const ya = yc - r.webbing_width / 2;
    const yb = yc + r.webbing_width / 2;
    pad.paths.push({
      id: `${pad.id}-channel-${i + 1}`, closed: false, label: `Hydration channel ${i + 1} — leave this span UNSEWN`,
      edges: [seg(eid, 'notch', w * 0.2, ya, w * 0.8, ya), seg(eid, 'notch', w * 0.2, yb, w * 0.8, yb)],
    });
  }
  // Front PALS rows on the chest end of the pad (pad bottom = front corner), counted up from the
  // bottom at the 2" pitch; a row that would land on the cross strap is dropped (routing first,
  // mounting second — vault harness-hydration-comms-routing.md).
  for (let i = 0; i < r.front_pals_rows; i++) {
    const yc = r.pad_length - 20 - PALS_WEBBING_MM / 2 - i * PALS_ROW_PITCH_MM;
    if (yc - PALS_WEBBING_MM / 2 < y1 + 10) break;
    pad.paths.push({
      id: `${pad.id}-pals-${i + 1}`, closed: false, label: `PALS row ${i + 1} (1") — ${r.routing_side === 'both' ? 'both pads' : `${r.routing_side} pad only`}`,
      edges: [seg(eid, 'stitch', 0, yc - PALS_WEBBING_MM / 2, w, yc - PALS_WEBBING_MM / 2), seg(eid, 'stitch', 0, yc + PALS_WEBBING_MM / 2, w, yc + PALS_WEBBING_MM / 2)],
    });
  }
}

function buildCrossStrap(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(CROSS_STRAP_PIECE_ID);
  const len = r.cross_strap_length;
  const wb = r.webbing_width;
  const outline = rect(eid, `${CROSS_STRAP_PIECE_ID}-outline`, len, wb);
  const paths: Path[] = [outline];
  // Pad overlaps at each end (sewn to the pads), the spread in the middle, the slotted range at the far end.
  paths.push({ id: `${CROSS_STRAP_PIECE_ID}-pad-a`, closed: false, label: 'Sewn to left pad', edges: [seg(eid, 'stitch', r.pad_width, 0, r.pad_width, wb)] });
  const slotStart = r.pad_width + r.pad_spread;
  paths.push({ id: `${CROSS_STRAP_PIECE_ID}-pad-b`, closed: false, label: 'Sewn to right pad (at the slot you fit to)', edges: [seg(eid, 'stitch', slotStart + r.chest_adjust_range, 0, slotStart + r.chest_adjust_range, wb)] });
  for (let i = 0; i < r.slot_count; i++) {
    const x = slotStart + i * r.slot_pitch;
    if (x > len - r.pad_width + 0.01) break;
    paths.push({
      id: `${CROSS_STRAP_PIECE_ID}-slot-${i + 1}`, closed: false,
      label: i === 0 ? 'Cut-to-fit slots — sew across, cut between slots, sear' : undefined,
      edges: [seg(eid, 'stitch', x, 0, x, wb)],
    });
  }
  return {
    id: CROSS_STRAP_PIECE_ID,
    name: 'H cross strap',
    mirror: false,
    quantity: 1,
    materialId: `webbing-${Math.round(wb)}`,
    paths,
    seamAllowances: zeroSa(outline),
    annotations: [{ kind: 'label', label: `Cross strap — ${fmt(len)} mm of ${fmt(wb)} mm webbing: ${fmt(r.pad_width)} on each pad + ${fmt(r.pad_spread)} spread + ${fmt(r.chest_adjust_range)} slotted adjustment (${r.slot_count} slots at ${fmt(r.slot_pitch)} mm)` }],
  };
}

function buildChannelBars(r: ResolvedInputs, count: number): Piece {
  const eid = makeEdgeIdGen(CHANNEL_BAR_PIECE_ID);
  const len = r.pad_width + 1 * IN;
  const outline = rect(eid, `${CHANNEL_BAR_PIECE_ID}-outline`, len, r.webbing_width);
  return {
    id: CHANNEL_BAR_PIECE_ID,
    name: 'Hydration channel bar (sew ends only)',
    mirror: false,
    quantity: count * 2,
    materialId: `webbing-${Math.round(r.webbing_width)}`,
    paths: [outline],
    seamAllowances: zeroSa(outline),
    annotations: [{ kind: 'label', label: `Channel bar — ${count * 2} × ${fmt(len)} mm of ${fmt(r.webbing_width)} mm webbing; box-X the ends on the pad, the middle stays open for the carrier strap` }],
  };
}

function buildPalsRows(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(PALS_ROW_PIECE_ID);
  // Rows are cut 1" long and trimmed after sewing (plate-carriers/pals-sewn-webbing.md).
  const len = r.pad_width + 1 * IN;
  const outline = rect(eid, `${PALS_ROW_PIECE_ID}-outline`, len, PALS_WEBBING_MM);
  const sides = r.routing_side === 'both' ? 2 : 1;
  return {
    id: PALS_ROW_PIECE_ID,
    name: 'Front PALS row (routing)',
    mirror: false,
    quantity: r.front_pals_rows * sides,
    materialId: 'webbing-25',
    paths: [outline],
    seamAllowances: zeroSa(outline),
    annotations: [{ kind: 'label', label: `PALS row — ${r.front_pals_rows * sides} × ${fmt(len)} mm of 1" webbing; sew at the marks, trim flush after` }],
  };
}

function harnessSteps(r: ResolvedInputs): Step[] {
  const pads = [PAD_PIECE_ID];
  const side = r.routing_side === 'both' ? 'both pads' : r.routing_side === 'none' ? 'neither pad' : `the ${r.routing_side} (non-dominant) pad`;
  return [
    {
      id: 'h.cross-strap', title: 'Join the pads with the cross strap',
      body: `Lay the pads mirrored (an explicit left and right — check twice). Sew the cross strap's first ${fmt(r.pad_width)} mm across the left pad at ${fmt(r.cross_strap_height)} mm from the top, both long edges, at a slight angle that kicks the pads outboard — that angle, not the padding, is what seats the yoke on the shoulders. Leave ${fmt(r.pad_spread)} mm of spread, then the slotted range runs onto the right pad. Leave every hydration-channel crossing marked on the pad UNSEWN: the channels are absence-of-stitching features and the carrier straps route through them.`,
      dependsOn: ['strap.assemble'], refsPieces: [...pads, CROSS_STRAP_PIECE_ID], group: 'H-harness',
    },
    ...(r.hydration_channels > 0 ? [{
      id: 'h.channels', title: 'Sew the hydration channel bars',
      body: `Above the cross strap on each pad, sew ${r.hydration_channels} crossing bar${r.hydration_channels === 1 ? '' : 's'} of ${fmt(r.webbing_width)} mm webbing at the marks — box-X the ends ONLY. The open middle is the channel; the hydration carrier's upper straps run under whichever bar puts the carrier at the right height (the ladder is the height adjustment). A tidy tack across the middle deletes the hydro mount.`,
      dependsOn: ['h.cross-strap'], refsPieces: [...pads, CHANNEL_BAR_PIECE_ID], group: 'H-harness',
    } satisfies Step] : []),
    {
      id: 'h.slots', title: 'Sew the cut-to-fit slots',
      body: `Sew ${r.slot_count} bar tacks across the cross strap at ${fmt(r.slot_pitch)} mm over the ${fmt(r.chest_adjust_range)} mm adjustment range. Sizing is one-way: a smaller wearer cuts between slots about 1/4" past a slot and sears the end (hot knife or soldering iron). Nothing can be added back.`,
      dependsOn: ['h.cross-strap'], refsPieces: [CROSS_STRAP_PIECE_ID], group: 'H-harness',
    },
    ...(r.front_pals_rows > 0 && r.routing_side !== 'none' ? [{
      id: 'h.pals', title: 'Sew the routing PALS on the pad face',
      body: `On ${side}, sew ${r.front_pals_rows} row${r.front_pals_rows === 1 ? '' : 's'} of 1" webbing at the marks (2" pitch) and trim the ends flush. Add an elastic loop per row. These carry the hydration tube and comm wire under the rows first; mounting a pouch is the last use.`,
      dependsOn: ['h.cross-strap'], refsPieces: [...pads, PALS_ROW_PIECE_ID], group: 'H-harness',
    } satisfies Step] : []),
    {
      id: 'h.corners', title: 'Fit the four corner buckles',
      body: `Fold ${fmt(BUCKLE_FOLD_MM)} mm of each of the four webbing ends back over a male side-release half and box-X it; a tri-glide on each leg takes the adjustment. Adjustment lives on the harness so the excess gathers where it can be wrapped and stowed — double-bypass it, keeper it with One-Wrap hook-side out. Never cut the corner tails.`,
      dependsOn: ['h.slots'], refsPieces: pads, group: 'H-harness',
    },
    {
      id: 'h.fit', title: 'Fit check',
      body: `Clip the four corners into the rig's buckles (it replaces the standard strap set with no sewing). Set the cross strap so the pads sit flat with no twist behind the back, then pick the hydration channel by torso height and where you wear the cross strap. If the pad length, width or crossing height feel wrong, change them here and recut — the vault gives no numbers for them.`,
      dependsOn: ['h.corners'], refsPieces: pads, group: 'H-harness',
    },
  ];
}
