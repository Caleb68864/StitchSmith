/**
 * Predefined magazine dimension table (all measurements in inches).
 *
 * Width = max body width at the widest rib (not feed lip); Thickness = max body
 * thickness incl. floorplate proud points; Height = floorplate to feed-lip ridge.
 *
 * Source: StitchSmith mag-pouch v1 design document, §2.3 "Supported magazines".
 * Values verified against published manufacturer spec sheets; tolerance ±0.05".
 */

export interface MagazineEntry {
  /** Magazine identifier — stable across versions. */
  id: string;
  /** Human-readable description of the magazine. */
  description: string;
  /** Max body width at the widest rib, NOT the feed lip (inches). */
  width: number;
  /** Max body thickness including floorplate proud points (inches). */
  thickness: number;
  /** Floorplate to feed-lip ridge height (inches). */
  height: number;
}

const magazines: Record<string, MagazineEntry> = {
  ar15_30_round: {
    id: 'ar15_30_round',
    description: 'AR-15 / M4 30-round aluminum USGI magazine',
    width: 2.55,
    thickness: 1.0,
    height: 7.5,
  },
  ar15_20_round: {
    id: 'ar15_20_round',
    description: 'AR-15 20-round aluminum USGI magazine',
    width: 2.55,
    thickness: 1.0,
    height: 5.5,
  },
  pmag_gen2: {
    id: 'pmag_gen2',
    description: 'Magpul PMAG 30 Gen M2 MOE polymer magazine',
    width: 2.6,
    thickness: 1.05,
    height: 7.5,
  },
  pmag_gen3: {
    id: 'pmag_gen3',
    description: 'Magpul PMAG 30 Gen M3 polymer magazine',
    width: 2.6,
    thickness: 1.05,
    height: 7.5,
  },
  lancer_l5: {
    id: 'lancer_l5',
    description: 'Lancer Systems L5AWM 30-round hybrid translucent magazine',
    width: 2.55,
    thickness: 1.05,
    height: 7.5,
  },
  m4_stanag: {
    id: 'm4_stanag',
    description: 'M4/STANAG-pattern 30-round steel magazine',
    width: 2.55,
    thickness: 1.0,
    height: 7.5,
  },
};

export { magazines };
export type { MagazineEntry as Magazine };

/**
 * Returns the predefined magazine entry for the given ID, or `undefined` if
 * the ID is not found.
 */
export function getMagazine(id: string): MagazineEntry | undefined {
  return magazines[id];
}

/** All predefined magazine IDs. */
export const MAGAZINE_IDS = Object.keys(magazines) as Array<keyof typeof magazines>;
