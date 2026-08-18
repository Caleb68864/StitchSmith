import { useState, useCallback, useEffect } from 'react';
import type { ZipPouchInputs } from '../generators/zip-pouch/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';

const STORAGE_KEY = 'stitchsmith.zip-pouch.project';

function isValidZipPouchProject(value: unknown): value is ZipPouchProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 5 && v.generatorId === 'zip-pouch' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<ZipPouchProject>({ key: STORAGE_KEY, isValid: isValidZipPouchProject });
export const _resetZipPouchStorage = storage._reset;

export interface ZipPouchProject {
  schemaVersion: 5;
  generatorId: 'zip-pouch';
  projectName: string;
  inputs: ZipPouchInputs;
  createdAt: string;
  updatedAt: string;
}

export function makeDefaultZipPouchProject(): ZipPouchProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 5,
    generatorId: 'zip-pouch',
    projectName: 'My Zip Pouch',
    inputs: {
      preset: 'pencil',
      units: 'mm',
      seam_allowance: 10,
      zip_gauge: '#3',
      grosgrain_width: 15.875,
      pull_loops: true,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: ZipPouchProject): ZipPouchProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseZipPouchProjectReturn = {
  project: ZipPouchProject;
  setProject: (p: ZipPouchProject) => void;
  updateInputs: (changes: Partial<ZipPouchInputs>) => void;
  resetProject: () => void;
  importProject: (p: ZipPouchProject) => void;
};

export function useZipPouchProject(): UseZipPouchProjectReturn {
  const [project, setProjectState] = useState<ZipPouchProject>(() => storage.load() ?? makeDefaultZipPouchProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: ZipPouchProject) => {
    setProjectState(p);
  }, []);

  const updateInputs = useCallback((changes: Partial<ZipPouchInputs>) => {
    setProjectState(prev =>
      touch({ ...prev, inputs: { ...prev.inputs, ...changes } }),
    );
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultZipPouchProject());
  }, []);

  const importProject = useCallback((p: ZipPouchProject) => {
    if (p.generatorId !== 'zip-pouch') {
      throw new Error(`Cannot import project with generatorId '${p.generatorId}' into Zip Pouch`);
    }
    setProjectState(p);
  }, []);

  return {
    project,
    setProject,
    updateInputs,
    resetProject,
    importProject,
  };
}
