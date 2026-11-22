/**
 * Wind shirt — pattern builder (Convention B). Back and front whole (mirrored
 * from the bodice halves), two sleeves, a neck binding. Every cut edge takes
 * an explicit 0; the sew lines are the finished edges, drawn per seam; the
 * hem and the cuff channels come from the Hem primitive.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import { resolveHem, hemLines } from '../../lib/pattern-engine/primitives/hem.js';
import type { WindShirtInputs, WindShirtBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError, HardwareItem } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import { PLACEHOLDERS } from './defaults.js';
import { draftShirt, runs, type Outline, type Tag, type ShirtDraft } from './draft.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };
export const BACK_ID = 'shirt-back';
export const FRONT_ID = 'shirt-front';
export const SLEEVE_ID = 'shirt-sleeve';
export const BINDING_ID = 'shirt-binding';
export const FABRIC_ID = 'shirt-fabric';

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
function zeroSa(path: Path): Record<EdgeId, number> { const o: Record<EdgeId, number> = {}; for (const e of path.edges) o[e.id] = 0; return o; }

const LABEL: Partial<Record<Tag, string>> = {
  shoulder: 'Shoulder seam', armhole: 'Armhole — the sleeve cap sews here', side: 'Side seam', neck: 'Neckline — bound, no allowance',
  cap: 'Sleeve cap — to the armhole', underseam: 'Underarm seam',
};

function sewLines(o: Outline, id: string, eid: () => EdgeId, tags: Tag[]): Path[] {
  const out: Path[] = [];
  for (const t of tags) runs(o, t).forEach((pts, i) => out.push(poly(eid, `${id}-${t}-${i}`, pts, 'stitch', false, i === 0 ? LABEL[t] : undefined)));
  return out;
}

function bodyPiece(r: ResolvedInputs, o: Outline, id: string, name: string, front: boolean, d: ShirtDraft): Piece {
  const eid = makeEdgeIdGen(id);
  const outline = poly(eid, `${id}-outline`, o.cut, 'cut', true);
  const paths: Path[] = [outline, ...sewLines(o, id, eid, ['neck', 'shoulder', 'armhole', 'side'])];
  const hem = resolveHem({ depth: r.hem_depth, fold: 'single' });
  const hemRun = runs(o, 'hem')[0];
  if (hem.ok && hemRun) paths.push(...hemLines({ hem: hem.value, finished: hemRun, outward: { x: 0, y: 1 }, idPrefix: `${id}-hem`, eid, name: 'Body hem' }).paths);
  const cx = (Math.min(...o.finished.map((p) => p.x)) + Math.max(...o.finished.map((p) => p.x))) / 2;
  const topY = Math.min(...runs(o, 'neck').flat().map((p) => p.y).filter((y) => Number.isFinite(y)));
  if (front) {
    // The quarter zip: cut down the centre front from the neckline.
    const neckTop = Math.max(...runs(o, 'neck').flat().filter((p) => Math.abs(p.x - cx) < 1).map((p) => p.y), topY);
    paths.push(poly(eid, `${id}-zip-slit`, [{ x: cx, y: neckTop }, { x: cx, y: neckTop + r.zip_length }], 'notch', false, `Zipper slit — cut ${fmtIn(r.zip_length)}" down the centre front`));
  }
  const mid = { x: cx, y: (o.height) / 2 };
  return {
    id, name, mirror: false, quantity: 1, materialId: FABRIC_ID, paths, seamAllowances: zeroSa(outline),
    annotations: [
      { kind: 'grain', label: 'grain down the body', point: { x: cx + 80, y: mid.y }, angle: 90 },
      { kind: 'label', label: `${name} — cut ${dim(o.width)} × ${dim(o.height)}; allowances and hem included; chest ${fmtIn(4 * d.bodice.widths.chest)}" eased round`, point: mid },
    ],
  };
}

function sleevePiece(r: ResolvedInputs, o: Outline, d: ShirtDraft): Piece {
  const eid = makeEdgeIdGen(SLEEVE_ID);
  const outline = poly(eid, `${SLEEVE_ID}-outline`, o.cut, 'cut', true);
  const paths: Path[] = [outline, ...sewLines(o, SLEEVE_ID, eid, ['cap', 'underseam'])];
  const cuff = resolveHem({ depth: r.cuff_channel, fold: 'double' });
  const w = runs(o, 'wrist')[0];
  if (cuff.ok && w) paths.push(...hemLines({ hem: cuff.value, finished: w, outward: { x: 0, y: 1 }, idPrefix: `${SLEEVE_ID}-cuff`, eid, name: 'Cuff elastic channel hem' }).paths);
  // Cap top notch: matches the shoulder seam.
  const cap = runs(o, 'cap')[0];
  const top = cap.reduce((a, p) => (p.y < a.y ? p : a), cap[0]);
  paths.push(poly(eid, `${SLEEVE_ID}-capnotch`, [top, { x: top.x, y: top.y + 12 }], 'notch', false, 'Cap top — to the shoulder seam'));
  return {
    id: SLEEVE_ID, name: 'Sleeve (cut 2)', mirror: false, quantity: 2, materialId: FABRIC_ID, paths, seamAllowances: zeroSa(outline),
    annotations: [{ kind: 'label', label: `Sleeve — ${fmtIn(d.sleeve.capHeight)}" cap, ${fmtIn(d.sleeve.bicep)}" bicep, ${fmtIn(d.sleeve.wrist)}" wrist; allowances and cuff channel included`, point: { x: o.width / 2, y: o.height / 2 } }],
  };
}

function bindingPiece(r: ResolvedInputs, d: ShirtDraft): Piece {
  const eid = makeEdgeIdGen(BINDING_ID);
  const s = r.seam_allowance;
  const w = d.seams.neckline + 2 * s, h = r.binding_width;
  const outline = poly(eid, `${BINDING_ID}-outline`, [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], 'cut', true);
  return {
    id: BINDING_ID, name: 'Neck binding', mirror: false, quantity: 1, materialId: FABRIC_ID, seamAllowances: zeroSa(outline),
    paths: [
      outline,
      poly(eid, `${BINDING_ID}-sew`, [{ x: s, y: h / 4 }, { x: w - s, y: h / 4 }], 'stitch', false, `Binding sew line — ${fmtIn(d.seams.neckline)}" round the neck, ends turned in ${fmtIn(s)}" at the zipper`),
      poly(eid, `${BINDING_ID}-fold`, [{ x: 0, y: h / 2 }, { x: w, y: h / 2 }], 'fold', false, 'Binding fold (180°)'),
    ],
    annotations: [{ kind: 'label', label: `Binding — cut ${dim(w)} × ${dim(h)} on the bias or the stretch`, point: { x: w / 2, y: (3 * h) / 4 } }],
  };
}

function buildSteps(r: ResolvedInputs, d: ShirtDraft): Step[] {
  const all = [BACK_ID, FRONT_ID, SLEEVE_ID, BINDING_ID];
  return [
    { id: 'shirt.cut', title: 'Cut the pieces', body: `Back and front ${dim(d.back.height)} long, two sleeves and the neck binding, allowances and hems included. Cut the ${fmtIn(r.zip_length)}" zipper slit down the centre front. Grain down the body and the sleeves.`, dependsOn: [], refsPieces: all, group: 'Cut' },
    { id: 'shirt.zip', title: 'Quarter zip', body: `Set a ${dim(r.zip_length)} zipper into the front slit (a faced or exposed zipper), its top at the neckline.`, dependsOn: ['shirt.cut'], refsPieces: [FRONT_ID], group: 'Front' },
    { id: 'shirt.shoulders', title: 'Shoulder seams', body: `Right sides together, sew the front to the back at both shoulders, ${fmtIn(r.seam_allowance)}" in.`, dependsOn: ['shirt.zip'], refsPieces: [BACK_ID, FRONT_ID], group: 'Body' },
    { id: 'shirt.neck', title: 'Bind the neck', body: `Sew the binding round the neckline on its sew line, ${fmtIn(d.seams.neckline)}" from zipper edge to zipper edge, ends turned in; fold it over the raw edge and stitch in the ditch.`, dependsOn: ['shirt.shoulders'], refsPieces: [BACK_ID, FRONT_ID, BINDING_ID], group: 'Body' },
    { id: 'shirt.sleeves', title: 'Set the sleeves flat', body: `With the body open flat, sew each sleeve cap into its armhole, the cap notch at the shoulder seam. The cap is ${fmtIn(r.cap_ease)}" longer than the armhole: ease it in over the shoulder.`, dependsOn: ['shirt.neck'], refsPieces: [SLEEVE_ID, BACK_ID, FRONT_ID], group: 'Sleeves' },
    { id: 'shirt.sides', title: 'Underarm and side seams', body: 'In one seam each side, sew from the cuff up the sleeve, through the underarm point and down the side to the hem.', dependsOn: ['shirt.sleeves'], refsPieces: [SLEEVE_ID, BACK_ID, FRONT_ID], group: 'Sleeves' },
    { id: 'shirt.hems', title: 'Hem and cuffs', body: `Hem the body (mark ${fmtIn(2 * r.hem_depth)}" in, fold to the mark). Roll each cuff into a ${fmtIn(r.cuff_channel)}" channel, leave a gap, thread ${dim(r.elastic_length)} of elastic, join it and close the gap.`, dependsOn: ['shirt.sides'], refsPieces: [BACK_ID, FRONT_ID, SLEEVE_ID], group: 'Finish' },
  ];
}

function mockDerived(inputs: WindShirtInputs, r: ResolvedInputs): GeneratorWarning[] {
  const unit = r.units === 'in' ? (mm: number) => `${(mm / IN).toFixed(3).replace(/\.?0+$/, '')}"` : (mm: number) => `${Math.round(mm * 10) / 10} mm`;
  const applies = (f: keyof WindShirtInputs) => (f === 'ease_waist' || f === 'ease_hip' || f === 'waist' || f === 'hip' ? r.body === 'shaped' : true);
  const open = PLACEHOLDERS.filter((p) => applies(p.field) && (inputs[p.field] === undefined || inputs[p.field] === null));
  if (open.length === 0) return [];
  const body = open.filter((p) => p.label.endsWith('(example body)'));
  const show = (p: (typeof PLACEHOLDERS)[number]) => (p.kind === 'percent' ? `${p.mm} %` : p.kind === 'sa' ? `${p.mm} mm` : unit(p.mm));
  return [{
    id: 'mock-derived', severity: 'info', field: open[0].field,
    message: `[mock-derived] ${open.length} placeholder${open.length === 1 ? '' : 's'} in use${body.length ? `, ${body.length} of them measurements from an example body (one person, not a size chart)` : ''}: ${open.map((p) => `${p.label} ${show(p)}`).join('; ')}. Measure the wearer and enter each.`,
  }];
}

export function buildPattern(inputs: WindShirtInputs): Result<WindShirtBuildResult> {
  const v = validateInputs(inputs);
  if (!v.ok) return { ok: false, errors: v.errors };
  const r = resolveInputs(inputs);
  const dr = draftShirt(r);
  if (!dr.ok) return { ok: false, errors: dr.errors };
  const d = dr.value;
  const binding = bindingPiece(r, d);
  const pieces: Piece[] = [bodyPiece(r, d.back, BACK_ID, 'Back', false, d), bodyPiece(r, d.front, FRONT_ID, 'Front', true, d), sleevePiece(r, d.sleevePiece, d), binding];
  const seams = { ...d.seams, binding: binding.paths.find((p) => p.id === `${BINDING_ID}-sew`)!.edges.reduce((s, e) => s + Math.hypot(e.end.x - e.start.x, e.end.y - e.start.y), 0) };
  const hardware: HardwareItem[] = [
    { id: 'zipper', name: 'Zipper (non-separating) for the quarter zip', quantity: 1, notes: dim(r.zip_length) },
    { id: 'elastic', name: 'Cuff elastic', quantity: 2, notes: `${dim(r.elastic_length)} each (${r.elastic_pct} % of the wrist), narrower than the ${fmtIn(r.cuff_channel)}" channel` },
  ];
  const warnings = mockDerived(inputs, r);
  return { ok: true, value: { pieces, steps: buildSteps(r, d), warnings, hardware, resolved: r, seams } };
}
