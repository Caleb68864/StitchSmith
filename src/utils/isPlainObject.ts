/**
 * True for a non-null, non-array object.
 *
 * `typeof null === 'object'` and `typeof [] === 'object'`, so a bare
 * `typeof v === 'object'` check accepts both. That matters for the project
 * `isValid` guards: hand-edited or corrupt localStorage containing
 * `"inputs": null` passed the guard, was restored by the hook's useState
 * initializer, and then threw on the first property access. The project hooks
 * run in `App` above `<ErrorBoundary>`, so the boundary cannot catch it, and
 * the bad value is re-read on every reload — a blank page that survives
 * refresh. `parseProjectJson` already guarded this on the import path; this is
 * the same check for the storage-load path.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
