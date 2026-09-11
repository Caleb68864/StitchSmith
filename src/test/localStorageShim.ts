// TEST-ONLY environment shim — delete when the toolchain moves.
//
// WHY THIS EXISTS
// ---------------
// On Node v26.x, `globalThis.localStorage` is defined as a built-in getter that
// returns `undefined` unless the process was started with `--localstorage-file`.
// Crucially the *property* exists, so `'localStorage' in globalThis` is `true`.
//
// vitest's jsdom environment populates the test global by copying jsdom window
// keys, but its `getWindowKeys` step deliberately skips any key that is already
// present on the global, and `localStorage` is not in its allowlist. So jsdom's
// perfectly good `localStorage` is never installed, and because vitest then
// aliases `window` to that same global, `window.localStorage` is `undefined`
// too. Every call site then fails with:
//
//     TypeError: Cannot read properties of undefined (reading 'getItem')
//
// jsdom itself is fine — probed directly on this machine: `typeof
// dom.window.localStorage === 'object'` with a working setItem/getItem
// round-trip. The fault is purely in vitest's global-population step, which is
// why the fix belongs here and not in application code.
//
// Confirmed environmental rather than a bug in either library: the identical
// symptom appears on two unrelated codebases on this machine across different
// major versions of both tools (vitest 2 + jsdom 25 here; vitest 3 + jsdom 26
// elsewhere).
//
// WHEN TO DELETE THIS FILE
// ------------------------
// Node made it necessary at v26.8.1 (2026-09). Remove this file and the
// `setupFiles` entry in `vite.config.ts` once either:
//   - Node stops shadowing `localStorage` with an undefined-returning getter, or
//   - vitest adds `localStorage` to the window keys it copies into the global.
// The guard below makes it self-cancelling: on a fixed environment it installs
// nothing, so deleting it is a no-op and the suite will say so.
//
// WHAT IT DELIBERATELY DOES *NOT* DO
// ----------------------------------
// It does not stub out storage failures, and it does not run when a working
// `localStorage` is already present. It installs a real, spec-shaped Storage
// only when the global is genuinely broken — the same thing a browser would
// have provided. Application code that legitimately handles storage being
// absent (see `src/storage/genericProjectStorage.ts`, which probes with a
// try/catch and falls back to an in-memory cache with a toast) is therefore
// still exercised honestly: the tests that cover that path install their own
// throwing mock via `Object.defineProperty`, and this shim is defined as
// `writable`/`configurable` precisely so they can keep doing that.

/** Minimal spec-shaped Storage: string coercion, `null` for missing keys. */
class MemoryStorage implements Storage {
  // Storage's index signature. Not used by app code, which goes through the
  // methods, but required for the interface to be satisfied.
  [name: string]: unknown;

  #map = new Map<string, string>();

  get length(): number {
    return this.#map.size;
  }

  key(index: number): string | null {
    return [...this.#map.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    // The real API coerces the key and returns null (not undefined) when absent.
    return this.#map.has(String(key)) ? this.#map.get(String(key))! : null;
  }

  setItem(key: string, value: string): void {
    this.#map.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.#map.delete(String(key));
  }

  clear(): void {
    this.#map.clear();
  }
}

/**
 * True when the global `localStorage` is usable. Mirrors what application code
 * does: try a real write rather than trusting the property's presence, because
 * on Node 26 the property exists and yields `undefined`.
 */
function hasWorkingLocalStorage(): boolean {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (!ls) return false;
    const probeKey = '__stitchsmith_shim_probe__';
    ls.setItem(probeKey, '1');
    const ok = ls.getItem(probeKey) === '1';
    ls.removeItem(probeKey);
    return ok;
  } catch {
    return false;
  }
}

if (!hasWorkingLocalStorage()) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    // Both flags matter: the storage-unavailable tests replace this with a
    // throwing mock and must be able to.
    writable: true,
    configurable: true,
  });
}

export {};
