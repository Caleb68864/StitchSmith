import type { ToolRollProject } from '../generators/tool-roll/types.js';

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

  if (!('schemaVersion' in obj) || obj.schemaVersion !== 1) {
    throw new Error(
      'Invalid project file: missing or unsupported schemaVersion (expected 1).',
    );
  }

  if (!('generatorId' in obj) || obj.generatorId !== 'tool-roll') {
    throw new Error(
      "Invalid project file: missing or wrong generatorId (expected 'tool-roll').",
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

  return parsed as ToolRollProject;
}
