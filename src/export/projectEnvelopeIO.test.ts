import { describe, it, expect, vi } from 'vitest';
import { parseProjectJson, KNOWN_SCHEMA_VERSIONS, downloadProjectJson } from './projectEnvelopeIO.js';

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

  it('rejects a different generator, naming both pages the way the user sees them', () => {
    expect(() => parseProjectJson<Env>(JSON.stringify(good), 'mag-pouch' as never)).toThrow(
      /This is a Zip Pouch project file, so it cannot be opened on the Mag Pouch page/,
    );
  });

  it('names an unrecognised generator id rather than printing "undefined"', () => {
    expect(() => parseProjectJson<Env>(JSON.stringify({ ...good, generatorId: 'not-a-generator' }), 'zip-pouch')).toThrow(
      /This is a "not-a-generator" project file/,
    );
    expect(() => parseProjectJson<Env>(JSON.stringify({ ...good, generatorId: undefined }), 'zip-pouch')).toThrow(
      /This is a unknown project file/,
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

describe('downloadProjectJson filename', () => {
  function nameFor(projectName: string, generatorId: string): string {
    const anchors: HTMLAnchorElement[] = [];
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLAnchorElement;
      if (tag === 'a') { el.click = () => {}; anchors.push(el); }
      return el;
    });
    // jsdom implements neither.
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = () => 'blob:x';
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = () => {};
    downloadProjectJson({ projectName, generatorId } as never);
    vi.restoreAllMocks();
    return anchors[0].download;
  }

  it('keeps the project name and tags the generator, so two generators never collide', () => {
    expect(nameFor('My Project', 'zip-pouch')).toBe('My_Project.zip-pouch.json');
    expect(nameFor('My Project', 'mag-pouch')).toBe('My_Project.mag-pouch.json');
  });

  it('falls back to the generator id when the name sanitises to nothing', () => {
    expect(nameFor('***', 'organizer')).toBe('organizer.organizer.json');
    expect(nameFor('  ', 'lbv')).toBe('lbv.lbv.json');
  });
});
