import { useState, useCallback, useEffect } from 'react';
import type { WindShirtInputs } from '../generators/wind-shirt/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';
import { assertGeneratorMatch } from '../export/projectEnvelopeIO.js';

export const STORAGE_KEY = 'stitchsmith.wind-shirt.project';

export interface WindShirtProject {
  schemaVersion: 21;
  generatorId: 'wind-shirt';
  projectName: string;
  inputs: WindShirtInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidWindShirtProject(value: unknown): value is WindShirtProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 21 && v.generatorId === 'wind-shirt' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<WindShirtProject>({ key: STORAGE_KEY, isValid: isValidWindShirtProject });
export const _resetWindShirtStorage = storage._reset;

export function makeDefaultWindShirtProject(): WindShirtProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 21,
    generatorId: 'wind-shirt',
    projectName: 'My Wind Shirt',
    // Choices only. Every length is left empty so the field shows its
    // placeholder and the page lists it as mock-derived until it is entered.
    inputs: {
      units: 'in',
      body: 'straight',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: WindShirtProject): WindShirtProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseWindShirtProjectReturn = {
  project: WindShirtProject;
  setProject: (p: WindShirtProject) => void;
  updateInputs: (changes: Partial<WindShirtInputs>) => void;
  resetProject: () => void;
  importProject: (p: WindShirtProject) => void;
};

export function useWindShirtProject(): UseWindShirtProjectReturn {
  const [project, setProjectState] = useState<WindShirtProject>(() => storage.load() ?? makeDefaultWindShirtProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: WindShirtProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<WindShirtInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultWindShirtProject());
  }, []);

  const importProject = useCallback((p: WindShirtProject) => {
    assertGeneratorMatch(p.generatorId, 'wind-shirt');
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
