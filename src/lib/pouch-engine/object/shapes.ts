/**
 * Canonical cross-section shapes for carried objects.
 * 'rectangular' – box with flat faces (magazines, phones, tools).
 * 'cylindrical' – circular cross-section (flashlights, water bottles).
 */
export type ObjectShape = 'rectangular' | 'cylindrical';

/** Metadata that supplements a {@link CarriedObject} with shape context. */
export interface ObjectProfile {
  shape: ObjectShape;
  /** Free-text name for display / error messages. */
  label?: string;
}
