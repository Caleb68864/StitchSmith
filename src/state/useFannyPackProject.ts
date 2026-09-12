import { useState, useCallback, useEffect } from 'react';
import type { FannyPackInputs } from '../generators/fanny-pack/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';
import { assertGeneratorMatch } from '../export/projectEnvelopeIO.js';

export const STORAGE_KEY = 'stitchsmith.fanny-pack.project';

export interface FannyPackProject {
  schemaVersion: 11;
  generatorId: 'fanny-pack';
  projectName: string;
  inputs: FannyPackInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidFannyPackProject(value: unknown): value is FannyPackProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 11 && v.generatorId === 'fanny-pack' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<FannyPackProject>({ key: STORAGE_KEY, isValid: isValidFannyPackProject });
export const _resetFannyPackStorage = storage._reset;

export function makeDefaultFannyPackProject(): FannyPackProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 11,
    generatorId: 'fanny-pack',
    projectName: 'My Fanny Pack',
    inputs: {
      units: 'in',
      width: 10,
      height: 6,
      depth: 3,
      seam_allowance: 0.5,
      lid_drop_target: 'fully_open',
      zipper_edge_finish: 'fold',
      zipper_lip: 1,
      belt_webbing: 1.5,
      belt_min: 28,
      belt_max: 52,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: FannyPackProject): FannyPackProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseFannyPackProjectReturn = {
  project: FannyPackProject;
  setProject: (p: FannyPackProject) => void;
  updateInputs: (changes: Partial<FannyPackInputs>) => void;
  resetProject: () => void;
  importProject: (p: FannyPackProject) => void;
};

export function useFannyPackProject(): UseFannyPackProjectReturn {
  const [project, setProjectState] = useState<FannyPackProject>(() => storage.load() ?? makeDefaultFannyPackProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: FannyPackProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<FannyPackInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultFannyPackProject());
  }, []);

  const importProject = useCallback((p: FannyPackProject) => {
    assertGeneratorMatch(p.generatorId, 'fanny-pack');
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
