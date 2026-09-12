import { useState, useCallback, useEffect } from 'react';
import type { PlateCarrierInputs } from '../generators/plate-carrier/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';

export const STORAGE_KEY = 'stitchsmith.plate-carrier.project';

export interface PlateCarrierProject {
  schemaVersion: 13;
  generatorId: 'plate-carrier';
  projectName: string;
  inputs: PlateCarrierInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidPlateCarrierProject(value: unknown): value is PlateCarrierProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 13 && v.generatorId === 'plate-carrier' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<PlateCarrierProject>({ key: STORAGE_KEY, isValid: isValidPlateCarrierProject });
export const _resetPlateCarrierStorage = storage._reset;

export function makeDefaultPlateCarrierProject(): PlateCarrierProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 13,
    generatorId: 'plate-carrier',
    projectName: 'My Plate Carrier',
    inputs: {
      units: 'in',
      plate_preset: '10x12',
      plate_cut: 'sapi',
      pocket_ease: 0.375,
      shell_oversize: 0.5,
      shell_material: '500d',
      edge_finish: 'bound',
      binding_width: 1,
      seam_allowance: 0.375,
      back_comfort: 'mesh',
      pocket_opening: 'top',
      pocket_flap_length: 3,
      front_field: 'loop',
      loop_field_width: 6,
      loop_field_height: 6,
      loop_field_y_offset: 1,
      back_field: 'pals_sewn',
      shoulder_style: 'padded',
      strap_width: 2,
      strap_adjust_range: 3,
      cummerbund_style: 'elastic',
      cummerbund_width: 4,
      cummerbund_overlap: 2,
      side_plate: 'none',
      qr_buckle: 'none',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: PlateCarrierProject): PlateCarrierProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UsePlateCarrierProjectReturn = {
  project: PlateCarrierProject;
  setProject: (p: PlateCarrierProject) => void;
  updateInputs: (changes: Partial<PlateCarrierInputs>) => void;
  resetProject: () => void;
  importProject: (p: PlateCarrierProject) => void;
};

export function usePlateCarrierProject(): UsePlateCarrierProjectReturn {
  const [project, setProjectState] = useState<PlateCarrierProject>(() => storage.load() ?? makeDefaultPlateCarrierProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: PlateCarrierProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<PlateCarrierInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultPlateCarrierProject());
  }, []);

  const importProject = useCallback((p: PlateCarrierProject) => {
    if (p.generatorId !== 'plate-carrier') {
      throw new Error(`Cannot import project with generatorId '${p.generatorId}' into organizer`);
    }
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
