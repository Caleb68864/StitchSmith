import { describe, it, expect } from 'vitest';
import { parseProjectJson } from './projectEnvelopeIO.js';

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
