import { useState, useCallback, useEffect } from 'react';
import type { PaddedStrapInputs } from '../generators/padded-strap/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';
import { assertGeneratorMatch } from '../export/projectEnvelopeIO.js';

export const STORAGE_KEY = 'stitchsmith.padded-strap.project';

export interface PaddedStrapProject {
  schemaVersion: 7;
  generatorId: 'padded-strap';
  projectName: string;
  inputs: PaddedStrapInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidPaddedStrapProject(value: unknown): value is PaddedStrapProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 7 && v.generatorId === 'padded-strap' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<PaddedStrapProject>({ key: STORAGE_KEY, isValid: isValidPaddedStrapProject });
export const _resetPaddedStrapStorage = storage._reset;

export function makeDefaultPaddedStrapProject(): PaddedStrapProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 7,
    generatorId: 'padded-strap',
    projectName: 'My Padded Straps',
    inputs: {
      units: 'in',
      mode: 'pack_pair',
      pad_length: 16,
      pad_width: 2.5,
      torso_length: 20,
      gusset_depth: 6,
      foam_thickness: 8,
      curve: 'j_curve',
      architecture: 'foam_sandwich_mesh',
      edge_finish: 'bound',
      webbing_width: 25,
      hardware: 'ladderlock',
      seam_allowance: 10,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: PaddedStrapProject): PaddedStrapProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UsePaddedStrapProjectReturn = {
  project: PaddedStrapProject;
  setProject: (p: PaddedStrapProject) => void;
  updateInputs: (changes: Partial<PaddedStrapInputs>) => void;
  resetProject: () => void;
  importProject: (p: PaddedStrapProject) => void;
};

export function usePaddedStrapProject(): UsePaddedStrapProjectReturn {
  const [project, setProjectState] = useState<PaddedStrapProject>(() => storage.load() ?? makeDefaultPaddedStrapProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: PaddedStrapProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<PaddedStrapInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultPaddedStrapProject());
  }, []);

  const importProject = useCallback((p: PaddedStrapProject) => {
    assertGeneratorMatch(p.generatorId, 'padded-strap');
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
