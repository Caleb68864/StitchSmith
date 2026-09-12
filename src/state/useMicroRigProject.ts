import { useState, useCallback, useEffect } from 'react';
import type { MicroRigInputs } from '../generators/micro-rig/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';
import { assertGeneratorMatch } from '../export/projectEnvelopeIO.js';

export const STORAGE_KEY = 'stitchsmith.micro-rig.project';

export interface MicroRigProject {
  schemaVersion: 8;
  generatorId: 'micro-rig';
  projectName: string;
  inputs: MicroRigInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidMicroRigProject(value: unknown): value is MicroRigProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 8 && v.generatorId === 'micro-rig' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<MicroRigProject>({ key: STORAGE_KEY, isValid: isValidMicroRigProject });
export const _resetMicroRigStorage = storage._reset;

export function makeDefaultMicroRigProject(): MicroRigProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 8,
    generatorId: 'micro-rig',
    projectName: 'My Micro Rig',
    inputs: {
      units: 'in',
      panel_width_preset: 'standard_13',
      // Panel width, cell span, face per cell and cell height follow the width preset
      // and the magazine, so they stay unset and the panel shows the resolved value.
      panel_height: 7,
      pocket_set: 'mag_cells',
      magazine_preset_id: 'ar15_30_round',
      cell_count: 2,
      utility_pocket: true,
      side_pals_columns: 1,
      bottom_loop_count: 2,
      split_front: false,
      suspension: 'webbing_straps',
      dangler_field: true,
      seam_allowance: 9.5,
      edge_margin: 0.25,
      gap_width: 1,
      buckle_setback: 1,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: MicroRigProject): MicroRigProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseMicroRigProjectReturn = {
  project: MicroRigProject;
  setProject: (p: MicroRigProject) => void;
  updateInputs: (changes: Partial<MicroRigInputs>) => void;
  resetProject: () => void;
  importProject: (p: MicroRigProject) => void;
};

export function useMicroRigProject(): UseMicroRigProjectReturn {
  const [project, setProjectState] = useState<MicroRigProject>(() => storage.load() ?? makeDefaultMicroRigProject());
  useEffect(() => { storage.save(project); }, [project]);
  const setProject = useCallback((p: MicroRigProject) => { setProjectState(p); }, []);
  const updateInputs = useCallback((changes: Partial<MicroRigInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);
  const resetProject = useCallback(() => { storage.clear(); setProjectState(makeDefaultMicroRigProject()); }, []);
  const importProject = useCallback((p: MicroRigProject) => {
    assertGeneratorMatch(p.generatorId, 'micro-rig');setProjectState(p);
  }, []);
  return { project, setProject, updateInputs, resetProject, importProject };
}
