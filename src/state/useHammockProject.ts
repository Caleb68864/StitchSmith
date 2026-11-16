import { useState, useCallback, useEffect } from 'react';
import type { HammockInputs } from '../generators/hammock/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';
import { assertGeneratorMatch } from '../export/projectEnvelopeIO.js';

export const STORAGE_KEY = 'stitchsmith.hammock.project';

export interface HammockProject {
  schemaVersion: 16;
  generatorId: 'hammock';
  projectName: string;
  inputs: HammockInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidHammockProject(value: unknown): value is HammockProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 16 && v.generatorId === 'hammock' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<HammockProject>({ key: STORAGE_KEY, isValid: isValidHammockProject });
export const _resetHammockStorage = storage._reset;

export function makeDefaultHammockProject(): HammockProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 16,
    generatorId: 'hammock',
    projectName: 'My Hammock',
    // Choices only. Every length is left empty so the field shows its
    // placeholder and the page lists it as mock-derived until it is entered.
    inputs: {
      units: 'in',
      end_style: 'channel',
      side_edge: 'hem',
      hem_fold: 'double',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: HammockProject): HammockProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseHammockProjectReturn = {
  project: HammockProject;
  setProject: (p: HammockProject) => void;
  updateInputs: (changes: Partial<HammockInputs>) => void;
  resetProject: () => void;
  importProject: (p: HammockProject) => void;
};

export function useHammockProject(): UseHammockProjectReturn {
  const [project, setProjectState] = useState<HammockProject>(() => storage.load() ?? makeDefaultHammockProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: HammockProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<HammockInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultHammockProject());
  }, []);

  const importProject = useCallback((p: HammockProject) => {
    assertGeneratorMatch(p.generatorId, 'hammock');
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
