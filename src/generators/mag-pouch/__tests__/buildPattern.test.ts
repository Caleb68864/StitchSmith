/**
 * buildPattern.test.ts
 * Integration tests for the mag-pouch generator's buildPattern function.
 *
 * Covers:
 *  - toPouchSpec output dimensions
 *  - buildPattern basic result shape
 *  - BOM fixtures per retention × attachment × drainage scenario (M12)
 *  - AK warning in buildPattern output (M11)
 *  - Mandatory steps present in every build
 *  - Parametric smoke test: 6 magazines × 4 retentions × 2 attachments × 3 drainages (144 combos)
 */

import { describe, it, expect } from 'vitest';
import { buildPattern } from '../buildPattern.js';
import { toPouchSpec } from '../toPouchSpec.js';
import { AK_WARNING_COPY } from '../buildPattern.js';
import { MAG_STEP_CUT, MAG_STEP_ASSEMBLE, MAG_STEP_ATTACH, MAG_STEP_FINISH } from '../steps.js';
import { MAGAZINE_IDS } from '../magazines.js';
import type { MagPouchInputs, RetentionStyle, AttachmentStyle, DrainageStyle } from '../types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseInputs(overrides: Partial<MagPouchInputs> = {}): MagPouchInputs {
  return {
    magazine: { mode: 'predefined', presetId: 'ar15_30_round', units: 'in' },
    retention: 'flap_velcro',
    attachment: 'pals',
    drainage: 'open_corner',
    seamAllowance: 0.375,
    ...overrides,
  };
}

const IN_TO_MM = 25.4;

// ─── toPouchSpec dimension tests ─────────────────────────────────────────────

describe('toPouchSpec', () => {
  it('ar15_30_round: object.width ≈ 64.77 mm (2.55" + default ease)', () => {
    const spec = toPouchSpec(baseInputs());
    // 2.55" mag + 0.25" ease = 2.80" = 71.12 mm
    // But spec says object.width ≈ 64.77 mm which is 2.55" × 25.4 (no ease?)
    // Re-reading spec: "object.width ≈ 64.77 mm (2.55")" — this means the raw width
    // Actually the spec says object is the magazine dimensions, ease applied separately via fit
    // So object.width = 2.55 * 25.4 = 64.77 mm (bare magazine dimension)
    // But toPouchSpec currently adds ease to object...
    // Let me check the spec: "object.width ≈ 64.77 mm (2.55")"
    // That matches mag width only, no ease. Let me verify our toPouchSpec.
    // The spec says "object.width ≈ 64.77 mm (2.55")" which implies the object is the magazine.
    // Our toPouchSpec adds ease to the object dimensions.
    // But: 2.55 * 25.4 = 64.77
    // And: (2.55 + 0.25) * 25.4 = 2.80 * 25.4 = 71.12
    // So the spec assertion is checking the bare magazine dimension in object.
    // We need to fix toPouchSpec to store bare magazine dims in object and ease in fit.
    expect(spec.object.width).toBeCloseTo(2.55 * IN_TO_MM, 1); // 64.77
  });

  it('ar15_30_round: object.depth ≈ 25.4 mm (1.0")', () => {
    const spec = toPouchSpec(baseInputs());
    expect(spec.object.depth).toBeCloseTo(1.0 * IN_TO_MM, 1); // 25.4
  });

  it('ar15_30_round: object.height ≈ 190.5 mm (7.5")', () => {
    const spec = toPouchSpec(baseInputs());
    expect(spec.object.height).toBeCloseTo(7.5 * IN_TO_MM, 1); // 190.5
  });

  it('construction is folded_t', () => {
    const spec = toPouchSpec(baseInputs());
    expect(spec.construction).toBe('folded_t');
  });

  it('seamAllowance converts inches to mm (0.375" → 9.525 mm)', () => {
    const spec = toPouchSpec(baseInputs());
    expect(spec.seamAllowance).toBeCloseTo(0.375 * IN_TO_MM, 2);
  });
});

// ─── buildPattern result shape ────────────────────────────────────────────────

describe('buildPattern — basic shape', () => {
  it('returns { pattern, warnings, bom, steps }', () => {
    const result = buildPattern(baseInputs());
    expect(result).toHaveProperty('pattern');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('bom');
    expect(result).toHaveProperty('steps');
  });

  it('pattern has at least one piece (body)', () => {
    const result = buildPattern(baseInputs());
    expect(result.pattern.pieces.length).toBeGreaterThanOrEqual(1);
  });

  it('pattern.pieces is a non-empty array', () => {
    const result = buildPattern(baseInputs());
    expect(Array.isArray(result.pattern.pieces)).toBe(true);
    expect(result.pattern.pieces.length).toBeGreaterThan(0);
  });

  it('warnings is an array', () => {
    const result = buildPattern(baseInputs());
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

// ─── Mandatory steps (M17 requirement) ───────────────────────────────────────

describe('buildPattern — mandatory steps', () => {
  const MANDATORY_IDS = [MAG_STEP_CUT, MAG_STEP_ASSEMBLE, MAG_STEP_ATTACH, MAG_STEP_FINISH];

  it('returns at least 4 steps', () => {
    const result = buildPattern(baseInputs());
    expect(result.steps.length).toBeGreaterThanOrEqual(4);
  });

  it.each(MANDATORY_IDS)('step "%s" is present', (stepId) => {
    const result = buildPattern(baseInputs());
    const ids = result.steps.map((s) => s.id);
    expect(ids).toContain(stepId);
  });

  it('each step has id, title, body, dependsOn, refsPieces', () => {
    const result = buildPattern(baseInputs());
    for (const step of result.steps) {
      expect(typeof step.id).toBe('string');
      expect(typeof step.title).toBe('string');
      expect(typeof step.body).toBe('string');
      expect(Array.isArray(step.dependsOn)).toBe(true);
      expect(Array.isArray(step.refsPieces)).toBe(true);
    }
  });
});

// ─── BOM fixtures (M12) ───────────────────────────────────────────────────────

describe('buildPattern — BOM fixtures (M12)', () => {
  /**
   * Fixture: flap_velcro + pals + open_corner
   *
   * Expected materials types (sorted): fabric, velcro-hook, velcro-loop, webbing
   * Expected hardware types (sorted):  (none)
   */
  it('flap_velcro: materials include velcro-hook and velcro-loop', () => {
    const result = buildPattern(
      baseInputs({ retention: 'flap_velcro', attachment: 'pals', drainage: 'open_corner' }),
    );
    const matTypes = result.bom.materials.map((m) => m.type).sort();
    expect(matTypes).toContain('velcro-hook');
    expect(matTypes).toContain('velcro-loop');
  });

  it('flap_velcro: hardware is empty', () => {
    const result = buildPattern(
      baseInputs({ retention: 'flap_velcro', attachment: 'pals', drainage: 'open_corner' }),
    );
    expect(result.bom.hardware).toHaveLength(0);
  });

  it('flap_velcro + pals + open_corner: exact material type set', () => {
    const result = buildPattern(
      baseInputs({ retention: 'flap_velcro', attachment: 'pals', drainage: 'open_corner' }),
    );
    const matTypes = result.bom.materials.map((m) => m.type).sort();
    // Fixture: ['fabric', 'velcro-hook', 'velcro-loop', 'webbing']
    expect(matTypes).toEqual(['fabric', 'velcro-hook', 'velcro-loop', 'webbing']);
  });

  it('flap_velcro + pals + open_corner: exact hardware type set (empty)', () => {
    const result = buildPattern(
      baseInputs({ retention: 'flap_velcro', attachment: 'pals', drainage: 'open_corner' }),
    );
    const hwTypes = result.bom.hardware.map((h) => h.type).sort();
    // Fixture: []
    expect(hwTypes).toEqual([]);
  });

  /**
   * Fixture: flap_snap + pals + open_corner
   *
   * Expected materials types (sorted): fabric, webbing
   * Expected hardware types (sorted):  snap
   */
  it('flap_snap: materials do NOT include velcro types', () => {
    const result = buildPattern(
      baseInputs({ retention: 'flap_snap', attachment: 'pals', drainage: 'open_corner' }),
    );
    const matTypes = result.bom.materials.map((m) => m.type);
    expect(matTypes).not.toContain('velcro-hook');
    expect(matTypes).not.toContain('velcro-loop');
  });

  it('flap_snap: hardware contains snap', () => {
    const result = buildPattern(
      baseInputs({ retention: 'flap_snap', attachment: 'pals', drainage: 'open_corner' }),
    );
    const hwTypes = result.bom.hardware.map((h) => h.type);
    expect(hwTypes).toContain('snap');
  });

  it('flap_snap + pals + open_corner: exact material type set', () => {
    const result = buildPattern(
      baseInputs({ retention: 'flap_snap', attachment: 'pals', drainage: 'open_corner' }),
    );
    const matTypes = result.bom.materials.map((m) => m.type).sort();
    // Fixture: ['fabric', 'webbing']
    expect(matTypes).toEqual(['fabric', 'webbing']);
  });

  it('flap_snap + pals + open_corner: exact hardware type set', () => {
    const result = buildPattern(
      baseInputs({ retention: 'flap_snap', attachment: 'pals', drainage: 'open_corner' }),
    );
    const hwTypes = result.bom.hardware.map((h) => h.type).sort();
    // Fixture: ['snap']
    expect(hwTypes).toEqual(['snap']);
  });

  /**
   * Fixture: flap_fastex + pals + open_corner
   *
   * Expected materials types (sorted): fabric, webbing
   * Expected hardware types (sorted):  fastex
   * Must NOT include cord-lock.
   */
  it('flap_fastex: hardware contains fastex, NOT cord-lock', () => {
    const result = buildPattern(
      baseInputs({ retention: 'flap_fastex', attachment: 'pals', drainage: 'open_corner' }),
    );
    const hwTypes = result.bom.hardware.map((h) => h.type);
    expect(hwTypes).toContain('fastex');
    expect(hwTypes).not.toContain('cord-lock');
  });

  it('flap_fastex + pals + open_corner: exact material type set', () => {
    const result = buildPattern(
      baseInputs({ retention: 'flap_fastex', attachment: 'pals', drainage: 'open_corner' }),
    );
    const matTypes = result.bom.materials.map((m) => m.type).sort();
    // Fixture: ['fabric', 'webbing']
    expect(matTypes).toEqual(['fabric', 'webbing']);
  });

  it('flap_fastex + pals + open_corner: exact hardware type set', () => {
    const result = buildPattern(
      baseInputs({ retention: 'flap_fastex', attachment: 'pals', drainage: 'open_corner' }),
    );
    const hwTypes = result.bom.hardware.map((h) => h.type).sort();
    // Fixture: ['fastex']
    expect(hwTypes).toEqual(['fastex']);
  });

  /**
   * Fixture: open_top_bungee + pals + open_corner
   *
   * Expected materials types (sorted): cord, fabric, webbing
   * Expected hardware types (sorted):  cord-lock
   */
  it('open_top_bungee: materials contain cord', () => {
    const result = buildPattern(
      baseInputs({ retention: 'open_top_bungee', attachment: 'pals', drainage: 'open_corner' }),
    );
    const matTypes = result.bom.materials.map((m) => m.type);
    expect(matTypes).toContain('cord');
  });

  it('open_top_bungee: hardware contains cord-lock', () => {
    const result = buildPattern(
      baseInputs({ retention: 'open_top_bungee', attachment: 'pals', drainage: 'open_corner' }),
    );
    const hwTypes = result.bom.hardware.map((h) => h.type);
    expect(hwTypes).toContain('cord-lock');
  });

  it('open_top_bungee + pals + open_corner: exact material type set', () => {
    const result = buildPattern(
      baseInputs({ retention: 'open_top_bungee', attachment: 'pals', drainage: 'open_corner' }),
    );
    const matTypes = result.bom.materials.map((m) => m.type).sort();
    // Fixture: ['cord', 'fabric', 'webbing']
    expect(matTypes).toEqual(['cord', 'fabric', 'webbing']);
  });

  it('open_top_bungee + pals + open_corner: exact hardware type set', () => {
    const result = buildPattern(
      baseInputs({ retention: 'open_top_bungee', attachment: 'pals', drainage: 'open_corner' }),
    );
    const hwTypes = result.bom.hardware.map((h) => h.type).sort();
    // Fixture: ['cord-lock']
    expect(hwTypes).toEqual(['cord-lock']);
  });

  // Grommet drainage adds a grommet hardware item
  it('grommet drainage adds grommet to hardware', () => {
    const result = buildPattern(baseInputs({ drainage: 'grommet' }));
    const hwTypes = result.bom.hardware.map((h) => h.type);
    expect(hwTypes).toContain('grommet');
  });
});

// ─── AK warning in buildPattern (M11) ────────────────────────────────────────

describe('buildPattern — AK warning (M11)', () => {
  it('custom mag with AK profile emits AK warning in warnings array', () => {
    const result = buildPattern(
      baseInputs({
        magazine: { mode: 'custom', width: 2.5, thickness: 1.05, height: 9.0, units: 'in' },
      }),
    );
    const hasAkWarning = result.warnings.some((w) =>
      w.includes('AK-pattern'),
    );
    expect(hasAkWarning).toBe(true);
  });

  it('custom AK mag warning contains canonical AK_WARNING_COPY substring', () => {
    const result = buildPattern(
      baseInputs({
        magazine: { mode: 'custom', width: 2.5, thickness: 1.05, height: 9.0, units: 'in' },
      }),
    );
    const akWarning = result.warnings.find((w) => w.includes('AK-pattern'));
    expect(akWarning).toContain(AK_WARNING_COPY.slice(0, 40)); // substring match
  });

  it('AR-15 30-round preset emits no AK warning', () => {
    const result = buildPattern(baseInputs());
    const hasAk = result.warnings.some((w) => w.includes('AK-pattern'));
    expect(hasAk).toBe(false);
  });
});

// ─── Parametric smoke test (96 combinations) ─────────────────────────────────

describe('buildPattern — parametric smoke test', () => {
  const retentions: RetentionStyle[] = ['flap_velcro', 'flap_snap', 'flap_fastex', 'open_top_bungee'];
  const attachments: AttachmentStyle[] = ['pals', 'belt_loop'];
  const drainages: DrainageStyle[] = ['open_corner', 'sewn_closed', 'grommet'];
  const magazineIds = MAGAZINE_IDS;

  for (const magId of magazineIds) {
    for (const retention of retentions) {
      for (const attachment of attachments) {
        for (const drainage of drainages) {
          it(`${magId} × ${retention} × ${attachment} × ${drainage} — produces non-empty pattern`, () => {
            const inputs: MagPouchInputs = {
              magazine: { mode: 'predefined', presetId: magId, units: 'in' },
              retention,
              attachment,
              drainage,
              seamAllowance: 0.375,
            };
            let result: ReturnType<typeof buildPattern> | undefined;
            expect(() => {
              result = buildPattern(inputs);
            }).not.toThrow();
            expect(result!.pattern.pieces.length).toBeGreaterThan(0);
          });
        }
      }
    }
  }
});
