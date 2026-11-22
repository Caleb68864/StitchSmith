import { useState, useCallback, useEffect } from 'react';
import type { BeanieInputs } from '../generators/beanie/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';
import { assertGeneratorMatch } from '../export/projectEnvelopeIO.js';

export const STORAGE_KEY = 'stitchsmith.beanie.project';

export interface BeanieProject {
  schemaVersion: 20;
  generatorId: 'beanie';
  projectName: string;
  inputs: BeanieInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidBeanieProject(value: unknown): value is BeanieProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 20 && v.generatorId === 'beanie' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<BeanieProject>({ key: STORAGE_KEY, isValid: isValidBeanieProject });
export const _resetBeanieStorage = storage._reset;

export function makeDefaultBeanieProject(): BeanieProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 20,
    generatorId: 'beanie',
    projectName: 'My Beanie',
    // Choices only. Every length is left empty so the field shows its
    // placeholder and the page lists it as mock-derived until it is entered.
    inputs: {
      units: 'in',
      finish: 'cuff',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: BeanieProject): BeanieProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseBeanieProjectReturn = {
  project: BeanieProject;
  setProject: (p: BeanieProject) => void;
  updateInputs: (changes: Partial<BeanieInputs>) => void;
  resetProject: () => void;
  importProject: (p: BeanieProject) => void;
};

export function useBeanieProject(): UseBeanieProjectReturn {
  const [project, setProjectState] = useState<BeanieProject>(() => storage.load() ?? makeDefaultBeanieProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: BeanieProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<BeanieInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultBeanieProject());
  }, []);

  const importProject = useCallback((p: BeanieProject) => {
    assertGeneratorMatch(p.generatorId, 'beanie');
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
