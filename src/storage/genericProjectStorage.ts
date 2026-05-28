// Generic localStorage helper for project state across every generator.
//
// Each generator state hook calls makeProjectStorage<T>(...) once to get back a
// { load, save, clear, isAvailable } trio it can wire into useState init +
// useEffect. The implementation is debounced (250 ms) and tolerant of:
//   - localStorage being unavailable (private mode, denied permission)
//   - JSON parse failures
//   - quota errors mid-session (subsequent writes silently fall back to memory)
//
// Convention: storage keys are `stitchsmith.<generator-id>.project`.

export interface ProjectStorage<T> {
  /** Returns the parsed project or null if missing/invalid. */
  load: () => T | null;
  /** Schedules a debounced write; returns immediately. */
  save: (value: T) => void;
  /** Removes the entry. */
  clear: () => void;
  /** Probes localStorage on first call; result is cached. */
  isAvailable: () => boolean;
  /** Test helper — resets in-memory state. Do not call in production code. */
  _reset: () => void;
}

const DEBOUNCE_MS = 250;

function probeStorage(): boolean {
  try {
    const k = '__stitchsmith_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export interface MakeProjectStorageOpts<T> {
  /** Storage key. By convention `stitchsmith.<generator-id>.project`. */
  key: string;
  /**
   * Validates parsed JSON before returning. Returns true if shape is accepted.
   * Reject cross-generator data and out-of-version projects here.
   */
  isValid: (value: unknown) => value is T;
  /**
   * Optional migrator that runs after isValid passes — useful for filling in
   * fields added since the project was saved.
   */
  migrate?: (project: T) => T;
}

export function makeProjectStorage<T>(opts: MakeProjectStorageOpts<T>): ProjectStorage<T> {
  let memCache: T | null = null;
  let writeFailed = false;
  let warnedOnce = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let available: boolean | null = null;

  function isAvailable(): boolean {
    if (writeFailed) return false;
    if (available === null) available = probeStorage();
    return available;
  }

  function load(): T | null {
    if (writeFailed) return memCache;
    if (!isAvailable()) return memCache;
    try {
      const raw = localStorage.getItem(opts.key);
      if (raw == null) return null;
      const parsed = JSON.parse(raw);
      if (!opts.isValid(parsed)) return null;
      return opts.migrate ? opts.migrate(parsed) : parsed;
    } catch {
      return null;
    }
  }

  function save(value: T): void {
    memCache = value;
    if (writeFailed) return;
    if (!isAvailable()) return;
    if (timer != null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      try {
        localStorage.setItem(opts.key, JSON.stringify(value));
      } catch (err) {
        writeFailed = true;
        if (!warnedOnce) {
          warnedOnce = true;
          console.warn(`[stitchsmith] Saving ${opts.key} failed; subsequent changes will be kept only in memory.`, err);
        }
      }
    }, DEBOUNCE_MS);
  }

  function clear(): void {
    memCache = null;
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
    if (!isAvailable()) return;
    try {
      localStorage.removeItem(opts.key);
    } catch {
      // ignore
    }
  }

  function _reset(): void {
    memCache = null;
    writeFailed = false;
    warnedOnce = false;
    available = null;
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return { load, save, clear, isAvailable, _reset };
}
