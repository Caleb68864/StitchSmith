// SS-05: storage key follows P7 naming convention (stitchsmith.<generator-id>.project).
// isValidProject checks schemaVersion=1 so cross-generator data in storage is silently ignored.
import type { ToolRollProject } from '../generators/tool-roll/types.js';
import { defaultToolRollSettings } from '../generators/tool-roll/defaults.js';

export const STORAGE_KEY = 'stitchsmith.tool-roll.project';

/**
 * Merges saved settings with the current defaults so that newly-added setting
 * fields are filled in for projects saved before they existed. Prevents undefined
 * reads in the UI (e.g. NumInput calling .toFixed on a missing field).
 */
function migrateSettings(saved: unknown): ToolRollProject['settings'] {
  if (typeof saved !== 'object' || saved === null) return { ...defaultToolRollSettings };
  return { ...defaultToolRollSettings, ...(saved as ToolRollProject['settings']) };
}

// In-memory fallback when localStorage is unavailable
let _inMemoryProject: ToolRollProject | null = null;
// Set to true after the first write failure; prevents future write attempts
let _writeFailure = false;
let _warnedOnce = false;
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
// Cached probe result — null means not yet tested
let _storageAvailable: boolean | null = null;

/**
 * schemaVersion 1 is shared by Tool Roll AND Roll-Top Sack — per CLAUDE.md these
 * are sibling schemas, not an upgrade chain, and are distinguished by
 * `generatorId`. Checking the version alone accepted a Roll-Top Sack project
 * stored under this key, and accepted a bare `{ schemaVersion: 1 }` with no
 * `tools` — which every consumer immediately calls `.map()` on.
 *
 * `serialize()` always writes `generatorId`, `tools` and `settings`, so no
 * project this module has ever persisted is rejected by these extra checks.
 */
function isValidProject(value: unknown): value is ToolRollProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.schemaVersion === 1 &&
    v.generatorId === 'tool-roll' &&
    Array.isArray(v.tools) &&
    typeof v.settings === 'object' &&
    v.settings !== null
  );
}

// Serialize only the canonical persisted fields — never computed layout or SVG strings
function serialize(p: ToolRollProject): string {
  const {
    schemaVersion,
    projectName,
    generatorId,
    units,
    settings,
    tools,
    createdAt,
    updatedAt,
  } = p;
  return JSON.stringify({
    schemaVersion,
    projectName,
    generatorId,
    units,
    settings,
    tools,
    createdAt,
    updatedAt,
  });
}

export function loadProject(): ToolRollProject | null {
  // Storage known-bad from a prior write failure — return in-memory cache
  if (_writeFailure) return _inMemoryProject;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidProject(parsed)) return null;
    // Forward-migrate: fill any newer setting fields from defaults.
    return { ...parsed, settings: migrateSettings(parsed.settings) };
  } catch {
    return null;
  }
}

export function saveProject(p: ToolRollProject): void {
  // Always update in-memory cache immediately (synchronously)
  _inMemoryProject = p;
  if (_saveTimer !== null) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    // Skip write if we already know storage is unavailable
    if (_writeFailure) return;
    try {
      localStorage.setItem(STORAGE_KEY, serialize(p));
    } catch {
      _writeFailure = true;
      if (!_warnedOnce) {
        console.warn(
          "[StitchSmith] Session won't persist — browser storage disabled.",
        );
        _warnedOnce = true;
      }
    }
  }, 500);
}

export function clearProject(): void {
  _inMemoryProject = null;
  if (_writeFailure) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Returns whether localStorage is available. Uses a lightweight probe on first
 * call and caches the result. Call sites must not use this to gate write attempts
 * — writes catch their own errors in saveProject.
 */
export function isStorageAvailable(): boolean {
  if (_writeFailure) return false;
  if (_storageAvailable !== null) return _storageAvailable;
  try {
    const probe = '__ss_probe__';
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    _storageAvailable = true;
  } catch {
    _storageAvailable = false;
  }
  return _storageAvailable;
}

/** Reset module-level state — for tests only */
export function _resetStorageModule(): void {
  _inMemoryProject = null;
  _writeFailure = false;
  _warnedOnce = false;
  _storageAvailable = null;
  if (_saveTimer !== null) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
}
