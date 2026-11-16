import { useState, useCallback, useEffect } from 'react';
import type { TarpInputs } from '../generators/tarp/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';
import { assertGeneratorMatch } from '../export/projectEnvelopeIO.js';

export const STORAGE_KEY = 'stitchsmith.tarp.project';

export interface TarpProject {
  schemaVersion: 15;
  generatorId: 'tarp';
  projectName: string;
  inputs: TarpInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidTarpProject(value: unknown): value is TarpProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 15 && v.generatorId === 'tarp' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<TarpProject>({ key: STORAGE_KEY, isValid: isValidTarpProject });
export const _resetTarpStorage = storage._reset;

export function makeDefaultTarpProject(): TarpProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 15,
    generatorId: 'tarp',
    projectName: 'My Tarp',
    // Choices only. Every length is left empty so the field shows its
    // placeholder and the page lists it as mock-derived until it is entered.
    inputs: {
      units: 'in',
      construction: 'ridge_seam',
      cut_style: 'cat_cut',
      hem_fold: 'double',
      ridge_tieouts: true,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: TarpProject): TarpProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseTarpProjectReturn = {
  project: TarpProject;
  setProject: (p: TarpProject) => void;
  updateInputs: (changes: Partial<TarpInputs>) => void;
  resetProject: () => void;
  importProject: (p: TarpProject) => void;
};

export function useTarpProject(): UseTarpProjectReturn {
  const [project, setProjectState] = useState<TarpProject>(() => storage.load() ?? makeDefaultTarpProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: TarpProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<TarpInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultTarpProject());
  }, []);

  const importProject = useCallback((p: TarpProject) => {
    assertGeneratorMatch(p.generatorId, 'tarp');
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
