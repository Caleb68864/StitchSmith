import { useState, useCallback, useEffect } from 'react';
import type { LbvInputs } from '../generators/lbv/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';
import { assertGeneratorMatch } from '../export/projectEnvelopeIO.js';
import { DEFAULT_LBV_INPUTS } from '../generators/lbv/defaults.js';

export const STORAGE_KEY = 'stitchsmith.lbv.project';

export interface LbvProject {
  schemaVersion: 14;
  generatorId: 'lbv';
  projectName: string;
  inputs: LbvInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidLbvProject(value: unknown): value is LbvProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 14 && v.generatorId === 'lbv' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<LbvProject>({ key: STORAGE_KEY, isValid: isValidLbvProject });
export const _resetLbvStorage = storage._reset;

export function makeDefaultLbvProject(): LbvProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 14,
    generatorId: 'lbv',
    projectName: 'My Modular LBV',
    inputs: { ...DEFAULT_LBV_INPUTS },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: LbvProject): LbvProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseLbvProjectReturn = {
  project: LbvProject;
  setProject: (p: LbvProject) => void;
  updateInputs: (changes: Partial<LbvInputs>) => void;
  resetProject: () => void;
  importProject: (p: LbvProject) => void;
};

export function useLbvProject(): UseLbvProjectReturn {
  const [project, setProjectState] = useState<LbvProject>(() => storage.load() ?? makeDefaultLbvProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: LbvProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<LbvInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultLbvProject());
  }, []);

  const importProject = useCallback((p: LbvProject) => {
    assertGeneratorMatch(p.generatorId, 'lbv');
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
