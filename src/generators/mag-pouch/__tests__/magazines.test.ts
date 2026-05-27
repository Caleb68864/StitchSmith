/**
 * magazines.test.ts
 * Verifies the predefined magazine table structure and dimension values.
 */

import { describe, it, expect } from 'vitest';
import { magazines, getMagazine, MAGAZINE_IDS } from '../magazines.js';

const EXPECTED_IDS = [
  'ar15_30_round',
  'ar15_20_round',
  'pmag_gen2',
  'pmag_gen3',
  'lancer_l5',
  'm4_stanag',
] as const;

describe('magazines', () => {
  it('exports exactly six magazine entries', () => {
    expect(Object.keys(magazines)).toHaveLength(6);
  });

  it('contains exactly the six expected IDs', () => {
    const ids = Object.keys(magazines).sort();
    expect(ids).toEqual([...EXPECTED_IDS].sort());
  });

  it('exports MAGAZINE_IDS matching the magazine table keys', () => {
    expect(MAGAZINE_IDS.sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it.each(EXPECTED_IDS)('%s — has required fields', (id) => {
    const entry = magazines[id];
    expect(entry).toBeDefined();
    expect(typeof entry.id).toBe('string');
    expect(typeof entry.description).toBe('string');
    expect(typeof entry.width).toBe('number');
    expect(typeof entry.thickness).toBe('number');
    expect(typeof entry.height).toBe('number');
  });

  it.each(EXPECTED_IDS)('%s — id field matches key', (id) => {
    expect(magazines[id].id).toBe(id);
  });

  it.each(EXPECTED_IDS)('%s — description is non-empty', (id) => {
    expect(magazines[id].description.length).toBeGreaterThan(0);
  });

  // ── Dimension values per spec §2.3 ──────────────────────────────────────────

  it('ar15_30_round: 2.55 × 1.0 × 7.5 (inches)', () => {
    const m = magazines['ar15_30_round'];
    expect(m.width).toBe(2.55);
    expect(m.thickness).toBe(1.0);
    expect(m.height).toBe(7.5);
  });

  it('ar15_20_round: 2.55 × 1.0 × 5.5 (inches)', () => {
    const m = magazines['ar15_20_round'];
    expect(m.width).toBe(2.55);
    expect(m.thickness).toBe(1.0);
    expect(m.height).toBe(5.5);
  });

  it('pmag_gen2: 2.6 × 1.05 × 7.5 (inches)', () => {
    const m = magazines['pmag_gen2'];
    expect(m.width).toBe(2.6);
    expect(m.thickness).toBe(1.05);
    expect(m.height).toBe(7.5);
  });

  it('pmag_gen3: 2.6 × 1.05 × 7.5 (inches)', () => {
    const m = magazines['pmag_gen3'];
    expect(m.width).toBe(2.6);
    expect(m.thickness).toBe(1.05);
    expect(m.height).toBe(7.5);
  });

  it('lancer_l5: 2.55 × 1.05 × 7.5 (inches)', () => {
    const m = magazines['lancer_l5'];
    expect(m.width).toBe(2.55);
    expect(m.thickness).toBe(1.05);
    expect(m.height).toBe(7.5);
  });

  it('m4_stanag: 2.55 × 1.0 × 7.5 (inches)', () => {
    const m = magazines['m4_stanag'];
    expect(m.width).toBe(2.55);
    expect(m.thickness).toBe(1.0);
    expect(m.height).toBe(7.5);
  });

  // ── getMagazine helper ────────────────────────────────────────────────────

  it('getMagazine returns the entry for a known id', () => {
    const entry = getMagazine('ar15_30_round');
    expect(entry).toBeDefined();
    expect(entry!.id).toBe('ar15_30_round');
  });

  it('getMagazine returns undefined for an unknown id', () => {
    expect(getMagazine('ak47_made_up')).toBeUndefined();
  });
});
