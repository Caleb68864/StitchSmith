import { describe, it, expect } from 'vitest';
import { resolveInputs } from '../inputs.js';
import { buildBom } from '../bom.js';
import type { BookCoverInputs } from '../types.js';

const BASE: BookCoverInputs = {
  units: 'mm',
  book_height: 210,
  book_width: 148,
  spine_width: 15,
  flap_depth: 65,
};

describe('buildBom — lining interfacing row', () => {
  it('emits a fusible interfacing material row when lining is enabled', () => {
    const r = resolveInputs({ ...BASE, lining: { enabled: true, interfacing: 'fusible' } });
    const bom = buildBom(r);
    const row = bom.materials.find(m => m.id === 'lining-interfacing');
    expect(row).toBeDefined();
    expect(row!.name).toMatch(/interfacing/i);
  });

  it('emits a sew-in interfacing row for sew-in kind', () => {
    const r = resolveInputs({ ...BASE, lining: { enabled: true, interfacing: 'sew-in' } });
    const bom = buildBom(r);
    const row = bom.materials.find(m => m.id === 'lining-interfacing');
    expect(row).toBeDefined();
    expect(row!.name).toMatch(/sew-in/i);
  });

  it('does not emit interfacing row when lining is disabled', () => {
    const r = resolveInputs({ ...BASE, lining: { enabled: false } });
    const bom = buildBom(r);
    const row = bom.materials.find(m => m.id === 'lining-interfacing');
    expect(row).toBeUndefined();
  });

  it('does not emit interfacing row when interfacing kind is none', () => {
    const r = resolveInputs({ ...BASE, lining: { enabled: true, interfacing: 'none' } });
    const bom = buildBom(r);
    const row = bom.materials.find(m => m.id === 'lining-interfacing');
    expect(row).toBeUndefined();
  });
});

describe('buildBom — grosgrain ribbon row', () => {
  it('emits a grosgrain ribbon hardware row when bookmark_ribbon is set', () => {
    // book_height=254.8 → ribbon length = 254.8+50 = 304.8; width_mm=9.525
    const r = resolveInputs({
      ...BASE,
      book_height: 254.8,
      lining: { enabled: true },
      bookmark_ribbon: { count: 1, width_mm: 9.525 },
    });
    const bom = buildBom(r);
    const row = bom.hardware.find(h => h.id === 'bookmark-ribbon');
    expect(row).toBeDefined();
    expect(row!.name).toMatch(/grosgrain ribbon/i);
    expect(row!.notes).toMatch(/30[45]/);
    expect(row!.sizeMm).toBeCloseTo(9.525, 2);
  });

  it('ribbon row quantity matches bookmark_ribbon count', () => {
    const r = resolveInputs({ ...BASE, lining: { enabled: true }, bookmark_ribbon: { count: 3, width_mm: 9.5 } });
    const bom = buildBom(r);
    const row = bom.hardware.find(h => h.id === 'bookmark-ribbon');
    expect(row!.quantity).toBe(3);
  });

  it('no ribbon row when bookmark_ribbon is absent', () => {
    const r = resolveInputs({ ...BASE, lining: { enabled: true } });
    const bom = buildBom(r);
    const row = bom.hardware.find(h => h.id === 'bookmark-ribbon');
    expect(row).toBeUndefined();
  });
});

describe('buildBom — internal zip pocket zipper row', () => {
  it('emits a zipper hardware row for internal zip pocket', () => {
    const r = resolveInputs({ ...BASE, lining: { enabled: true }, internal_zip_pocket: { gauge: '#5' } });
    const bom = buildBom(r);
    const row = bom.hardware.find(h => h.id === 'internal-zip-pocket-zipper');
    expect(row).toBeDefined();
    expect(row!.type).toBe('zipper');
  });
});

describe('buildBom — mesh pocket row', () => {
  it('emits a mesh material row when mesh_pocket is set', () => {
    const r = resolveInputs({ ...BASE, lining: { enabled: true }, mesh_pocket: {} });
    const bom = buildBom(r);
    const row = bom.materials.find(m => m.id === 'mesh-pocket-fabric');
    expect(row).toBeDefined();
    expect(row!.name).toMatch(/mesh/i);
  });

  it('emits elastic row when mesh_pocket has elastic_top', () => {
    const r = resolveInputs({ ...BASE, lining: { enabled: true }, mesh_pocket: { elastic_top: true } });
    const bom = buildBom(r);
    const row = bom.hardware.find(h => h.id === 'mesh-pocket-elastic');
    expect(row).toBeDefined();
    expect(row!.type).toBe('other');
  });

  it('no elastic row when mesh_pocket has no elastic_top', () => {
    const r = resolveInputs({ ...BASE, lining: { enabled: true }, mesh_pocket: { elastic_top: false } });
    const bom = buildBom(r);
    const row = bom.hardware.find(h => h.id === 'mesh-pocket-elastic');
    expect(row).toBeUndefined();
  });
});

describe('buildBom — tactical hardware rows', () => {
  it('emits a loop Velcro row when tactical is enabled', () => {
    const r = resolveInputs({ ...BASE, tactical: { enabled: true } });
    const bom = buildBom(r);
    const row = bom.hardware.find(h => h.id === 'tactical-velcro-loop');
    expect(row).toBeDefined();
    expect(row!.name).toMatch(/velcro/i);
  });

  it('emits webbing AND hook tab rows when retention_strap is true', () => {
    const r = resolveInputs({ ...BASE, tactical: { enabled: true, retention_strap: true } });
    const bom = buildBom(r);
    const webbing = bom.hardware.find(h => h.id === 'retention-strap-webbing');
    const hookTab = bom.hardware.find(h => h.id === 'retention-strap-hook-tab');
    expect(webbing).toBeDefined();
    expect(webbing!.name).toMatch(/webbing/i);
    expect(hookTab).toBeDefined();
    expect(hookTab!.name).toMatch(/hook tab/i);
  });

  it('no webbing or hook tab when retention_strap is false', () => {
    const r = resolveInputs({ ...BASE, tactical: { enabled: true, retention_strap: false } });
    const bom = buildBom(r);
    const webbing = bom.hardware.find(h => h.id === 'retention-strap-webbing');
    const hookTab = bom.hardware.find(h => h.id === 'retention-strap-hook-tab');
    expect(webbing).toBeUndefined();
    expect(hookTab).toBeUndefined();
  });
});
