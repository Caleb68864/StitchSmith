import { useState, useCallback, useEffect } from 'react';
import type { LbvInputs } from '../generators/lbv/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';

export const STORAGE_KEY = 'stitchsmith.lbv.project';

export interface LbvProject {
  schemaVersion: 14;
  generatorId: 'lbv';
  projectName: string;
  inputs: LbvInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidLbvProject(value: unknown): value is LbvProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 14 && v.generatorId === 'lbv' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<LbvProject>({ key: STORAGE_KEY, isValid: isValidLbvProject });
export const _resetLbvStorage = storage._reset;

export function makeDefaultLbvProject(): LbvProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 14,
    generatorId: 'lbv',
    projectName: 'My Modular LBV',
    inputs: {
      units: 'in',
      panel_width: 9,
      panel_height: 11,
      back_panel_width: 11,
      back_panel_height: 11,
      back_bellow: 0.75,
      foam_insert: true,
      row_width: 1.5,
      row_pitch: 2.5,
      front_cols: 4,
      back_cols: 4,
      vertical_mark: 4,
      vertical_strap_len: 24,
      tab_foldover: 1,
      drop_adjust: 12,
      pad_length: 10,
      pad_width: 2.5,
      pad_tab_foldover: 1.5,
      cross_piece_angle: 15,
      front_straps: 3,
      male_side: 'right',
      front_strap_positions: [1, 5, 9],
      adjust_per_location: 12,
      belt_width: 2,
      loops_per_panel: 2,
      hydration_webbing: 10,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: LbvProject): LbvProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseLbvProjectReturn = {
  project: LbvProject;
  setProject: (p: LbvProject) => void;
  updateInputs: (changes: Partial<LbvInputs>) => void;
  resetProject: () => void;
  importProject: (p: LbvProject) => void;
};

export function useLbvProject(): UseLbvProjectReturn {
  const [project, setProjectState] = useState<LbvProject>(() => storage.load() ?? makeDefaultLbvProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: LbvProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<LbvInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultLbvProject());
  }, []);

  const importProject = useCallback((p: LbvProject) => {
    if (p.generatorId !== 'lbv') {
      throw new Error(`Cannot import project with generatorId '${p.generatorId}' into organizer`);
    }
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
