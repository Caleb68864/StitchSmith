import { useState, useCallback, useEffect } from 'react';
import type { TriZipInputs, PresetName } from '../generators/tri-zip-backpack/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';

const STORAGE_KEY = 'stitchsmith.tri-zip-backpack.project';

function isValidTriZipProject(value: unknown): value is TriZipProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 2 && v.generatorId === 'tri-zip-backpack' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<TriZipProject>({ key: STORAGE_KEY, isValid: isValidTriZipProject });
export const _resetTriZipStorage = storage._reset;

export interface TriZipProject {
  schemaVersion: 2;
  generatorId: 'tri-zip-backpack';
  projectName: string;
  inputs: TriZipInputs;
  createdAt: string;
  updatedAt: string;
}

export function makeDefaultTriZipProject(): TriZipProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    generatorId: 'tri-zip-backpack',
    projectName: 'My Tri-Zip Backpack',
    inputs: {
      height: 450,
      width: 300,
      depth: 150,
      units: 'mm',
      stylePreset: 'urban_assault',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: TriZipProject): TriZipProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseTriZipProjectReturn = {
  project: TriZipProject;
  setProject: (p: TriZipProject) => void;
  updateInputs: (changes: Partial<TriZipInputs>) => void;
  setPreset: (name: PresetName) => void;
  resetProject: () => void;
  importProject: (p: TriZipProject) => void;
};

export function useTriZipProject(): UseTriZipProjectReturn {
  const [project, setProjectState] = useState<TriZipProject>(() => storage.load() ?? makeDefaultTriZipProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: TriZipProject) => {
    setProjectState(p);
  }, []);

  const updateInputs = useCallback((changes: Partial<TriZipInputs>) => {
    setProjectState(prev =>
      touch({ ...prev, inputs: { ...prev.inputs, ...changes } }),
    );
  }, []);

  const setPreset = useCallback((name: PresetName) => {
    setProjectState(prev =>
      touch({ ...prev, inputs: { ...prev.inputs, stylePreset: name } }),
    );
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultTriZipProject());
  }, []);

  const importProject = useCallback((p: TriZipProject) => {
    // parseProjectJson already checks generatorId on the file-import path; this
    // is defence in depth so a caller can never load another generator's project.
    if (p.generatorId !== 'tri-zip-backpack') {
      throw new Error(`Cannot import project with generatorId '${p.generatorId}' into Tri-Zip Backpack`);
    }
    setProjectState(p);
  }, []);

  return {
    project,
    setProject,
    updateInputs,
    setPreset,
    resetProject,
    importProject,
  };
}
