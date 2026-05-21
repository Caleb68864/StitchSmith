import type { ToolRollProject } from '../generators/tool-roll/types.js';
import { downloadTextFile } from '../utils/download.js';

export function exportProjectJson(project: ToolRollProject): void {
  const json = JSON.stringify(project, null, 2);
  downloadTextFile('tool-roll-project.json', json, 'application/json');
}
