import { describe, it, expect } from 'vitest';
import { validateInputs, resolveInputs } from '../inputs.js';
import { BOOK_PRESETS, FOLDOVER_PRESETS } from '../defaults.js';

const IN = 25.4;

describe('BOOK_PRESETS — catalog completeness', () => {
  it('exports at least 17 book presets', () => {
    expect(BOOK_PRESETS.length).toBeGreaterThanOrEqual(17);
  });

  it('all preset ids are unique', () => {
    const ids = BOOK_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('bible-compact has correct dimensions in mm', () => {
    const p = BOOK_PRESETS.find(p => p.id === 'bible-compact');
    expect(p).toBeDefined();
    expect(p!.book_height_mm).toBeCloseTo(6.5 * IN, 4);
    expect(p!.book_width_mm).toBeCloseTo(4.6 * IN, 4);
    expect(p!.spine_width_mm).toBeCloseTo(1.45 * IN, 4);
    expect(p!.is_hardcover).toBe(true);
  });

  it('moleskine-classic-pocket is hardcover', () => {
    const p = BOOK_PRESETS.find(p => p.id === 'moleskine-classic-pocket');
    expect(p).toBeDefined();
    expect(p!.is_hardcover).toBe(true);
  });

  it('moleskine-cahier-pocket is softcover', () => {
    const p = BOOK_PRESETS.find(p => p.id === 'moleskine-cahier-pocket');
    expect(p).toBeDefined();
    expect(p!.is_hardcover).toBe(false);
  });

  it('all presets have positive non-zero dimensions', () => {
    for (const p of BOOK_PRESETS) {
      expect(p.book_height_mm).toBeGreaterThan(0);
      expect(p.book_width_mm).toBeGreaterThan(0);
      expect(p.spine_width_mm).toBeGreaterThan(0);
      expect(p.flap_depth_mm).toBeGreaterThan(0);
    }
  });
});

describe('FOLDOVER_PRESETS — catalog', () => {
  it('exports tactical and civilian foldover presets', () => {
    const ids = FOLDOVER_PRESETS.map(p => p.id);
    expect(ids).toContain('tactical');
    expect(ids).toContain('civilian');
  });
});

describe('resolveInputs — preset dimension seeding', () => {
  it('resolves bible-compact dimensions from preset (in → mm)', () => {
    const r = resolveInputs({ book_preset: 'bible-compact', units: 'in' });
    expect(r.book_height).toBeCloseTo(6.5 * IN, 4);
    expect(r.book_width).toBeCloseTo(4.6 * IN, 4);
    expect(r.spine_width).toBeCloseTo(1.45 * IN, 4);
  });

  it('manual book_height overrides preset when both present', () => {
    const r = resolveInputs({ book_preset: 'bible-compact', book_height: 180, units: 'mm' });
    expect(r.book_height).toBe(180);
    expect(r.book_width).toBeCloseTo(4.6 * IN, 4);
  });

  it('manual spine_width overrides preset spine_width', () => {
    const r = resolveInputs({ book_preset: 'bible-compact', spine_width: 20, units: 'mm' });
    expect(r.spine_width).toBe(20);
  });

  it('resolves moleskine-classic-pocket from preset', () => {
    const r = resolveInputs({ book_preset: 'moleskine-classic-pocket', units: 'mm' });
    expect(r.book_height).toBe(140);
    expect(r.book_width).toBe(90);
    expect(r.spine_width).toBe(14);
  });
});

describe('resolveInputs — width_ease default formula', () => {
  it('spine_width 5mm → width_ease = max(6.35, 2.5) = 6.35', () => {
    const r = resolveInputs({ book_height: 200, book_width: 150, spine_width: 5, flap_depth: 70, units: 'mm' });
    expect(r.width_ease).toBeCloseTo(6.35, 5);
  });

  it('spine_width 20mm → width_ease = max(6.35, 10) = 10', () => {
    const r = resolveInputs({ book_height: 200, book_width: 150, spine_width: 20, flap_depth: 70, units: 'mm' });
    expect(r.width_ease).toBeCloseTo(10, 5);
  });

  it('spine_width 25mm → width_ease = max(6.35, 12.5) = 12.5', () => {
    const r = resolveInputs({ book_height: 200, book_width: 150, spine_width: 25, flap_depth: 70, units: 'mm' });
    expect(r.width_ease).toBeCloseTo(12.5, 5);
  });

  it('spine_width 80mm → width_ease = max(6.35, 40) = 40', () => {
    const r = resolveInputs({ book_height: 200, book_width: 150, spine_width: 80, flap_depth: 70, units: 'mm' });
    expect(r.width_ease).toBeCloseTo(40, 5);
  });

  it('manual width_ease overrides the formula', () => {
    const r = resolveInputs({ book_height: 200, book_width: 150, spine_width: 80, flap_depth: 70, units: 'mm', width_ease: 5 });
    expect(r.width_ease).toBe(5);
  });
});

describe('resolveInputs — spine_bulge default based on is_hardcover', () => {
  it('moleskine-classic-pocket (hardcover) → spine_bulge = 6.35 by default', () => {
    const r = resolveInputs({ book_preset: 'moleskine-classic-pocket', units: 'mm' });
    expect(r.spine_bulge).toBeCloseTo(6.35, 5);
  });

  it('moleskine-classic-pocket with manual spine_bulge: 3 → spine_bulge = 3', () => {
    const r = resolveInputs({ book_preset: 'moleskine-classic-pocket', spine_bulge: 3, units: 'mm' });
    expect(r.spine_bulge).toBe(3);
  });

  it('moleskine-cahier-pocket (softcover) → spine_bulge = 0 by default', () => {
    const r = resolveInputs({ book_preset: 'moleskine-cahier-pocket', units: 'mm' });
    expect(r.spine_bulge).toBe(0);
  });

  it('manual is_hardcover: true with no preset → spine_bulge = 6.35', () => {
    const r = resolveInputs({ book_height: 200, book_width: 150, spine_width: 25, flap_depth: 70, units: 'mm', is_hardcover: true });
    expect(r.spine_bulge).toBeCloseTo(6.35, 5);
  });

  it('manual is_hardcover: false with no preset → spine_bulge = 0', () => {
    const r = resolveInputs({ book_height: 200, book_width: 150, spine_width: 25, flap_depth: 70, units: 'mm', is_hardcover: false });
    expect(r.spine_bulge).toBe(0);
  });
});

describe('validateInputs — preset validation', () => {
  it('unknown book_preset returns ok: false', () => {
    const r = validateInputs({ book_preset: 'made-up-id', units: 'mm' });
    expect(r.ok).toBe(false);
  });

  it('valid book_preset with no manual dimensions returns ok: true', () => {
    const r = validateInputs({ book_preset: 'moleskine-classic-pocket', units: 'mm' });
    expect(r.ok).toBe(true);
  });

  it('valid book_preset with manual dimensions returns ok: true', () => {
    const r = validateInputs({ book_preset: 'bible-compact', book_height: 200, book_width: 150, spine_width: 25, flap_depth: 70, units: 'mm' });
    expect(r.ok).toBe(true);
  });

  it('valid foldover_preset returns ok: true', () => {
    const r = validateInputs({ book_preset: 'a5-notebook', foldover_preset: 'tactical', units: 'mm' });
    expect(r.ok).toBe(true);
  });

  it('invalid foldover_preset returns ok: false', () => {
    const r = validateInputs({ book_height: 200, book_width: 150, spine_width: 25, flap_depth: 70, units: 'mm', foldover_preset: 'military' as 'tactical' });
    expect(r.ok).toBe(false);
  });
});

describe('validateInputs — width_ease and spine_bulge rejection', () => {
  const BASE = { book_height: 200, book_width: 150, spine_width: 25, flap_depth: 70, units: 'mm' as const };

  it('rejects negative width_ease', () => {
    expect(validateInputs({ ...BASE, width_ease: -1 }).ok).toBe(false);
  });

  it('accepts width_ease of zero', () => {
    expect(validateInputs({ ...BASE, width_ease: 0 }).ok).toBe(true);
  });

  it('rejects NaN width_ease', () => {
    expect(validateInputs({ ...BASE, width_ease: NaN }).ok).toBe(false);
  });

  it('rejects Infinity width_ease', () => {
    expect(validateInputs({ ...BASE, width_ease: Infinity }).ok).toBe(false);
  });

  it('rejects negative spine_bulge', () => {
    expect(validateInputs({ ...BASE, spine_bulge: -1 }).ok).toBe(false);
  });

  it('accepts spine_bulge of zero', () => {
    expect(validateInputs({ ...BASE, spine_bulge: 0 }).ok).toBe(true);
  });

  it('rejects NaN spine_bulge', () => {
    expect(validateInputs({ ...BASE, spine_bulge: NaN }).ok).toBe(false);
  });

  it('rejects Infinity spine_bulge', () => {
    expect(validateInputs({ ...BASE, spine_bulge: Infinity }).ok).toBe(false);
  });
});
