import { describe, it, expect } from 'vitest';
import { buildBom } from '../bom.js';

const BASE_FULL = {
  preset: 'full' as const,
  waist_circumference: 711.2,
  skirt_length: 609.6,
  units: 'mm' as const,
  seam_allowance: 15,
  hem_allowance: 20,
};

describe('buildBom — row count', () => {
  it('full-circle zip closure returns at least 3 rows', () => {
    const rows = buildBom(BASE_FULL);
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it('elastic closure returns at least 3 rows', () => {
    const rows = buildBom({ ...BASE_FULL, closure: 'elastic', waistband_type: 'elastic-casing' });
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it('half-circle returns at least 3 rows', () => {
    const rows = buildBom({ ...BASE_FULL, preset: 'half' });
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });
});

describe('buildBom — row ids and structure', () => {
  it('all rows have non-empty id, description, unit, and quantity > 0', () => {
    const rows = buildBom(BASE_FULL);
    for (const row of rows) {
      expect(row.id.length).toBeGreaterThan(0);
      expect(row.description.length).toBeGreaterThan(0);
      expect(row.unit.length).toBeGreaterThan(0);
      expect(row.quantity).toBeGreaterThan(0);
    }
  });

  it('row ids are unique', () => {
    const rows = buildBom(BASE_FULL);
    const ids = rows.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains a main-fabric row', () => {
    const rows = buildBom(BASE_FULL);
    expect(rows.some(r => r.id === 'fabric-main')).toBe(true);
  });

  it('contains a waistband-fabric row', () => {
    const rows = buildBom(BASE_FULL);
    expect(rows.some(r => r.id === 'fabric-waistband')).toBe(true);
  });
});

describe('buildBom — closure-specific rows', () => {
  it('side-zip closure includes a zipper row', () => {
    const rows = buildBom({ ...BASE_FULL, closure: 'side-zip' });
    expect(rows.some(r => r.id === 'zipper')).toBe(true);
  });

  it('back-zip closure includes a zipper row', () => {
    const rows = buildBom({ ...BASE_FULL, closure: 'back-zip' });
    expect(rows.some(r => r.id === 'zipper')).toBe(true);
  });

  it('elastic closure includes an elastic row instead of a zipper row', () => {
    const rows = buildBom({ ...BASE_FULL, closure: 'elastic', waistband_type: 'elastic-casing' });
    expect(rows.some(r => r.id === 'elastic')).toBe(true);
    expect(rows.some(r => r.id === 'zipper')).toBe(false);
  });
});

describe('buildBom — fabric quantity scaling', () => {
  it('longer skirt requires more fabric than shorter skirt', () => {
    const shortRows = buildBom({ ...BASE_FULL, skirt_length: 300 });
    const longRows = buildBom({ ...BASE_FULL, skirt_length: 900 });
    const shortFabric = shortRows.find(r => r.id === 'fabric-main')!.quantity;
    const longFabric = longRows.find(r => r.id === 'fabric-main')!.quantity;
    expect(longFabric).toBeGreaterThan(shortFabric);
  });
});
