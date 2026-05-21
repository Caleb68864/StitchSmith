import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToolRollProject } from './useToolRollProject.js';
import { _resetStorageModule, STORAGE_KEY } from '../storage/localStorage.js';
import type { ToolRollProject } from '../generators/tool-roll/types.js';
import { sampleTools, defaultToolRollSettings } from '../generators/tool-roll/defaults.js';

let store: Record<string, string> = {};

function seedStorage(value: unknown): void {
  store[STORAGE_KEY] = JSON.stringify(value);
}

function makeValidProject(overrides: Partial<ToolRollProject> = {}): ToolRollProject {
  return {
    schemaVersion: 1,
    projectName: 'Persisted',
    generatorId: 'tool-roll',
    units: 'mm',
    settings: { ...defaultToolRollSettings },
    tools: [...sampleTools],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  store = {};
  _resetStorageModule();
  vi.useFakeTimers();

  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  _resetStorageModule();
});

describe('useToolRollProject', () => {
  describe('initial load', () => {
    it('loads a persisted project from localStorage', () => {
      seedStorage(makeValidProject({ projectName: 'From Storage' }));

      const { result } = renderHook(() => useToolRollProject());
      expect(result.current.project.projectName).toBe('From Storage');
    });

    it('falls back to starter project when storage is empty', () => {
      const { result } = renderHook(() => useToolRollProject());
      expect(result.current.project.schemaVersion).toBe(1);
      expect(result.current.project.tools.length).toBeGreaterThan(0);
    });

    it('falls back to starter project when localStorage contains corrupted JSON', () => {
      store[STORAGE_KEY] = '{ not valid json }}}';

      const { result } = renderHook(() => useToolRollProject());
      // Should fall back to sample tools
      expect(result.current.project.tools.length).toBeGreaterThan(0);
      expect(result.current.project.schemaVersion).toBe(1);
    });

    it('falls back to starter project when schema is missing (schemaVersion absent)', () => {
      store[STORAGE_KEY] = JSON.stringify({ projectName: 'No schema' });

      const { result } = renderHook(() => useToolRollProject());
      expect(result.current.project.tools.length).toBeGreaterThan(0);
    });
  });

  describe('return shape', () => {
    it('returns all required API members', () => {
      const { result } = renderHook(() => useToolRollProject());
      const keys: Array<keyof ReturnType<typeof useToolRollProject>> = [
        'project',
        'setProject',
        'addTool',
        'updateTool',
        'duplicateTool',
        'deleteTool',
        'moveToolUp',
        'moveToolDown',
        'updateSettings',
        'resetProject',
        'importProject',
      ];
      for (const key of keys) {
        expect(result.current).toHaveProperty(key);
      }
    });
  });

  describe('addTool', () => {
    it('appends a new tool with a generated id', () => {
      const { result } = renderHook(() => useToolRollProject());
      const initial = result.current.project.tools.length;

      act(() => {
        result.current.addTool({
          name: 'Hammer',
          width: 30,
          thickness: 5,
          height: 200,
          visibleAmount: 60,
        });
      });

      expect(result.current.project.tools.length).toBe(initial + 1);
      const added = result.current.project.tools.at(-1)!;
      expect(added.name).toBe('Hammer');
      expect(added.id).toBeTruthy();
    });
  });

  describe('updateTool', () => {
    it('updates a tool by id', () => {
      seedStorage(makeValidProject());
      const { result } = renderHook(() => useToolRollProject());
      const firstId = result.current.project.tools[0].id;

      act(() => {
        result.current.updateTool(firstId, { name: 'Updated Tool' });
      });

      const updated = result.current.project.tools.find(t => t.id === firstId);
      expect(updated?.name).toBe('Updated Tool');
    });

    it('does not affect other tools', () => {
      seedStorage(makeValidProject());
      const { result } = renderHook(() => useToolRollProject());
      const [first, second] = result.current.project.tools;

      act(() => {
        result.current.updateTool(first.id, { name: 'Changed' });
      });

      const secondAfter = result.current.project.tools.find(t => t.id === second.id);
      expect(secondAfter?.name).toBe(second.name);
    });
  });

  describe('duplicateTool', () => {
    it('inserts a copy after the original', () => {
      seedStorage(makeValidProject());
      const { result } = renderHook(() => useToolRollProject());
      const original = result.current.project.tools[0];
      const initialCount = result.current.project.tools.length;

      act(() => {
        result.current.duplicateTool(original.id);
      });

      expect(result.current.project.tools.length).toBe(initialCount + 1);
      const copy = result.current.project.tools[1];
      expect(copy.id).not.toBe(original.id);
      expect(copy.name).toContain(original.name);
    });
  });

  describe('deleteTool', () => {
    it('removes the tool with the given id', () => {
      seedStorage(makeValidProject());
      const { result } = renderHook(() => useToolRollProject());
      const idToDelete = result.current.project.tools[0].id;
      const before = result.current.project.tools.length;

      act(() => {
        result.current.deleteTool(idToDelete);
      });

      expect(result.current.project.tools.length).toBe(before - 1);
      expect(result.current.project.tools.find(t => t.id === idToDelete)).toBeUndefined();
    });
  });

  describe('moveToolUp / moveToolDown', () => {
    it('moves a tool up by swapping with its predecessor', () => {
      seedStorage(makeValidProject());
      const { result } = renderHook(() => useToolRollProject());
      const [a, b] = result.current.project.tools;

      act(() => {
        result.current.moveToolUp(b.id);
      });

      expect(result.current.project.tools[0].id).toBe(b.id);
      expect(result.current.project.tools[1].id).toBe(a.id);
    });

    it('does not move first tool up', () => {
      seedStorage(makeValidProject());
      const { result } = renderHook(() => useToolRollProject());
      const firstId = result.current.project.tools[0].id;
      const originalOrder = result.current.project.tools.map(t => t.id);

      act(() => {
        result.current.moveToolUp(firstId);
      });

      expect(result.current.project.tools.map(t => t.id)).toEqual(originalOrder);
    });

    it('moves a tool down by swapping with its successor', () => {
      seedStorage(makeValidProject());
      const { result } = renderHook(() => useToolRollProject());
      const [a, b] = result.current.project.tools;

      act(() => {
        result.current.moveToolDown(a.id);
      });

      expect(result.current.project.tools[0].id).toBe(b.id);
      expect(result.current.project.tools[1].id).toBe(a.id);
    });
  });

  describe('updateSettings', () => {
    it('merges partial settings changes', () => {
      const { result } = renderHook(() => useToolRollProject());
      const originalSortMode = result.current.project.settings.sortMode;

      act(() => {
        result.current.updateSettings({ sortMode: 'widthAscending' });
      });

      expect(result.current.project.settings.sortMode).toBe('widthAscending');
      // Other settings untouched
      expect(result.current.project.settings.seamAllowance).toBe(
        defaultToolRollSettings.seamAllowance,
      );
      expect(originalSortMode).toBeDefined();
    });
  });

  describe('resetProject', () => {
    it('resets to the starter project', () => {
      seedStorage(makeValidProject({ projectName: 'Custom' }));
      const { result } = renderHook(() => useToolRollProject());

      act(() => {
        result.current.resetProject();
      });

      expect(result.current.project.projectName).toBe('My Tool Roll');
    });
  });

  describe('importProject', () => {
    it('replaces the current project', () => {
      const { result } = renderHook(() => useToolRollProject());
      const imported = makeValidProject({ projectName: 'Imported', tools: [] });

      act(() => {
        result.current.importProject(imported);
      });

      expect(result.current.project.projectName).toBe('Imported');
      expect(result.current.project.tools).toHaveLength(0);
    });
  });

  describe('storage unavailable warning', () => {
    it('returns null storageWarning when localStorage works', () => {
      const { result } = renderHook(() => useToolRollProject());
      expect(result.current.storageWarning).toBeNull();
    });

    it('returns a warning PatternWarning when localStorage is unavailable', () => {
      _resetStorageModule();
      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          getItem: () => { throw new Error('disabled'); },
          setItem: () => { throw new Error('disabled'); },
          removeItem: () => {},
        },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useToolRollProject());
      expect(result.current.storageWarning).not.toBeNull();
      expect(result.current.storageWarning?.severity).toBe('warning');
      expect(result.current.storageWarning?.message).toContain("Session won't persist");
    });
  });
});
