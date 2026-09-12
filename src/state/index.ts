/**
 * Registry of every generator's project hook (hardening pass H5): storage key,
 * schema version, default factory and the test-only storage reset. Tests use it
 * to prove keys are unique, versions match CLAUDE.md and every project
 * round-trips through export → parse → import.
 */
import { makeDefaultBookCoverProject, _resetBookCoverStorage, useBookCoverProject, STORAGE_KEY as BookCoverKey } from './useBookCoverProject.js';
import { makeDefaultCircleSkirtProject, _resetCircleSkirtStorage, useCircleSkirtProject, STORAGE_KEY as CircleSkirtKey } from './useCircleSkirtProject.js';
import { makeDefaultClamshellPackProject, _resetClamshellPackStorage, useClamshellPackProject, STORAGE_KEY as ClamshellPackKey } from './useClamshellPackProject.js';
import { makeDefaultFannyPackProject, _resetFannyPackStorage, useFannyPackProject, STORAGE_KEY as FannyPackKey } from './useFannyPackProject.js';
import { makeDefaultLbvProject, _resetLbvStorage, useLbvProject, STORAGE_KEY as LbvKey } from './useLbvProject.js';
import { makeDefaultMagPouchProject, _resetMagPouchStorage, useMagPouchProject, STORAGE_KEY as MagPouchKey } from './useMagPouchProject.js';
import { makeDefaultMicroRigProject, _resetMicroRigStorage, useMicroRigProject, STORAGE_KEY as MicroRigKey } from './useMicroRigProject.js';
import { makeDefaultOrganizerProject, _resetOrganizerStorage, useOrganizerProject, STORAGE_KEY as OrganizerKey } from './useOrganizerProject.js';
import { makeDefaultPaddedStrapProject, _resetPaddedStrapStorage, usePaddedStrapProject, STORAGE_KEY as PaddedStrapKey } from './usePaddedStrapProject.js';
import { makeDefaultPlateCarrierProject, _resetPlateCarrierStorage, usePlateCarrierProject, STORAGE_KEY as PlateCarrierKey } from './usePlateCarrierProject.js';
import { makeDefaultRollTopSackProject, _resetRollTopSackStorage, useRollTopSackProject, STORAGE_KEY as RollTopSackKey } from './useRollTopSackProject.js';
import { makeDefaultSlingProject, _resetSlingStorage, useSlingProject, STORAGE_KEY as SlingKey } from './useSlingProject.js';
import { makeDefaultTriZipProject, _resetTriZipStorage, useTriZipProject, STORAGE_KEY as TriZipKey } from './useTriZipProject.js';
import { makeDefaultZipPouchProject, _resetZipPouchStorage, useZipPouchProject, STORAGE_KEY as ZipPouchKey } from './useZipPouchProject.js';
import { STORAGE_KEY as toolRollKey } from '../storage/localStorage.js';

export interface ProjectEnvelope {
  schemaVersion: number;
  generatorId: string;
  projectName: string;
  inputs: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectHookApi {
  project: ProjectEnvelope;
  setProject: (p: never) => void;
  updateInputs: (changes: Record<string, unknown>) => void;
  resetProject: () => void;
  importProject: (p: never) => void;
}

export interface ProjectHookEntry {
  generatorId: string;
  schemaVersion: number;
  storageKey: string;
  makeDefault: () => ProjectEnvelope;
  reset: () => void;
  /** The React hook itself (typed loosely; tests drive it through renderHook). */
  useHook: () => ProjectHookApi;
  /** Directory under src/generators that owns validateInputs for this project. */
  generatorDir: string;
}

/** Every generator that persists through makeProjectStorage (Tool Roll has its own module: see TOOL_ROLL_STORAGE_KEY). */
export const PROJECT_HOOKS: readonly ProjectHookEntry[] = [
  { generatorId: 'book-cover', schemaVersion: 4, storageKey: BookCoverKey, makeDefault: makeDefaultBookCoverProject as unknown as () => ProjectEnvelope, reset: _resetBookCoverStorage, useHook: useBookCoverProject as unknown as () => ProjectHookApi, generatorDir: 'book-cover' },
  { generatorId: 'circle-skirt', schemaVersion: 6, storageKey: CircleSkirtKey, makeDefault: makeDefaultCircleSkirtProject as unknown as () => ProjectEnvelope, reset: _resetCircleSkirtStorage, useHook: useCircleSkirtProject as unknown as () => ProjectHookApi, generatorDir: 'circle-skirt' },
  { generatorId: 'clamshell-pack', schemaVersion: 12, storageKey: ClamshellPackKey, makeDefault: makeDefaultClamshellPackProject as unknown as () => ProjectEnvelope, reset: _resetClamshellPackStorage, useHook: useClamshellPackProject as unknown as () => ProjectHookApi, generatorDir: 'clamshell-pack' },
  { generatorId: 'fanny-pack', schemaVersion: 11, storageKey: FannyPackKey, makeDefault: makeDefaultFannyPackProject as unknown as () => ProjectEnvelope, reset: _resetFannyPackStorage, useHook: useFannyPackProject as unknown as () => ProjectHookApi, generatorDir: 'fanny-pack' },
  { generatorId: 'lbv', schemaVersion: 14, storageKey: LbvKey, makeDefault: makeDefaultLbvProject as unknown as () => ProjectEnvelope, reset: _resetLbvStorage, useHook: useLbvProject as unknown as () => ProjectHookApi, generatorDir: 'lbv' },
  { generatorId: 'mag-pouch', schemaVersion: 3, storageKey: MagPouchKey, makeDefault: makeDefaultMagPouchProject as unknown as () => ProjectEnvelope, reset: _resetMagPouchStorage, useHook: useMagPouchProject as unknown as () => ProjectHookApi, generatorDir: 'mag-pouch' },
  { generatorId: 'micro-rig', schemaVersion: 8, storageKey: MicroRigKey, makeDefault: makeDefaultMicroRigProject as unknown as () => ProjectEnvelope, reset: _resetMicroRigStorage, useHook: useMicroRigProject as unknown as () => ProjectHookApi, generatorDir: 'micro-rig' },
  { generatorId: 'organizer', schemaVersion: 10, storageKey: OrganizerKey, makeDefault: makeDefaultOrganizerProject as unknown as () => ProjectEnvelope, reset: _resetOrganizerStorage, useHook: useOrganizerProject as unknown as () => ProjectHookApi, generatorDir: 'organizer' },
  { generatorId: 'padded-strap', schemaVersion: 7, storageKey: PaddedStrapKey, makeDefault: makeDefaultPaddedStrapProject as unknown as () => ProjectEnvelope, reset: _resetPaddedStrapStorage, useHook: usePaddedStrapProject as unknown as () => ProjectHookApi, generatorDir: 'padded-strap' },
  { generatorId: 'plate-carrier', schemaVersion: 13, storageKey: PlateCarrierKey, makeDefault: makeDefaultPlateCarrierProject as unknown as () => ProjectEnvelope, reset: _resetPlateCarrierStorage, useHook: usePlateCarrierProject as unknown as () => ProjectHookApi, generatorDir: 'plate-carrier' },
  { generatorId: 'roll-top-sack', schemaVersion: 1, storageKey: RollTopSackKey, makeDefault: makeDefaultRollTopSackProject as unknown as () => ProjectEnvelope, reset: _resetRollTopSackStorage, useHook: useRollTopSackProject as unknown as () => ProjectHookApi, generatorDir: 'roll-top-sack' },
  { generatorId: 'sling', schemaVersion: 9, storageKey: SlingKey, makeDefault: makeDefaultSlingProject as unknown as () => ProjectEnvelope, reset: _resetSlingStorage, useHook: useSlingProject as unknown as () => ProjectHookApi, generatorDir: 'sling' },
  { generatorId: 'tri-zip-backpack', schemaVersion: 2, storageKey: TriZipKey, makeDefault: makeDefaultTriZipProject as unknown as () => ProjectEnvelope, reset: _resetTriZipStorage, useHook: useTriZipProject as unknown as () => ProjectHookApi, generatorDir: 'tri-zip-backpack' },
  { generatorId: 'zip-pouch', schemaVersion: 5, storageKey: ZipPouchKey, makeDefault: makeDefaultZipPouchProject as unknown as () => ProjectEnvelope, reset: _resetZipPouchStorage, useHook: useZipPouchProject as unknown as () => ProjectHookApi, generatorDir: 'zip-pouch' },
];

export const TOOL_ROLL_STORAGE_KEY = toolRollKey;

/** generatorId → the schemaVersion this build writes (Tool Roll included). */
export const SCHEMA_VERSIONS: Readonly<Record<string, number>> = Object.freeze({
  'tool-roll': 1,
  ...Object.fromEntries(PROJECT_HOOKS.map((h) => [h.generatorId, h.schemaVersion])),
});
