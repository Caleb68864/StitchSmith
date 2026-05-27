// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const engineRoot = path.resolve(__dirname, '..');

function walkTs(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTs(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

function findOffendingImports(filePath: string, patterns: string[]): string[] {
  const src = fs.readFileSync(filePath, 'utf-8');
  const offenses: string[] = [];
  for (const line of src.split('\n')) {
    for (const pat of patterns) {
      if (line.includes('from') && line.includes(pat)) {
        offenses.push(`${filePath}: ${line.trim()}`);
      }
    }
  }
  return offenses;
}

describe('pouch-engine boundary enforcement', () => {
  it('has no imports pointing to src/generators/', () => {
    const files = walkTs(engineRoot);
    const offenses: string[] = [];
    for (const f of files) {
      offenses.push(...findOffendingImports(f, ['src/generators']));
    }
    expect(offenses, `Boundary violations:\n${offenses.join('\n')}`).toHaveLength(0);
  });

  it('has no imports pointing to src/components/', () => {
    const files = walkTs(engineRoot);
    const offenses: string[] = [];
    for (const f of files) {
      offenses.push(...findOffendingImports(f, ['src/components']));
    }
    expect(offenses, `Boundary violations:\n${offenses.join('\n')}`).toHaveLength(0);
  });
});
