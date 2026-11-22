/**
 * Bathtub-floor bivy — pattern builder (Convention B).
 *
 * Floor frame: x along the length (head at x = 0), y across. The floor is one
 * rectangle: the tub sides fold up along the drawn folds and each corner
 * square folds on its diagonal into an ear, so the floor has no seam below
 * the tub height. The top's long edges sew to the tub's long top edges; its
 * short edges sew to the arched edges of the head and foot gussets, whose
 * chords sew to the tub's end top edges (`geometry/chordArc.ts`).
 */
import { assignAssemblies } from '../../lib/pattern-engine/graph/Piece.js';
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import { chordArcPoints } from '../../lib/pattern-engine/geometry/chordArc.js';
import type { BivyInputs, BivyBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError, HardwareItem } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import { PLACEHOLDERS } from './defaults.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };
export const FLOOR_ID = 'bivy-floor';
export const TOP_ID = 'bivy-top';
export const HEAD_GUSSET_ID = 'bivy-gusset-head';
export const FOOT_GUSSET_ID = 'bivy-gusset-foot';
export const FLOOR_FABRIC_ID = 'bivy-floor-fabric';
export const TOP_FABRIC_ID = 'bivy-top-fabric';
export const MESH_ID = 'bivy-mesh';

const IN = 25.4;
const fmtIn = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');
const dim = (mm: number) => `${Math.round(mm)} mm (${fmtIn(mm)}")`;

function seg(eid: () => EdgeId, role: Edge['role'], a: Point, b: Point): Edge { return { kind: 'straight', id: eid(), role, start: a, end: b }; }
function poly(eid: () => EdgeId, id: string, pts: Point[], role: Edge['role'], closed = false, label?: string): Path {
  const edges: Edge[] = [];
  for (let i = 1; i < pts.length; i++) edges.push(seg(eid, role, pts[i - 1], pts[i]));
  if (closed) edges.push(seg(eid, role, pts[pts.length - 1], pts[0]));
  return { id, closed, edges, label };
}
const rect = (x0: number, y0: number, x1: number, y1: number): Point[] => [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
function zeroSa(path: Path): Record<EdgeId, number> { const o: Record<EdgeId, number> = {}; for (const e of path.edges) o[e.id] = 0; return o; }

function buildFloor(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(FLOOR_ID);
  const s = r.seam_allowance, t = r.tub_height;
  const Lc = r.floor_cut_length, Wc = r.floor_cut_width;
  const outline = poly(eid, `${FLOOR_ID}-outline`, rect(0, 0, Lc, Wc), 'cut', true);
  const k = s + t;
  const paths: Path[] = [
    outline,
    poly(eid, `${FLOOR_ID}-top-seam`, rect(s, s, Lc - s, Wc - s), 'stitch', true, `Tub top edge — sewn to the top and gussets ${fmtIn(s)}" in`),
    // Tub side folds, full length and width: the sides stand up along these.
    poly(eid, `${FLOOR_ID}-fold-y0`, [{ x: 0, y: k }, { x: Lc, y: k }], 'fold', false, `Tub side fold (90°) — ${fmtIn(t)}" sides`),
    poly(eid, `${FLOOR_ID}-fold-y1`, [{ x: 0, y: Wc - k }, { x: Lc, y: Wc - k }], 'fold', false, 'Tub side fold (90°)'),
    poly(eid, `${FLOOR_ID}-fold-x0`, [{ x: k, y: 0 }, { x: k, y: Wc }], 'fold', false, 'Tub end fold (90°)'),
    poly(eid, `${FLOOR_ID}-fold-x1`, [{ x: Lc - k, y: 0 }, { x: Lc - k, y: Wc }], 'fold', false, 'Tub end fold (90°)'),
  ];
  // Corner ears: fold each corner square on its diagonal and stitch its two sides together.
  const corners: [number, number, number, number][] = [[0, 0, k, k], [Lc, 0, Lc - k, k], [Lc, Wc, Lc - k, Wc - k], [0, Wc, k, Wc - k]];
  corners.forEach(([cx, cy, ix, iy], i) => {
    paths.push(poly(eid, `${FLOOR_ID}-ear-${i}`, [{ x: cx, y: cy }, { x: ix, y: iy }], 'notch', false, i === 0 ? 'Corner ear — fold the square on this diagonal (no cut), stitch its two sides together, fold the ear flat against the end' : undefined));
  });
  return {
    id: FLOOR_ID, name: 'Bathtub floor', mirror: false, quantity: 1, materialId: FLOOR_FABRIC_ID, paths, seamAllowances: zeroSa(outline),
    annotations: [
      { kind: 'grain', label: 'grain along the length', point: { x: Lc / 2, y: Wc / 2 - 60 }, angle: 0 },
      { kind: 'label', label: `Floor — cut ${dim(Lc)} × ${dim(Wc)}; ${fmtIn(t)}" tub sides and the allowance included; folded corners, no floor seam`, point: { x: Lc / 2, y: Wc / 2 } },
    ],
  };
}

export const TOP_HEAD_ID = 'bivy-top-head';
export const BRIM_ID = 'bivy-brim-channel';

/**
 * The top, or with a J zipper its body below the J. Frame: x from the head (or the J
 * line) toward the foot, y = 0 the left long edge lying on your back.
 */
function buildTop(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(TOP_ID);
  const s = r.seam_allowance;
  const Lc = r.top_cut_length, Wc = r.top_cut_width;
  const j = r.zip_style === 'j';
  const outline = poly(eid, `${TOP_ID}-outline`, rect(0, 0, Lc, Wc), 'cut', true);
  const zy = r.zip_side === 'left' ? 0 : Wc;
  const zx = s + r.zip_length;
  const inward = r.zip_side === 'left' ? 1 : -1;
  const paths: Path[] = [
    outline,
    poly(eid, `${TOP_ID}-sew`, rect(s, s, Lc - s, Wc - s), 'stitch', true, j ? `Sew line ${fmtIn(s)}" in: long edges to the tub, the head edge to the J zipper, the foot edge to the gusset` : `Sew line ${fmtIn(s)}" in: long edges to the tub, short edges to the gussets`),
    poly(eid, `${TOP_ID}-zip-end`, [{ x: zx, y: zy }, { x: zx, y: zy + inward * Math.max(s, 6) }], 'notch', false, `Zipper end — ${fmtIn(r.zip_length)}" from the ${j ? 'J' : 'head'} corner`),
    poly(eid, `${TOP_ID}-centre-head`, [{ x: 0, y: Wc / 2 }, { x: s, y: Wc / 2 }], 'notch', false, 'Centre'),
    poly(eid, `${TOP_ID}-centre-foot`, [{ x: Lc - s, y: Wc / 2 }, { x: Lc, y: Wc / 2 }], 'notch'),
  ];
  if (r.brim && !j) paths.push(...brimLines(r, eid, TOP_ID));
  return {
    id: TOP_ID, name: j ? 'Top (below the J)' : 'Top', mirror: false, quantity: 1, materialId: r.top_material === 'mesh' ? MESH_ID : TOP_FABRIC_ID, paths, seamAllowances: zeroSa(outline),
    annotations: [
      { kind: 'grain', label: 'grain along the length', point: { x: Lc / 2, y: Wc / 2 - 60 }, angle: 0 },
      { kind: 'label', label: `${j ? 'Top below the J' : 'Top'} — cut ${dim(Lc)} × ${dim(Wc)}, allowance included; zipper on the ${r.zip_side} long edge from the ${j ? 'J' : 'head'}`, point: { x: Lc / 2, y: Wc / 2 } },
    ],
  };
}

/** The brim channel's two stitch lines across the top, at the brim distance from the head edge. */
function brimLines(r: ResolvedInputs, eid: () => EdgeId, id: string): Path[] {
  const s = r.seam_allowance, Wc = r.top_cut_width;
  const x0 = s + r.brim_from_head, x1 = x0 + r.brim_channel;
  return [
    poly(eid, `${id}-brim-0`, [{ x: x0, y: s }, { x: x0, y: Wc - s }], 'stitch', false, `Brim channel — sew the channel strip on the inside between these lines, ends open at the side seams`),
    poly(eid, `${id}-brim-1`, [{ x: x1, y: s }, { x: x1, y: Wc - s }], 'stitch'),
  ];
}

/** J zipper: the head section of the top, from the head gusset to the J line. */
function buildTopHead(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(TOP_HEAD_ID);
  const s = r.seam_allowance;
  const Lc = r.top_head_cut_length, Wc = r.top_cut_width;
  const outline = poly(eid, `${TOP_HEAD_ID}-outline`, rect(0, 0, Lc, Wc), 'cut', true);
  const paths: Path[] = [
    outline,
    poly(eid, `${TOP_HEAD_ID}-sew`, rect(s, s, Lc - s, Wc - s), 'stitch', true, `Sew line ${fmtIn(s)}" in: head edge to the gusset, long edges to the tub, the foot edge to the J zipper`),
    poly(eid, `${TOP_HEAD_ID}-centre`, [{ x: 0, y: Wc / 2 }, { x: s, y: Wc / 2 }], 'notch', false, 'Centre'),
  ];
  if (r.brim) paths.push(...brimLines(r, eid, TOP_HEAD_ID));
  return {
    id: TOP_HEAD_ID, name: 'Top head (above the J)', mirror: false, quantity: 1, materialId: r.top_material === 'mesh' ? MESH_ID : TOP_FABRIC_ID, paths, seamAllowances: zeroSa(outline),
    annotations: [{ kind: 'label', label: `Top head — cut ${dim(Lc)} × ${dim(Wc)}; the J zipper crosses at its foot edge`, point: { x: Lc / 2, y: Wc / 2 } }],
  };
}

/** The brim channel strip: the top's width (ends into the side seams) by the channel plus both turned edges. */
function buildBrim(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(BRIM_ID);
  const s = r.seam_allowance;
  const w = r.top_cut_width, h = r.brim_channel + 2 * s;
  const outline = poly(eid, `${BRIM_ID}-outline`, rect(0, 0, w, h), 'cut', true);
  return {
    id: BRIM_ID, name: 'Brim channel strip', mirror: false, quantity: 1, materialId: TOP_FABRIC_ID,
    paths: [outline, poly(eid, `${BRIM_ID}-turn-0`, [{ x: 0, y: s }, { x: w, y: s }], 'fold', false, 'Hem — turn under (180°)'), poly(eid, `${BRIM_ID}-turn-1`, [{ x: 0, y: h - s }, { x: w, y: h - s }], 'fold', false, 'Hem — turn under (180°)')],
    seamAllowances: zeroSa(outline),
    annotations: [{ kind: 'label', label: `Brim channel — ${fmtIn(r.brim_channel)}" finished, edges turned under ${fmtIn(s)}"`, point: { x: w / 2, y: h / 2 } }],
  };
}

function buildGusset(r: ResolvedInputs, id: string, name: string, materialId: string): Piece {
  const eid = makeEdgeIdGen(id);
  const s = r.seam_allowance, W = r.floor_width, a = r.arch!;
  const arc = chordArcPoints({ chord: W, arcLength: r.top_width, radius: a.radius, theta: a.theta, rise: a.rise }, 32);
  // Offset the arc out by s about its centre, the chord down by s.
  const cx = W / 2, cy = a.radius * Math.cos(a.theta / 2);
  const out = arc.map((p) => { const dx = p.x - cx, dy = p.y - cy, L = Math.hypot(dx, dy); return { x: p.x + (s * dx) / L, y: p.y + (s * dy) / L }; });
  const ring = [...out, { x: out[out.length - 1].x, y: s }, { x: out[0].x, y: s }];
  const minX = Math.min(...ring.map((p) => p.x)), minY = Math.min(...ring.map((p) => p.y));
  const mv = (p: Point) => ({ x: p.x - minX, y: p.y - minY });
  const outline = poly(eid, `${id}-outline`, ring.map(mv), 'cut', true);
  const paths: Path[] = [
    outline,
    poly(eid, `${id}-arch`, arc.map(mv), 'stitch', false, `Arch — sewn to the top's ${name === 'Head gusset' ? 'head' : 'foot'} edge (${fmtIn(r.top_width)}")`),
    poly(eid, `${id}-chord`, [mv({ x: 0, y: 0 }), mv({ x: W, y: 0 })], 'stitch', false, `Base — sewn to the tub's end (${fmtIn(W)}")`),
    poly(eid, `${id}-centre`, [mv({ x: W / 2, y: 0 }), mv({ x: W / 2, y: s })], 'notch'),
  ];
  return {
    id, name, mirror: false, quantity: 1, materialId, paths, seamAllowances: zeroSa(outline),
    annotations: [{ kind: 'label', label: `${name} — ${fmtIn(W)}" base, ${fmtIn(a.rise)}" rise; allowance included`, point: mv({ x: W / 2, y: -a.rise / 2 }) }],
  };
}

function buildSteps(r: ResolvedInputs): Step[] {
  const ids = [FLOOR_ID, ...(r.zip_style === 'j' ? [TOP_HEAD_ID] : []), TOP_ID, HEAD_GUSSET_ID, FOOT_GUSSET_ID, ...(r.brim ? [BRIM_ID] : [])];
  return [
    { id: 'bivy.cut', title: 'Cut the pieces', body: `Floor ${dim(r.floor_cut_length)} × ${dim(r.floor_cut_width)} from the waterproof floor fabric; top ${dim(r.top_cut_length)} × ${dim(r.top_cut_width)} and the foot gusset from ${r.top_material === 'mesh' ? 'no-see-um mesh' : 'the top fabric'}; the head gusset from ${r.head_gusset === 'mesh' || r.top_material === 'mesh' ? 'no-see-um mesh' : 'the top fabric'}. The ${Math.round(r.seam_allowance * 10) / 10} mm allowance is included in every piece. Sewn fabrics only.`, dependsOn: [], refsPieces: ids, group: 'Cut' },
    { id: 'bivy.tub', title: 'Fold the tub corners', body: `At each corner of the floor, fold the corner square on its marked diagonal, outside together, stitch its two sides together from the raw edge to the inner corner and fold the ear flat against the end wall; tack it. The ${fmtIn(r.tub_height)}" sides then stand up along the folds. Nothing is cut, so the floor has no seam below the tub height; seal the four corner seams.`, dependsOn: ['bivy.cut'], refsPieces: [FLOOR_ID], group: 'Floor' },
    ...(r.brim ? [{ id: 'bivy.brim', title: 'Brim channel', body: `Turn both long edges of the strip under and sew it to the inside of the top between the brim lines, ${fmtIn(r.brim_from_head)}" from the head edge, ends open at the side seams. A wire or a short pole about ${fmtIn(r.top_width)}" long slides in after assembly and holds the fabric off the face.`, dependsOn: ['bivy.cut'], refsPieces: [r.zip_style === 'j' ? TOP_HEAD_ID : TOP_ID, BRIM_ID], group: 'Top' }] : []),
    { id: 'bivy.gussets', title: 'Gussets to the top', body: `Right sides together, sew each gusset's arch to a short edge of the top, centres matched, easing the ${fmtIn(r.top_width)}" edge round the curve.`, dependsOn: ['bivy.cut'], refsPieces: [TOP_ID, HEAD_GUSSET_ID, FOOT_GUSSET_ID], group: 'Top' },
    r.zip_style === 'j'
      ? { id: 'bivy.zip', title: 'J zipper', body: `Sew a ${dim(r.zipper_length)} zipper in a J: one tape across the head section's foot edge and the other across the body's head edge (${fmtIn(r.top_width)}" across, from the far side seam), then round the ${r.zip_side} corner and on along the body's ${r.zip_side} long edge to the zipper mark, its other tape there to the tub's top edge. Ease the tape round the corner with a few clips into its allowance.`, dependsOn: ['bivy.gussets', 'bivy.tub'], refsPieces: [TOP_HEAD_ID, TOP_ID, FLOOR_ID], group: 'Join' }
      : { id: 'bivy.zip', title: 'Zipper in the side seam', body: `Sew one tape of a ${dim(r.zip_length)} zipper to the top's ${r.zip_side} long edge from the head corner to the zipper mark, and the other tape to the tub's matching top edge, so the zipper closes the seam there.`, dependsOn: ['bivy.gussets', 'bivy.tub'], refsPieces: [TOP_ID, FLOOR_ID], group: 'Join' },
    { id: 'bivy.join', title: 'Top to the tub', body: `Right sides together, sew the rest of the top's long edges and both gusset bases to the tub's top edge on the drawn line, ${fmtIn(r.seam_allowance)}" in, corners matched; finish the allowance (bind or overlock). Turn it right side out.`, dependsOn: ['bivy.zip'], refsPieces: ids, group: 'Join' },
    { id: 'bivy.test', title: 'Lie in it before you trust it', body: `Inside height at the head is about ${fmtIn(r.head_height)}" (the ${fmtIn(r.tub_height)}" tub plus the ${fmtIn(r.arch!.rise)}" arch), less once you are in it. Check the length with your bag inside; every number in this pattern is a placeholder until checked.`, dependsOn: ['bivy.join'], refsPieces: ids, group: 'Finish' },
  ];
}

function mockDerived(inputs: BivyInputs, r: ResolvedInputs): GeneratorWarning[] {
  const unit = r.units === 'in' ? (mm: number) => `${(mm / IN).toFixed(3).replace(/\.?0+$/, '')}"` : (mm: number) => `${Math.round(mm * 10) / 10} mm`;
  const applies = (f: keyof BivyInputs) => (f === 'j_from_head' ? r.zip_style === 'j' : f === 'brim_from_head' || f === 'brim_channel' ? r.brim : true);
  const open = PLACEHOLDERS.filter((p) => applies(p.field) && (inputs[p.field] === undefined || inputs[p.field] === null));
  if (open.length === 0) return [];
  return [{
    id: 'mock-derived', severity: 'info', field: open[0].field,
    message: `[mock-derived] ${open.length} placeholder${open.length === 1 ? '' : 's'} with no vault source ${open.length === 1 ? 'is' : 'are'} in use: ${open.map((p) => `${p.label} ${p.kind === 'sa' ? `${p.mm} mm` : unit(p.mm)}`).join('; ')}. They are common starting points, not checked measurements: check each against the vault or a mock-up, then enter it.`,
  }];
}

function buildWarnings(inputs: BivyInputs, r: ResolvedInputs): GeneratorWarning[] {
  const w = mockDerived(inputs, r);
  w.push({ id: 'head-height', severity: 'info', field: 'top_width', message: `About ${fmtIn(r.head_height)}" of height at the head (the ${fmtIn(r.tub_height)}" tub plus a ${fmtIn(r.arch!.rise)}" arch from the ${fmtIn(r.top_width)}" top over the ${fmtIn(r.floor_width)}" floor). A wider top gives more room.` });
  if (r.top_material === 'mesh') w.push({ id: 'bug-bivy', severity: 'info', field: 'top_material', message: 'Bug bivy: everything above the tub is mesh. It keeps insects off and sheds no rain; use it under a tarp. The floor is still the waterproof tub.' });
  else if (r.head_gusset === 'mesh') w.push({ id: 'mesh-head', severity: 'info', field: 'head_gusset', message: 'The head gusset is mesh: it breathes and keeps insects out, and it lets rain in. Pitch under a tarp.' });
  return w;
}

export function buildPattern(inputs: BivyInputs): Result<BivyBuildResult> {
  const v = validateInputs(inputs);
  if (!v.ok) return { ok: false, errors: v.errors };
  const r = resolveInputs(inputs);
  const pieces: Piece[] = [
    buildFloor(r),
    ...(r.zip_style === 'j' ? [buildTopHead(r)] : []),
    buildTop(r),
    ...(r.brim ? [buildBrim(r)] : []),
    // A bug bivy is mesh above the tub everywhere.
    buildGusset(r, HEAD_GUSSET_ID, 'Head gusset', r.head_gusset === 'mesh' || r.top_material === 'mesh' ? MESH_ID : TOP_FABRIC_ID),
    buildGusset(r, FOOT_GUSSET_ID, 'Foot gusset', r.top_material === 'mesh' ? MESH_ID : TOP_FABRIC_ID),
  ];
  const hardware: HardwareItem[] = [
    { id: 'zipper', name: 'Zipper (two-way slider recommended)', quantity: 1, notes: r.zip_style === 'j' ? `${dim(r.zipper_length)}: across the top at the J, then down the ${r.zip_side} side` : `${dim(r.zip_length)} in the ${r.zip_side} side seam from the head` },
    ...(r.brim ? [{ id: 'brim-wire', name: 'Brim wire or short pole', quantity: 1, notes: `about ${dim(r.top_width)}, cut to hold the top off the face` }] : []),
    { id: 'seam-sealer', name: 'Seam sealer for the floor fabric', quantity: 1, notes: 'the four folded corner seams' },
  ];
  assignAssemblies(pieces, [[/floor/, 'Floor'], [/top|gusset|brim|net/, 'Top and ends']]);
  return { ok: true, value: { pieces, steps: buildSteps(r), warnings: buildWarnings(inputs, r), hardware, resolved: r } };
}
