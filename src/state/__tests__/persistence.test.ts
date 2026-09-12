/**
 * Persistence hardening (H5): every project hook survives corrupted storage,
 * round-trips through export → parse → import, stamps updatedAt, resets
 * cleanly, and owns a unique storage key whose schema version matches the
 * import table.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PROJECT_HOOKS, SCHEMA_VERSIONS, TOOL_ROLL_STORAGE_KEY } from '../index.js';
import { parseProjectJson, KNOWN_SCHEMA_VERSIONS } from '../../export/projectEnvelopeIO.js';
import { loadProject, _resetStorageModule } from '../../storage/localStorage.js';
import { validateInputs as vBookCover } from '../../generators/book-cover/index.js';
import { validateInputs as vCircleSkirt } from '../../generators/circle-skirt/index.js';
import { validateInputs as vClamshell } from '../../generators/clamshell-pack/index.js';
import { validateInputs as vFanny } from '../../generators/fanny-pack/index.js';
import { validateInputs as vLbv } from '../../generators/lbv/index.js';
import { validateInputs as vMagPouch } from '../../generators/mag-pouch/index.js';
import { validateInputs as vMicroRig } from '../../generators/micro-rig/index.js';
import { validateInputs as vOrganizer } from '../../generators/organizer/index.js';
import { validateInputs as vPaddedStrap } from '../../generators/padded-strap/index.js';
import { validateInputs as vPlateCarrier } from '../../generators/plate-carrier/index.js';
import { validateInputs as vRollTop } from '../../generators/roll-top-sack/index.js';
import { validateInputs as vSling } from '../../generators/sling/index.js';
import { validateInputs as vTriZip } from '../../generators/tri-zip-backpack/index.js';
import { validateInputs as vZipPouch } from '../../generators/zip-pouch/index.js';

const VALIDATORS: Record<string, (i: never) => { ok: boolean }> = {
  'book-cover': vBookCover, 'circle-skirt': vCircleSkirt, 'clamshell-pack': vClamshell, 'fanny-pack': vFanny, 'lbv': vLbv,
  'mag-pouch': vMagPouch, 'micro-rig': vMicroRig, 'organizer': vOrganizer, 'padded-strap': vPaddedStrap, 'plate-carrier': vPlateCarrier,
  'roll-top-sack': vRollTop, 'sling': vSling, 'tri-zip-backpack': vTriZip, 'zip-pouch': vZipPouch,
};

beforeEach(() => {
  localStorage.clear();
  for (const h of PROJECT_HOOKS) h.reset();
  _resetStorageModule();
});
afterEach(() => { vi.useRealTimers(); });

describe('registry', () => {
  it('every hook has a unique storage key in the stitchsmith.<id>.project convention', () => {
    const keys = [...PROJECT_HOOKS.map((h) => h.storageKey), TOOL_ROLL_STORAGE_KEY];
    expect(new Set(keys).size).toBe(keys.length);
    for (const h of PROJECT_HOOKS) expect(h.storageKey).toBe(`stitchsmith.${h.generatorId}.project`);
    expect(TOOL_ROLL_STORAGE_KEY).toBe('stitchsmith.tool-roll.project');
  });
  it('schema versions match the import table and every generatorId is unique', () => {
    expect(SCHEMA_VERSIONS).toEqual(KNOWN_SCHEMA_VERSIONS);
    const ids = PROJECT_HOOKS.map((h) => h.generatorId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const h of PROJECT_HOOKS) {
      const d = h.makeDefault();
      expect(d.generatorId).toBe(h.generatorId);
      expect(d.schemaVersion).toBe(h.schemaVersion);
    }
  });
  it('every default project passes its generator\'s validateInputs', () => {
    for (const h of PROJECT_HOOKS) {
      const validate = VALIDATORS[h.generatorDir];
      expect(validate, `no validator wired for ${h.generatorDir}`).toBeDefined();
      expect(validate(h.makeDefault().inputs as never).ok, `${h.generatorId} default inputs`).toBe(true);
    }
  });
});

for (const h of PROJECT_HOOKS) {
  describe(`persistence — ${h.generatorId}`, () => {
    const corrupt: Record<string, string> = {
      'not JSON': '{not json',
      'a bare number': '42',
      'an array': '[]',
      'another generator': JSON.stringify({ ...h.makeDefault(), generatorId: h.generatorId === 'sling' ? 'organizer' : 'sling' }),
      'a future schemaVersion': JSON.stringify({ ...h.makeDefault(), schemaVersion: h.schemaVersion + 1 }),
      'inputs that are not an object': JSON.stringify({ ...h.makeDefault(), inputs: 'garbage' }),
      'inputs that are null': JSON.stringify({ ...h.makeDefault(), inputs: null }),
    };
    for (const [label, raw] of Object.entries(corrupt)) {
      it(`falls back to the default project when storage holds ${label}`, () => {
        localStorage.setItem(h.storageKey, raw);
        const { result } = renderHook(() => h.useHook());
        expect(result.current.project).toEqual(expect.objectContaining({ generatorId: h.generatorId, schemaVersion: h.schemaVersion }));
        expect(result.current.project.inputs).toEqual(h.makeDefault().inputs);
      });
    }

    it('loads a stored project whose inputs carry garbage values without throwing (the page validates)', () => {
      const stored = { ...h.makeDefault(), inputs: { ...h.makeDefault().inputs, units: 'garbage', seam_allowance: NaN, nonsense: {} } };
      localStorage.setItem(h.storageKey, JSON.stringify(stored));
      const { result } = renderHook(() => h.useHook());
      expect(result.current.project.generatorId).toBe(h.generatorId);
      expect(result.current.project.inputs.units).toBe('garbage');
    });

    it('round-trips export → parse → import with identical inputs', () => {
      const original = h.makeDefault();
      const text = JSON.stringify(original, null, 2);
      const parsed = parseProjectJson<typeof original & { generatorId: string }>(text, original.generatorId);
      const { result } = renderHook(() => h.useHook());
      act(() => { result.current.importProject(parsed as never); });
      expect(result.current.project.inputs).toEqual(original.inputs);
      expect(result.current.project.projectName).toBe(original.projectName);
    });

    it('importProject refuses another generator\'s project by name', () => {
      const { result } = renderHook(() => h.useHook());
      const foreign = { ...h.makeDefault(), generatorId: 'tool-roll' };
      expect(() => act(() => { result.current.importProject(foreign as never); })).toThrow(/tool-roll/);
    });

    it('updateInputs merges and stamps updatedAt; resetProject restores defaults and clears storage', () => {
      vi.useFakeTimers({ now: new Date('2026-09-12T00:00:00Z') });
      const { result } = renderHook(() => h.useHook());
      const before = result.current.project.updatedAt;
      vi.setSystemTime(new Date('2026-09-12T00:00:05Z'));
      act(() => { result.current.updateInputs({ fuzz_marker: 1 }); });
      expect((result.current.project.inputs as Record<string, unknown>).fuzz_marker).toBe(1);
      expect(result.current.project.updatedAt > before).toBe(true);
      act(() => { vi.advanceTimersByTime(300); });
      expect(JSON.parse(localStorage.getItem(h.storageKey)!).inputs.fuzz_marker).toBe(1);
      act(() => { result.current.resetProject(); });
      expect(result.current.project.inputs).toEqual(h.makeDefault().inputs);
      expect(localStorage.getItem(h.storageKey)).toBeNull();
      act(() => { vi.advanceTimersByTime(300); });
      expect(JSON.parse(localStorage.getItem(h.storageKey)!).inputs).toEqual(h.makeDefault().inputs);
    });
  });
}

describe('persistence — tool-roll', () => {
  it('corrupted storage loads as null without throwing', () => {
    for (const raw of ['{not json', '42', JSON.stringify({ schemaVersion: 1 }), JSON.stringify({ schemaVersion: 1, generatorId: 'roll-top-sack', tools: [], settings: {} }), JSON.stringify({ schemaVersion: 1, generatorId: 'tool-roll', tools: 'x', settings: {} })]) {
      localStorage.setItem(TOOL_ROLL_STORAGE_KEY, raw);
      expect(loadProject()).toBeNull();
    }
  });
});
