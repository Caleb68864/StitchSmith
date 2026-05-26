// SS-05: Project JSON always carries schemaVersion: 1 and generatorId: 'tool-roll'.
// The import path (importProjectJson.ts) checks generatorId first so cross-generator
// loads surface a friendly error rather than a confusing schema-version mismatch.
import type { ToolRollProject } from '../generators/tool-roll/types.js';
import { downloadTextFile } from '../utils/download.js';

export function exportProjectJson(project: ToolRollProject): void {
  const json = JSON.stringify(project, null, 2);
  downloadTextFile('tool-roll-project.json', json, 'application/json');
}
