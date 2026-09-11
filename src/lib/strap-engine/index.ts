/**
 * Strap engine — public API.
 *
 *   import { buildPaddedStrap } from './strap-engine/index.js';
 *   const { pieces, steps, warnings, hardware, derived } = buildPaddedStrap({ ... });
 *
 * Seam-allowance convention (CLAUDE.md, Convention A): pieces are drawn at
 * finished size. A `turned` pad gets `seamAllowances = SA` on every shell edge
 * so the exporters draw the SA cut line; a `bound` pad gets an explicit 0 on
 * every edge because binding adds no allowance. Foam and mesh are always cut
 * to net and carry explicit 0.
 */

import type { Piece } from '../pattern-engine/graph/Piece.js';
import type { Path } from '../pattern-engine/graph/Path.js';
import type { Edge, EdgeId } from '../pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../pattern-engine/graph/Edge.js';
import type { Step } from '../pattern-engine/instructions/Step.js';
import type {
  PaddedStrapSpec,
  PaddedStrapResult,
  PaddedStrapDerived,
  StrapHardwareItem,
} from './types.js';
import { strapOutline, insetOutline, defaultBottomWidth, defaultSweep, type OutlineSpec } from './geometry.js';

export type {
  StrapCurve,
  PadArchitecture,
  EdgeFinish,
  StrapHardware,
  PaddedStrapSpec,
  PaddedStrapResult,
  PaddedStrapDerived,
  StrapHardwareItem,
} from './types.js';
export { strapOutline, insetOutline, defaultBottomWidth, defaultSweep } from './geometry.js';

const IN = 25.4;

// ─── Defaults (vault) ─────────────────────────────────────────────────────────

/** Webbing inserted into each pad end and tacked — SOE: "never seen a sling come apart that's made that way". */
export const DEFAULT_WEBBING_INSERTION_MM = 1 * IN;
export const DEFAULT_TOP_ANCHOR_MM = 100;
export const DEFAULT_BINDING_WIDTH_MM = 1 * IN;
export const DEFAULT_MESH_INSET_MM = 0.25 * IN;
export const DEFAULT_FOAM_INSET_BOUND_MM = 0.5 * IN;
/** Foam thickness sweet spot, mm (vault reference/technique-shoulder-strap-construction.md). */
export const FOAM_MIN_MM = 4;
export const FOAM_MAX_MM = 12;
/** Practical pad widths, mm: 1.5" ultralight … 3" heavy. */
export const WIDTH_MIN_MM = 1.5 * IN;
export const WIDTH_MAX_MM = 3 * IN;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Hardware is sold in inch sizes: label 25 mm as 1", 38 as 1.5", 50 as 2"; otherwise mm. */
export function webbingSizeLabel(mm: number): string {
  for (const inches of [0.75, 1, 1.5, 2]) {
    if (Math.abs(mm - inches * IN) <= 1.5) return `${inches}"`;
  }
  return `${Math.round(mm)} mm`;
}

function fmt(mm: number): string {
  return String(Math.round(mm));
}

function rect(eid: () => EdgeId, id: string, w: number, h: number): Path {
  const e = (sx: number, sy: number, ex: number, ey: number): Edge =>
    ({ kind: 'straight', id: eid(), role: 'cut', start: { x: sx, y: sy }, end: { x: ex, y: ey } });
  return { id, closed: true, edges: [e(0, 0, w, 0), e(w, 0, w, h), e(w, h, 0, h), e(0, h, 0, 0)] };
}

function saRecord(path: Path, sa: number): Record<EdgeId, number> {
  const r: Record<EdgeId, number> = {};
  for (const e of path.edges) r[e.id] = sa;
  return r;
}

function outlineBbox(path: Path): { w: number; h: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const e of path.edges) {
    xs.push(e.start.x, e.end.x);
    ys.push(e.start.y, e.end.y);
    if (e.kind === 'bezier') { xs.push(e.cp1.x, e.cp2.x); ys.push(e.cp1.y, e.cp2.y); }
  }
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildPaddedStrap(spec: PaddedStrapSpec): PaddedStrapResult {
  const warnings: string[] = [];
  const pieces: Piece[] = [];
  const hardware: StrapHardwareItem[] = [];

  for (const [k, v] of Object.entries(spec)) {
    if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`buildPaddedStrap: ${k} is not a finite number`);
  }
  if (spec.padLength_mm <= 0 || spec.padWidth_mm <= 0) throw new Error('buildPaddedStrap: padLength_mm and padWidth_mm must be positive');
  if (spec.webbingWidth_mm <= 0) throw new Error('buildPaddedStrap: webbingWidth_mm must be positive');
  if (spec.seamAllowance_mm < 0) throw new Error('buildPaddedStrap: seamAllowance_mm must be ≥ 0');

  const qty = spec.quantity ?? 2;
  const id = spec.pieceId ?? 'shoulder-strap';
  const name = spec.name ?? 'Shoulder strap';
  const pre = spec.idPrefix ?? 'strap.';
  const hw = spec.hardware ?? 'ladderlock';
  const arch = spec.architecture;
  const bound = spec.edgeFinish === 'bound';
  const sa = spec.seamAllowance_mm;
  const insertion = spec.webbingInsertion_mm ?? DEFAULT_WEBBING_INSERTION_MM;
  const topAnchor = spec.topAnchorLength_mm ?? DEFAULT_TOP_ANCHOR_MM;
  const bindingW = spec.bindingWidth_mm ?? DEFAULT_BINDING_WIDTH_MM;
  const meshInset = spec.meshInset_mm ?? DEFAULT_MESH_INSET_MM;
  const foamInsetSides = spec.foamInset_mm ?? (bound ? DEFAULT_FOAM_INSET_BOUND_MM : sa + 3);
  const hasFoam = spec.foamThickness_mm > 0 && arch !== 'none' && arch !== 'crushable_sleeve';

  // ── Guidance warnings ─────────────────────────────────────────────────────
  if (spec.padWidth_mm < WIDTH_MIN_MM) warnings.push(`Pad width ${fmt(spec.padWidth_mm)} mm is under the 1.5" ultralight minimum; it will dig under load.`);
  if (spec.padWidth_mm > WIDTH_MAX_MM) warnings.push(`Pad width ${fmt(spec.padWidth_mm)} mm exceeds the 3" heavy-load width; expect bulk at the neck.`);
  if (hasFoam && spec.foamThickness_mm < FOAM_MIN_MM) warnings.push(`${spec.foamThickness_mm} mm foam is too thin to pad anything; 6–10 mm is the sweet spot.`);
  if (hasFoam && spec.foamThickness_mm > FOAM_MAX_MM) warnings.push(`${spec.foamThickness_mm} mm foam is bulky and hard to bind; 6–10 mm is the sweet spot.`);
  if (spec.webbingWidth_mm > spec.padWidth_mm) warnings.push('Webbing is wider than the pad — the pad cannot cover it.');
  if (arch === 'none') warnings.push('Unpadded straps flop and snag when the bag is hand-carried: make them detachable or give them a stow sleeve.');
  if (arch === 'webbing_through_quilted') warnings.push('Quilting through foam needs a heavy walking-foot machine: sew slowly, never reverse through the foam — turn the work. Stack peaks at 4 Cordura + 3 webbing + foam.');
  if (spec.tailLength_mm < 150) warnings.push(`Tail webbing ${fmt(spec.tailLength_mm)} mm leaves under 150 mm of adjustment; derive it from torso length AND gusset depth, then mock it on the loaded bag.`);
  if (spec.curve !== 'straight' && qty === 2) warnings.push('Curved pads are handed: cut a mirrored pair, not two identical.');

  // ── Outline ───────────────────────────────────────────────────────────────
  const eid = makeEdgeIdGen(id);
  const bottomWidth = defaultBottomWidth(spec.padWidth_mm, spec.webbingWidth_mm, spec.curve);
  const sweep = defaultSweep(spec.padWidth_mm, spec.curve);
  const outline: OutlineSpec = {
    width: spec.padWidth_mm,
    length: spec.padLength_mm,
    curve: spec.curve,
    bottomWidth,
    sweep,
  };

  let foamLength = 0;
  let foamWidth = 0;
  let webbingPerStrap = 0;
  let maxLayers = 2;
  let foamInNeedlePath = false;

  if (arch === 'none') {
    // Slick webbing straps: one continuous piece per strap.
    const len = spec.padLength_mm + spec.tailLength_mm + topAnchor;
    webbingPerStrap = len;
    const path = rect(eid, `${id}-outline`, spec.webbingWidth_mm, len);
    pieces.push({
      id,
      name: `${name} (slick webbing)`,
      mirror: false,
      quantity: qty,
      materialId: `webbing-${Math.round(spec.webbingWidth_mm)}`,
      paths: [path],
      seamAllowances: saRecord(path, 0),
      annotations: [{ kind: 'label', label: `${name} — ${qty} × ${fmt(len)} mm of ${fmt(spec.webbingWidth_mm)} mm webbing` }],
    });
    maxLayers = 3;
  } else if (arch === 'crushable_sleeve') {
    // Shell tube (turned) over soft fill; webbing runs through full length.
    const tubeW = 2 * spec.padWidth_mm + 2 * sa;
    const tubeL = spec.padLength_mm + 2 * sa;
    const path = rect(eid, `${id}-outline`, tubeW, tubeL);
    const foldPath: Path = {
      id: `${id}-fold`, closed: false, label: 'Fold — tube centre',
      edges: [{ kind: 'straight', id: eid(), role: 'fold', start: { x: tubeW / 2, y: 0 }, end: { x: tubeW / 2, y: tubeL } }],
    };
    pieces.push({
      id,
      name: `${name} sleeve (turned tube)`,
      mirror: false,
      quantity: qty,
      materialId: 'packcloth',
      paths: [path, foldPath],
      seamAllowances: saRecord(path, 0),
      annotations: [{ kind: 'label', label: `Sleeve — cut ${fmt(tubeW)} × ${fmt(tubeL)} mm incl. ${fmt(sa)} mm SA; fold, sew the long edge, turn` }],
    });
    const len = spec.padLength_mm + spec.tailLength_mm + topAnchor;
    webbingPerStrap = len;
    const wpath = rect(eid, `${id}-webbing-outline`, spec.webbingWidth_mm, len);
    pieces.push({
      id: `${id}-webbing`,
      name: `${name} webbing (through sleeve)`,
      mirror: false,
      quantity: qty,
      materialId: `webbing-${Math.round(spec.webbingWidth_mm)}`,
      paths: [wpath],
      seamAllowances: saRecord(wpath, 0),
      annotations: [{ kind: 'label', label: `Webbing — ${qty} × ${fmt(len)} mm, continuous through the sleeve` }],
    });
    maxLayers = 5;
  } else {
    // Padded sandwich family: outer shell, inner backer, foam, webbing pieces.
    const shellPath = strapOutline(outline, eid, `${id}-outline`);
    const shellSa = bound ? 0 : sa;
    const bb = outlineBbox(shellPath);
    pieces.push({
      id,
      name: `${name} — outer shell`,
      mirror: true,
      quantity: qty,
      materialId: 'cordura-500',
      paths: [shellPath],
      seamAllowances: saRecord(shellPath, shellSa),
      annotations: [
        { kind: 'grain', label: 'grain', point: { x: spec.padWidth_mm / 2, y: spec.padLength_mm / 2 }, angle: 90 },
        { kind: 'label', label: `${name} — ${qty} mirrored; ${fmt(bb.w)} × ${fmt(bb.h)} mm finished${bound ? ', bound edges (no SA)' : `, + ${fmt(sa)} mm SA all round`}` },
      ],
    });

    const backerIsMesh = arch === 'foam_sandwich_mesh';
    const backerPath = bound && backerIsMesh
      ? insetOutline(outline, meshInset, meshInset, eid, `${id}-inner-outline`)
      : strapOutline(outline, eid, `${id}-inner-outline`);
    pieces.push({
      id: `${id}-inner`,
      name: backerIsMesh ? `${name} — spacer mesh backer` : `${name} — inner shell`,
      mirror: true,
      quantity: qty,
      materialId: backerIsMesh ? 'spacer-mesh' : 'cordura-500',
      paths: [backerPath],
      seamAllowances: saRecord(backerPath, shellSa),
      annotations: [{
        kind: 'label',
        label: backerIsMesh
          ? `Spacer mesh — ${qty} mirrored${bound ? `, inset ${fmt(meshInset)} mm so the binding closes cleanly` : ''}`
          : `Inner shell — ${qty} mirrored`,
      }],
    });

    if (hasFoam) {
      // Tacked ends keep the foam clear of the end tacks entirely.
      const foamEndInset = arch === 'webbing_tacked_ends' ? insertion + 6 : foamInsetSides;
      const foamPath = insetOutline(outline, foamInsetSides, foamEndInset, eid, `${id}-foam-outline`);
      // Nominal (top) width and length — the swept bbox of a curved pad is wider.
      foamLength = spec.padLength_mm - 2 * foamEndInset;
      foamWidth = spec.padWidth_mm - 2 * foamInsetSides;
      const fb = { w: foamWidth, h: foamLength };
      pieces.push({
        id: `${id}-foam`,
        name: `${name} — closed-cell foam ${spec.foamThickness_mm} mm`,
        mirror: true,
        quantity: qty,
        materialId: 'foam-closed-cell',
        paths: [foamPath],
        seamAllowances: saRecord(foamPath, 0),
        annotations: [{
          kind: 'label',
          label: `Foam — ${qty} mirrored, ${fmt(fb.w)} × ${fmt(fb.h)} mm (shell outline minus ${fmt(foamInsetSides)} mm sides / ${fmt(foamEndInset)} mm ends); separate cut sheet`,
        }],
      });
    }

    if (arch === 'webbing_through_quilted') {
      const len = topAnchor + spec.padLength_mm + spec.tailLength_mm;
      webbingPerStrap = len;
      const wpath = rect(eid, `${id}-webbing-outline`, spec.webbingWidth_mm, len);
      pieces.push({
        id: `${id}-webbing`,
        name: `${name} — webbing (full length over the pad)`,
        mirror: false,
        quantity: qty,
        materialId: `webbing-${Math.round(spec.webbingWidth_mm)}`,
        paths: [wpath],
        seamAllowances: saRecord(wpath, 0),
        annotations: [{ kind: 'label', label: `Webbing — ${qty} × ${fmt(len)} mm: ${fmt(topAnchor)} top anchor + ${fmt(spec.padLength_mm)} over the pad + ${fmt(spec.tailLength_mm)} tail` }],
      });
      const coverPath = rect(eid, `${id}-cover-outline`, spec.webbingWidth_mm + 2 * sa + 6, spec.padLength_mm);
      pieces.push({
        id: `${id}-cover`,
        name: `${name} — cover strip (optional, colour-match)`,
        mirror: false,
        quantity: qty,
        materialId: 'cordura-500',
        paths: [coverPath],
        seamAllowances: saRecord(coverPath, 0),
        annotations: [{ kind: 'label', label: 'Cover strip over the webbing when webbing colour ≠ shell; edges turned under' }],
      });
      foamInNeedlePath = true;
      maxLayers = 8;
    } else {
      const tailLen = spec.tailLength_mm + insertion;
      const topLen = topAnchor + insertion;
      webbingPerStrap = tailLen + topLen;
      const tpath = rect(eid, `${id}-webbing-tail-outline`, spec.webbingWidth_mm, tailLen);
      pieces.push({
        id: `${id}-webbing-tail`,
        name: `${name} — tail webbing`,
        mirror: false,
        quantity: qty,
        materialId: `webbing-${Math.round(spec.webbingWidth_mm)}`,
        paths: [tpath],
        seamAllowances: saRecord(tpath, 0),
        annotations: [{ kind: 'label', label: `Tail — ${qty} × ${fmt(tailLen)} mm (${fmt(spec.tailLength_mm)} free + ${fmt(insertion)} inserted into the pad end); mock on the loaded bag` }],
      });
      const apath = rect(eid, `${id}-webbing-top-outline`, spec.webbingWidth_mm, topLen);
      pieces.push({
        id: `${id}-webbing-top`,
        name: `${name} — top anchor webbing`,
        mirror: false,
        quantity: qty,
        materialId: `webbing-${Math.round(spec.webbingWidth_mm)}`,
        paths: [apath],
        seamAllowances: saRecord(apath, 0),
        annotations: [{ kind: 'label', label: `Top anchor — ${qty} × ${fmt(topLen)} mm (${fmt(topAnchor)} into the yoke seam + ${fmt(insertion)} inserted)` }],
      });
      maxLayers = bound ? 6 : 5;
    }
  }

  // ── Hardware ──────────────────────────────────────────────────────────────
  const wIn = webbingSizeLabel(spec.webbingWidth_mm);
  if (hw === 'ladderlock') {
    hardware.push({ id: 'ladderlock', name: `${wIn} ladderlock`, quantity: qty, notes: 'Lower anchor adjuster; slot must match the webbing width. Bartack the anchor tab.' });
  } else if (hw === 'side_release') {
    hardware.push(
      { id: 'side-release', name: `${wIn} side-release buckle`, quantity: qty, notes: 'Male half on the bag side, words up; the strap is then a swappable module.' },
      { id: 'tri-glide', name: `${wIn} tri-glide`, quantity: qty, notes: 'Length adjustment on the tail.' },
    );
  } else {
    hardware.push({ id: 'tri-glide', name: `${wIn} tri-glide`, quantity: qty, notes: 'Length adjustment; a plain slider creeps under a bouncing load — use a one-way lock for slings.' });
  }
  if (arch !== 'none') {
    hardware.push({ id: 'binding', name: bound ? `${fmt(bindingW)} mm grosgrain / binding tape` : 'none (turned)', quantity: bound ? qty : 0, notes: bound ? `About ${fmt(2 * (spec.padLength_mm + spec.padWidth_mm) + 100)} mm per strap` : undefined });
  }

  // ── Steps ─────────────────────────────────────────────────────────────────
  const steps = buildSteps(spec, { pre, id, name, qty, bound, sa, insertion, topAnchor, hasFoam, foamLength, foamWidth, hw });

  const derived: PaddedStrapDerived = {
    bottomWidth_mm: bottomWidth,
    sweep_mm: sweep,
    foamLength_mm: foamLength,
    foamWidth_mm: foamWidth,
    webbingPerStrap_mm: webbingPerStrap,
    maxLayers,
    foamInNeedlePath,
    gussetDepth_mm: spec.gussetDepth_mm,
  };

  return { pieces, steps, warnings, hardware, derived };
}

// ─── Steps ────────────────────────────────────────────────────────────────────

interface StepCtx {
  pre: string; id: string; name: string; qty: number; bound: boolean; sa: number;
  insertion: number; topAnchor: number; hasFoam: boolean; foamLength: number; foamWidth: number; hw: string;
}

function buildSteps(spec: PaddedStrapSpec, c: StepCtx): Step[] {
  const arch = spec.architecture;
  const pieceIds = [c.id];
  const steps: Step[] = [];
  const pair = c.qty === 2 ? 'a mirrored pair' : `${c.qty}`;

  if (arch === 'none') {
    steps.push(
      {
        id: `${c.pre}cut`, title: `Cut ${c.name.toLowerCase()} webbing`,
        body: `Cut ${c.qty} × ${Math.round(spec.padLength_mm + spec.tailLength_mm + (spec.topAnchorLength_mm ?? DEFAULT_TOP_ANCHOR_MM))} mm of ${Math.round(spec.webbingWidth_mm)} mm webbing; hot-knife the ends.`,
        dependsOn: [], refsPieces: pieceIds, group: 'Straps',
      },
      {
        id: `${c.pre}assemble`, title: 'Fit the hardware',
        body: 'Fold 1.25" of each end back over the ${hw} and box-X or bartack it — the fold to the outside so the tab catches the adjuster. Tacks must sit outboard of any bag-closing seam in the load path, or that one seam carries the wearer.'.replace('${hw}', c.hw.replace('_', '-')),
        dependsOn: [`${c.pre}cut`], refsPieces: pieceIds, group: 'Straps',
      },
    );
    return steps;
  }

  if (arch === 'crushable_sleeve') {
    steps.push(
      {
        id: `${c.pre}cut`, title: `Cut ${c.name.toLowerCase()} sleeves and webbing`,
        body: `Cut ${c.qty} sleeve tubes (SA ${Math.round(c.sa)} mm included) and ${c.qty} full-length webbing runs.`,
        dependsOn: [], refsPieces: pieceIds, group: 'Straps',
      },
      {
        id: `${c.pre}assemble`, title: 'Sew, turn and stuff the sleeves',
        body: 'Fold each sleeve on the centre line, sew the long edge, turn it (a rod, or pull it through on a length of 550 cord if it is tight). Stuff with soft fill or thin foam, run the webbing through, and close each end over the webbing with a dense tack — that end stitch is the load path. Pads settle to shape in use; the pair need not match exactly.',
        dependsOn: [`${c.pre}cut`], refsPieces: pieceIds, group: 'Straps',
      },
    );
    return steps;
  }

  // Sandwich family
  steps.push({
    id: `${c.pre}cut`,
    title: `Cut ${c.name.toLowerCase()} shells (${pair})`,
    body:
      `Cut ${c.qty} outer shells and ${c.qty} ${arch === 'foam_sandwich_mesh' ? 'spacer-mesh backers' : 'inner shells'} as ${pair}${c.bound ? ' — no seam allowance, the edges are bound' : ` with ${Math.round(c.sa)} mm seam allowance`}. ` +
      (c.hasFoam
        ? `Trace the shell onto ${spec.foamThickness_mm} mm closed-cell foam and cut ${c.qty} foam cores about ${Math.round(c.foamWidth)} × ${Math.round(c.foamLength)} mm — trim with small cuts until it sits inside the stitch line ("you can always take more off"), then chamfer the top edge so the binding wraps clean. Foam goes on its own cut sheet.`
        : 'No foam core.'),
    dependsOn: [],
    refsPieces: pieceIds,
    group: 'Straps',
  });

  if (arch === 'webbing_through_quilted') {
    steps.push(
      {
        id: `${c.pre}webbing`, title: 'Lay the webbing full length over the pad',
        body: `Centre one ${Math.round(spec.webbingWidth_mm)} mm webbing run on each outer shell so it overhangs ${Math.round(c.topAnchor)} mm at the top and the full tail at the bottom; stitch both long edges through shell + foam + inner shell. Offset the centre seam slightly and push the shell slack along the pad before locking it, so the pad finishes tight and wrinkle-free.`,
        dependsOn: [`${c.pre}cut`], refsPieces: pieceIds, group: 'Straps',
      },
      {
        id: `${c.pre}assemble`, title: 'Quilt the pad and finish the edges',
        body: `Sew cross-seams through the foam at about 50 mm spacing — they stiffen the pad and double as cut-to-fit slots. Sew slowly, forward only, turning the work at each end; a deflected needle here strikes the feed dog and knocks the machine out of time. ${c.bound ? 'Bind the perimeter with tape.' : 'Turn the edges under and topstitch.'} Sew a colour-matched cover strip over the webbing if it does not match the shell.`,
        dependsOn: [`${c.pre}webbing`], refsPieces: pieceIds, group: 'Straps',
      },
    );
  } else {
    steps.push(
      {
        id: `${c.pre}webbing`, title: 'Tack the webbing into the pad ends',
        body:
          `Insert the tail webbing ${Math.round(c.insertion)} mm into the bottom of the pad and the top-anchor webbing ${Math.round(c.insertion)} mm into the top, between the outer shell and the foam, and tack each with a box-X. ` +
          'The foam stops short of the tacks so no needle ever passes through foam — SOE built padded slings this way for years and never saw one come apart. Trust the materials, the machine and the thread; extra stitching through foam buys nothing.',
        dependsOn: [`${c.pre}cut`], refsPieces: pieceIds, group: 'Straps',
      },
      {
        id: `${c.pre}assemble`,
        title: c.bound ? 'Stack and bind the pad' : 'Sew, turn and topstitch the pad',
        body: c.bound
          ? `Stack outer shell, foam and ${arch === 'foam_sandwich_mesh' ? 'mesh' : 'inner shell'} (mesh to the body), baste, and bind the whole perimeter with ${Math.round(spec.bindingWidth_mm ?? DEFAULT_BINDING_WIDTH_MM)} mm tape: outside line first, then the inside line compressing the foam. Use a walking foot and do not crush the mesh flat. The edge-of-foam pass steers sideways — hold the work slightly crooked to compensate.`
          : `Sew outer and inner shells right sides together at ${Math.round(c.sa)} mm, leaving the top open; turn, slide the foam in, close the top and topstitch the perimeter. Turned edges are slimmer but fight on tight curves and thick foam.`,
        dependsOn: [`${c.pre}webbing`], refsPieces: pieceIds, group: 'Straps',
      },
    );
  }

  steps.push({
    id: `${c.pre}hardware`,
    title: 'Fit the hardware and check the tacks against the load path',
    body:
      `Fold the tail end 1.25" back over the ${c.hw.replace('_', '-')} (fold to the outside so the tab catches the adjuster) and box-X it. The top anchor sews into the yoke / top seam with three tacks. ` +
      'Every tack must sit outboard of the bag-closing seam in the load path, or the closing seam alone carries the wearer. Curved pads: check the pair is handed before you sew hardware.',
    dependsOn: [`${c.pre}assemble`],
    refsPieces: pieceIds,
    group: 'Straps',
  });

  return steps;
}
