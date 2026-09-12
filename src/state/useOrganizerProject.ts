import { useState, useCallback, useEffect } from 'react';
import type { OrganizerInputs } from '../generators/organizer/types.js';
import { makeProjectStorage } from '../storage/genericProjectStorage.js';
import { isPlainObject } from '../utils/isPlainObject.js';
import { assertGeneratorMatch } from '../export/projectEnvelopeIO.js';

export const STORAGE_KEY = 'stitchsmith.organizer.project';

export interface OrganizerProject {
  schemaVersion: 10;
  generatorId: 'organizer';
  projectName: string;
  inputs: OrganizerInputs;
  createdAt: string;
  updatedAt: string;
}

function isValidOrganizerProject(value: unknown): value is OrganizerProject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 10 && v.generatorId === 'organizer' && isPlainObject(v.inputs);
}

const storage = makeProjectStorage<OrganizerProject>({ key: STORAGE_KEY, isValid: isValidOrganizerProject });
export const _resetOrganizerStorage = storage._reset;

export function makeDefaultOrganizerProject(): OrganizerProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 10,
    generatorId: 'organizer',
    projectName: 'My Organizer',
    inputs: {
      units: 'in',
      pouch_width: 5,
      pocket_height: 5,
      body_hem: 1,
      panel_hem: 0.25,
      side_seam_allowance: 0.25,
      side_fold: 1,
      panel_extra_width: 1.25,
      slot_widths: [1.25, 1.25],
      velcro_strip_count: 2,
      velcro_strip_width: 1.5,
      velcro_gap: 0.5,
      contents_height: 5,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: OrganizerProject): OrganizerProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseOrganizerProjectReturn = {
  project: OrganizerProject;
  setProject: (p: OrganizerProject) => void;
  updateInputs: (changes: Partial<OrganizerInputs>) => void;
  resetProject: () => void;
  importProject: (p: OrganizerProject) => void;
};

export function useOrganizerProject(): UseOrganizerProjectReturn {
  const [project, setProjectState] = useState<OrganizerProject>(() => storage.load() ?? makeDefaultOrganizerProject());

  useEffect(() => { storage.save(project); }, [project]);

  const setProject = useCallback((p: OrganizerProject) => { setProjectState(p); }, []);

  const updateInputs = useCallback((changes: Partial<OrganizerInputs>) => {
    setProjectState(prev => touch({ ...prev, inputs: { ...prev.inputs, ...changes } }));
  }, []);

  const resetProject = useCallback(() => {
    storage.clear();
    setProjectState(makeDefaultOrganizerProject());
  }, []);

  const importProject = useCallback((p: OrganizerProject) => {
    assertGeneratorMatch(p.generatorId, 'organizer');
    setProjectState(p);
  }, []);

  return { project, setProject, updateInputs, resetProject, importProject };
}
