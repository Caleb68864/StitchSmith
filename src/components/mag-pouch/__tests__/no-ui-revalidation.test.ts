import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

/**
 * M13 — No UI Re-validation Contract Test
 *
 * UI components must NOT duplicate engine validation logic.
 * Forbidden patterns in src/components/mag-pouch/ (UI files only):
 *   - `deriveErrors(` — a helper that re-implements validation
 *   - `function deriveErrors` — same as above
 *
 * Per-field errors in MagPouchPage must come directly from
 * `validateInputs(inputs).errors`, not from a custom derive step.
 */

// Resolve to src/components/mag-pouch/ (one level up from __tests__)
const MAG_POUCH_UI_DIR = resolve(import.meta.dirname, '../');

function getAllUiFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'node_modules') continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getAllUiFiles(fullPath));
    } else if (
      stat.isFile() &&
      (entry.endsWith('.tsx') || entry.endsWith('.ts')) &&
      !entry.endsWith('.test.tsx') &&
      !entry.endsWith('.test.ts')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /deriveErrors\s*\(/,
    description: 'deriveErrors() helper found — UI must not re-implement validation',
  },
  {
    pattern: /function\s+deriveErrors/,
    description: 'deriveErrors function definition found — must not exist in UI',
  },
];

describe('no-ui-revalidation (M13)', () => {
  const uiFiles = getAllUiFiles(MAG_POUCH_UI_DIR);

  it('found mag-pouch UI files to check', () => {
    expect(uiFiles.length).toBeGreaterThan(0);
  });

  for (const forbidden of FORBIDDEN_PATTERNS) {
    it(`no mag-pouch UI file contains forbidden pattern: ${forbidden.description}`, () => {
      const offenders: string[] = [];
      for (const file of uiFiles) {
        const content = readFileSync(file, 'utf-8');
        if (forbidden.pattern.test(content)) {
          offenders.push(file);
        }
      }
      if (offenders.length > 0) {
        throw new Error(
          `${forbidden.description}\nOffending files:\n${offenders.map(f => `  - ${f}`).join('\n')}`,
        );
      }
      expect(offenders.length).toBe(0);
    });
  }

  it('MagPouchPage.tsx imports validateInputs from the engine (not a custom validator)', () => {
    const pageFile = join(MAG_POUCH_UI_DIR, 'MagPouchPage.tsx');
    const content = readFileSync(pageFile, 'utf-8');
    // Must import validateInputs from the generator
    expect(content).toContain('validateInputs');
    // Must NOT define its own validate function
    expect(content).not.toMatch(/function\s+validate[A-Z]/);
  });
});
