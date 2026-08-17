import { describe, it, expect, beforeEach } from 'vitest';
import {
  exportProjectJson,
  importProjectJson,
  roundTripProjectJson,
} from '../exports/projectJson.js';
import { registerMigrator, clearRegistry } from '../exports/migrators/index.js';
import type { ProjectEnvelope, GeneratorConfig } from '../exports/projectJson.js';

interface TriZipV2Inputs {
  mainBodyWidthMm: number;
  mainBodyHeightMm: number;
  mainBodyDepthMm: number;
  stylePreset: 'classic' | 'slim' | 'expedition';
}

const triZipV2Config: GeneratorConfig<TriZipV2Inputs> = {
  generatorId: 'tri-zip-backpack',
  currentSchemaVersion: 2,
  inputSchema: {
    mainBodyWidthMm: { type: 'number', required: true },
    mainBodyHeightMm: { type: 'number', required: true },
    mainBodyDepthMm: { type: 'number', required: true },
    stylePreset: {
      type: 'string',
      required: true,
      enum: ['classic', 'slim', 'expedition'],
    },
  },
};

const validEnvelope: ProjectEnvelope<TriZipV2Inputs> = {
  schemaVersion: 2,
  generatorId: 'tri-zip-backpack',
  inputs: {
    mainBodyWidthMm: 300,
    mainBodyHeightMm: 450,
    mainBodyDepthMm: 150,
    stylePreset: 'classic',
  },
  stylePresetName: 'Classic',
};

describe('exportProjectJson', () => {
  it('returns a JSON string', () => {
    const json = exportProjectJson(validEnvelope);
    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('serializes schemaVersion, generatorId, inputs, stylePresetName', () => {
    const json = exportProjectJson(validEnvelope);
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.generatorId).toBe('tri-zip-backpack');
    expect(parsed.inputs).toEqual(validEnvelope.inputs);
    expect(parsed.stylePresetName).toBe('Classic');
  });
});

describe('importProjectJson — round-trip', () => {
  it('round-trips bit-for-bit: export → parse → re-export produces identical string', () => {
    const exported = exportProjectJson(validEnvelope);
    const result = importProjectJson(exported, triZipV2Config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const reexported = exportProjectJson(result.envelope);
    expect(reexported).toBe(exported);
  });

  it('roundTripProjectJson helper returns the same JSON string', () => {
    const result = roundTripProjectJson(validEnvelope, triZipV2Config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.jsonString).toBe(exportProjectJson(validEnvelope));
  });
});

describe('importProjectJson — validation errors', () => {
  it('returns error for missing required field', () => {
    const json = JSON.stringify({
      schemaVersion: 2,
      generatorId: 'tri-zip-backpack',
      inputs: {
        mainBodyWidthMm: 300,
        mainBodyHeightMm: 450,
        // mainBodyDepthMm is missing
        stylePreset: 'classic',
      },
    });
    const result = importProjectJson(json, triZipV2Config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('validation-error');
    expect(result.error).toContain('mainBodyDepthMm');
  });

  it('returns error for wrong-typed field', () => {
    const json = JSON.stringify({
      schemaVersion: 2,
      generatorId: 'tri-zip-backpack',
      inputs: {
        mainBodyWidthMm: '300',
        mainBodyHeightMm: 450,
        mainBodyDepthMm: 150,
        stylePreset: 'classic',
      },
    });
    const result = importProjectJson(json, triZipV2Config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('validation-error');
  });

  it('returns error for non-finite numeric field (JSON 1e999 parses to Infinity)', () => {
    const json =
      '{"schemaVersion":2,"generatorId":"tri-zip-backpack","inputs":{"mainBodyWidthMm":1e999,' +
      '"mainBodyHeightMm":450,"mainBodyDepthMm":150,"stylePreset":"classic"}}';
    const result = importProjectJson(json, triZipV2Config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('validation-error');
    expect(result.error).toContain('mainBodyWidthMm');
  });

  it('returns schema-error when inputs is an array', () => {
    const json = JSON.stringify({ schemaVersion: 2, generatorId: 'tri-zip-backpack', inputs: [] });
    const result = importProjectJson(json, triZipV2Config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('schema-error');
  });

  it('returns error for invalid enum value', () => {
    const json = JSON.stringify({
      schemaVersion: 2,
      generatorId: 'tri-zip-backpack',
      inputs: {
        mainBodyWidthMm: 300,
        mainBodyHeightMm: 450,
        mainBodyDepthMm: 150,
        stylePreset: 'ultra-light',
      },
    });
    const result = importProjectJson(json, triZipV2Config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('validation-error');
    expect(result.error).toContain('stylePreset');
  });

  it('returns parse-error for invalid JSON', () => {
    const result = importProjectJson('{not valid json}', triZipV2Config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('parse-error');
  });

  it('returns schema-error for non-object JSON', () => {
    const result = importProjectJson('"just a string"', triZipV2Config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('schema-error');
  });

  it('returns schema-error for missing schemaVersion', () => {
    const json = JSON.stringify({
      generatorId: 'tri-zip-backpack',
      inputs: {},
    });
    const result = importProjectJson(json, triZipV2Config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('schema-error');
  });
});

describe('importProjectJson — future version error', () => {
  it('returns future-version error with user-friendly message for newer schemaVersion', () => {
    const json = JSON.stringify({
      schemaVersion: 99,
      generatorId: 'tri-zip-backpack',
      inputs: {},
    });
    const result = importProjectJson(json, triZipV2Config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('future-version');
    expect(result.error).toContain('newer version of StitchSmith');
  });
});

describe('importProjectJson — wrong generator error', () => {
  it('returns wrong-generator error when generatorId does not match', () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      generatorId: 'tool-roll',
      inputs: {},
    });
    const result = importProjectJson(json, triZipV2Config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('wrong-generator');
    expect(result.error).toContain('tool-roll');
    expect(result.error).toContain('tri-zip-backpack');
  });
});

describe('migrator chain — tri-zip-v2 → tri-zip-v3 synthetic test', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('registers and invokes a v2 → v3 migrator in isolation', () => {
    registerMigrator({
      generatorId: 'tri-zip-backpack',
      fromVersion: 2,
      toVersion: 3,
      migrate: (data) => ({
        ...data,
        _migrated: true,
        newV3Field: 'default-value',
      }),
    });

    // Use a v3-config to trigger migration from v2
    const v3Config: GeneratorConfig = {
      generatorId: 'tri-zip-backpack',
      currentSchemaVersion: 3,
      inputSchema: {
        mainBodyWidthMm: { type: 'number', required: true },
        mainBodyHeightMm: { type: 'number', required: true },
        mainBodyDepthMm: { type: 'number', required: true },
        stylePreset: {
          type: 'string',
          required: true,
          enum: ['classic', 'slim', 'expedition'],
        },
        newV3Field: { type: 'string', required: true },
      },
    };

    const v2Json = JSON.stringify({
      schemaVersion: 2,
      generatorId: 'tri-zip-backpack',
      inputs: {
        mainBodyWidthMm: 300,
        mainBodyHeightMm: 450,
        mainBodyDepthMm: 150,
        stylePreset: 'classic',
      },
    });

    const result = importProjectJson(v2Json, v3Config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const inputs = result.envelope.inputs as Record<string, unknown>;
    expect(inputs['newV3Field']).toBe('default-value');
    expect(inputs['_migrated']).toBe(true);
    expect(result.envelope.schemaVersion).toBe(3);
  });

  it('returns migration-error if no migrator registered for a version gap', () => {
    // No migrators registered (clearRegistry called in beforeEach)
    const v3Config: GeneratorConfig = {
      generatorId: 'tri-zip-backpack',
      currentSchemaVersion: 3,
      inputSchema: {},
    };

    const v2Json = JSON.stringify({
      schemaVersion: 2,
      generatorId: 'tri-zip-backpack',
      inputs: { mainBodyWidthMm: 300 },
    });

    const result = importProjectJson(v2Json, v3Config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('migration-error');
  });

  it('handles same-version (no migration needed)', () => {
    // No migrators registered
    const json = exportProjectJson(validEnvelope);
    const result = importProjectJson(json, triZipV2Config);
    expect(result.ok).toBe(true);
  });
});
