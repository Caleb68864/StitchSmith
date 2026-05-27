export type MigratorFn = (
  data: Record<string, unknown>,
) => Record<string, unknown>;

export interface MigratorEntry {
  generatorId: string;
  fromVersion: number;
  toVersion: number;
  migrate: MigratorFn;
}

// ─── Built-in migrator registrations ─────────────────────────────────────────
//
// Each generator registers its migrators here.  The chain runs in order from
// `fromVersion` to `targetVersion`, stepping through `toVersion` values.
//
// Mag Pouch v3 — identity migrator (schemaVersion 3 is the first version; no
// real v0/v1/v2 ever existed, so the "no migrator found" path handles those).
//
// Tool Roll (schemaVersion 1) and Tri-Zip (schemaVersion 2) never required
// migration paths because no prior versions shipped; add their entries here
// when version bumps occur.

const registry: MigratorEntry[] = [
  // mag-pouch schemaVersion 3 identity — keeps the registry non-empty for this
  // generatorId so future v3→v4 migrators can extend the chain naturally.
  {
    generatorId: 'mag-pouch',
    fromVersion: 3,
    toVersion: 3,
    migrate: (inputs) => ({ ...inputs }),
  },
];

export function registerMigrator(entry: MigratorEntry): void {
  registry.push(entry);
}

export type MigrateResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

export function migrateData(
  generatorId: string,
  fromVersion: number,
  targetVersion: number,
  data: Record<string, unknown>,
): MigrateResult {
  if (fromVersion === targetVersion) {
    return { ok: true, data };
  }

  if (fromVersion > targetVersion) {
    return {
      ok: false,
      error: `This project was saved by a newer version of StitchSmith (schema v${fromVersion}). Please upgrade StitchSmith to open it.`,
    };
  }

  let current = fromVersion;
  let currentData = { ...data };

  while (current < targetVersion) {
    const migrator = registry.find(
      (m) => m.generatorId === generatorId && m.fromVersion === current,
    );
    if (!migrator) {
      return {
        ok: false,
        error: `No migrator registered for ${generatorId} v${current} → v${current + 1}. The project file may be corrupt.`,
      };
    }
    currentData = migrator.migrate(currentData);
    current = migrator.toVersion;
  }

  return { ok: true, data: currentData };
}

export function clearRegistry(): void {
  registry.length = 0;
}
