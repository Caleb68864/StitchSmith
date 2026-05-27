// @vitest-environment node
/**
 * End-to-end smoke test for the mag-pouch generator.
 *
 * Coverage:
 *  1. Five representative input scenarios × seven exporters each
 *     (SVG, tiled HTML, PDF, DXF, cut-list CSV, instructions, projectJson)
 *  2. Migrator chain — v3 identity and synthetic v0 error path
 *  3. Warnings catalog — AK profile, folded-T aspect-ratio, grommet/exposure
 *  4. BOM exclusion — verifies hardware that should NOT appear per retention style
 *
 * NOTE: pdf-lib is mocked so the test runs without a DOM or native crypto.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

// ─── Mock pdf-lib before any import that uses it ─────────────────────────────

vi.mock('pdf-lib', () => {
  const mockPage = {
    drawLine: vi.fn(),
    drawRectangle: vi.fn(),
    drawText: vi.fn(),
    getSize: vi.fn(() => ({ width: 595.28, height: 841.89 })),
  };
  const mockDoc = {
    addPage: vi.fn(() => mockPage),
    save: vi.fn(() =>
      Promise.resolve(
        new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]),
      ),
    ),
  };
  return {
    PDFDocument: {
      create: vi.fn(() => Promise.resolve(mockDoc)),
    },
    rgb: vi.fn((r: number, g: number, b: number) => ({ r, g, b, type: 'RGB' })),
    degrees: vi.fn((d: number) => d),
    LineCapStyle: { Butt: 0, Round: 1, Projecting: 2 },
  };
});

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { buildPattern, AK_WARNING_COPY } from '../../../generators/mag-pouch/buildPattern.js';
import type { MagPouchInputs } from '../../../generators/mag-pouch/types.js';
import { patternToSvg } from '../../pattern-engine/exports/svg.js';
import { patternToTiledHtml } from '../../pattern-engine/exports/tiledHtml.js';
import { exportPatternToPdf } from '../../pattern-engine/exports/pdf.js';
import { exportPatternToDxf } from '../../pattern-engine/exports/dxf.js';
import { exportCutList, exportCutListCsv } from '../../pattern-engine/exports/cutList.js';
import { exportProjectJson, migrateData } from '../../pattern-engine/exports/index.js';
import { GROMMET_EXPOSURE_WARNING } from '../components/drainage.js';

// ─── Fixture input helpers ────────────────────────────────────────────────────

function predefinedInputs(
  presetId: string,
  retention: MagPouchInputs['retention'],
  attachment: MagPouchInputs['attachment'],
  drainage: MagPouchInputs['drainage'],
): MagPouchInputs {
  return {
    magazine: { mode: 'predefined', presetId, units: 'in' },
    retention,
    attachment,
    drainage,
    seamAllowance: 0.375,
    ease_width: 0.25,
    ease_depth: 0.25,
    exposed_percentage: 0.70,
    hook_length: 3.0,
    loop_length: 4.0,
    closure_overlap: 2.5,
    grommet_size: '#0',
  };
}

function customInputs(
  widthIn: number,
  thicknessIn: number,
  heightIn: number,
  retention: MagPouchInputs['retention'],
  attachment: MagPouchInputs['attachment'],
  drainage: MagPouchInputs['drainage'],
): MagPouchInputs {
  return {
    magazine: {
      mode: 'custom',
      width: widthIn,
      thickness: thicknessIn,
      height: heightIn,
      units: 'in',
    },
    retention,
    attachment,
    drainage,
    seamAllowance: 0.375,
    ease_width: 0.25,
    ease_depth: 0.25,
    exposed_percentage: 0.70,
    hook_length: 3.0,
    loop_length: 4.0,
    closure_overlap: 2.5,
    grommet_size: '#0',
  };
}

// ─── Scenarios ────────────────────────────────────────────────────────────────

const SCENARIOS: Array<{ label: string; inputs: MagPouchInputs }> = [
  {
    label: 'ar15_30_round × flap_velcro × pals × open_corner',
    inputs: predefinedInputs('ar15_30_round', 'flap_velcro', 'pals', 'open_corner'),
  },
  {
    label: 'pmag_gen3 × flap_snap × molle × sewn_closed',
    inputs: predefinedInputs('pmag_gen3', 'flap_snap', 'molle', 'sewn_closed'),
  },
  {
    label: 'lancer_l5 × flap_fastex × belt_loop × grommet',
    inputs: predefinedInputs('lancer_l5', 'flap_fastex', 'belt_loop', 'grommet'),
  },
  {
    label: 'ar15_20_round × open_top_bungee × velcro_panel × sewn_closed',
    inputs: predefinedInputs('ar15_20_round', 'open_top_bungee', 'velcro_panel', 'sewn_closed'),
  },
  {
    label: 'custom(2.6×1.0×8.0) × flap_velcro × alice × open_corner',
    inputs: customInputs(2.6, 1.0, 8.0, 'flap_velcro', 'alice', 'open_corner'),
  },
];

// ─── Section 1: Five scenarios × seven exporters ──────────────────────────────

describe('end-to-end: five scenarios × seven exporters', () => {
  for (const scenario of SCENARIOS) {
    describe(scenario.label, () => {
      let result: ReturnType<typeof buildPattern>;

      beforeAll(() => {
        result = buildPattern(scenario.inputs);
      });

      it('buildPattern returns a pattern with at least one piece', () => {
        expect(result.pattern).toBeDefined();
        expect(result.pattern.pieces.length).toBeGreaterThan(0);
      });

      it('SVG exporter produces non-empty output', () => {
        const svg = patternToSvg(result.pattern, { defaultSeamAllowance: 9.525 });
        expect(svg.length).toBeGreaterThan(0);
        // Must contain an SVG root element
        expect(svg).toContain('<svg');
      });

      it('tiled HTML exporter produces non-empty output', () => {
        const html = patternToTiledHtml(result.pattern, { title: 'Mag Pouch' });
        expect(html.length).toBeGreaterThan(0);
        expect(html).toContain('<html');
      });

      it('PDF exporter produces a non-empty Blob', async () => {
        const blob = await exportPatternToPdf(result.pattern);
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.size).toBeGreaterThan(0);
      });

      it('DXF exporter produces non-empty output', () => {
        const dxf = exportPatternToDxf(result.pattern);
        expect(dxf.length).toBeGreaterThan(0);
        expect(dxf).toContain('SECTION');
      });

      it('cut-list exporter produces a cut list with at least one material', () => {
        const cutList = exportCutList(result.pattern, [], []);
        expect(Array.isArray(cutList.byMaterial)).toBe(true);
      });

      it('cut-list CSV exporter produces non-empty CSV', () => {
        const cutList = exportCutList(result.pattern, [], []);
        const csv = exportCutListCsv(cutList, []);
        expect(csv.length).toBeGreaterThan(0);
        expect(csv).toContain('Material ID');
      });

      it('instructions step list is non-empty', () => {
        expect(Array.isArray(result.steps)).toBe(true);
        expect(result.steps.length).toBeGreaterThan(0);
      });

      it('projectJson exporter produces valid JSON with schemaVersion 3', () => {
        const envelope = {
          schemaVersion: 3,
          generatorId: 'mag-pouch',
          inputs: scenario.inputs as unknown as Record<string, unknown>,
        };
        const json = exportProjectJson(envelope);
        expect(json.length).toBeGreaterThan(0);
        const parsed = JSON.parse(json) as Record<string, unknown>;
        expect(parsed['schemaVersion']).toBe(3);
        expect(parsed['generatorId']).toBe('mag-pouch');
      });
    });
  }
});

// ─── Section 2: Migrator chain ────────────────────────────────────────────────

describe('migrator chain — mag-pouch v3', () => {
  const sampleInputs: Record<string, unknown> = {
    magazine: { mode: 'predefined', presetId: 'ar15_30_round', units: 'in' },
    retention: 'flap_velcro',
    attachment: 'pals',
    drainage: 'open_corner',
    seamAllowance: 0.375,
  };

  it('migrateData(mag-pouch, 3, 3, inputs) returns identity result', () => {
    const result = migrateData('mag-pouch', 3, 3, sampleInputs);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(sampleInputs);
    }
  });

  it('migrateData(mag-pouch, 3, 3, inputs) data is reference-equal to input', () => {
    // The fast-path returns the original data object unchanged (no copy)
    const result = migrateData('mag-pouch', 3, 3, sampleInputs);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Data values should match exactly
      expect(result.data['retention']).toBe('flap_velcro');
      expect(result.data['seamAllowance']).toBe(0.375);
    }
  });

  it('migrateData(mag-pouch, 0, 3, inputs) returns migration error for missing v0→v1 migrator', () => {
    // Synthetic v0 file — no migrator exists for v0→v1 because v0 never shipped
    const result = migrateData('mag-pouch', 0, 3, sampleInputs);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Error must name the missing step
      expect(result.error).toContain('mag-pouch');
      expect(result.error).toContain('v0');
    }
  });

  it('migrateData(mag-pouch, 0, 3) error message is user-friendly and names the generator', () => {
    const result = migrateData('mag-pouch', 0, 3, sampleInputs);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(20);
      expect(result.error).toContain('mag-pouch');
    }
  });

  it('migrateData for a future schema version returns a future-version error', () => {
    // fromVersion > targetVersion: schema version newer than current
    const result = migrateData('mag-pouch', 9, 3, sampleInputs);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('newer version');
    }
  });
});

// ─── Section 3: Warnings catalog ─────────────────────────────────────────────

describe('warnings catalog (M11)', () => {
  describe('AK-profile warning', () => {
    it('emits AK warning for custom mag matching AK profile (h≥8.5, t≥1.05 in)', () => {
      // AK-style: height=9.0", thickness=1.05" — both thresholds met
      const inputs = customInputs(2.5, 1.05, 9.0, 'flap_velcro', 'pals', 'open_corner');
      const result = buildPattern(inputs);
      const akWarnings = result.warnings.filter((w) => w.includes('AK'));
      expect(akWarnings.length).toBeGreaterThan(0);
      expect(akWarnings[0]).toContain(AK_WARNING_COPY.slice(0, 30));
    });

    it('does NOT emit AK warning when height is below threshold (h<8.5")', () => {
      // height=7.5" — below 8.5" threshold
      const inputs = customInputs(2.5, 1.05, 7.5, 'flap_velcro', 'pals', 'open_corner');
      const result = buildPattern(inputs);
      const akWarnings = result.warnings.filter((w) => w.includes('AK'));
      expect(akWarnings.length).toBe(0);
    });

    it('does NOT emit AK warning when thickness is below threshold (t<1.05")', () => {
      // thickness=1.0" — below 1.05" threshold
      const inputs = customInputs(2.7, 1.0, 9.0, 'flap_velcro', 'pals', 'open_corner');
      const result = buildPattern(inputs);
      const akWarnings = result.warnings.filter((w) => w.includes('AK'));
      expect(akWarnings.length).toBe(0);
    });
  });

  describe('grommet-vs-high-exposure warning', () => {
    it('emits grommet/exposure warning when exposed_percentage > 0.85 with grommet drainage', () => {
      const inputs: MagPouchInputs = {
        ...predefinedInputs('ar15_30_round', 'flap_velcro', 'pals', 'grommet'),
        exposed_percentage: 0.90, // exceeds 0.85 threshold
      };
      const result = buildPattern(inputs);
      expect(result.warnings.some((w) => w.includes('Grommet'))).toBe(true);
      expect(result.warnings).toContain(GROMMET_EXPOSURE_WARNING);
    });

    it('does NOT emit grommet warning when exposed_percentage ≤ 0.85', () => {
      const inputs: MagPouchInputs = {
        ...predefinedInputs('ar15_30_round', 'flap_velcro', 'pals', 'grommet'),
        exposed_percentage: 0.70, // below threshold — no warning
      };
      const result = buildPattern(inputs);
      const grommetWarnings = result.warnings.filter((w) => w.includes('Grommet'));
      expect(grommetWarnings.length).toBe(0);
    });

    it('does NOT emit grommet warning for open_corner drainage even at high exposure', () => {
      const inputs: MagPouchInputs = {
        ...predefinedInputs('ar15_30_round', 'flap_velcro', 'pals', 'open_corner'),
        exposed_percentage: 0.95, // high but not grommet drainage
      };
      const result = buildPattern(inputs);
      const grommetWarnings = result.warnings.filter((w) => w.includes('Grommet'));
      expect(grommetWarnings.length).toBe(0);
    });
  });

  describe('folded-T depth > width/2 aspect-ratio warning', () => {
    it('emits aspect-ratio warning when internal_depth > internal_width / 2', () => {
      // Custom magazine: very deep relative to width forces depth > width/2 in the engine
      // width=1.0", thickness=0.9" (+ease = ~31.75 mm each), height=4.0"
      // internal_width ≈ (1.0+0.25)*25.4 = 31.75 mm
      // internal_depth ≈ (0.9+0.25)*25.4 = 29.21 mm
      // 29.21 > 31.75/2 = 15.875 → warning expected
      const inputs = customInputs(1.0, 0.9, 4.0, 'flap_velcro', 'pals', 'open_corner');
      const result = buildPattern(inputs);
      const aspectWarnings = result.warnings.filter((w) => w.includes('center seam'));
      expect(aspectWarnings.length).toBeGreaterThan(0);
      expect(aspectWarnings[0]).toContain('Folded-T center seam');
    });

    it('does NOT emit aspect-ratio warning when depth ≤ width/2', () => {
      // AR-15 30-round: width=2.55", thickness=1.0"
      // internal_width ≈ (2.55+0.25)*25.4 = 71.12 mm
      // internal_depth ≈ (1.0+0.25)*25.4  = 31.75 mm
      // 31.75 ≤ 71.12/2 = 35.56 → no warning
      const inputs = predefinedInputs('ar15_30_round', 'flap_velcro', 'pals', 'open_corner');
      const result = buildPattern(inputs);
      const aspectWarnings = result.warnings.filter((w) => w.includes('center seam'));
      expect(aspectWarnings.length).toBe(0);
    });
  });
});

// ─── Section 4: BOM exclusion tests (M12) ─────────────────────────────────────

describe('BOM exclusion tests (M12)', () => {
  describe('flap_velcro', () => {
    it('BOM contains velcro-hook and velcro-loop materials', () => {
      const result = buildPattern(
        predefinedInputs('ar15_30_round', 'flap_velcro', 'pals', 'open_corner'),
      );
      const matTypes = result.bom.materials.map((m) => m.type);
      expect(matTypes).toContain('velcro-hook');
      expect(matTypes).toContain('velcro-loop');
    });

    it('BOM does NOT contain fastex, snap, or cord-lock for flap_velcro', () => {
      const result = buildPattern(
        predefinedInputs('ar15_30_round', 'flap_velcro', 'pals', 'open_corner'),
      );
      const hwTypes = result.bom.hardware.map((h) => h.type);
      expect(hwTypes).not.toContain('fastex');
      expect(hwTypes).not.toContain('snap');
      expect(hwTypes).not.toContain('cord-lock');
    });
  });

  describe('flap_snap', () => {
    it('BOM contains a snap hardware entry for flap_snap', () => {
      const result = buildPattern(
        predefinedInputs('pmag_gen3', 'flap_snap', 'molle', 'sewn_closed'),
      );
      const hwTypes = result.bom.hardware.map((h) => h.type);
      expect(hwTypes).toContain('snap');
    });

    it('BOM does NOT contain cord-lock or fastex for flap_snap', () => {
      const result = buildPattern(
        predefinedInputs('pmag_gen3', 'flap_snap', 'molle', 'sewn_closed'),
      );
      const hwTypes = result.bom.hardware.map((h) => h.type);
      expect(hwTypes).not.toContain('cord-lock');
      expect(hwTypes).not.toContain('fastex');
    });
  });

  describe('flap_fastex', () => {
    it('BOM contains fastex hardware entry for flap_fastex', () => {
      const result = buildPattern(
        predefinedInputs('lancer_l5', 'flap_fastex', 'belt_loop', 'grommet'),
      );
      const hwTypes = result.bom.hardware.map((h) => h.type);
      expect(hwTypes).toContain('fastex');
    });

    it('BOM does NOT contain cord-lock for flap_fastex (no bungee system)', () => {
      const result = buildPattern(
        predefinedInputs('lancer_l5', 'flap_fastex', 'belt_loop', 'grommet'),
      );
      const hwTypes = result.bom.hardware.map((h) => h.type);
      expect(hwTypes).not.toContain('cord-lock');
    });

    it('BOM does NOT contain velcro materials for flap_fastex', () => {
      const result = buildPattern(
        predefinedInputs('lancer_l5', 'flap_fastex', 'belt_loop', 'grommet'),
      );
      const matTypes = result.bom.materials.map((m) => m.type);
      expect(matTypes).not.toContain('velcro-hook');
      expect(matTypes).not.toContain('velcro-loop');
    });
  });

  describe('open_top_bungee', () => {
    it('BOM contains cord material and cord-lock hardware for open_top_bungee', () => {
      const result = buildPattern(
        predefinedInputs('ar15_20_round', 'open_top_bungee', 'velcro_panel', 'sewn_closed'),
      );
      const matTypes = result.bom.materials.map((m) => m.type);
      const hwTypes = result.bom.hardware.map((h) => h.type);
      expect(matTypes).toContain('cord');
      expect(hwTypes).toContain('cord-lock');
    });

    it('BOM does NOT contain fastex/buckle hardware for open_top_bungee', () => {
      const result = buildPattern(
        predefinedInputs('ar15_20_round', 'open_top_bungee', 'velcro_panel', 'sewn_closed'),
      );
      const hwTypes = result.bom.hardware.map((h) => h.type);
      expect(hwTypes).not.toContain('fastex');
      expect(hwTypes).not.toContain('buckle');
    });

    it('BOM does NOT contain snap hardware for open_top_bungee', () => {
      const result = buildPattern(
        predefinedInputs('ar15_20_round', 'open_top_bungee', 'velcro_panel', 'sewn_closed'),
      );
      const hwTypes = result.bom.hardware.map((h) => h.type);
      expect(hwTypes).not.toContain('snap');
    });
  });
});
