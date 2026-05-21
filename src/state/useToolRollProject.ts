import { useState, useEffect, useCallback, useRef } from 'react';
import type { ToolRollProject, ToolItem, ToolRollSettings, PatternWarning } from '../generators/tool-roll/types.js';
import { defaultToolRollSettings, sampleTools } from '../generators/tool-roll/defaults.js';
import {
  loadProject,
  saveProject,
  isStorageAvailable,
  _resetStorageModule as _resetStorage,
} from '../storage/localStorage.js';
import { generateId } from '../utils/ids.js';

export { _resetStorage };

function makeStarterProject(): ToolRollProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    projectName: 'My Tool Roll',
    generatorId: 'tool-roll',
    units: 'mm',
    settings: { ...defaultToolRollSettings },
    tools: sampleTools.map(t => ({ ...t })),
    createdAt: now,
    updatedAt: now,
  };
}

function touch(p: ToolRollProject): ToolRollProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

export type UseToolRollProjectReturn = {
  project: ToolRollProject;
  setProject: (p: ToolRollProject) => void;
  addTool: (tool: Omit<ToolItem, 'id'>) => void;
  updateTool: (id: string, changes: Partial<Omit<ToolItem, 'id'>>) => void;
  duplicateTool: (id: string) => void;
  deleteTool: (id: string) => void;
  moveToolUp: (id: string) => void;
  moveToolDown: (id: string) => void;
  updateSettings: (changes: Partial<ToolRollSettings>) => void;
  resetProject: () => void;
  importProject: (p: ToolRollProject) => void;
  storageWarning: PatternWarning | null;
};

export function useToolRollProject(): UseToolRollProjectReturn {
  const [project, setProjectState] = useState<ToolRollProject>(() => {
    const loaded = loadProject();
    return loaded ?? makeStarterProject();
  });

  const storageWarning: PatternWarning | null = isStorageAvailable()
    ? null
    : {
        id: 'storage-unavailable',
        severity: 'warning',
        message: "Session won't persist — browser storage disabled",
      };

  // Use a ref to always save the latest project without stale closure
  const projectRef = useRef(project);
  projectRef.current = project;

  const setProject = useCallback((p: ToolRollProject) => {
    setProjectState(p);
    saveProject(p);
  }, []);

  // Save whenever project state changes (covers internal mutations)
  useEffect(() => {
    saveProject(project);
  }, [project]);

  const addTool = useCallback((tool: Omit<ToolItem, 'id'>) => {
    const newTool: ToolItem = { ...tool, id: generateId('tool') };
    setProjectState(prev => touch({ ...prev, tools: [...prev.tools, newTool] }));
  }, []);

  const updateTool = useCallback((id: string, changes: Partial<Omit<ToolItem, 'id'>>) => {
    setProjectState(prev =>
      touch({
        ...prev,
        tools: prev.tools.map(t => (t.id === id ? { ...t, ...changes } : t)),
      }),
    );
  }, []);

  const duplicateTool = useCallback((id: string) => {
    setProjectState(prev => {
      const idx = prev.tools.findIndex(t => t.id === id);
      if (idx === -1) return prev;
      const original = prev.tools[idx];
      const copy: ToolItem = {
        ...original,
        id: generateId('tool'),
        name: `${original.name} (copy)`,
      };
      const tools = [...prev.tools];
      tools.splice(idx + 1, 0, copy);
      return touch({ ...prev, tools });
    });
  }, []);

  const deleteTool = useCallback((id: string) => {
    setProjectState(prev =>
      touch({ ...prev, tools: prev.tools.filter(t => t.id !== id) }),
    );
  }, []);

  const moveToolUp = useCallback((id: string) => {
    setProjectState(prev => {
      const idx = prev.tools.findIndex(t => t.id === id);
      if (idx <= 0) return prev;
      const tools = [...prev.tools];
      [tools[idx - 1], tools[idx]] = [tools[idx], tools[idx - 1]];
      return touch({ ...prev, tools });
    });
  }, []);

  const moveToolDown = useCallback((id: string) => {
    setProjectState(prev => {
      const idx = prev.tools.findIndex(t => t.id === id);
      if (idx === -1 || idx >= prev.tools.length - 1) return prev;
      const tools = [...prev.tools];
      [tools[idx], tools[idx + 1]] = [tools[idx + 1], tools[idx]];
      return touch({ ...prev, tools });
    });
  }, []);

  const updateSettings = useCallback((changes: Partial<ToolRollSettings>) => {
    setProjectState(prev =>
      touch({ ...prev, settings: { ...prev.settings, ...changes } }),
    );
  }, []);

  const resetProject = useCallback(() => {
    const starter = makeStarterProject();
    setProjectState(starter);
    saveProject(starter);
  }, []);

  const importProject = useCallback((p: ToolRollProject) => {
    setProjectState(p);
    saveProject(p);
  }, []);

  return {
    project,
    setProject,
    addTool,
    updateTool,
    duplicateTool,
    deleteTool,
    moveToolUp,
    moveToolDown,
    updateSettings,
    resetProject,
    importProject,
    storageWarning,
  };
}
