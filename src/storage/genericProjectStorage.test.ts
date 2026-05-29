import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { subscribe } from '../lib/toast/toast.js';
import { makeProjectStorage } from './genericProjectStorage.js';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

type SimpleProject = { version: number; name: string };

function isSimpleProject(v: unknown): v is SimpleProject {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as SimpleProject).version === 'number' &&
    typeof (v as SimpleProject).name === 'string'
  );
}

function makeStorage() {
  const s = makeProjectStorage<SimpleProject>({
    key: 'stitchsmith.test.project',
    isValid: isSimpleProject,
  });
  // Always _reset so module-level state from prior tests doesn't bleed through.
  s._reset();
  return s;
}

function captureToasts() {
  const received: string[] = [];
  const unsub = subscribe(msg => received.push(msg.title));
  return { received, unsub };
}

// --------------------------------------------------------------------------
// P28 — Confirm toast does NOT fire in jsdom (localStorage available)
// --------------------------------------------------------------------------

describe('genericProjectStorage — no stray toasts in jsdom', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
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

  it('probe does not toast when localStorage is available', () => {
    const { received, unsub } = captureToasts();
    const s = makeStorage();

    s.isAvailable(); // triggers the probe

    unsub();
    expect(received).toHaveLength(0);
  });

  it('load does not toast when localStorage is available and empty', () => {
    const { received, unsub } = captureToasts();
    const s = makeStorage();

    s.load();

    unsub();
    expect(received).toHaveLength(0);
  });

  it('save + immediate read does not toast', () => {
    vi.useFakeTimers();
    const { received, unsub } = captureToasts();
    const s = makeStorage();

    s.save({ version: 1, name: 'hello' });
    vi.advanceTimersByTime(300);

    unsub();
    vi.useRealTimers();
    expect(received).toHaveLength(0);
  });
});

// --------------------------------------------------------------------------
// P26 — Toast fires on storage unavailable / write failure paths
// --------------------------------------------------------------------------

function brokenStorage() {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: () => { throw new Error('unavailable'); },
      setItem: () => { throw new Error('unavailable'); },
      removeItem: () => {},
    },
    writable: true,
    configurable: true,
  });
}

function workingStorage() {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    },
    writable: true,
    configurable: true,
  });
}

describe('genericProjectStorage — probe-failure toast', () => {
  afterEach(() => {
    vi.useRealTimers();
    workingStorage();
  });

  it('fires a warning toast when localStorage is unavailable at probe time', () => {
    brokenStorage();
    const { received, unsub } = captureToasts();
    const s = makeStorage();

    s.isAvailable();

    unsub();
    expect(received).toHaveLength(1);
    expect(received[0]).toMatch(/unavailable/i);
  });

  it('probe toast fires only once even if isAvailable is called repeatedly', () => {
    brokenStorage();
    const { received, unsub } = captureToasts();
    const s = makeStorage();

    s.isAvailable();
    s.isAvailable();
    s.isAvailable();

    unsub();
    expect(received).toHaveLength(1);
  });

  it('probe toast fires only once even if load() is called (which calls isAvailable internally)', () => {
    brokenStorage();
    const { received, unsub } = captureToasts();
    const s = makeStorage();

    s.load();
    s.load();

    unsub();
    expect(received).toHaveLength(1);
  });
});

describe('genericProjectStorage — write-failure toast', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    workingStorage();
  });

  it('fires a warning toast when a debounced write fails', () => {
    vi.useFakeTimers();

    // Probe succeeds, but setItem fails on real writes
    let probeCount = 0;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: (_k: string, _v: string) => {
          probeCount += 1;
          if (probeCount > 1) throw new Error('quota exceeded');
          // first call is the probe — let it succeed
        },
        removeItem: () => {},
      },
      writable: true,
      configurable: true,
    });

    const { received, unsub } = captureToasts();
    const s = makeStorage();
    s.isAvailable(); // triggers probe (probeCount = 1, succeeds)

    s.save({ version: 1, name: 'test' });
    vi.advanceTimersByTime(300); // debounce fires — setItem throws (probeCount = 2)

    unsub();
    vi.useRealTimers();
    expect(received).toHaveLength(1);
    expect(received[0]).toMatch(/couldn't save|storage/i);
  });

  it('write-failure toast fires only once across multiple failed saves', () => {
    vi.useFakeTimers();

    let probeCount = 0;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {
          probeCount += 1;
          if (probeCount > 1) throw new Error('quota');
        },
        removeItem: () => {},
      },
      writable: true,
      configurable: true,
    });

    const { received, unsub } = captureToasts();
    const s = makeStorage();
    s.isAvailable();

    s.save({ version: 1, name: 'A' });
    vi.advanceTimersByTime(300); // first write fails → toast

    s.save({ version: 1, name: 'B' });
    vi.advanceTimersByTime(300); // writeFailed=true → skipped entirely

    unsub();
    vi.useRealTimers();
    expect(received).toHaveLength(1);
  });

  it('after write failure, load() returns the last in-memory value', () => {
    vi.useFakeTimers();

    let probeCount = 0;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {
          probeCount += 1;
          if (probeCount > 1) throw new Error('quota');
        },
        removeItem: () => {},
      },
      writable: true,
      configurable: true,
    });

    const s = makeStorage();
    s.isAvailable();

    const project = { version: 1, name: 'cached' };
    s.save(project);
    vi.advanceTimersByTime(300); // write fails; memCache is set

    vi.useRealTimers();
    const loaded = s.load();
    expect(loaded).toMatchObject({ name: 'cached' });
  });
});

describe('genericProjectStorage — migrate option', () => {
  afterEach(() => {
    workingStorage();
  });

  it('applies migrate() to a loaded valid project', () => {
    const store: Record<string, string> = {
      'stitchsmith.test.project': JSON.stringify({ version: 1, name: 'old' }),
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
      },
      writable: true,
      configurable: true,
    });

    const s = makeProjectStorage<SimpleProject>({
      key: 'stitchsmith.test.project',
      isValid: isSimpleProject,
      migrate: p => ({ ...p, name: p.name + '-migrated' }),
    });
    s._reset();

    const loaded = s.load();
    expect(loaded?.name).toBe('old-migrated');
  });

  it('returns null for data that fails isValid', () => {
    const store: Record<string, string> = {
      'stitchsmith.test.project': JSON.stringify({ wrong: 'shape' }),
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
      },
      writable: true,
      configurable: true,
    });

    const s = makeStorage();
    expect(s.load()).toBeNull();
  });
});
