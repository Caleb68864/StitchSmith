export const DEFAULT_SEAM_ALLOWANCE_MM = 9.5;
export const DEFAULT_TOP_BOTTOM_HEM_MM = 12;
export const DEFAULT_PEN_HOLDER_HEIGHT_MM = 80;

const IN = 25.4;

export interface BookPreset {
  id: string;
  label: string;
  book_height_mm: number;
  book_width_mm: number;
  spine_width_mm: number;
  flap_depth_mm: number;
  is_hardcover: boolean;
}

export interface FoldoverPreset {
  id: 'tactical' | 'civilian';
  label: string;
  flap_depth_mm: number;
}

export const BOOK_PRESETS: BookPreset[] = [
  // Bibles (width × height × spine in inches → stored as mm)
  { id: 'bible-compact', label: 'Bible — Compact', book_height_mm: 6.5 * IN, book_width_mm: 4.6 * IN, spine_width_mm: 1.45 * IN, flap_depth_mm: 65, is_hardcover: true },
  { id: 'bible-standard', label: 'Bible — Standard', book_height_mm: 8.5 * IN, book_width_mm: 5.5 * IN, spine_width_mm: 1.5 * IN, flap_depth_mm: 75, is_hardcover: true },
  { id: 'bible-large-print', label: 'Bible — Large Print', book_height_mm: 9.0 * IN, book_width_mm: 6.0 * IN, spine_width_mm: 1.75 * IN, flap_depth_mm: 80, is_hardcover: true },
  { id: 'bible-thinline', label: 'Bible — Thinline', book_height_mm: 7.5 * IN, book_width_mm: 5.25 * IN, spine_width_mm: 0.875 * IN, flap_depth_mm: 65, is_hardcover: true },
  // Moleskine
  { id: 'moleskine-classic-pocket', label: 'Moleskine Classic — Pocket', book_height_mm: 140, book_width_mm: 90, spine_width_mm: 14, flap_depth_mm: 50, is_hardcover: true },
  { id: 'moleskine-classic-large', label: 'Moleskine Classic — Large', book_height_mm: 210, book_width_mm: 130, spine_width_mm: 18, flap_depth_mm: 65, is_hardcover: true },
  { id: 'moleskine-cahier-pocket', label: 'Moleskine Cahier — Pocket', book_height_mm: 140, book_width_mm: 90, spine_width_mm: 9, flap_depth_mm: 50, is_hardcover: false },
  { id: 'moleskine-cahier-large', label: 'Moleskine Cahier — Large', book_height_mm: 210, book_width_mm: 130, spine_width_mm: 14, flap_depth_mm: 65, is_hardcover: false },
  // Field Notes
  { id: 'field-notes', label: 'Field Notes', book_height_mm: 5.5 * IN, book_width_mm: 3.5 * IN, spine_width_mm: 0.25 * IN, flap_depth_mm: 45, is_hardcover: false },
  // ISO notebook sizes
  { id: 'a5-notebook', label: 'A5 Notebook', book_height_mm: 210, book_width_mm: 148, spine_width_mm: 12, flap_depth_mm: 65, is_hardcover: false },
  { id: 'a6-notebook', label: 'A6 Notebook', book_height_mm: 148, book_width_mm: 105, spine_width_mm: 8, flap_depth_mm: 50, is_hardcover: false },
  // Leuchtturm1917
  { id: 'leuchtturm1917-a5', label: 'Leuchtturm1917 A5', book_height_mm: 203, book_width_mm: 145, spine_width_mm: 15, flap_depth_mm: 65, is_hardcover: true },
  { id: 'leuchtturm1917-pocket', label: 'Leuchtturm1917 Pocket', book_height_mm: 152, book_width_mm: 90, spine_width_mm: 10, flap_depth_mm: 50, is_hardcover: true },
  // Passport
  { id: 'passport-standard', label: 'Passport — Standard', book_height_mm: 127, book_width_mm: 89, spine_width_mm: 8, flap_depth_mm: 45, is_hardcover: true },
  // Traveler's Notebook
  { id: 'traveler-notebook-regular', label: "Traveler's Notebook — Regular", book_height_mm: 210, book_width_mm: 110, spine_width_mm: 10, flap_depth_mm: 55, is_hardcover: false },
  { id: 'traveler-notebook-passport', label: "Traveler's Notebook — Passport", book_height_mm: 139, book_width_mm: 85, spine_width_mm: 10, flap_depth_mm: 45, is_hardcover: false },
  // Paperback / Trade
  { id: 'paperback-mass-market', label: 'Paperback — Mass Market', book_height_mm: 6.75 * IN, book_width_mm: 4.19 * IN, spine_width_mm: 0.75 * IN, flap_depth_mm: 55, is_hardcover: false },
  { id: 'paperback-trade', label: 'Paperback — Trade', book_height_mm: 9.0 * IN, book_width_mm: 6.0 * IN, spine_width_mm: 1.0 * IN, flap_depth_mm: 65, is_hardcover: false },
  { id: 'composition-notebook', label: 'Composition Notebook', book_height_mm: 9.75 * IN, book_width_mm: 7.5 * IN, spine_width_mm: 0.375 * IN, flap_depth_mm: 65, is_hardcover: false },
];

export const FOLDOVER_PRESETS: FoldoverPreset[] = [
  { id: 'tactical', label: 'Tactical', flap_depth_mm: 100 },
  { id: 'civilian', label: 'Civilian', flap_depth_mm: 70 },
];

export interface ZipperGaugeDefaults {
  corner_radius_mm: number;
  min_corner_radius_mm: number;
}

export const ZIPPER_GAUGE_DEFAULTS: Record<'#3' | '#5' | '#10', ZipperGaugeDefaults> = {
  '#3': { corner_radius_mm: 19.05, min_corner_radius_mm: 12.7 },
  '#5': { corner_radius_mm: 31.75, min_corner_radius_mm: 25.4 },
  '#10': { corner_radius_mm: 50.8, min_corner_radius_mm: 38.1 },
};

export const CLOSURE_DEFAULTS = {
  elastic: {
    width_mm: 25.4,
    tension: 'standard' as const,
  },
  snap: {
    count: 2,
  },
  'flap-buckle': {
    strap_width: 25.4,
    buckle_size: 25.4,
  },
} as const;

export const LINING_DEFAULTS = {
  interfacing: 'fusible' as const,
} as const;

export const CARD_SLOTS_DEFAULTS = {
  slot_height: 57,
} as const;

export const BOOKMARK_RIBBON_DEFAULTS = {
  width_mm: 9.5,
} as const;

export const INTERNAL_ZIP_POCKET_DEFAULTS = {
  gauge: '#5' as const,
} as const;

export const MESH_POCKET_DEFAULTS = {
} as const;

export const TACTICAL_DEFAULTS = {
  velcro_panel_width: 101.6,
  velcro_panel_height: 152.4,
  lining_interfacing: 'hdpe' as const,
  foldover_preset: 'tactical' as const,
} as const;
