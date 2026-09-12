/** Tactical Organizer — pattern builder (Convention B: cut sizes include hems; explicit 0 on every edge). */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Edge, EdgeId } from '../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { OrganizerInputs, OrganizerBuildResult, ResolvedInputs, GeneratorWarning, BuildPatternError, HardwareItem } from './types.js';
import { resolveInputs, validateInputs } from './inputs.js';
import { BELLOWS_MAX_MM, PEN_SLOT_HONEST_MM, PRODUCTION_HEM_MIN_MM } from './defaults.js';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: BuildPatternError[] };
export const BODY_ID = 'organizer-body';
export const PANEL_ID = 'organizer-front-panel';

const IN = 25.4;
const fmtIn = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');
const dim = (mm: number) => `${Math.round(mm)} mm (${fmtIn(mm)}")`;

function seg(eid: () => EdgeId, role: Edge['role'], sx: number, sy: number, ex: number, ey: number): Edge {
  return { kind: 'straight', id: eid(), role, start: { x: sx, y: sy }, end: { x: ex, y: ey } };
}
function rect(eid: () => EdgeId, id: string, w: number, h: number): Path {
  return { id, closed: true, edges: [seg(eid, 'cut', 0, 0, w, 0), seg(eid, 'cut', w, 0, w, h), seg(eid, 'cut', w, h, 0, h), seg(eid, 'cut', 0, h, 0, 0)] };
}
function zeroSa(path: Path): Record<EdgeId, number> { const o: Record<EdgeId, number> = {}; for (const e of path.edges) o[e.id] = 0; return o; }
function strip(id: string, name: string, w: number, h: number, quantity: number, materialId: string, label: string): Piece {
  const eid = makeEdgeIdGen(id);
  const outline = rect(eid, `${id}-outline`, w, h);
  return { id, name, mirror: false, quantity, materialId, paths: [outline], seamAllowances: zeroSa(outline), annotations: [{ kind: 'label', label }] };
}

function buildBody(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(BODY_ID);
  const W = r.body_cut_width, L = r.body_cut_length;
  const outline = rect(eid, `${BODY_ID}-outline`, W, L);
  const paths: Path[] = [outline];
  const halves = r.bifold ? 2 : 1;
  const unit = L / halves;
  for (let hIdx = 0; hIdx < halves; hIdx++) {
    const y0 = hIdx * unit;
    // Top hems at both ends of each folded unit: fold at the hem depth, raw edge marked at double.
    paths.push(
      { id: `${BODY_ID}-hem-a-${hIdx}`, closed: false, label: `${fmtIn(r.body_hem)}" hem — fold the raw edge to the ${fmtIn(r.body_hem_mark)}" mark`, edges: [seg(eid, 'fold', 0, y0 + r.body_hem, W, y0 + r.body_hem)] },
      { id: `${BODY_ID}-mark-a-${hIdx}`, closed: false, label: `Mark at ${fmtIn(r.body_hem_mark)}" (double the hem)`, edges: [seg(eid, 'notch', 0, y0 + r.body_hem_mark, W * 0.15, y0 + r.body_hem_mark), seg(eid, 'notch', W * 0.85, y0 + r.body_hem_mark, W, y0 + r.body_hem_mark)] },
      { id: `${BODY_ID}-hem-b-${hIdx}`, closed: false, edges: [seg(eid, 'fold', 0, y0 + unit - r.body_hem, W, y0 + unit - r.body_hem)] },
      { id: `${BODY_ID}-mark-b-${hIdx}`, closed: false, edges: [seg(eid, 'notch', 0, y0 + unit - r.body_hem_mark, W * 0.15, y0 + unit - r.body_hem_mark), seg(eid, 'notch', W * 0.85, y0 + unit - r.body_hem_mark, W, y0 + unit - r.body_hem_mark)] },
      { id: `${BODY_ID}-bottom-fold-${hIdx}`, closed: false, label: 'Bottom fold — fold in half, Velcro out; the preview starts it open (120°) and the seams close it', edges: [seg(eid, 'fold', 0, y0 + unit / 2, W, y0 + unit / 2)] },
    );
    // Velcro (or PALS) on the outside of the back half, before any folding: horizontal strips below the hem.
    if (!r.pals_back && r.velcro_strip_count > 0) {
      const x0 = (W - r.velcro_strip_length) / 2;
      const blockTop = y0 + r.body_hem + (r.clear_height - r.velcro_block_height) / 2;
      for (let s = 0; s < r.velcro_strip_count; s++) {
        const y = blockTop + s * (r.velcro_strip_width + r.velcro_gap);
        paths.push({ id: `${BODY_ID}-velcro-${hIdx}-${s}`, closed: false, label: s === 0 && hIdx === 0 ? `Hook strips ${fmtIn(r.velcro_strip_width)} × ${fmtIn(r.velcro_strip_length)}", ${r.velcro_strip_count} across with a ${fmtIn(r.velcro_gap)}" gap — on the OUTSIDE of the back half, sewn before any fold` : undefined, edges: [seg(eid, 'stitch', x0, y, x0 + r.velcro_strip_length, y), seg(eid, 'stitch', x0 + r.velcro_strip_length, y, x0 + r.velcro_strip_length, y + r.velcro_strip_width), seg(eid, 'stitch', x0 + r.velcro_strip_length, y + r.velcro_strip_width, x0, y + r.velcro_strip_width), seg(eid, 'stitch', x0, y + r.velcro_strip_width, x0, y)] });
      }
    }
    if (r.pals_back) {
      for (let row = 0; row < Math.floor(r.clear_height / (2 * IN)); row++) {
        const y = y0 + r.body_hem + 0.5 * IN + row * 2 * IN;
        paths.push({ id: `${BODY_ID}-pals-${hIdx}-${row}`, closed: false, label: row === 0 && hIdx === 0 ? 'PALS rows (1" webbing, 2" pitch) instead of Velcro' : undefined, edges: [seg(eid, 'stitch', r.side_seam_allowance, y, W - r.side_seam_allowance, y), seg(eid, 'stitch', r.side_seam_allowance, y + 1 * IN, W - r.side_seam_allowance, y + 1 * IN)] });
      }
    }
    if (r.grommets) {
      paths.push({ id: `${BODY_ID}-grommets-${hIdx}`, closed: false, label: 'Two grommets for 550 cord', edges: [seg(eid, 'notch', W * 0.3 - 3, y0 + unit / 2 - 0.4 * IN, W * 0.3 + 3, y0 + unit / 2 - 0.4 * IN), seg(eid, 'notch', W * 0.7 - 3, y0 + unit / 2 - 0.4 * IN, W * 0.7 + 3, y0 + unit / 2 - 0.4 * IN)] });
    }
  }
  return {
    id: BODY_ID, name: r.bifold ? 'Body (bifold, two pockets)' : 'Body', mirror: false, quantity: 1, materialId: 'cordura-500', paths, seamAllowances: zeroSa(outline),
    annotations: [
      { kind: 'grain', label: 'grain', point: { x: W / 2, y: L / 4 }, angle: 90 },
      { kind: 'label', label: `Body — cut ${dim(W)} × ${dim(L)}: the long dimension folds, the short one is the pouch width. Hems ${fmtIn(r.body_hem)}" both ends → ${fmtIn(r.pocket_height)}" pocket`, point: { x: W / 2, y: L / 4 } },
    ],
  };
}

function buildPanel(r: ResolvedInputs): Piece {
  const eid = makeEdgeIdGen(PANEL_ID);
  const W = r.panel_cut_width, H = r.panel_cut_height;
  const outline = rect(eid, `${PANEL_ID}-outline`, W, H);
  const paths: Path[] = [outline,
    { id: `${PANEL_ID}-hem`, closed: false, label: `${fmtIn(r.panel_hem)}" top hem — mark at ${fmtIn(r.panel_hem_mark)}", fold to the line`, edges: [seg(eid, 'fold', 0, r.panel_hem, W, r.panel_hem)] },
    { id: `${PANEL_ID}-mark`, closed: false, edges: [seg(eid, 'notch', 0, r.panel_hem_mark, W * 0.15, r.panel_hem_mark), seg(eid, 'notch', W * 0.85, r.panel_hem_mark, W, r.panel_hem_mark)] },
    // Side folds: creased, not sewn; they become the bellows. Not a hinge in the preview (0°).
    { id: `${PANEL_ID}-side-fold-l`, closed: false, label: `Side fold ${fmtIn(r.side_fold)}" in — crease only; ${fmtIn(r.span_loss)}" bridges to the body, ${fmtIn(r.bellows_depth)}" becomes bellows (0°)`, edges: [seg(eid, 'fold', r.side_fold, 0, r.side_fold, H)] },
    { id: `${PANEL_ID}-side-fold-r`, closed: false, label: 'Side fold (0°)', edges: [seg(eid, 'fold', W - r.side_fold, 0, W - r.side_fold, H)] },
  ];
  // Dividers are marked on the assembled face from the side seam; shown here at their flat-centre positions.
  const faceLeft = r.side_fold + (r.side_seam_allowance - r.span_loss);
  r.divider_positions.forEach((pos, i) => {
    const x = faceLeft + pos;
    paths.push({ id: `${PANEL_ID}-divider-${i}`, closed: false, label: i === 0 ? `Divider ${fmtIn(pos)}" from the side seam (marked on the assembled face); slots ${r.slot_widths.map(fmtIn).join('", ')}", wide pocket ${fmtIn(r.wide_pocket_width)}"` : `Divider ${fmtIn(pos)}" from the side seam`, edges: [seg(eid, 'stitch', x, r.panel_hem_mark, x, H)] });
  });
  if (r.name_tape_loop) {
    const x0 = faceLeft + (r.divider_positions[r.divider_positions.length - 1] ?? 0);
    paths.push({ id: `${PANEL_ID}-name-tape`, closed: false, label: 'Loop patch for name tape', edges: [seg(eid, 'stitch', x0 + 0.25 * IN, H / 2 - 0.5 * IN, x0 + r.wide_pocket_width - 0.25 * IN, H / 2 - 0.5 * IN), seg(eid, 'stitch', x0 + 0.25 * IN, H / 2 + 0.5 * IN, x0 + r.wide_pocket_width - 0.25 * IN, H / 2 + 0.5 * IN)] });
  }
  return {
    id: PANEL_ID, name: 'Front pocket panel', mirror: false, quantity: r.bifold ? 2 : 1, materialId: 'cordura-500', paths, seamAllowances: zeroSa(outline),
    annotations: [
      { kind: 'grain', label: 'grain', point: { x: W / 2, y: H / 2 }, angle: 90 },
      { kind: 'label', label: `Front panel — cut ${dim(W)} × ${dim(H)}; ${fmtIn(r.panel_extra_width)}" wider than the body; side folds at ${fmtIn(r.side_fold)}" give ~${fmtIn(r.bellows_depth)}" of bellows`, point: { x: W / 2, y: H / 2 } },
    ],
  };
}

function buildSteps(r: ResolvedInputs): Step[] {
  const q = r.bifold ? 2 : 1;
  const steps: Step[] = [
    { id: 'org.cut', title: 'Cut the pieces', body: `Body ${dim(r.body_cut_width)} × ${dim(r.body_cut_length)} — the long side folds, the short side is the pouch width. Front panel ${dim(r.panel_cut_width)} × ${dim(r.panel_cut_height)}${q === 2 ? ', two of them' : ''}. ${r.velcro_strip_count > 0 && !r.pals_back ? `Hook Velcro ${fmtIn(r.velcro_strip_width)} × ${fmtIn(r.velcro_strip_length)}", ${r.velcro_strip_count * q} strips.` : ''} Use an etched steel square; keep the fabric shears off the webbing.`, dependsOn: [], refsPieces: [BODY_ID, PANEL_ID], group: 'Cut' },
    { id: 'org.mark', title: 'Mark the hems at double', body: `Mark ${fmtIn(r.body_hem_mark)}" from each end of the body on the inside face — double the ${fmtIn(r.body_hem)}" hem — and ${fmtIn(r.panel_hem_mark)}" on the front panel's top. Fold the raw edge to the line and the hem comes out right every time; that is the whole production rule.`, dependsOn: ['org.cut'], refsPieces: [BODY_ID, PANEL_ID], group: 'Hems' },
    { id: 'org.body-hems', title: 'Hem both body ends', body: 'Fold each raw end to its mark and double stitch. Tack at every start and stop.', dependsOn: ['org.mark'], refsPieces: [BODY_ID], group: 'Hems' },
  ];
  if (r.pals_back) {
    steps.push({ id: 'org.velcro', title: 'PALS rows on the back half', body: 'Sew the 1" webbing rows at the marks on the outside of the back half now, before any fold, bar-tacked at the side seam allowance and every 1.5". Sew them later and you sew the pocket shut.', dependsOn: ['org.body-hems'], refsPieces: [BODY_ID], group: 'Interior first' });
  } else if (r.velcro_strip_count > 0) {
    steps.push({ id: 'org.velcro', title: 'Velcro onto the outside of the back half — before folding anything', body: `Sew the ${r.velcro_strip_count} hook strips across the back half at the marks, ${fmtIn(r.velcro_gap)}" apart, clear of the hem and the ${fmtIn(r.side_seam_allowance)}" side seam allowance. Split strips peel with a finger and let the panel flex; one full field would stiffen it into a board you cannot pull off loaded. Sew it later and you sew the pocket shut. The stitching shows inside the notebook pocket; that is expected.${r.loop_over_hook ? ' Stick opposing loop over part of the hook so it does not snag in a pocket; add or remove loop until the removal force feels right.' : ''}`, dependsOn: ['org.body-hems'], refsPieces: [BODY_ID, 'organizer-velcro-hook'], group: 'Interior first' });
  }
  steps.push(
    { id: 'org.panel-hem', title: 'Front panel top hem', body: `Mark ${fmtIn(r.panel_hem_mark)}", fold to the line, double stitch, tack both ends.${r.panel_hem < PRODUCTION_HEM_MIN_MM ? ' (Production would be a 1/2" hem: easier to hit repeatably, and the panel would then be cut 1/4" taller.)' : ''}`, dependsOn: ['org.mark'], refsPieces: [PANEL_ID], group: 'Hems' },
    { id: 'org.creases', title: 'Crease the front panel side folds', body: `Crease ${fmtIn(r.side_fold)}" in from each edge. Do not sew them. Of that fold, ${fmtIn(r.span_loss)}" per side is spent bridging from the ${fmtIn(r.panel_flat_center)}" flat centre to the ${fmtIn(r.pouch_width)}" body; ${fmtIn(r.bellows_depth)}" survives as pocket depth. Mock this in paper first: the fold is a starting point, not a spec.`, dependsOn: ['org.panel-hem'], refsPieces: [PANEL_ID], group: 'Front panel' },
    { id: 'org.fold', title: 'Fold the body in half', body: 'Velcro out, fold at the bottom line.', dependsOn: [r.velcro_strip_count > 0 || r.pals_back ? 'org.velcro' : 'org.body-hems'], refsPieces: [BODY_ID], group: 'Assembly' },
    { id: 'org.position', title: 'Position the front panel', body: 'Bottom flush to the fold, top flush to the rim, side folds turned so the panel edges meet the body edges.', dependsOn: ['org.fold', 'org.creases'], refsPieces: [BODY_ID, PANEL_ID], group: 'Assembly' },
    { id: 'org.panel-bottom', title: 'Sew the front panel bottom — before the sides', body: 'Through the front layers only, not the back. Double stitch. This is the step skipped on camera that cost a side seam to unpick.', dependsOn: ['org.position'], refsPieces: [BODY_ID, PANEL_ID], group: 'Assembly' },
    { id: 'org.dividers', title: 'Divider lines', body: `Sew the dividers at ${r.divider_positions.map(fmtIn).join('" and ')}" from the side seam, bottom seam up to the panel's top hem. Single stitch is fine — closing the sides re-sews the outer lines. Tack top and bottom. Sew the line that will be hardest to see first; once the outer one is in, the material bunches.`, dependsOn: ['org.panel-bottom'], refsPieces: [PANEL_ID], group: 'Assembly' },
    { id: 'org.pleats', title: 'Set the bottom corner pleats', body: 'Push the bellows pleats into the bottom corners with a small screwdriver. They will not lie flat and their placement is aesthetic.', dependsOn: ['org.dividers'], refsPieces: [PANEL_ID], group: 'Assembly' },
    { id: 'org.sides', title: 'Close both sides — last, tight to the edge', body: `All layers, ${fmtIn(r.side_seam_allowance)}" from the edge or tighter: every bit further in eats bellows depth one for one and widens the pouch. Tack, travel back, forward, back. Stretch the seam to expose the thread tails and cut those with a fresh blade rather than digging into the Cordura.`, dependsOn: ['org.pleats'], refsPieces: [BODY_ID, PANEL_ID], group: 'Assembly' },
  );
  if (r.grommets) steps.push({ id: 'org.grommets', title: 'Set the grommets', body: 'Two grommets near the bottom fold for 550 cord — carry it in a pocket as an undercover wallet.', dependsOn: ['org.sides'], refsPieces: [BODY_ID], group: 'Finish' });
  return steps;
}

function buildWarnings(r: ResolvedInputs): GeneratorWarning[] {
  const w: GeneratorWarning[] = [];
  if (r.slot_widths.length >= 3 && r.wide_pocket_width < 1.25 * IN) w.push({ id: 'three-slots', severity: 'warning', field: 'slot_widths', message: `Three pen slots leave only ${fmtIn(r.wide_pocket_width)}" for the wide pocket — not enough for a folder. Drop the slots to 7/8" or cut the body an inch wider.` });
  if (r.slot_widths.some((s) => s > PEN_SLOT_HONEST_MM + 1e-6)) w.push({ id: 'slot-width', severity: 'info', field: 'slot_widths', message: '1 1/4" is generous for one pen: a Sharpie is ~7/16" and a 1 1/4" slot with 5/16" of bellows holds two sloppily. 7/8"–1" is the honest single-pen width.' });
  if (r.velcro_strip_count > 0 && r.velcro_strip_length > r.clear_width - 1e-6) w.push({ id: 'velcro-width', severity: 'warning', field: 'velcro_strip_length', message: `Velcro ${fmtIn(r.velcro_strip_length)}" long against a ${fmtIn(r.clear_width)}" clear width fights the side seam (the as-filmed 4 3/4" strips do); cut it ${fmtIn(r.clear_width - 0.25 * IN)}" unless closing the sides very tight.` });
  if (r.velcro_strip_count > 0 && r.velcro_strip_length > r.clear_height) w.push({ id: 'velcro-horizontal', severity: 'info', message: `The strips run horizontally: ${fmtIn(r.velcro_strip_length)}" does not fit the ${fmtIn(r.clear_height)}" of clear height below the hem.` });
  if (r.contents_height >= r.pocket_height - 1e-6) w.push({ id: 'flush', severity: 'info', field: 'pocket_height', message: `${fmtIn(r.contents_height)}" contents in a ${fmtIn(r.pocket_height)}" pocket sit flush — nothing to pinch for extraction. Measure the actual notebook; every 1/2" off the body length is only 1/4" off the pocket, because the panel is folded. For shorter contents drop foam in the bottom instead of reshaping the panel.` });
  if (r.panel_hem < PRODUCTION_HEM_MIN_MM) w.push({ id: 'production-hem', severity: 'info', field: 'panel_hem', message: `A ${fmtIn(r.panel_hem)}" panel hem is what he sewed on camera; production is 1/2", which would need the panel cut ${fmtIn(r.pocket_height + PRODUCTION_HEM_MIN_MM)}" tall. Production mode applies it.` });
  if (r.bellows_depth > BELLOWS_MAX_MM) w.push({ id: 'bellows-deep', severity: 'warning', field: 'side_fold', message: `${fmtIn(r.bellows_depth)}" of bellows is more than a side fold does well; cut a proper gusset or box the corners instead.` });
  w.push({ id: 'seam-tolerance', severity: 'info', message: `Side seam allowance trades one for one against bellows depth: ${fmtIn(r.side_seam_allowance)}" here gives ~${fmtIn(r.bellows_depth)}"; coming in another 1/4" collapses it and widens the pouch. His second build finished 1/4" wider from seam placement alone.` });
  return w;
}

export function buildPattern(inputs: OrganizerInputs): Result<OrganizerBuildResult> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  const r = resolveInputs(inputs);
  const q = r.bifold ? 2 : 1;
  const pieces: Piece[] = [buildBody(r), buildPanel(r)];
  if (!r.pals_back && r.velcro_strip_count > 0) pieces.push(strip('organizer-velcro-hook', 'Hook Velcro strip', r.velcro_strip_length, r.velcro_strip_width, r.velcro_strip_count * q, 'velcro-hook', `Hook — ${fmtIn(r.velcro_strip_width)} × ${fmtIn(r.velcro_strip_length)}", ${r.velcro_strip_count} per pocket, horizontal`));
  if (r.loop_over_hook && r.velcro_strip_count > 0) pieces.push(strip('organizer-velcro-loop', 'Opposing loop (dead-zone the hook)', r.velcro_strip_length / 2, r.velcro_strip_width, r.velcro_strip_count * q, 'velcro-loop', 'Stuck over part of each hook strip; add or remove until it peels right'));
  if (r.pals_back) pieces.push(strip('organizer-pals-row', 'PALS row', r.clear_width + 1 * IN, 1 * IN, Math.floor(r.clear_height / (2 * IN)) * q, 'webbing-25', 'Cut 1" long, trim flush after sewing'));
  if (r.name_tape_loop) pieces.push(strip('organizer-name-loop', 'Name tape loop patch', Math.max(0, r.wide_pocket_width - 0.5 * IN), 1 * IN, q, 'velcro-loop', 'On the wide pocket face'));
  const hardware: HardwareItem[] = r.grommets ? [{ id: 'grommet', name: '#0 grommet', quantity: 2 * q, notes: 'For 550 cord' }] : [];
  return { ok: true, value: { pieces, steps: buildSteps(r), warnings: buildWarnings(r), hardware, resolved: r } };
}
