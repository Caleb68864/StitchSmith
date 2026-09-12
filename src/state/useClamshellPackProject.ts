import { useState, useCallback, useEffect } from 'react';
import type { ClamshellPackInputs } from '../generators/clamshell-pack/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';

export const STORAGE_KEY = 'stitchsmith.clamshell-pack.project';

export interface ClamshellPackProject {
  schemaVersion: 12;
  generatorId: 'clamshell-pack';
  projectName: string;
  inputs: ClamshellPackInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidClamshellPackProject(value: unknown): value is ClamshellPackProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 12 && v.generatorId === 'clamshell-pack' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<ClamshellPackProject>({ key: STORAGE_KEY, isValid: isValidClamshellPackProject });
export const _resetClamshellPackStorage = storage._reset;

export function makeDefaultClamshellPackProject(): ClamshellPackProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 12,
    generatorId: 'clamshell-pack',
    projectName: 'My Clamshell Pack',
    inputs: {
      units: 'in',
      pocket_grid: 'custom',
      width: 11,
      height: 16,
      depth: 6,
      lid_depth: 1.5,
      zipper_lip: 1,
      zipper_underwrap: 1.75,
      hoop_overcut: 0.5,
      seam_allowance: 0.5,
      fold_in: 0.5,
      zipper_clearance: 0,
      pals_style: 'sewn',
      pals_rows_side: 7,
      pals_rows_face: 5,
      pals_rows_bottom: 3,
      pals_cols_side: 3,
      edge_offset: 1,
      handle: true,
      handle_bow: 2,
      handle_fold_under: 2,
      compression_straps_per_side: 2,
      compression_extra: 6,
      interior_loop: true,
      loop_strip_width: 2,
      loop_gap: 0.5,
      strap_provision: 'tabs_and_stow',
      strap_tab_spacing: 4,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: ClamshellPackProject): ClamshellPackProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseClamshellPackProjectReturn = {
  project: ClamshellPackProject;
  setProject: (p: ClamshellPackProject) => void;
  updateInputs: (changes: Partial<ClamshellPackInputs>) => void;
  resetProject: () => void;
  importProject: (p: ClamshellPackProject) => void;
};

export function useClamshellPackProject(): UseClamshellPackProjectReturn {
  const [project, setProjectState] = useState<ClamshellPackProject>(() => storage.load() ?? makeDefaultClamshellPackProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: ClamshellPackProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<ClamshellPackInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultClamshellPackProject());
  }, []);

  const importProject = useCallback((p: ClamshellPackProject) => {
    if (p.generatorId !== 'clamshell-pack') {
      throw new Error(`Cannot import project with generatorId '${p.generatorId}' into organizer`);
    }
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
