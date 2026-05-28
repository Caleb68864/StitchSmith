import { useState, useCallback, useEffect } from 'react';
import type {
  BookCoverInputs,
  PocketConfig,
  PenHolderConfig,
  LiningConfig,
  CardSlotsConfig,
  BookmarkRibbonConfig,
  InternalZipPocketConfig,
  MeshPocketConfig,
  TacticalConfig,
} from '../generators/book-cover/types.js';
import { DEFAULT_SEAM_ALLOWANCE_MM, DEFAULT_TOP_BOTTOM_HEM_MM, DEFAULT_PEN_HOLDER_HEIGHT_MM } from '../generators/book-cover/defaults.js';
import { toast } from '../lib/toast/toast.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';

const STORAGE_KEY = 'stitchsmith.book-cover.project';

function isValidBookCoverProject(value: unknown): value is BookCoverProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 4 && v.generatorId === 'book-cover' && typeof v.inputs === 'object';
}

const storage = makeProjectStorage<BookCoverProject>({
  key: STORAGE_KEY,
  isValid: isValidBookCoverProject,
});

export const _resetBookCoverStorage = storage._reset;

export interface BookCoverProjectInputs extends BookCoverInputs {
  top_bottom_hem?: number;
}

export interface BookCoverProject {
  schemaVersion: 4;
  generatorId: 'book-cover';
  projectName: string;
  inputs: BookCoverProjectInputs;
  createdAt: string;
  updatedAt: string;
}

export function makeDefaultBookCoverProject(): BookCoverProject {
  const now = new Date().toISOString();
  // Seed with the Moleskine Classic Large preset — recognizable, hardcover,
  // realistic spine and flap, so the preview is meaningful on first load.
  return {
    schemaVersion: 4,
    generatorId: 'book-cover',
    projectName: 'My Book Cover',
    inputs: {
      book_preset: 'moleskine-classic-large',
      book_height: 210,
      book_width: 130,
      spine_width: 18,
      flap_depth: 65,
      seam_allowance: DEFAULT_SEAM_ALLOWANCE_MM,
      top_bottom_hem: DEFAULT_TOP_BOTTOM_HEM_MM,
      units: 'mm',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: BookCoverProject): BookCoverProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseBookCoverProjectReturn = {
  project: BookCoverProject;
  setProject: (p: BookCoverProject) => void;
  updateInputs: (changes: Partial<BookCoverProjectInputs>) => void;
  resetProject: () => void;
  importProject: (p: BookCoverProject) => void;
  toggleOuterPocket: (enabled: boolean) => void;
  toggleInnerPocket: (enabled: boolean) => void;
  togglePenHolder: (enabled: boolean) => void;
  toggleLining: (enabled: boolean) => void;
  toggleCardSlots: (enabled: boolean) => void;
  toggleBookmarkRibbon: (enabled: boolean) => void;
  toggleInternalZipPocket: (enabled: boolean) => void;
  toggleMeshPocket: (enabled: boolean) => void;
  toggleTactical: (enabled: boolean) => void;
};

const DEFAULT_OUTER_POCKET: PocketConfig = { width: 120, height: 100, position: 'front' };
const DEFAULT_INNER_POCKET: PocketConfig = { width: 120, height: 80, position: 'back' };
const DEFAULT_PEN_HOLDER: PenHolderConfig = { count: 3, slot_width: 15, height: DEFAULT_PEN_HOLDER_HEIGHT_MM };
const DEFAULT_LINING: LiningConfig = { enabled: true, interfacing: 'fusible' };
const DEFAULT_CARD_SLOTS: CardSlotsConfig = { count: 3, slot_height: 57 };
const DEFAULT_BOOKMARK_RIBBON: BookmarkRibbonConfig = { count: 1, width_mm: 9.5 };
const DEFAULT_INTERNAL_ZIP_POCKET: InternalZipPocketConfig = { gauge: '#5' };
const DEFAULT_MESH_POCKET: MeshPocketConfig = { elastic_top: true };
const DEFAULT_TACTICAL: TacticalConfig = {
  enabled: true,
  velcro_panel_width: 101.6,
  velcro_panel_height: 152.4,
  retention_strap: false,
  spare_mag_pocket: false,
};

const FEATURE_LABEL: Record<string, string> = {
  card_slots: 'Card slots',
  bookmark_ribbon: 'Bookmark ribbon',
  internal_zip_pocket: 'Internal zip pocket',
  mesh_pocket: 'Mesh pocket',
};

export function useBookCoverProject(): UseBookCoverProjectReturn {
  const [project, setProjectState] = useState<BookCoverProject>(() => {
    return storage.load() ?? makeDefaultBookCoverProject();
  });

  // Auto-save on every project change (debounced inside storage).
  useEffect(() => {
    storage.save(project);
  }, [project]);

  const setProject = useCallback((p: BookCoverProject) => {
    setProjectState(p);
  }, []);

  const updateInputs = useCallback((changes: Partial<BookCoverProjectInputs>) => {
    setProjectState(prev =>
      touch({ ...prev, inputs: { ...prev.inputs, ...changes } }),
    );
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultBookCoverProject());
  }, []);

  const importProject = useCallback((p: BookCoverProject) => {
    if (p.generatorId !== 'book-cover') {
      throw new Error(`Cannot import project with generatorId '${p.generatorId}' into Book Cover`);
    }
    setProjectState(p);
  }, []);

  const toggleOuterPocket = useCallback((enabled: boolean) => {
    setProjectState(prev =>
      touch({ ...prev, inputs: { ...prev.inputs, outer_pocket: enabled ? DEFAULT_OUTER_POCKET : undefined } }),
    );
  }, []);

  const toggleInnerPocket = useCallback((enabled: boolean) => {
    setProjectState(prev =>
      touch({ ...prev, inputs: { ...prev.inputs, inner_pocket: enabled ? DEFAULT_INNER_POCKET : undefined } }),
    );
  }, []);

  const togglePenHolder = useCallback((enabled: boolean) => {
    setProjectState(prev =>
      touch({ ...prev, inputs: { ...prev.inputs, pen_holder: enabled ? DEFAULT_PEN_HOLDER : undefined } }),
    );
  }, []);

  // Internal-feature toggles auto-enable lining when needed and surface a toast.
  // Lining-disable warns when features that need lining are on.

  const enableLiningIfNeeded = useCallback((next: BookCoverProjectInputs, featureKey: keyof typeof FEATURE_LABEL): BookCoverProjectInputs => {
    if (next.lining?.enabled) return next;
    toast.info(
      'Lining auto-enabled',
      `${FEATURE_LABEL[featureKey]} attaches to the lining, so lining was switched on automatically.`,
    );
    return { ...next, lining: DEFAULT_LINING };
  }, []);

  const toggleLining = useCallback((enabled: boolean) => {
    setProjectState(prev => {
      const inputs = prev.inputs;
      if (!enabled) {
        // Warn if internal features that depend on lining are on.
        const dependents: string[] = [];
        if (inputs.card_slots) dependents.push(FEATURE_LABEL.card_slots);
        if (inputs.bookmark_ribbon) dependents.push(FEATURE_LABEL.bookmark_ribbon);
        if (inputs.internal_zip_pocket) dependents.push(FEATURE_LABEL.internal_zip_pocket);
        if (inputs.mesh_pocket) dependents.push(FEATURE_LABEL.mesh_pocket);
        if (inputs.tactical?.enabled) dependents.push('Tactical mode');
        if (dependents.length > 0) {
          toast.warning(
            'Lining cannot be disabled yet',
            `${dependents.join(', ')} attach${dependents.length === 1 ? 'es' : ''} to the lining. Disable ${dependents.length === 1 ? 'it' : 'them'} first.`,
          );
          return prev;
        }
      }
      return touch({
        ...prev,
        inputs: { ...inputs, lining: enabled ? DEFAULT_LINING : undefined },
      });
    });
  }, []);

  const toggleCardSlots = useCallback((enabled: boolean) => {
    setProjectState(prev => {
      let next: BookCoverProjectInputs = { ...prev.inputs, card_slots: enabled ? DEFAULT_CARD_SLOTS : undefined };
      if (enabled) next = enableLiningIfNeeded(next, 'card_slots');
      return touch({ ...prev, inputs: next });
    });
  }, [enableLiningIfNeeded]);

  const toggleBookmarkRibbon = useCallback((enabled: boolean) => {
    setProjectState(prev => {
      let next: BookCoverProjectInputs = { ...prev.inputs, bookmark_ribbon: enabled ? DEFAULT_BOOKMARK_RIBBON : undefined };
      if (enabled) next = enableLiningIfNeeded(next, 'bookmark_ribbon');
      return touch({ ...prev, inputs: next });
    });
  }, [enableLiningIfNeeded]);

  const toggleInternalZipPocket = useCallback((enabled: boolean) => {
    setProjectState(prev => {
      let next: BookCoverProjectInputs = { ...prev.inputs, internal_zip_pocket: enabled ? DEFAULT_INTERNAL_ZIP_POCKET : undefined };
      if (enabled) next = enableLiningIfNeeded(next, 'internal_zip_pocket');
      return touch({ ...prev, inputs: next });
    });
  }, [enableLiningIfNeeded]);

  const toggleMeshPocket = useCallback((enabled: boolean) => {
    setProjectState(prev => {
      let next: BookCoverProjectInputs = { ...prev.inputs, mesh_pocket: enabled ? DEFAULT_MESH_POCKET : undefined };
      if (enabled) next = enableLiningIfNeeded(next, 'mesh_pocket');
      return touch({ ...prev, inputs: next });
    });
  }, [enableLiningIfNeeded]);

  const toggleTactical = useCallback((enabled: boolean) => {
    setProjectState(prev => {
      const next: BookCoverProjectInputs = { ...prev.inputs };
      if (enabled) {
        next.tactical = DEFAULT_TACTICAL;
        if (!next.lining?.enabled) {
          toast.info(
            'Lining auto-enabled',
            'Tactical mode mounts on the lining, so lining was switched on with HDPE interfacing.',
          );
          next.lining = { enabled: true, interfacing: 'hdpe' };
        }
      } else {
        next.tactical = undefined;
      }
      return touch({ ...prev, inputs: next });
    });
  }, []);

  return {
    project,
    setProject,
    updateInputs,
    resetProject,
    importProject,
    toggleOuterPocket,
    toggleInnerPocket,
    togglePenHolder,
    toggleLining,
    toggleCardSlots,
    toggleBookmarkRibbon,
    toggleInternalZipPocket,
    toggleMeshPocket,
    toggleTactical,
  };
}
