import { useState, useCallback, useEffect } from 'react';
import type { SlingInputs } from '../generators/sling/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';

export const STORAGE_KEY = 'stitchsmith.sling.project';

export interface SlingProject {
  schemaVersion: 9;
  generatorId: 'sling';
  projectName: string;
  inputs: SlingInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidSlingProject(value: unknown): value is SlingProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 9 && v.generatorId === 'sling' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<SlingProject>({ key: STORAGE_KEY, isValid: isValidSlingProject });
export const _resetSlingStorage = storage._reset;

export function makeDefaultSlingProject(): SlingProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 9,
    generatorId: 'sling',
    projectName: 'My Sling',
    inputs: {
      units: 'in',
      third_piece: 'anchor_strap',
      end_interface: 'bare_triglide',
      route_through_both_slots: false,
      seam_allowance: 9.5,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: SlingProject): SlingProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseSlingProjectReturn = {
  project: SlingProject;
  setProject: (p: SlingProject) => void;
  updateInputs: (changes: Partial<SlingInputs>) => void;
  resetProject: () => void;
  importProject: (p: SlingProject) => void;
};

export function useSlingProject(): UseSlingProjectReturn {
  const [project, setProjectState] = useState<SlingProject>(() => storage.load() ?? makeDefaultSlingProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: SlingProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<SlingInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultSlingProject());
  }, []);

  const importProject = useCallback((p: SlingProject) => {
    if (p.generatorId !== 'sling') {
      throw new Error(`Cannot import project with generatorId '${p.generatorId}' into sling`);
    }
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
