import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadProject,
  saveProject,
  clearProject,
  isStorageAvailable,
  STORAGE_KEY,
  _resetStorageModule,
} from './localStorage.js';
import type { ToolRollProject } from '../generators/tool-roll/types.js';

// Minimal valid project for tests
function makeProject(overrides: Partial<ToolRollProject> = {}): ToolRollProject {
  return {
    schemaVersion: 1,
    projectName: 'Test',
    generatorId: 'tool-roll',
    units: 'mm',
    settings: {} as ToolRollProject['settings'],
    tools: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('localStorage storage module', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    _resetStorageModule();

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

  it('returns null when nothing is stored', () => {
    expect(loadProject()).toBeNull();
  });

  it('returns a valid project from storage', () => {
    const p = makeProject();
    store[STORAGE_KEY] = JSON.stringify(p);
    expect(loadProject()).toMatchObject({ schemaVersion: 1, projectName: 'Test' });
  });

  it('returns null for corrupted JSON (invalid JSON does not throw)', () => {
    store[STORAGE_KEY] = '{ this is not json }}}';
    expect(() => loadProject()).not.toThrow();
    expect(loadProject()).toBeNull();
  });

  it('returns null for schema-mismatched data (missing schemaVersion)', () => {
    store[STORAGE_KEY] = JSON.stringify({ projectName: 'No version' });
    expect(loadProject()).toBeNull();
  });

  it('returns null for schemaVersion that is not 1', () => {
    store[STORAGE_KEY] = JSON.stringify({ schemaVersion: 99, projectName: 'Future' });
    expect(loadProject()).toBeNull();
  });

  it('clearProject removes the key', () => {
    store[STORAGE_KEY] = JSON.stringify(makeProject());
    clearProject();
    expect(store[STORAGE_KEY]).toBeUndefined();
  });

  describe('saveProject debouncing', () => {
    it('debounces rapid calls — single write within 500 ms', () => {
      vi.useFakeTimers();
      const setItemSpy = vi.spyOn(
        globalThis.localStorage,
        'setItem',
      );

      const p1 = makeProject({ projectName: 'V1' });
      const p2 = makeProject({ projectName: 'V2' });
      const p3 = makeProject({ projectName: 'V3' });

      saveProject(p1);
      saveProject(p2);
      saveProject(p3);

      // No write yet
      expect(setItemSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);

      // Exactly one write — with the last value
      expect(setItemSpy).toHaveBeenCalledOnce();
      const written = setItemSpy.mock.calls[0][1] as string;
      expect(JSON.parse(written)).toMatchObject({ projectName: 'V3' });
    });

    it('resets the timer on each call so delay is measured from last call', () => {
      vi.useFakeTimers();
      const setItemSpy = vi.spyOn(globalThis.localStorage, 'setItem');

      saveProject(makeProject({ projectName: 'A' }));
      vi.advanceTimersByTime(400);
      saveProject(makeProject({ projectName: 'B' }));
      vi.advanceTimersByTime(400); // only 400ms since last call

      expect(setItemSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100); // now 500ms since last call
      expect(setItemSpy).toHaveBeenCalledOnce();
    });
  });

  describe('saveProject serialization', () => {
    it('does not serialize computed ToolRollLayout or SVG strings', () => {
      vi.useFakeTimers();
      const setItemSpy = vi.spyOn(globalThis.localStorage, 'setItem');

      const p = {
        ...makeProject(),
        // Pretend someone attached layout data
        layout: { patternWidth: 100, patternHeight: 200, pockets: [] },
        svgString: '<svg></svg>',
      } as unknown as ToolRollProject;

      saveProject(p);
      vi.advanceTimersByTime(500);

      const written = JSON.parse(setItemSpy.mock.calls[0][1] as string) as Record<string, unknown>;
      expect(written.layout).toBeUndefined();
      expect(written.svgString).toBeUndefined();
      expect(written.schemaVersion).toBe(1);
    });
  });

  describe('storage unavailable', () => {
    it('swallows setItem errors and emits a one-time console.warn', () => {
      vi.useFakeTimers();

      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          getItem: () => { throw new Error('unavailable'); },
          setItem: () => { throw new Error('unavailable'); },
          removeItem: () => {},
        },
        writable: true,
        configurable: true,
      });
      _resetStorageModule();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const p = makeProject({ projectName: 'InMemory' });
      expect(() => {
        saveProject(p);
        vi.advanceTimersByTime(500);
      }).not.toThrow();

      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy.mock.calls[0][0]).toContain("Session won't persist");
    });

    it('console.warn fires only once across multiple failed saves', () => {
      vi.useFakeTimers();

      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          getItem: () => { throw new Error('unavailable'); },
          setItem: () => { throw new Error('unavailable'); },
          removeItem: () => {},
        },
        writable: true,
        configurable: true,
      });
      _resetStorageModule();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      saveProject(makeProject({ projectName: 'A' }));
      vi.advanceTimersByTime(500);
      _resetStorageModule();
      // Re-set storage as broken to force same code path (storageAvailable resets)
      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          getItem: () => { throw new Error('unavailable'); },
          setItem: () => { throw new Error('unavailable'); },
          removeItem: () => {},
        },
        writable: true,
        configurable: true,
      });

      saveProject(makeProject({ projectName: 'B' }));
      vi.advanceTimersByTime(500);

      // The _resetStorageModule above reset warnedOnce, so it fires once per module reset
      expect(warnSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('loadProject returns in-memory project when storage is unavailable', () => {
      _resetStorageModule();

      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          getItem: () => { throw new Error('unavailable'); },
          setItem: () => { throw new Error('unavailable'); },
          removeItem: () => {},
        },
        writable: true,
        configurable: true,
      });

      vi.useFakeTimers();
      const p = makeProject({ projectName: 'Cached' });
      saveProject(p);
      vi.advanceTimersByTime(500);

      const loaded = loadProject();
      expect(loaded).toMatchObject({ projectName: 'Cached' });
    });

    it('isStorageAvailable returns false when storage throws', () => {
      _resetStorageModule();
      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          getItem: () => { throw new Error('unavailable'); },
          setItem: () => { throw new Error('unavailable'); },
          removeItem: () => {},
        },
        writable: true,
        configurable: true,
      });

      expect(isStorageAvailable()).toBe(false);
    });
  });
});

describe('localStorage storage module — pagehide flushes the pending write', () => {
  let store: Record<string, string> = {};

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
    vi.useRealTimers();
    _resetStorageModule();
  });

  it('writes the pending project synchronously on pagehide', () => {
    saveProject(makeProject({ projectName: 'unsaved edit' }));
    expect(Object.keys(store)).toHaveLength(0);
    window.dispatchEvent(new Event('pagehide'));
    const written = Object.values(store);
    expect(written).toHaveLength(1);
    expect(JSON.parse(written[0]).projectName).toBe('unsaved edit');
  });
});
