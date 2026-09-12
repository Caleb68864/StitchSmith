import { describe, it, expect } from 'vitest';
import { parseProjectJson, KNOWN_SCHEMA_VERSIONS } from './projectEnvelopeIO.js';

interface Env {
  generatorId: 'zip-pouch';
  projectName: string;
  inputs: { finished_length: number };
}

const good: Env = { generatorId: 'zip-pouch', projectName: 'p', inputs: { finished_length: 180 } };

describe('parseProjectJson (shared envelope import)', () => {
  it('accepts a well-formed envelope for the expected generator', () => {
    const parsed = parseProjectJson<Env>(JSON.stringify(good), 'zip-pouch');
    expect(parsed.inputs.finished_length).toBe(180);
  });

  it('rejects a different generator with a message naming both ids', () => {
    expect(() => parseProjectJson<Env>(JSON.stringify(good), 'mag-pouch' as never)).toThrow(
      /"zip-pouch" project, not a mag-pouch/,
    );
  });

  it('rejects malformed JSON with a friendly message', () => {
    expect(() => parseProjectJson<Env>('{not json', 'zip-pouch')).toThrow(/Invalid JSON/);
  });

  it('rejects non-object roots (array, null, string)', () => {
    for (const text of ['[]', 'null', '"zip-pouch"']) {
      expect(() => parseProjectJson<Env>(text, 'zip-pouch')).toThrow(/expected a JSON object/);
    }
  });

  it('rejects an envelope whose inputs are missing, null, or an array', () => {
    for (const inputs of [undefined, null, []]) {
      const text = JSON.stringify({ ...good, inputs });
      expect(() => parseProjectJson<Env>(text, 'zip-pouch')).toThrow(/"inputs" object/);
    }
  });
});

describe('parseProjectJson — schema versions and names (H5)', () => {
  const base = { generatorId: 'zip-pouch', projectName: 'p', schemaVersion: 5, inputs: { finished_length: 180 } };
  it('rejects a future schemaVersion with a message naming both versions', () => {
    expect(() => parseProjectJson(JSON.stringify({ ...base, schemaVersion: 99 }), 'zip-pouch')).toThrow(/schemaVersion 99; this build reads 5/);
  });
  it('accepts the current and older versions, and a file with no version', () => {
    expect(parseProjectJson(JSON.stringify(base), 'zip-pouch').generatorId).toBe('zip-pouch');
    expect(parseProjectJson(JSON.stringify({ ...base, schemaVersion: 1 }), 'zip-pouch').generatorId).toBe('zip-pouch');
    const { schemaVersion: _drop, ...noVersion } = base;
    expect(parseProjectJson(JSON.stringify(noVersion), 'zip-pouch').generatorId).toBe('zip-pouch');
  });
  it('rejects a non-integer schemaVersion and an empty project name', () => {
    expect(() => parseProjectJson(JSON.stringify({ ...base, schemaVersion: 'five' }), 'zip-pouch')).toThrow(/whole number/);
    expect(() => parseProjectJson(JSON.stringify({ ...base, projectName: '' }), 'zip-pouch')).toThrow(/projectName/);
  });
  it('the version table covers every generator in CLAUDE.md', () => {
    expect(Object.keys(KNOWN_SCHEMA_VERSIONS)).toHaveLength(15);
    expect(KNOWN_SCHEMA_VERSIONS['lbv']).toBe(14);
  });
});
