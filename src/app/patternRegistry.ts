export interface PatternEntry {
  id: string;
  title: string;
  description: string;
  available: boolean;
  route: 'tool-roll' | 'tri-zip' | 'roll-top' | 'mag-pouch' | 'book-cover';
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
  {
    id: 'roll-top-sack',
    title: 'Roll-Top Stuff Sack',
    description: 'Parametric ultralight roll-top stuff sack with french seams and boxed corners.',
    available: true,
    route: 'roll-top',
  },
];

/**
 * Register a new pattern entry in the PATTERNS array.
 * Idempotent — if an entry with the same `id` already exists, this is a no-op.
 * Pattern registry entries are append-only; existing entries are never overwritten.
 */
export function registerPattern(entry: PatternEntry): void {
  if (PATTERNS.some(p => p.id === entry.id)) {
    return;
  }
  PATTERNS.push(entry);
}

// Register the mag-pouch entry (idempotent — safe to call multiple times)
registerPattern({
  id: 'mag-pouch',
  title: 'Mag Pouch',
  description: 'Parametric magazine pouch with MOLLE/PALS attachment, retention flap, and drainage options.',
  available: true,
  route: 'mag-pouch',
});

// Register the book-cover entry (idempotent — safe to call multiple times)
registerPattern({
  id: 'book-cover',
  title: 'Book Cover',
  description: 'Parametric fabric book cover with adjustable spine width, optional flaps, and seam allowance.',
  available: true,
  route: 'book-cover',
});
