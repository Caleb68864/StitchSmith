/**
 * Predefined magazine dimension table (all measurements in inches).
 *
 * Width = max body width at the widest rib (not feed lip) — the front-to-back
 * dimension that spans a cell; Thickness = max body thickness incl. floorplate
 * proud points — the cell depth; Height = floorplate to feed-lip ridge.
 *
 * Sources: StitchSmith mag-pouch v1 design document §2.3 for the AR family
 * (manufacturer spec sheets, ±0.05"); vault rigs/stacked-rig-308-adaptation.md
 * for the .308 PMAG test case; vault mag-pouches/mag-pouch-ak-variant-hemmed-face.md
 * and unsupportedMagazines.ts for the AK profile.
 */

/**
 * Magazine platform. Drives the PALS cell span, the AK face hem, the .308
 * off-grid handling and platform-keyed hardware (Kydex wedges, bungee pulls).
 */
export type MagazinePlatform = 'rifle_556' | 'rifle_308' | 'ak' | 'custom';

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
  platform: MagazinePlatform;
}

const magazines: Record<string, MagazineEntry> = {
  ar15_30_round: {
    id: 'ar15_30_round',
    description: 'AR-15 / M4 30-round aluminum USGI magazine',
    width: 2.55,
    thickness: 1.0,
    height: 7.5,
    platform: 'rifle_556',
  },
  ar15_20_round: {
    id: 'ar15_20_round',
    description: 'AR-15 20-round aluminum USGI magazine',
    width: 2.55,
    thickness: 1.0,
    height: 5.5,
    platform: 'rifle_556',
  },
  pmag_gen2: {
    id: 'pmag_gen2',
    description: 'Magpul PMAG 30 Gen M2 MOE polymer magazine',
    width: 2.6,
    thickness: 1.05,
    height: 7.5,
    platform: 'rifle_556',
  },
  pmag_gen3: {
    id: 'pmag_gen3',
    description: 'Magpul PMAG 30 Gen M3 polymer magazine',
    width: 2.6,
    thickness: 1.05,
    height: 7.5,
    platform: 'rifle_556',
  },
  lancer_l5: {
    id: 'lancer_l5',
    description: 'Lancer Systems L5AWM 30-round hybrid translucent magazine',
    width: 2.55,
    thickness: 1.05,
    height: 7.5,
    platform: 'rifle_556',
  },
  m4_stanag: {
    id: 'm4_stanag',
    description: 'M4/STANAG-pattern 30-round steel magazine',
    width: 2.55,
    thickness: 1.0,
    height: 7.5,
    platform: 'rifle_556',
  },
  pmag_308_20: {
    id: 'pmag_308_20',
    description: 'Magpul PMAG 20 LR/SR 7.62×51 (.308) magazine',
    width: 2.9,
    thickness: 1.1,
    height: 5.75,
    platform: 'rifle_308',
  },
  ak47_762x39_30round: {
    id: 'ak47_762x39_30round',
    description: 'AK-47 / AKM 30-round 7.62×39 steel magazine (curved)',
    width: 2.5,
    thickness: 1.1,
    height: 9.5,
    platform: 'ak',
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

/** Human-readable platform names for the UI. */
export const PLATFORM_LABELS: Record<MagazinePlatform, string> = {
  rifle_556: '5.56 / AR-15',
  rifle_308: '.308 / 7.62 NATO',
  ak: 'AK (7.62×39 / 5.45)',
  custom: 'Custom',
};
