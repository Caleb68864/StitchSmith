import { useState, useCallback } from 'react';
import type { BookCoverInputs, PocketConfig, PenHolderConfig } from '../generators/book-cover/types.js';
import { DEFAULT_SEAM_ALLOWANCE_MM, DEFAULT_TOP_BOTTOM_HEM_MM, DEFAULT_PEN_HOLDER_HEIGHT_MM } from '../generators/book-cover/defaults.js';

export interface BookCoverProjectInputs extends BookCoverInputs {
  top_bottom_hem?: number;
}

export interface BookCoverProject {
  schemaVersion: 4;
  generatorId: 'book-cover';
  projectName: string;
  inputs: BookCoverProjectInputs;
  createdAt: string;
  updatedAt: string;
}

export function makeDefaultBookCoverProject(): BookCoverProject {
  const now = new Date().toISOString();
  // Seed with the Moleskine Classic Large preset — recognizable, hardcover,
  // realistic spine and flap, so the preview is meaningful on first load.
  return {
    schemaVersion: 4,
    generatorId: 'book-cover',
    projectName: 'My Book Cover',
    inputs: {
      book_preset: 'moleskine-classic-large',
      book_height: 210,
      book_width: 130,
      spine_width: 18,
      flap_depth: 65,
      seam_allowance: DEFAULT_SEAM_ALLOWANCE_MM,
      top_bottom_hem: DEFAULT_TOP_BOTTOM_HEM_MM,
      units: 'mm',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: BookCoverProject): BookCoverProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseBookCoverProjectReturn = {
  project: BookCoverProject;
  setProject: (p: BookCoverProject) => void;
  updateInputs: (changes: Partial<BookCoverProjectInputs>) => void;
  resetProject: () => void;
  importProject: (p: BookCoverProject) => void;
  toggleOuterPocket: (enabled: boolean) => void;
  toggleInnerPocket: (enabled: boolean) => void;
  togglePenHolder: (enabled: boolean) => void;
};

const DEFAULT_OUTER_POCKET: PocketConfig = { width: 120, height: 100, position: 'front' };
const DEFAULT_INNER_POCKET: PocketConfig = { width: 120, height: 80, position: 'back' };
const DEFAULT_PEN_HOLDER: PenHolderConfig = { count: 3, slot_width: 15, height: DEFAULT_PEN_HOLDER_HEIGHT_MM };

export function useBookCoverProject(): UseBookCoverProjectReturn {
  const [project, setProjectState] = useState<BookCoverProject>(makeDefaultBookCoverProject);

  const setProject = useCallback((p: BookCoverProject) => {
    setProjectState(p);
  }, []);

  const updateInputs = useCallback((changes: Partial<BookCoverProjectInputs>) => {
    setProjectState(prev =>
      touch({ ...prev, inputs: { ...prev.inputs, ...changes } }),
    );
  }, []);

  const resetProject = useCallback(() => {
    setProjectState(makeDefaultBookCoverProject());
  }, []);

  const importProject = useCallback((p: BookCoverProject) => {
    if (p.generatorId !== 'book-cover') {
      throw new Error(`Cannot import project with generatorId '${p.generatorId}' into Book Cover`);
    }
    setProjectState(p);
  }, []);

  const toggleOuterPocket = useCallback((enabled: boolean) => {
    setProjectState(prev =>
      touch({ ...prev, inputs: { ...prev.inputs, outer_pocket: enabled ? DEFAULT_OUTER_POCKET : undefined } }),
    );
  }, []);

  const toggleInnerPocket = useCallback((enabled: boolean) => {
    setProjectState(prev =>
      touch({ ...prev, inputs: { ...prev.inputs, inner_pocket: enabled ? DEFAULT_INNER_POCKET : undefined } }),
    );
  }, []);

  const togglePenHolder = useCallback((enabled: boolean) => {
    setProjectState(prev =>
      touch({ ...prev, inputs: { ...prev.inputs, pen_holder: enabled ? DEFAULT_PEN_HOLDER : undefined } }),
    );
  }, []);

  return {
    project,
    setProject,
    updateInputs,
    resetProject,
    importProject,
    toggleOuterPocket,
    toggleInnerPocket,
    togglePenHolder,
  };
}
