export type MigratorFn = (
  data: Record<string, unknown>,
) => Record<string, unknown>;

export interface MigratorEntry {
  generatorId: string;
  fromVersion: number;
  toVersion: number;
  migrate: MigratorFn;
}

const registry: MigratorEntry[] = [];

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
