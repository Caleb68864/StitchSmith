/**
 * resolve.test.ts — the one place every derived dimension comes from.
 * Rules under test are the vault's: PALS grid quantization, .308 off-grid,
 * face-per-cell formula, coverage, derived lid length, AK hem default.
 */
import { describe, it, expect } from 'vitest';
import { resolveMagPouch, snapUpToGrid, gridError } from '../resolve.js';
import type { MagPouchInputs } from '../types.js';

function inputs(overrides: Partial<MagPouchInputs> = {}): MagPouchInputs {
  return {
    magazine: { mode: 'predefined', presetId: 'ar15_30_round', units: 'in' },
    retention: 'flap_velcro',
    attachment: 'pals',
    drainage: 'open_corner',
    seamAllowance: 0.375,
    ...overrides,
  };
}

describe('grid helpers', () => {
  it('snapUpToGrid rounds up to the pitch and tolerates float dust', () => {
    expect(snapUpToGrid(2.8, 1.5)).toBe(3);
    expect(snapUpToGrid(3.5, 1.5)).toBe(4.5);
    expect(snapUpToGrid(3.0000000001, 1.5)).toBe(3);
    expect(snapUpToGrid(1.5, 1.5)).toBe(1.5);
  });
  it('gridError measures distance to the nearest multiple', () => {
    expect(gridError(3, 1.5)).toBeCloseTo(0, 9);
    expect(gridError(3.5, 1.5)).toBeCloseTo(0.5, 9);
    expect(gridError(2.8, 1.5)).toBeCloseTo(0.2, 9);
  });
});

describe('resolveMagPouch — cell span', () => {
  it('a PALS-mounted rifle cell is 3" (two columns), not mag width + ease', () => {
    const r = resolveMagPouch(inputs());
    expect(r.nominalSpanIn).toBeCloseTo(2.8, 9);
    expect(r.cellSpanIn).toBe(3);
    expect(r.spanSnappedToGrid).toBe(true);
    expect(r.palsColumns).toBe(2);
    expect(r.gridErrorIn).toBeCloseTo(0, 9);
  });

  it('a Velcro-mounted cell runs at mag width + ease', () => {
    const r = resolveMagPouch(inputs({ attachment: 'velcro_panel' }));
    expect(r.cellSpanIn).toBeCloseTo(2.8, 9);
    expect(r.spanSnappedToGrid).toBe(false);
  });

  it('.308 wants 3.5", which a PALS mount rounds up to 4.5" (three columns)', () => {
    const pals = resolveMagPouch(inputs({ magazine: { mode: 'predefined', presetId: 'pmag_308_20', units: 'in' } }));
    expect(pals.nominalSpanIn).toBe(3.5);
    expect(pals.cellSpanIn).toBe(4.5);
    expect(pals.palsColumns).toBe(3);
    const velcro = resolveMagPouch(inputs({ attachment: 'velcro_panel', magazine: { mode: 'predefined', presetId: 'pmag_308_20', units: 'in' } }));
    expect(velcro.cellSpanIn).toBe(3.5);
  });

  it('an explicit off-grid span override is honoured and flagged', () => {
    const r = resolveMagPouch(inputs({ cell_span: 3.5 }));
    expect(r.cellSpanIn).toBe(3.5);
    expect(r.gridErrorIn).toBeCloseTo(0.5, 9);
    expect(r.spanSnappedToGrid).toBe(false);
  });

  it('a 4-cell card spans 8 columns', () => {
    const r = resolveMagPouch(inputs({ construction: 'pleated_card', cell_count: 4 }));
    expect(r.palsColumns).toBe(8);
  });
});

describe('resolveMagPouch — face, heights, lid', () => {
  it('face per cell = mag_w + 2·mag_t + 5/16" ≈ 4.86" for a rifle mag (SOE measured 4.875)', () => {
    const r = resolveMagPouch(inputs({ construction: 'pleated_card' }));
    expect(r.facePerCellIn).toBeCloseTo(4.8625, 6);
    expect(Math.abs(r.facePerCellIn - 4.875)).toBeLessThan(0.02);
    expect(r.puckerPerSideIn).toBeCloseTo(0.93125, 6);
  });

  it('coverage 0.7 puts 70% of the mag inside and 30% proud', () => {
    const r = resolveMagPouch(inputs());
    expect(r.pouchHeightIn).toBeCloseTo(5.25, 9);
    expect(r.exposedHeightIn).toBeCloseTo(2.25, 9);
  });

  it('lid length = 2 × exposed height (up behind the mag, back down to the mouth) + cell depth + closure reach + pull channel', () => {
    const r = resolveMagPouch(inputs());
    // 2 × 2.25 + (1.0 + 0.25) + 2.5 wrap-and-purchase, + 1.5 one-piece pull channel on a Velcro lid
    expect(r.flapLengthIn).toBeCloseTo(9.75, 9);
    expect(resolveMagPouch(inputs({ pull_channel_depth: 0 })).flapLengthIn).toBeCloseTo(8.25, 9);
    expect(r.hasFlap).toBe(true);
  });

  it('an explicit flap_length overrides the derivation; open tops have no lid', () => {
    expect(resolveMagPouch(inputs({ flap_length: 4 })).flapLengthIn).toBe(4);
    expect(resolveMagPouch(inputs({ retention: 'velcro_dot' })).flapLengthIn).toBe(0);
    expect(resolveMagPouch(inputs({ retention: 'open_top_bungee' })).hasFlap).toBe(false);
  });
});

describe('resolveMagPouch — platform-driven defaults', () => {
  const ak = { mode: 'predefined' as const, presetId: 'ak47_762x39_30round', units: 'in' as const };

  it('AK defaults the face hem on; anything else off; explicit flag wins', () => {
    expect(resolveMagPouch(inputs({ magazine: ak })).akFaceHem).toBe(true);
    expect(resolveMagPouch(inputs()).akFaceHem).toBe(false);
    expect(resolveMagPouch(inputs({ ak_face_hem: true })).akFaceHem).toBe(true);
    expect(resolveMagPouch(inputs({ magazine: ak, ak_face_hem: false })).akFaceHem).toBe(false);
  });

  it('bungee retention forces face PALS bars on a card', () => {
    const r = resolveMagPouch(inputs({ construction: 'pleated_card', retention: 'open_top_bungee', face_pals: false }));
    expect(r.facePals).toBe(true);
  });

  it('interior loop defaults on for the card and only for dot/wedge on the folded-T', () => {
    expect(resolveMagPouch(inputs({ construction: 'pleated_card' })).interiorLoop).toBe(true);
    expect(resolveMagPouch(inputs({ construction: 'pleated_card', interior_loop: false })).interiorLoop).toBe(false);
    expect(resolveMagPouch(inputs()).interiorLoop).toBe(false);
    expect(resolveMagPouch(inputs({ retention: 'kydex_wedge' })).interiorLoop).toBe(true);
  });

  it('custom magazines carry their declared platform', () => {
    const r = resolveMagPouch(inputs({ magazine: { mode: 'custom', width: 2.9, thickness: 1.1, height: 5.75, units: 'in', platform: 'rifle_308' } }));
    expect(r.platform).toBe('rifle_308');
    expect(r.cellSpanIn).toBe(4.5);
    const mm = resolveMagPouch(inputs({ magazine: { mode: 'custom', width: 64.77, thickness: 25.4, height: 190.5, units: 'mm' } }));
    expect(mm.magIn.width).toBeCloseTo(2.55, 6);
    expect(mm.platform).toBe('custom');
  });
});
