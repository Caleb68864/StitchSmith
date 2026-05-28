import { useState, useCallback, useEffect } from 'react';
import type { RollTopSackInputs } from '../generators/roll-top-sack/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';

const STORAGE_KEY = 'stitchsmith.roll-top-sack.project';

function isValidRollTopSackProject(value: unknown): value is RollTopSackProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 1 && v.generatorId === 'roll-top-sack' && typeof v.inputs === 'object';
}

const storage = makeProjectStorage<RollTopSackProject>({ key: STORAGE_KEY, isValid: isValidRollTopSackProject });
export const _resetRollTopSackStorage = storage._reset;

export interface RollTopSackProject {
  schemaVersion: 1;
  generatorId: 'roll-top-sack';
  projectName: string;
  inputs: RollTopSackInputs;
  createdAt: string;
  updatedAt: string;
}

export function makeDefaultRollTopSackProject(): RollTopSackProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    generatorId: 'roll-top-sack',
    projectName: 'My Roll-Top Stuff Sack',
    inputs: {
      bottom_length: 200,
      bottom_width: 100,
      height_when_rolled: 300,
      collar_height: 120,
      units: 'mm',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: RollTopSackProject): RollTopSackProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseRollTopSackProjectReturn = {
  project: RollTopSackProject;
  setProject: (p: RollTopSackProject) => void;
  updateInputs: (changes: Partial<RollTopSackInputs>) => void;
  resetProject: () => void;
  importProject: (p: RollTopSackProject) => void;
};

export function useRollTopSackProject(): UseRollTopSackProjectReturn {
  const [project, setProjectState] = useState<RollTopSackProject>(() => storage.load() ?? makeDefaultRollTopSackProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: RollTopSackProject) => {
    setProjectState(p);
  }, []);

  const updateInputs = useCallback((changes: Partial<RollTopSackInputs>) => {
    setProjectState(prev =>
      touch({ ...prev, inputs: { ...prev.inputs, ...changes } }),
    );
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultRollTopSackProject());
  }, []);

  const importProject = useCallback((p: RollTopSackProject) => {
    if (p.generatorId !== 'roll-top-sack') {
      throw new Error(`Cannot import project with generatorId '${p.generatorId}' into Roll-Top Sack`);
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
