import { describe, it, expect } from 'vitest';
import { parseProjectJson } from './importProjectJson.js';
import type { ToolRollProject } from '../generators/tool-roll/types.js';
import { defaultToolRollSettings } from '../generators/tool-roll/defaults.js';

function makeValidProject(): ToolRollProject {
  return {
    schemaVersion: 1,
    projectName: 'Test Project',
    generatorId: 'tool-roll',
    units: 'mm',
    settings: { ...defaultToolRollSettings },
    tools: [
      { id: 't1', name: 'Hammer', width: 40, thickness: 10, height: 120, visibleAmount: 40 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('parseProjectJson', () => {
  it('returns the project unchanged for valid JSON', () => {
    const project = makeValidProject();
    const result = parseProjectJson(JSON.stringify(project));
    expect(result).toEqual(project);
  });

  it('throws on invalid JSON string', () => {
    expect(() => parseProjectJson('not valid json')).toThrow();
    expect(() => parseProjectJson('{"foo":1}')).toThrow();
  });

  it('throws when schemaVersion is missing', () => {
    const { schemaVersion: _sv, ...noVersion } = makeValidProject();
    expect(() => parseProjectJson(JSON.stringify(noVersion))).toThrow(/schemaVersion/);
  });

  it('throws when schemaVersion is wrong value', () => {
    const bad = { ...makeValidProject(), schemaVersion: 2 };
    expect(() => parseProjectJson(JSON.stringify(bad))).toThrow(/schemaVersion/);
  });

  it('throws when generatorId is missing', () => {
    const { generatorId: _gid, ...noGenId } = makeValidProject();
    expect(() => parseProjectJson(JSON.stringify(noGenId))).toThrow(/generatorId/);
  });

  it('throws when generatorId is wrong', () => {
    const bad = { ...makeValidProject(), generatorId: 'other-tool' };
    expect(() => parseProjectJson(JSON.stringify(bad))).toThrow(/generatorId/);
  });

  it('throws when settings is missing', () => {
    const { settings: _s, ...noSettings } = makeValidProject();
    expect(() => parseProjectJson(JSON.stringify(noSettings))).toThrow(/settings/);
  });

  it('throws when tools is missing', () => {
    const { tools: _t, ...noTools } = makeValidProject();
    expect(() => parseProjectJson(JSON.stringify(noTools))).toThrow(/tools/);
  });

  it('throws when tools is not an array', () => {
    const bad = { ...makeValidProject(), tools: 'not-an-array' };
    expect(() => parseProjectJson(JSON.stringify(bad))).toThrow(/tools/);
  });

  it('throws with tool-count bound message when tools.length > 500', () => {
    const project = makeValidProject();
    const bigProject = { ...project, tools: new Array(501).fill(project.tools[0]) };
    expect(() => parseProjectJson(JSON.stringify(bigProject))).toThrow(/500/);
  });

  it('accepts exactly 500 tools without throwing', () => {
    const project = makeValidProject();
    const maxProject = { ...project, tools: new Array(500).fill(project.tools[0]) };
    expect(() => parseProjectJson(JSON.stringify(maxProject))).not.toThrow();
  });
});
