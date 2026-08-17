// Tiny helpers every generator page uses for "Save Project" + "Load Project"
// buttons. The shape is intentionally minimal — generators that need richer
// import/export (e.g. Tool Roll's SVG export) keep their own ExportPanel for
// those; PatternPageShell's Import/Export buttons are project-JSON only.

interface ProjectEnvelope {
  generatorId: string;
  projectName: string;
  // ...plus whatever the generator stores.
}

/**
 * Parse incoming JSON text and assert it matches the expected generatorId.
 * Throws a friendly error if the generatorId is wrong or the JSON is broken;
 * PatternPageShell catches and surfaces via alert().
 */
export function parseProjectJson<T extends ProjectEnvelope>(
  jsonText: string,
  expectedGeneratorId: T['generatorId'],
): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON: could not parse project file.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid project file: expected a JSON object.');
  }
  const obj = parsed as Partial<ProjectEnvelope> & { inputs?: unknown };
  if (obj.generatorId !== expectedGeneratorId) {
    throw new Error(
      `This file is a "${obj.generatorId ?? 'unknown'}" project, not a ${expectedGeneratorId} project.`,
    );
  }
  // Every generator page does `buildPattern(project.inputs)` straight after
  // import and the autosave effect persists whatever is in state, so a file
  // with the right generatorId but no inputs would crash and then survive
  // reload. Reject it here instead.
  if (typeof obj.inputs !== 'object' || obj.inputs === null || Array.isArray(obj.inputs)) {
    throw new Error('Invalid project file: missing or invalid "inputs" object.');
  }
  return obj as T;
}

/**
 * Trigger a browser download of `project` as pretty-printed JSON.
 * Filename: `<sanitized projectName>.<generatorId>.json`.
 */
export function downloadProjectJson<T extends ProjectEnvelope>(project: T): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.projectName.replace(/[^a-z0-9-]/gi, '_')}.${project.generatorId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
