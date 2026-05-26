import type { Edge } from './Edge.js';

export interface Path {
  id: string;
  edges: Edge[];
  closed: boolean;
}
