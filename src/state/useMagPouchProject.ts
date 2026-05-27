import { useState, useCallback } from 'react';
import type { MagPouchInputs, RetentionStyle, AttachmentStyle, DrainageStyle, SeamAllowance } from '../generators/mag-pouch/types.js';
import {
  DEFAULT_EASE_WIDTH_IN,
  DEFAULT_EASE_DEPTH_IN,
  DEFAULT_EXPOSED_PERCENTAGE,
  DEFAULT_SEAM_ALLOWANCE_IN,
  DEFAULT_HOOK_LENGTH_IN,
  DEFAULT_LOOP_LENGTH_IN,
  DEFAULT_CLOSURE_OVERLAP_IN,
  DEFAULT_GROMMET_SIZE,
} from '../generators/mag-pouch/defaults.js';

export interface MagPouchProject {
  schemaVersion: 3;
  generatorId: 'mag-pouch';
  projectName: string;
  inputs: MagPouchInputs;
  stylePresetName: undefined;
  createdAt: string;
  updatedAt: string;
}

export function makeDefaultMagPouchProject(): MagPouchProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 3,
    generatorId: 'mag-pouch',
    projectName: 'My Mag Pouch',
    stylePresetName: undefined,
    inputs: {
      magazine: {
        mode: 'predefined',
        presetId: 'ar15_30_round',
        units: 'in',
      },
      retention: 'flap_velcro' as RetentionStyle,
      attachment: 'pals' as AttachmentStyle,
      drainage: 'open_corner' as DrainageStyle,
      seamAllowance: DEFAULT_SEAM_ALLOWANCE_IN as SeamAllowance,
      ease_width: DEFAULT_EASE_WIDTH_IN,
      ease_depth: DEFAULT_EASE_DEPTH_IN,
      exposed_percentage: DEFAULT_EXPOSED_PERCENTAGE,
      hook_length: DEFAULT_HOOK_LENGTH_IN,
      loop_length: DEFAULT_LOOP_LENGTH_IN,
      closure_overlap: DEFAULT_CLOSURE_OVERLAP_IN,
      grommet_size: DEFAULT_GROMMET_SIZE,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: MagPouchProject): MagPouchProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseMagPouchProjectReturn = {
  project: MagPouchProject;
  setProject: (p: MagPouchProject) => void;
  updateInputs: (changes: Partial<MagPouchInputs>) => void;
  resetProject: () => void;
  importProject: (p: MagPouchProject) => void;
};

export function useMagPouchProject(): UseMagPouchProjectReturn {
  const [project, setProjectState] = useState<MagPouchProject>(makeDefaultMagPouchProject);

  const setProject = useCallback((p: MagPouchProject) => {
    setProjectState(p);
  }, []);

  const updateInputs = useCallback((changes: Partial<MagPouchInputs>) => {
    setProjectState(prev =>
      touch({ ...prev, inputs: { ...prev.inputs, ...changes } }),
    );
  }, []);

  const resetProject = useCallback(() => {
    setProjectState(makeDefaultMagPouchProject());
  }, []);

  const importProject = useCallback((p: MagPouchProject) => {
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
