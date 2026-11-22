import { useState, useCallback, useEffect } from 'react';
import type { BivyInputs } from '../generators/bivy/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';
import { assertGeneratorMatch } from '../export/projectEnvelopeIO.js';

export const STORAGE_KEY = 'stitchsmith.bivy.project';

export interface BivyProject {
  schemaVersion: 18;
  generatorId: 'bivy';
  projectName: string;
  inputs: BivyInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidBivyProject(value: unknown): value is BivyProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 18 && v.generatorId === 'bivy' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<BivyProject>({ key: STORAGE_KEY, isValid: isValidBivyProject });
export const _resetBivyStorage = storage._reset;

export function makeDefaultBivyProject(): BivyProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 18,
    generatorId: 'bivy',
    projectName: 'My Bivy',
    // Choices only. Every length is left empty so the field shows its
    // placeholder and the page lists it as mock-derived until it is entered.
    inputs: {
      units: 'in',
      head_gusset: 'mesh',
      zip_side: 'left',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: BivyProject): BivyProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseBivyProjectReturn = {
  project: BivyProject;
  setProject: (p: BivyProject) => void;
  updateInputs: (changes: Partial<BivyInputs>) => void;
  resetProject: () => void;
  importProject: (p: BivyProject) => void;
};

export function useBivyProject(): UseBivyProjectReturn {
  const [project, setProjectState] = useState<BivyProject>(() => storage.load() ?? makeDefaultBivyProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: BivyProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<BivyInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultBivyProject());
  }, []);

  const importProject = useCallback((p: BivyProject) => {
    assertGeneratorMatch(p.generatorId, 'bivy');
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
