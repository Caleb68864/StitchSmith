/**
 * Reference dimensions for AK-pattern and other out-of-scope magazines.
 *
 * These entries are NOT available as selectable presets in v1.  They exist
 * solely to provide reference dimensions for `detectAkProfile()` — the warning
 * thresholds in that function are derived from these known profiles.
 *
 * If a user enters custom dimensions that match these profiles, the generator
 * emits an advisory warning but still produces a pattern.  The user is
 * responsible for verifying compatibility with their chosen construction method.
 *
 * All measurements in inches.
 * Width = max body width at the widest rib (not feed lip);
 * Thickness = max body thickness incl. floorplate proud points;
 * Height = floorplate to feed-lip ridge.
 */

export interface UnsupportedMagazineEntry {
  id: string;
  description: string;
  width: number;
  thickness: number;
  height: number;
  reason: string;
}

/**
 * AK-pattern magazines.  The AK family has a distinctive curved profile and
 * forward-tilted feed angle.  The mag body is taller (≥ 8.5") and thicker
 * (≥ 1.05") than a standard AR-15 magazine, which can cause fit problems with
 * a straight-bodied folded-T pouch optimised for AR magazines.
 */
export const AK_MAGAZINES: UnsupportedMagazineEntry[] = [
  {
    id: 'ak47_762x39_30round',
    description: 'AK-47 / AKM 30-round 7.62×39 steel magazine',
    width: 2.5,
    thickness: 1.1,
    height: 9.5,
    reason:
      'AK-pattern magazine geometry (curved body, tall profile) requires a dedicated ' +
      'construction template not available in the folded-T engine.',
  },
  {
    id: 'ak74_545x39_30round',
    description: 'AK-74 / AK-74M 30-round 5.45×39 polymer magazine',
    width: 2.2,
    thickness: 1.05,
    height: 8.75,
    reason:
      'AK-74 magazine has a different taper and spine than AR-15 pattern; ' +
      'folded-T construction does not account for the curved-body geometry.',
  },
];

/**
 * Dimension thresholds derived from AK-pattern reference magazines.
 * `detectAkProfile()` uses these to decide whether to warn.
 */
export const AK_THRESHOLD_THICKNESS_IN = 1.05; // inches — minimum thickness for AK warning
export const AK_THRESHOLD_HEIGHT_IN = 8.5; // inches — minimum height for AK warning
