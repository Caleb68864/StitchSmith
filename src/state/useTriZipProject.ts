import { useState, useCallback } from 'react';
import type { TriZipInputs, PresetName } from '../generators/tri-zip-backpack/types.js';

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
  const [project, setProjectState] = useState<TriZipProject>(makeDefaultTriZipProject);

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
    setProjectState(makeDefaultTriZipProject());
  }, []);

  const importProject = useCallback((p: TriZipProject) => {
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
