import type { Edge } from './Edge.js';

export interface Path {
  id: string;
  edges: Edge[];
  closed: boolean;
  /**
   * Optional human-readable label drawn near the start of the path in SVG
   * export. Use for non-outline paths whose meaning isn't obvious from the
   * stroke color alone — e.g. distinguishing a "top hem fold (fold under)"
   * from a "collar fold (reference)" when both render as blue dashed lines.
   */
  label?: string;
}
