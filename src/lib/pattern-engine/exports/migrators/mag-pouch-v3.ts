/**
 * Mag Pouch v3 identity migrator.
 *
 * schemaVersion 3 is the first (and current) version of the mag-pouch project
 * JSON format.  There is no upgrade path from an earlier version because v0/v1/v2
 * never existed in the wild.  This migrator is exported so it can be referenced
 * in tests; the built-in registration happens directly in migrators/index.ts.
 *
 * Identity contract:
 *   magPouchV3MigrateIdentity(inputs) === { ok: true, data: inputs }
 *
 * A synthetic "v0" file (schemaVersion: 0, generatorId: 'mag-pouch') exercises
 * the MISSING-migrator path in the chain, which returns:
 *   { ok: false, error: 'No migrator registered for mag-pouch v0 → v1...' }
 * No migrator for v0 → v1 is registered because no real v0 files exist.
 */

/**
 * Canonical description of the mag-pouch v3 migrator entry shape, for reference
 * and tests.  The actual entry object is inlined in migrators/index.ts to keep
 * the registry initialisation in one place and avoid circular imports.
 *
 * generatorId: 'mag-pouch'
 * fromVersion: 3
 * toVersion:   3
 * migrate:     (inputs) => ({ ...inputs })   // identity — no transform needed
 */

/**
 * Convenience identity function that directly expresses the acceptance-criterion
 * shape `(inputs) => ({ ok: true, data: inputs })`.
 *
 * Usage in tests:
 *   import { magPouchV3MigrateIdentity } from '.../mag-pouch-v3.js';
 *   const result = magPouchV3MigrateIdentity(myInputs);
 *   expect(result).toEqual({ ok: true, data: myInputs });
 */
export function magPouchV3MigrateIdentity(
  inputs: Record<string, unknown>,
): { ok: true; data: Record<string, unknown> } {
  return { ok: true, data: inputs };
}

/**
 * The migrator entry object — exported so consumers can reference metadata
 * (generatorId, fromVersion, toVersion) without hard-coding strings.
 */
export const magPouchV3MigratorMeta = {
  generatorId: 'mag-pouch' as const,
  fromVersion: 3 as const,
  toVersion: 3 as const,
} as const;
