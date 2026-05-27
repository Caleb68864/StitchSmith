import type { ToolRollProject } from '../generators/tool-roll/types.js';
import { defaultToolRollSettings } from '../generators/tool-roll/defaults.js';

const MAX_TOOLS = 500;

export function parseProjectJson(json: string): ToolRollProject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON: could not parse project file.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid project file: expected a JSON object.');
  }

  const obj = parsed as Record<string, unknown>;

  if (!('generatorId' in obj)) {
    throw new Error('Invalid project file: missing generatorId field.');
  }

  // Friendly cross-generator message before version check so the user gets
  // actionable guidance rather than a confusing schema-version error.
  if (obj.generatorId === 'tri-zip-backpack') {
    throw new Error(
      'This project is a Tri-Zip Backpack — switch to that generator to load it.',
    );
  }

  if (obj.generatorId !== 'tool-roll') {
    throw new Error(
      `Invalid project file: wrong generatorId "${obj.generatorId}" — this page only loads Tool Roll projects.`,
    );
  }

  if (!('schemaVersion' in obj) || obj.schemaVersion !== 1) {
    if (typeof obj.schemaVersion === 'number' && (obj.schemaVersion as number) > 1) {
      throw new Error(
        `Invalid project file: unsupported schemaVersion ${obj.schemaVersion}. Update to the latest version to load it.`,
      );
    }
    throw new Error(
      'Invalid project file: missing or unsupported schemaVersion (expected 1).',
    );
  }

  if (!('settings' in obj) || typeof obj.settings !== 'object' || obj.settings === null) {
    throw new Error('Invalid project file: missing or invalid settings object.');
  }

  if (!('tools' in obj) || !Array.isArray(obj.tools)) {
    throw new Error('Invalid project file: missing or invalid tools array.');
  }

  if ((obj.tools as unknown[]).length > MAX_TOOLS) {
    throw new Error(
      `Invalid project file: tools array exceeds the maximum of ${MAX_TOOLS} items (found ${(obj.tools as unknown[]).length}).`,
    );
  }

  // Forward-migrate: merge any newly-added setting fields from the current defaults
  // so older project files (e.g. the bundled wrenches.json) don't crash the UI.
  const project = parsed as ToolRollProject;
  return {
    ...project,
    settings: { ...defaultToolRollSettings, ...project.settings },
  };
}
