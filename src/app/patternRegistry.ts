export type PatternCategory = 'pouches' | 'packs' | 'rigs' | 'straps' | 'apparel';

export interface PatternEntry {
  id: string;
  title: string;
  description: string;
  available: boolean;
  /** Landing-page group. Defaults from PATTERN_META by id; new generators should set it. */
  category?: PatternCategory;
  /** One line for the card; the description stays as the detail text. */
  summary?: string;
  /** Search terms beyond the title (vault names, platforms, materials). */
  tags?: string[];
  route: 'tool-roll' | 'tri-zip' | 'roll-top' | 'mag-pouch' | 'book-cover' | 'zip-pouch' | 'circle-skirt' | 'padded-strap' | 'micro-rig' | 'sling' | 'organizer' | 'fanny-pack' | 'clamshell-pack' | 'plate-carrier' | 'lbv';
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
    description: 'Generate sewing patterns for a modular tri-zip backpack with customizable sections, padded J/S-curve shoulder straps (shell, foam and mesh pieces), and organizational panels.',
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
  description: 'Parametric magazine pouch: folded-T single or the SOE pleated card (1–8 cells, cradles, interior loop, PALS-grid cell spans). 5.56, .308 and AK presets; lid, bungee, Velcro-dot or Kydex retention.',
  available: true,
  route: 'mag-pouch',
});

// Register the book-cover entry (idempotent — safe to call multiple times)
registerPattern({
  id: 'book-cover',
  title: 'Book Cover',
  description: 'Parametric fabric book cover. Pick a preset (Moleskine, Bible, Field Notes, …) or enter custom dimensions. Optional zipper / elastic / snap / buckle closure, lining + interfacing, card slots, bookmark ribbon, internal zip pocket, mesh pocket, and a tactical Velcro-mount variant.',
  available: true,
  route: 'book-cover',
});

// Register the zip-pouch entry (idempotent — safe to call multiple times)
registerPattern({
  id: 'zip-pouch',
  title: 'Zip Pouch',
  description: 'Parametric zip pouch with boxed corners, preset sizes (pencil, EDC, toiletry), and grosgrain pull loops. Exports SVG/PDF/DXF with cut dimensions and assembly instructions.',
  available: true,
  route: 'zip-pouch',
});

// Register the circle-skirt entry (idempotent — safe to call multiple times)
registerPattern({
  id: 'circle-skirt',
  title: 'Circle Skirt',
  description: 'Parametric circle skirt generator. Choose a fullness preset (quarter/half/full/double circle), enter your waist measurement and skirt length, and get sector-shaped panels with true arc edges. Supports side-zip, back-zip, and elastic closures.',
  available: true,
  route: 'circle-skirt',
});

// Register the padded-strap entry (idempotent — safe to call multiple times)
registerPattern({
  id: 'padded-strap',
  title: 'Padded Strap',
  description: 'Padded shoulder strap pair (foam + mesh, tacked or quilted webbing; tail derived from torso and gusset depth) or the SOE-style H-harness: two pads, slotted cross strap with 8" of adjustment, four side-release corners, unsewn hydration channels and routing PALS.',
  available: true,
  route: 'padded-strap',
});

// Register the micro-rig entry (idempotent — safe to call multiple times)
registerPattern({
  id: 'micro-rig',
  title: 'Micro Rig',
  description: 'SOE-style micro rig platform: a 7" panel that is itself a pocket (10.5"–19" wide), pleated mag cells on the front, 6 × 6 × 3" utility pocket, side PALS, bottom loops, dangler field, optional split front, webbing straps or an H-harness.',
  available: true,
  route: 'micro-rig',
});

// Register the sling entry (idempotent — safe to call multiple times)
registerPattern({
  id: 'sling',
  title: 'Padded Sling',
  description: 'SOE-style padded two-point sling: a turned Cordura tube over foam, webbing tucked into each pad end, a one-way tension adapter and bare tri-glide ends. Every length is yours to measure; the vault gives the method.',
  available: true,
  route: 'sling',
});

// Register the organizer entry (idempotent — safe to call multiple times)
registerPattern({
  id: 'organizer',
  title: 'Tactical Organizer',
  description: 'SOE-style pen and notebook organizer: a folded body with hems marked at double, split hook Velcro on the back, an oversized front panel whose side folds become bellows, pen-slot dividers, sides closed last. Bifold, PALS-back, grommet and name-tape variations.',
  available: true,
  route: 'organizer',
});

// Register the fanny pack entry (idempotent — safe to call multiple times)
registerPattern({
  id: 'fanny-pack',
  title: 'Fanny Pack',
  description: 'Tactical fanny pack: lid hinged along the zipper with the lid-drop extension rule, drawbridge cord limiter, drainage grommets, tape or fold zipper edges, dual-mode belt.',
  available: true,
  route: 'fanny-pack',
});

// Register the clamshell pack entry (idempotent — safe to call multiple times)
registerPattern({
  id: 'clamshell-pack',
  title: 'Clamshell Pack',
  description: 'Fat clamshell medpack / tool pod: zipper frame hoop with a 1" lip, alligator-mouth bottom, PALS fields, bowed top handle, compression straps, removable straps and interior loop walls.',
  available: true,
  route: 'clamshell-pack',
});

// Register the plate carrier entry (idempotent — safe to call multiple times)
registerPattern({
  id: 'plate-carrier',
  title: 'Plate Carrier',
  description: 'Plate carrier: front and back panels sized from the plate cut, cummerbund, shoulder straps, PALS or loop fields, binding edges, plate-size fit mapping.',
  available: true,
  route: 'plate-carrier',
});

// Register the modular lbv entry (idempotent — safe to call multiple times)
registerPattern({
  id: 'lbv',
  title: 'Modular LBV',
  description: 'Modular load-bearing vest: three zippered panel pockets, 1.5" Velcro-faced PALS rows, shoulder set with 24" verticals, snap belt loops, drag handle.',
  available: true,
  route: 'lbv',
});

// ─── Landing-page metadata ─────────────────────────────────────────────────────
// Category, one-line summary and search tags per generator. Kept here (not in
// the entries above) so the append-only registry stays untouched; a new
// generator may set the same fields directly on its entry instead.

export const CATEGORIES: { id: PatternCategory; title: string; blurb: string }[] = [
  { id: 'pouches', title: 'Pouches', blurb: 'Magazine, zip and admin pouches — the SOE card and the pattern-engine classics.' },
  { id: 'packs', title: 'Packs and bags', blurb: 'Backpacks, sacks, clamshells and covers.' },
  { id: 'rigs', title: 'Rigs and carriers', blurb: 'Chest rigs, load-bearing vests and plate carriers on a torso.' },
  { id: 'straps', title: 'Straps and slings', blurb: 'Padded straps, harnesses and rifle slings from the strap engine.' },
  { id: 'apparel', title: 'Apparel', blurb: 'Garments on the pattern engine.' },
];

export const PATTERN_META: Record<string, { category: PatternCategory; summary: string; tags: string[] }> = {
  'mag-pouch': { category: 'pouches', summary: 'Folded-T single or SOE pleated card, 1–8 cells, PALS-grid spans.', tags: ['magazine', '5.56', '.308', 'AK', 'PALS', 'MOLLE', 'pleated card', 'lid', 'bungee'] },
  'zip-pouch': { category: 'pouches', summary: 'Boxed, cross-bottom, gusset-strip or multi-panel zip pouch.', tags: ['zipper', 'EDC', 'toiletry', 'pencil', 'boxed corners'] },
  'organizer': { category: 'pouches', summary: 'SOE pen and notebook organizer with bellows and split Velcro.', tags: ['admin', 'pen', 'notebook', 'Velcro', 'bellows', 'hem'] },
  'tri-zip-backpack': { category: 'packs', summary: 'Modular tri-zip backpack with padded straps and a full hardware BOM.', tags: ['backpack', 'Y-zip', 'shoulder straps', 'hip belt', 'sternum'] },
  'roll-top-sack': { category: 'packs', summary: 'Ultralight roll-top stuff sack with french seams and boxed corners.', tags: ['stuff sack', 'roll top', 'dry bag', 'ultralight'] },
  'fanny-pack': { category: 'packs', summary: 'Tactical fanny pack with the lid-drop rule, grommets and a dual-mode belt.', tags: ['hip pack', 'waist', 'sling', 'lid', 'grommet', 'drawbridge'] },
  'clamshell-pack': { category: 'packs', summary: 'Fat clamshell medpack or tool pod: zipper frame hoop, PALS fields, handle.', tags: ['medpack', 'tool pod', 'clamshell', 'zipper frame', 'alligator mouth', 'PALS'] },
  'book-cover': { category: 'packs', summary: 'Fabric book cover with presets, closures, slots and a tactical variant.', tags: ['notebook', 'Moleskine', 'Bible', 'Field Notes', 'cover'] },
  'tool-roll': { category: 'packs', summary: 'Tool roll with a pocket per tool, flap and ties.', tags: ['tool roll', 'wrench', 'pockets', 'ties'] },
  'micro-rig': { category: 'rigs', summary: 'Panel-as-pocket chest rig: pleated or stacked mag cells, PALS, harness.', tags: ['chest rig', 'micro rig', '.308 stacked', 'H-harness', 'PALS', 'dangler'] },
  'lbv': { category: 'rigs', summary: 'Modular load-bearing vest: three zippered panels, 1.5" rows, shoulder set.', tags: ['vest', 'LBV', 'belt loops', 'drag handle', 'PALS'] },
  'plate-carrier': { category: 'rigs', summary: 'Plate carrier from the plate cut: panels, cummerbund, straps, fields.', tags: ['armor', 'plate', 'SAPI', 'shooter', 'swimmer', 'cummerbund', 'placard'] },
  'padded-strap': { category: 'straps', summary: 'Pack strap pair or the H-harness from the strap engine, checked on a torso.', tags: ['shoulder strap', 'harness', 'foam', 'J-curve', 'S-curve'] },
  'sling': { category: 'straps', summary: 'Padded two-point rifle sling: turned tube, tuck rule, adapter.', tags: ['rifle', 'sling', 'two-point', 'QD', 'tri-glide'] },
  'circle-skirt': { category: 'apparel', summary: 'Quarter to double circle skirt with waistband and closure options.', tags: ['skirt', 'garment', 'waist', 'zipper', 'elastic'] },
};

export function patternCategory(p: PatternEntry): PatternCategory {
  return p.category ?? PATTERN_META[p.id]?.category ?? 'packs';
}
export function patternSummary(p: PatternEntry): string {
  return p.summary ?? PATTERN_META[p.id]?.summary ?? p.description;
}
export function patternTags(p: PatternEntry): string[] {
  return p.tags ?? PATTERN_META[p.id]?.tags ?? [];
}

/** Patterns grouped in CATEGORIES order; within a group, registration order. Empty groups are dropped. */
export function patternsByCategory(patterns: PatternEntry[] = PATTERNS): { category: (typeof CATEGORIES)[number]; patterns: PatternEntry[] }[] {
  return CATEGORIES.map((category) => ({ category, patterns: patterns.filter((p) => patternCategory(p) === category.id) })).filter((g) => g.patterns.length > 0);
}

/** Case-insensitive match on title, summary, description and tags. Empty query matches everything. */
export function matchesPatternQuery(p: PatternEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [p.title, patternSummary(p), p.description, ...patternTags(p)].join(' ').toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}
