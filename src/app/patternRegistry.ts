export interface PatternEntry {
  id: string;
  title: string;
  description: string;
  available: boolean;
  route: 'tool-roll' | 'tri-zip';
}

export const PATTERNS: PatternEntry[] = [
  {
    id: 'tool-roll',
    title: 'Tool Roll',
    description: 'Generate sewing patterns for a custom tool roll with individual pockets for each tool.',
    available: true,
    route: 'tool-roll',
  },
  {
    id: 'tri-zip-backpack',
    title: 'Tri-Zip Backpack',
    description: 'Generate sewing patterns for a modular tri-zip backpack with customizable sections, shoulder straps, and organizational panels.',
    available: true,
    route: 'tri-zip',
  },
];
