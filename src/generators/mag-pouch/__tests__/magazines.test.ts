/**
 * magazines.test.ts
 * Verifies the predefined magazine table structure and dimension values.
 */

import { describe, it, expect } from 'vitest';
import { magazines, getMagazine, MAGAZINE_IDS, PLATFORM_LABELS } from '../magazines.js';

const EXPECTED_IDS = [
  'ar15_30_round',
  'ar15_20_round',
  'pmag_gen2',
  'pmag_gen3',
  'lancer_l5',
  'm4_stanag',
  'pmag_308_20',
  'ak47_762x39_30round',
] as const;

describe('magazines', () => {
  it('exports exactly eight magazine entries', () => {
    expect(Object.keys(magazines)).toHaveLength(8);
  });

  it('contains exactly the expected IDs', () => {
    const ids = Object.keys(magazines).sort();
    expect(ids).toEqual([...EXPECTED_IDS].sort());
  });

  it('exports MAGAZINE_IDS matching the magazine table keys', () => {
    expect([...MAGAZINE_IDS].sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it.each(EXPECTED_IDS)('%s — has required fields', (id) => {
    const entry = magazines[id];
    expect(entry).toBeDefined();
    expect(typeof entry.id).toBe('string');
    expect(typeof entry.description).toBe('string');
    expect(typeof entry.width).toBe('number');
    expect(typeof entry.thickness).toBe('number');
    expect(typeof entry.height).toBe('number');
    expect(PLATFORM_LABELS[entry.platform]).toBeTruthy();
  });

  it.each(EXPECTED_IDS)('%s — id field matches key', (id) => {
    expect(magazines[id].id).toBe(id);
  });

  it.each(EXPECTED_IDS)('%s — description is non-empty', (id) => {
    expect(magazines[id].description.length).toBeGreaterThan(0);
  });

  // ── Dimension values per spec §2.3 ──────────────────────────────────────────

  it('ar15_30_round: 2.55 × 1.0 × 7.5 (inches), 5.56 platform', () => {
    const m = magazines['ar15_30_round'];
    expect(m.width).toBe(2.55);
    expect(m.thickness).toBe(1.0);
    expect(m.height).toBe(7.5);
    expect(m.platform).toBe('rifle_556');
  });

  it('ar15_20_round: 2.55 × 1.0 × 5.5 (inches)', () => {
    const m = magazines['ar15_20_round'];
    expect(m.width).toBe(2.55);
    expect(m.thickness).toBe(1.0);
    expect(m.height).toBe(5.5);
  });

  it('pmag_gen3: 2.6 × 1.05 × 7.5 (inches)', () => {
    const m = magazines['pmag_gen3'];
    expect(m.width).toBe(2.6);
    expect(m.thickness).toBe(1.05);
    expect(m.height).toBe(7.5);
  });

  // ── Vault-sourced platforms ────────────────────────────────────────────────

  it('pmag_308_20: 2.9 × 1.1 × 5.75 — the stacked-rig .308 test case', () => {
    const m = magazines['pmag_308_20'];
    expect(m.width).toBe(2.9);
    expect(m.thickness).toBe(1.1);
    expect(m.height).toBe(5.75);
    expect(m.platform).toBe('rifle_308');
  });

  it('ak47_762x39_30round: 2.5 × 1.1 × 9.5, AK platform', () => {
    const m = magazines['ak47_762x39_30round'];
    expect(m.width).toBe(2.5);
    expect(m.thickness).toBe(1.1);
    expect(m.height).toBe(9.5);
    expect(m.platform).toBe('ak');
  });

  it('every 5.56 preset is under the AK thresholds', () => {
    for (const id of MAGAZINE_IDS) {
      const m = magazines[id];
      if (m.platform === 'rifle_556') {
        expect(m.height).toBeLessThan(8.5);
      }
    }
  });

  it('getMagazine returns undefined for an unknown id', () => {
    expect(getMagazine('nope')).toBeUndefined();
    expect(getMagazine('ar15_30_round')?.id).toBe('ar15_30_round');
  });
});
