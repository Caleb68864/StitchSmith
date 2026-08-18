import { describe, it, expect } from 'vitest';
import { resolveInputs, validateInputs } from '../inputs.js';

const WAIST = 711.2; // mm (~28")
const LENGTH = 609.6; // mm (~24")

// ─── resolveInputs — preset resolution ──────────────────────────────────────────

describe('resolveInputs — presets', () => {
  it('full preset: sweep_angle_deg = 360', () => {
    const r = resolveInputs({ preset: 'full', waist_circumference: WAIST, skirt_length: LENGTH, units: 'mm', waist_ease: 0 });
    expect(r.sweep_angle_deg).toBe(360);
  });

  it('half preset: sweep_angle_deg = 180', () => {
    const r = resolveInputs({ preset: 'half', waist_circumference: WAIST, skirt_length: LENGTH, units: 'mm' });
    expect(r.sweep_angle_deg).toBe(180);
  });

  it('quarter preset: sweep_angle_deg = 90', () => {
    const r = resolveInputs({ preset: 'quarter', waist_circumference: WAIST, skirt_length: LENGTH, units: 'mm' });
    expect(r.sweep_angle_deg).toBe(90);
  });

  it('double preset: sweep_angle_deg = 720', () => {
    const r = resolveInputs({ preset: 'double', waist_circumference: WAIST, skirt_length: LENGTH, units: 'mm' });
    expect(r.sweep_angle_deg).toBe(720);
  });

  it('custom preset: uses provided sweep_angle_deg', () => {
    const r = resolveInputs({ preset: 'custom', waist_circumference: WAIST, skirt_length: LENGTH, sweep_angle_deg: 270, units: 'mm' });
    expect(r.sweep_angle_deg).toBe(270);
  });
});

// ─── resolveInputs — full-circle math ──────────────────────────────────────────

describe('resolveInputs — full-circle derived fields (waist_ease: 0)', () => {
  const resolved = resolveInputs({ preset: 'full', waist_circumference: WAIST, skirt_length: LENGTH, units: 'mm', waist_ease: 0 });

  it('r ≈ 711.2 / (2π) ≈ 113.2', () => {
    expect(resolved.r).toBeCloseTo(113.2, 0);
  });

  it('R = r + skirt_length ≈ 722.8', () => {
    expect(resolved.R).toBeCloseTo(722.8, 0);
  });

  it('num_panels = 4 (max(2, ceil(360/90)))', () => {
    expect(resolved.num_panels).toBe(4);
  });

  it('panel_sweep_deg = 90 (360/4)', () => {
    expect(resolved.panel_sweep_deg).toBe(90);
  });

  it('cut_inner_r = max(1, r - seam_allowance)', () => {
    expect(resolved.cut_inner_r).toBeCloseTo(resolved.r - resolved.seam_allowance, 4);
    expect(resolved.cut_inner_r).toBeGreaterThanOrEqual(1);
  });

  it('cut_outer_r = R + hem_allowance', () => {
    expect(resolved.cut_outer_r).toBeCloseTo(resolved.R + resolved.hem_allowance, 4);
  });
});

// ─── resolveInputs — half-circle ────────────────────────────────────────────────

describe('resolveInputs — half-circle', () => {
  const resolved = resolveInputs({ preset: 'half', waist_circumference: WAIST, skirt_length: LENGTH, units: 'mm' });

  it('num_panels = 2 (max(2, ceil(180/90)))', () => {
    expect(resolved.num_panels).toBe(2);
  });

  it('panel_sweep_deg = 90 (180/2)', () => {
    expect(resolved.panel_sweep_deg).toBe(90);
  });
});

// ─── resolveInputs — effective_waist ─────────────────────────────────────────────

describe('resolveInputs — effective_waist', () => {
  it('zip closure: effective_waist = waist + waist_ease', () => {
    const r = resolveInputs({ waist_circumference: 700, waist_ease: 20, closure: 'side-zip', units: 'mm' });
    expect(r.effective_waist).toBe(720);
  });

  it('elastic-casing: effective_waist uses hip (waist+100 when hip not given)', () => {
    const r = resolveInputs({ waist_circumference: 700, closure: 'elastic', waistband_type: 'elastic-casing', units: 'mm' });
    expect(r.effective_waist).toBe(800); // 700 + 100
  });

  it('elastic-casing: uses explicit hip_circumference when provided', () => {
    const r = resolveInputs({ waist_circumference: 700, hip_circumference: 950, closure: 'elastic', waistband_type: 'elastic-casing', units: 'mm' });
    expect(r.effective_waist).toBe(950);
  });
});

// ─── resolveInputs — SA=0 valid ──────────────────────────────────────────────────

describe('resolveInputs — SA=0', () => {
  it('seam_allowance=0 produces cut_inner_r = max(1, r)', () => {
    const r = resolveInputs({ preset: 'full', waist_circumference: WAIST, skirt_length: LENGTH, seam_allowance: 0, waist_ease: 0, units: 'mm' });
    expect(r.seam_allowance).toBe(0);
    expect(r.cut_inner_r).toBeCloseTo(Math.max(1, r.r), 4);
  });
});

// ─── resolveInputs — units field stored ──────────────────────────────────────────

describe('resolveInputs — units handling', () => {
  // resolveInputs normalises body/garment measurements to mm. This previously
  // asserted the opposite ("dimensions are passed through unchanged"), which
  // locked in the bug: no UI file ever performed the conversion the old
  // contract delegated to it, so the shipped default built a 1/25-scale skirt.
  it('converts inch body measurements to mm, keeping units for labelling', () => {
    const r = resolveInputs({ preset: 'full', waist_circumference: WAIST, skirt_length: LENGTH, units: 'in', waist_ease: 0 });
    expect(r.units).toBe('in');
    expect(r.waist_circumference).toBeCloseTo(WAIST * 25.4, 6);
    expect(r.skirt_length).toBeCloseTo(LENGTH * 25.4, 6);
  });

  it('leaves always-mm fields untouched under inch units', () => {
    const r = resolveInputs({
      preset: 'full', waist_circumference: 28, skirt_length: 24, units: 'in',
      seam_allowance: 15, hem_allowance: 20, band_height: 25, elastic_width: 25, waist_ease: 20,
    });
    // These are labelled "(mm)" in the settings panel regardless of the toggle.
    expect(r.seam_allowance).toBe(15);
    expect(r.hem_allowance).toBe(20);
    expect(r.band_height).toBe(25);
    expect(r.elastic_width).toBe(25);
    expect(r.waist_ease).toBe(20);
  });

  it('mm units: dimensions passed through unchanged', () => {
    const r = resolveInputs({ preset: 'full', waist_circumference: 600, skirt_length: 500, units: 'mm', waist_ease: 0 });
    expect(r.waist_circumference).toBe(600);
  });

  it('inch and equivalent mm inputs resolve identically', () => {
    const asIn = resolveInputs({ preset: 'full', waist_circumference: 28, skirt_length: 24, units: 'in', waist_ease: 20 });
    const asMm = resolveInputs({ preset: 'full', waist_circumference: 28 * 25.4, skirt_length: 24 * 25.4, units: 'mm', waist_ease: 20 });
    expect(asIn.effective_waist).toBeCloseTo(asMm.effective_waist, 6);
    expect(asIn.cut_outer_r).toBeCloseTo(asMm.cut_outer_r, 6);
    expect(asIn.num_panels).toBe(asMm.num_panels);
  });

  // Guards the shipped default specifically: it ships units:'in', so a
  // regression here means every new user gets a doll-sized skirt again.
  it('the shipped default project resolves to a wearable skirt, not 1/25 scale', () => {
    const r = resolveInputs({
      waist_circumference: 28, skirt_length: 24, units: 'in', preset: 'full',
      seam_allowance: 15, hem_allowance: 20, band_height: 25, elastic_width: 25,
    });
    expect(r.effective_waist).toBeCloseTo(28 * 25.4 + 20, 6); // 731.2 mm
    expect(r.cut_outer_r).toBeGreaterThan(500);               // was 25.8 mm
  });
});

// ─── validateInputs — passing case ───────────────────────────────────────────────

describe('validateInputs — ok = true', () => {
  it('full preset with explicit valid values', () => {
    const v = validateInputs({ preset: 'full', waist_circumference: WAIST, skirt_length: LENGTH, sweep_angle_deg: 360, units: 'mm' });
    expect(v.ok).toBe(true);
  });

  it('SA=0 is valid', () => {
    const v = validateInputs({ preset: 'full', waist_circumference: WAIST, skirt_length: LENGTH, seam_allowance: 0, units: 'mm' });
    expect(v.ok).toBe(true);
  });

  it('hem_allowance=0 is valid', () => {
    const v = validateInputs({ preset: 'full', waist_circumference: WAIST, skirt_length: LENGTH, hem_allowance: 0, units: 'mm' });
    expect(v.ok).toBe(true);
  });
});

// ─── validateInputs — failing cases ──────────────────────────────────────────────

describe('validateInputs — ok = false', () => {
  it('waist_circumference = 0 → error on waist_circumference', () => {
    const v = validateInputs({ preset: 'custom', waist_circumference: 0, skirt_length: 600, sweep_angle_deg: 180, units: 'mm' });
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.errors.some(e => e.field === 'waist_circumference')).toBe(true);
    }
  });

  it('skirt_length = 0 → error on skirt_length', () => {
    const v = validateInputs({ preset: 'full', waist_circumference: WAIST, skirt_length: 0, units: 'mm' });
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.errors.some(e => e.field === 'skirt_length')).toBe(true);
    }
  });

  it('sweep_angle_deg = 44 (below minimum 45)', () => {
    const v = validateInputs({ preset: 'custom', waist_circumference: WAIST, skirt_length: LENGTH, sweep_angle_deg: 44, units: 'mm' });
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.errors.some(e => e.field === 'sweep_angle_deg')).toBe(true);
    }
  });

  it('sweep_angle_deg = 721 (above maximum 720)', () => {
    const v = validateInputs({ preset: 'custom', waist_circumference: WAIST, skirt_length: LENGTH, sweep_angle_deg: 721, units: 'mm' });
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.errors.some(e => e.field === 'sweep_angle_deg')).toBe(true);
    }
  });

  it('seam_allowance < 0 → error', () => {
    const v = validateInputs({ preset: 'full', waist_circumference: WAIST, skirt_length: LENGTH, seam_allowance: -1, units: 'mm' });
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.errors.some(e => e.field === 'seam_allowance')).toBe(true);
    }
  });
});

// ─── validateInputs — warnings ────────────────────────────────────────────────────

describe('validateInputs — warnings', () => {
  it('double preset (720°) fires multi-circle warning', () => {
    const v = validateInputs({ preset: 'double', waist_circumference: WAIST, skirt_length: LENGTH, units: 'mm' });
    if (v.ok) {
      expect(v.warnings.some(w => w.toLowerCase().includes('multi-circle'))).toBe(true);
    }
  });

  it('tall straight band (>30mm) fires fit warning', () => {
    const v = validateInputs({ preset: 'full', waist_circumference: WAIST, skirt_length: LENGTH, waistband_type: 'straight', band_height: 50, units: 'mm' });
    if (v.ok) {
      expect(v.warnings.some(w => w.includes('30mm'))).toBe(true);
    }
  });

  it('normal band height (25mm) does not fire warning', () => {
    const v = validateInputs({ preset: 'full', waist_circumference: WAIST, skirt_length: LENGTH, waistband_type: 'straight', band_height: 25, units: 'mm' });
    if (v.ok) {
      expect(v.warnings.filter(w => w.includes('30mm')).length).toBe(0);
    }
  });
});

// ─── resolveInputs — quarter-circle piecing ──────────────────────────────────────

describe('resolveInputs — quarter-circle piecing', () => {
  it('quarter (90°): num_panels = 2 (max(2, ceil(90/90)) = 2)', () => {
    const r = resolveInputs({ preset: 'quarter', waist_circumference: WAIST, skirt_length: LENGTH, units: 'mm' });
    expect(r.num_panels).toBe(2);
  });

  it('quarter: panel_sweep_deg = 45', () => {
    const r = resolveInputs({ preset: 'quarter', waist_circumference: WAIST, skirt_length: LENGTH, units: 'mm' });
    expect(r.panel_sweep_deg).toBe(45);
  });
});

// ─── resolveInputs — double-circle piecing ───────────────────────────────────────

describe('resolveInputs — double-circle piecing', () => {
  it('double (720°): num_panels = 8 (max(2, ceil(720/90)) = 8)', () => {
    const r = resolveInputs({ preset: 'double', waist_circumference: WAIST, skirt_length: LENGTH, units: 'mm' });
    expect(r.num_panels).toBe(8);
  });

  it('double: panel_sweep_deg = 90', () => {
    const r = resolveInputs({ preset: 'double', waist_circumference: WAIST, skirt_length: LENGTH, units: 'mm' });
    expect(r.panel_sweep_deg).toBe(90);
  });
});
