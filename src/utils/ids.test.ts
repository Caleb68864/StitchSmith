import { describe, it, expect } from 'vitest';
import { generateId } from './ids.js';

describe('generateId', () => {
  it('produces unique non-empty strings', () => {
    const a = generateId('tool');
    const b = generateId('tool');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^tool-/);
  });

  it('uses default prefix when none provided', () => {
    const id = generateId();
    expect(id).toMatch(/^id-/);
    expect(id.length).toBeGreaterThan(3);
  });

  it('generates non-empty string', () => {
    const id = generateId('pocket');
    expect(id).toBeTruthy();
    expect(id.length).toBeGreaterThan(0);
  });
});
