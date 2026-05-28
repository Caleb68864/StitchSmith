import { describe, it, expect } from 'vitest';
import { buildPattern } from '../buildPattern.js';
import { patternToSvg } from '../../../lib/pattern-engine/exports/svg.js';
import type { BookCoverInputs } from '../types.js';

// Full-loaded config with lining and all internal features enabled.
// Produces ≥ 10 pieces and ≥ 15 BOM rows (materials + hardware + notes).
const FULL_LINING: BookCoverInputs = {
  book_height: 200,
  book_width: 150,
  spine_width: 25,
  flap_depth: 70,
  units: 'mm',
  lining: { enabled: true, interfacing: 'fusible' },
  card_slots: { count: 3 },
  bookmark_ribbon: { count: 1 },
  internal_zip_pocket: {},
  mesh_pocket: { elastic_top: true },
  tactical: { enabled: true, retention_strap: true, spare_mag_pocket: true },
  outer_pocket: { width: 80, height: 100 },
  inner_pocket: { width: 60, height: 80 },
  pen_holder: { count: 3, slot_width: 20 },
  closure: { kind: 'flap-buckle', strap_width: 25.4, buckle_size: 25.4 },
};

// Full-loaded config WITHOUT lining — exercises the non-lining step path.
// With outer_pocket + inner_pocket + pen_holder + snap closure → ≥ 9 steps.
const FULL_NO_LINING: BookCoverInputs = {
  book_height: 200,
  book_width: 150,
  spine_width: 25,
  flap_depth: 70,
  units: 'mm',
  outer_pocket: { width: 80, height: 100 },
  inner_pocket: { width: 60, height: 80 },
  pen_holder: { count: 3, slot_width: 20 },
  closure: { kind: 'snap', count: 2 },
};

describe('end-to-end — piece count with fully-loaded lining config', () => {
  it('returns ok: true for full lining config', () => {
    const result = buildPattern(FULL_LINING);
    expect(result.ok).toBe(true);
  });

  it('full lining config returns ≥ 10 pieces', () => {
    const result = buildPattern(FULL_LINING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces.length).toBeGreaterThanOrEqual(10);
  });

  it('full lining config includes all expected piece ids', () => {
    const result = buildPattern(FULL_LINING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.pieces.map(p => p.id);
    expect(ids).toContain('cover-panel');
    expect(ids).toContain('inner-flap-left');
    expect(ids).toContain('inner-flap-right');
    expect(ids).toContain('lining');
    expect(ids).toContain('card-slot-stack');
    expect(ids).toContain('bookmark-ribbon');
    expect(ids).toContain('internal-zip-pocket');
    expect(ids).toContain('mesh-pocket');
    expect(ids).toContain('velcro-panel');
    expect(ids).toContain('retention-strap');
    expect(ids).toContain('spare-mag-pocket');
  });
});

describe('end-to-end — BOM row count with fully-loaded lining config', () => {
  it('full lining config BOM has ≥ 15 total rows (materials + hardware + notes)', () => {
    const result = buildPattern(FULL_LINING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { bom } = result.value;
    const totalRows = bom.materials.length + bom.hardware.length + bom.notes.length;
    expect(totalRows).toBeGreaterThanOrEqual(15);
  });

  it('full lining config BOM includes lining interfacing material', () => {
    const result = buildPattern(FULL_LINING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const mat = result.value.bom.materials.find(m => m.id === 'lining-interfacing');
    expect(mat).toBeDefined();
  });

  it('full lining config BOM includes tactical velcro hardware', () => {
    const result = buildPattern(FULL_LINING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const hw = result.value.bom.hardware.find(h => h.id === 'tactical-velcro-loop');
    expect(hw).toBeDefined();
  });
});

describe('end-to-end — step count with fully-loaded non-lining config', () => {
  it('full non-lining config returns ok: true', () => {
    const result = buildPattern(FULL_NO_LINING);
    expect(result.ok).toBe(true);
  });

  it('full non-lining config returns ≥ 9 steps', () => {
    const result = buildPattern(FULL_NO_LINING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.steps.length).toBeGreaterThanOrEqual(9);
  });
});

describe('end-to-end — SVG render safety', () => {
  it('patternToSvg(full lining config) does not throw', () => {
    const result = buildPattern(FULL_LINING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pattern = {
      id: 'book-cover-full-lining',
      name: 'Book Cover (Full Lining)',
      pieces: result.value.pieces,
    };
    expect(() => patternToSvg(pattern)).not.toThrow();
  });

  it('patternToSvg(full lining config) output includes <svg', () => {
    const result = buildPattern(FULL_LINING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pattern = {
      id: 'book-cover-full-lining',
      name: 'Book Cover (Full Lining)',
      pieces: result.value.pieces,
    };
    const svg = patternToSvg(pattern);
    expect(svg).toContain('<svg');
  });

  it('patternToSvg(full non-lining config) does not throw', () => {
    const result = buildPattern(FULL_NO_LINING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pattern = {
      id: 'book-cover-full-no-lining',
      name: 'Book Cover (Full, No Lining)',
      pieces: result.value.pieces,
    };
    expect(() => patternToSvg(pattern)).not.toThrow();
    expect(patternToSvg(pattern)).toContain('<svg');
  });
});

describe('end-to-end — edge case: lining disabled with internal features is rejected', () => {
  it('card_slots without lining is rejected by validateInputs', () => {
    const result = buildPattern({
      book_height: 200,
      book_width: 150,
      spine_width: 25,
      flap_depth: 70,
      units: 'mm',
      lining: { enabled: false },
      card_slots: { count: 2 },
    });
    expect(result.ok).toBe(false);
  });

  it('internal_zip_pocket without lining is rejected', () => {
    const result = buildPattern({
      book_height: 200,
      book_width: 150,
      spine_width: 25,
      flap_depth: 70,
      units: 'mm',
      internal_zip_pocket: {},
    });
    expect(result.ok).toBe(false);
  });
});

describe('end-to-end — mesh pocket elastic_top: false omits fold line', () => {
  it('mesh_pocket with elastic_top: false has no fold-role path', () => {
    const result = buildPattern({
      book_height: 200,
      book_width: 150,
      spine_width: 25,
      flap_depth: 70,
      units: 'mm',
      lining: { enabled: true },
      mesh_pocket: { elastic_top: false },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const mesh = result.value.pieces.find(p => p.id === 'mesh-pocket');
    expect(mesh).toBeDefined();
    const foldPaths = mesh!.paths.filter(p => p.edges.some(e => e.role === 'fold'));
    expect(foldPaths).toHaveLength(0);
  });

  it('mesh_pocket with elastic_top: true has a fold-role path', () => {
    const result = buildPattern({
      book_height: 200,
      book_width: 150,
      spine_width: 25,
      flap_depth: 70,
      units: 'mm',
      lining: { enabled: true },
      mesh_pocket: { elastic_top: true },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const mesh = result.value.pieces.find(p => p.id === 'mesh-pocket');
    expect(mesh).toBeDefined();
    const foldPaths = mesh!.paths.filter(p => p.edges.some(e => e.role === 'fold'));
    expect(foldPaths).toHaveLength(1);
  });
});
