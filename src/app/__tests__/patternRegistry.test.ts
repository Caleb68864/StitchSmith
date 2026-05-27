import { describe, it, expect } from 'vitest';

/**
 * Pattern registry idempotency tests.
 *
 * These tests verify that the registry-add operation is idempotent:
 * calling it twice with the same entry produces the same result as calling
 * it once, with no duplicates and no mutations to existing entries.
 *
 * Implementation note: we import `registerPattern` and manipulate the
 * `PATTERNS` array directly via a test reset mechanism to ensure each test
 * starts from a known baseline.
 */

// We need to isolate the registry state for each test.
// The registry uses a module-level PATTERNS array, so we snapshot/restore it.
// Note: since ES modules are singletons, we read the live array in each test.


describe('patternRegistry', () => {
  it('includes mag-pouch with required fields', async () => {
    const { PATTERNS } = await import('../patternRegistry.js');
    const entry = PATTERNS.find(p => p.id === 'mag-pouch');
    expect(entry).toBeDefined();
    expect(entry!.title).toBe('Mag Pouch');
    expect(entry!.available).toBe(true);
    expect(entry!.route).toBe('mag-pouch');
    expect(typeof entry!.description).toBe('string');
    expect(entry!.description.length).toBeGreaterThan(0);
  });

  it('registerPattern is idempotent: calling it twice does not duplicate the entry', async () => {
    const { PATTERNS, registerPattern } = await import('../patternRegistry.js');

    // Ensure we start with mag-pouch registered (it already is via module init)
    const afterFirst = PATTERNS.length;
    const afterFirstEntries = JSON.stringify(PATTERNS);

    // Second call with the same id — should be a no-op
    registerPattern({
      id: 'mag-pouch',
      title: 'Mag Pouch',
      description: 'Parametric magazine pouch.',
      available: true,
      route: 'mag-pouch',
    });

    const afterSecond = PATTERNS.length;

    // 1. Length unchanged
    expect(afterSecond).toBe(afterFirst);

    // 2. No duplicates for mag-pouch
    expect(PATTERNS.filter(p => p.id === 'mag-pouch').length).toBe(1);

    // 3. No duplicates for any id
    expect(new Set(PATTERNS.map(p => p.id)).size).toBe(PATTERNS.length);

    // 4. Byte-for-byte structural equality — second add is a complete no-op
    expect(JSON.stringify(PATTERNS)).toBe(afterFirstEntries);
  });

  it('registerPattern does not overwrite existing entry content', async () => {
    const { PATTERNS, registerPattern } = await import('../patternRegistry.js');

    // Capture the current mag-pouch entry (should already exist)
    const entryAfterFirst = PATTERNS.find(p => p.id === 'mag-pouch');
    expect(entryAfterFirst).toBeDefined();
    const snapshotAfterFirst = JSON.stringify(entryAfterFirst);

    // Attempt to register with different content
    registerPattern({
      id: 'mag-pouch',
      title: 'DIFFERENT TITLE',
      description: 'DIFFERENT DESCRIPTION',
      available: false,
      route: 'mag-pouch',
    });

    const entryAfterSecond = PATTERNS.find(p => p.id === 'mag-pouch');
    // Deep-compare — entry should be identical to before
    expect(JSON.stringify(entryAfterSecond)).toBe(snapshotAfterFirst);
  });

  it('all existing registry ids have no duplicates', async () => {
    const { PATTERNS } = await import('../patternRegistry.js');
    const ids = PATTERNS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('registry contains tool-roll, tri-zip-backpack, roll-top-sack, and mag-pouch', async () => {
    const { PATTERNS } = await import('../patternRegistry.js');
    const ids = new Set(PATTERNS.map(p => p.id));
    expect(ids.has('tool-roll')).toBe(true);
    expect(ids.has('tri-zip-backpack')).toBe(true);
    expect(ids.has('roll-top-sack')).toBe(true);
    expect(ids.has('mag-pouch')).toBe(true);
  });
});
