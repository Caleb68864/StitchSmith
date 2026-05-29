import { useState, useCallback, useEffect } from 'react';
import type { CircleSkirtInputs } from '../generators/circle-skirt/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';

const STORAGE_KEY = 'stitchsmith.circle-skirt.project';

export interface CircleSkirtProject {
  schemaVersion: 6;
  generatorId: 'circle-skirt';
  projectName: string;
  inputs: CircleSkirtInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidCircleSkirtProject(value: unknown): value is CircleSkirtProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 6 && v.generatorId === 'circle-skirt' && typeof v.inputs === 'object';
}

const storage = makeProjectStorage<CircleSkirtProject>({ key: STORAGE_KEY, isValid: isValidCircleSkirtProject });
export const _resetCircleSkirtStorage = storage._reset;

export function makeDefaultCircleSkirtProject(): CircleSkirtProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 6,
    generatorId: 'circle-skirt',
    projectName: 'My Circle Skirt',
    inputs: {
      waist_circumference: 28,
      skirt_length: 24,
      units: 'in',
      preset: 'full',
      seam_allowance: 15,
      hem_allowance: 20,
      closure: 'side-zip',
      waistband_type: 'straight',
      band_height: 25,
      elastic_width: 25,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: CircleSkirtProject): CircleSkirtProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseCircleSkirtProjectReturn = {
  project: CircleSkirtProject;
  setProject: (p: CircleSkirtProject) => void;
  updateInputs: (changes: Partial<CircleSkirtInputs>) => void;
  resetProject: () => void;
  importProject: (p: CircleSkirtProject) => void;
};

export function useCircleSkirtProject(): UseCircleSkirtProjectReturn {
  const [project, setProjectState] = useState<CircleSkirtProject>(() => storage.load() ?? makeDefaultCircleSkirtProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: CircleSkirtProject) => {
    setProjectState(p);
  }, []);

  const updateInputs = useCallback((changes: Partial<CircleSkirtInputs>) => {
    setProjectState(prev =>
      touch({ ...prev, inputs: { ...prev.inputs, ...changes } }),
    );
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultCircleSkirtProject());
  }, []);

  const importProject = useCallback((p: CircleSkirtProject) => {
    if (p.generatorId !== 'circle-skirt') {
      throw new Error(`Cannot import project with generatorId '${p.generatorId}' into circle-skirt`);
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
