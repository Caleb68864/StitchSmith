import { useState, useCallback, useEffect } from 'react';
import type { QuiltInputs } from '../generators/quilt/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';
import { assertGeneratorMatch } from '../export/projectEnvelopeIO.js';

export const STORAGE_KEY = 'stitchsmith.quilt.project';

export interface QuiltProject {
  schemaVersion: 17;
  generatorId: 'quilt';
  projectName: string;
  inputs: QuiltInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidQuiltProject(value: unknown): value is QuiltProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 17 && v.generatorId === 'quilt' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<QuiltProject>({ key: STORAGE_KEY, isValid: isValidQuiltProject });
export const _resetQuiltStorage = storage._reset;

export function makeDefaultQuiltProject(): QuiltProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 17,
    generatorId: 'quilt',
    projectName: 'My Top Quilt',
    // Choices only. Every length is left empty so the field shows its
    // placeholder and the page lists it as mock-derived until it is entered.
    inputs: {
      units: 'in',
      construction: 'baffled',
      footbox: 'sewn',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: QuiltProject): QuiltProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseQuiltProjectReturn = {
  project: QuiltProject;
  setProject: (p: QuiltProject) => void;
  updateInputs: (changes: Partial<QuiltInputs>) => void;
  resetProject: () => void;
  importProject: (p: QuiltProject) => void;
};

export function useQuiltProject(): UseQuiltProjectReturn {
  const [project, setProjectState] = useState<QuiltProject>(() => storage.load() ?? makeDefaultQuiltProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: QuiltProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<QuiltInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultQuiltProject());
  }, []);

  const importProject = useCallback((p: QuiltProject) => {
    assertGeneratorMatch(p.generatorId, 'quilt');
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
