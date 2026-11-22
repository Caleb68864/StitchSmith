import { useState, useCallback, useEffect } from 'react';
import type { GaiterInputs } from '../generators/gaiter/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';
import { assertGeneratorMatch } from '../export/projectEnvelopeIO.js';

export const STORAGE_KEY = 'stitchsmith.gaiter.project';

export interface GaiterProject {
  schemaVersion: 19;
  generatorId: 'gaiter';
  projectName: string;
  inputs: GaiterInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidGaiterProject(value: unknown): value is GaiterProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 19 && v.generatorId === 'gaiter' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<GaiterProject>({ key: STORAGE_KEY, isValid: isValidGaiterProject });
export const _resetGaiterStorage = storage._reset;

export function makeDefaultGaiterProject(): GaiterProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 19,
    generatorId: 'gaiter',
    projectName: 'My Gaiters',
    // Choices only. Every length is left empty so the field shows its
    // placeholder and the page lists it as mock-derived until it is entered.
    inputs: {
      units: 'in',
      closure: 'velcro',
      hem_fold: 'double',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: GaiterProject): GaiterProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseGaiterProjectReturn = {
  project: GaiterProject;
  setProject: (p: GaiterProject) => void;
  updateInputs: (changes: Partial<GaiterInputs>) => void;
  resetProject: () => void;
  importProject: (p: GaiterProject) => void;
};

export function useGaiterProject(): UseGaiterProjectReturn {
  const [project, setProjectState] = useState<GaiterProject>(() => storage.load() ?? makeDefaultGaiterProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: GaiterProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<GaiterInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultGaiterProject());
  }, []);

  const importProject = useCallback((p: GaiterProject) => {
    assertGeneratorMatch(p.generatorId, 'gaiter');
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
