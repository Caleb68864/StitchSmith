/**
 * Seam stacks and the layer budget (roadmap engine list; vault
 * reference/technique-sewing-through-bulk.md,
 * rigs/splitfront-technique-layer-budgeting.md).
 *
 * A seam's stack is every thickness of material the needle goes through
 * there: fabric layers, hem folds, webbing, Velcro, binding. Above about 8
 * layers the vault's rule is to sew forward only — turn the work, never
 * reverse through the bulk. That is the only threshold the vault gives; no
 * machine-class limits are encoded.
 */
export interface StackLayer {
  /** What the layer is ("face", "back hem", "PALS row"). */
  what: string;
  /** Thicknesses it adds at this seam. */
  count: number;
}

export interface SeamStack {
  /** The seam, in words ("each cell division"). */
  seam: string;
  layers: StackLayer[];
}

/** Above this many layers, sew forward only (the vault's "~8"). */
export const FORWARD_ONLY_LAYERS = 8;

export function stackTotal(s: SeamStack): number {
  return s.layers.reduce((n, l) => n + Math.max(0, l.count), 0);
}

export interface LayerBudget {
  seams: { seam: string; total: number; forwardOnly: boolean; layers: StackLayer[] }[];
  max: number;
  maxSeam: string | null;
  /** Seams over the forward-only threshold, heaviest first. */
  forwardOnly: string[];
}

export function layerBudget(stacks: SeamStack[]): LayerBudget {
  const seams = stacks.map((s) => { const total = stackTotal(s); return { seam: s.seam, total, forwardOnly: total > FORWARD_ONLY_LAYERS, layers: s.layers }; });
  const max = seams.reduce((m, s) => Math.max(m, s.total), 0);
  const heaviest = [...seams].sort((a, b) => b.total - a.total);
  return { seams, max, maxSeam: heaviest[0]?.seam ?? null, forwardOnly: heaviest.filter((s) => s.forwardOnly).map((s) => s.seam) };
}

/** The layer budget in words: every seam's count, and the forward-only rule where it applies. */
export function layerBudgetMessage(b: LayerBudget): string | null {
  if (b.seams.length === 0) return null;
  const list = [...b.seams].sort((x, y) => y.total - x.total).map((s) => `${s.seam} ${s.total}`).join(', ');
  const over = b.seams.filter((s) => s.forwardOnly);
  return over.length
    ? `Layer budget: ${list} layers. Over ${FORWARD_ONLY_LAYERS} at ${over.map((s) => s.seam).join(' and ')}: sew forward only there, turn the work at the ends and never reverse through the bulk; a walking foot or a machine that takes the stack.`
    : `Layer budget: ${list} layers — every seam is at or under ${FORWARD_ONLY_LAYERS}.`;
}
