/**
 * Pouch Engine — public API
 *
 * Usage:
 *   import { buildPouch } from './pouch-engine/index.js';
 *   const { pattern, warnings } = buildPouch({ ... });
 */

import type { Pattern } from '../pattern-engine/graph/Pattern.js';
import type { PouchSpec, PouchResult } from './construction/ConstructionStrategy.js';
import { foldedT } from './construction/foldedT.js';
import { boxedGusset } from './construction/boxedGusset.js';
import { centerGusset } from './construction/centerGusset.js';
import { taco } from './construction/taco.js';
import { foldedTDefaults } from './construction/foldedT.js';
import { boxedGussetDefaults } from './construction/boxedGusset.js';
import { centerGussetDefaults } from './construction/centerGusset.js';
import { tacoDefaults } from './construction/taco.js';

// ─── Public type re-exports ───────────────────────────────────────────────────

export type { CarriedObject } from './object/index.js';
export type { FitParams } from './fit/index.js';
export type {
  PouchSpec,
  PouchResult,
  ConstructionMethod,
} from './construction/ConstructionStrategy.js';
export { NotImplementedError } from './construction/ConstructionStrategy.js';
export { foldedTDefaults } from './construction/foldedT.js';
export { boxedGussetDefaults } from './construction/boxedGusset.js';
export { centerGussetDefaults } from './construction/centerGusset.js';
export { tacoDefaults } from './construction/taco.js';

// ─── Aggregated defaults ──────────────────────────────────────────────────────

/**
 * Convenience re-export: all strategy defaults in one object.
 * Consumers can import `{ defaults }` from the engine root.
 */
export const defaults = {
  folded_t: foldedTDefaults,
  boxed_gusset: boxedGussetDefaults,
  center_gusset: centerGussetDefaults,
  taco: tacoDefaults,
} as const;

// ─── Build entry point ────────────────────────────────────────────────────────

/**
 * Generate a complete pouch pattern from a {@link PouchSpec}.
 *
 * @throws {NotImplementedError} when `spec.construction` is not yet implemented.
 */
export function buildPouch(spec: PouchSpec): PouchResult {
  const strategy = {
    folded_t: foldedT,
    boxed_gusset: boxedGusset,
    center_gusset: centerGusset,
    taco: taco,
  }[spec.construction];

  const { pieces, steps, warnings } = strategy(spec);

  const pattern: Pattern = {
    id: `pouch-${spec.construction}-${Date.now()}`,
    name: `Pouch (${spec.construction.replace(/_/g, ' ')})`,
    pieces,
    description: steps.map((s) => `${s.title}: ${s.body}`).join('\n'),
    units: spec.units ?? 'mm',
  };

  return { pattern, warnings };
}
